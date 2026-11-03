-- Client content calendar — approve / reject / request changes.
-- Run once in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once. Requires supabase/client_dashboard_setup.sql.
--
-- Calendar posts live in clients.dashboard_data->'calendar' (edited in the admin).
-- Client answers are stored separately in clients.calendar_feedback, keyed by the
-- post id, so saving the admin editor never overwrites a client's decision.

alter table public.clients
  add column if not exists calendar_feedback jsonb not null default '{}'::jsonb;

-- Called from the client's private dashboard with its secret link token.
-- decision: 'approved' | 'rejected' | 'changes_requested' (a comment is required
-- for changes_requested). Only posts that exist in that client's calendar are accepted.
create or replace function public.respond_to_calendar_item(access_token uuid, item_id text, decision text, comment_text text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_calendar jsonb;
  clean_comment text := left(nullif(btrim(coalesce(comment_text, '')), ''), 2000);
  entry jsonb;
begin
  if decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'invalid decision';
  end if;
  if item_id is null or length(item_id) = 0 or length(item_id) > 64 then
    raise exception 'invalid item';
  end if;
  if decision = 'changes_requested' and clean_comment is null then
    raise exception 'comment required';
  end if;

  select c.id, coalesce(c.dashboard_data -> 'calendar', '[]'::jsonb)
    into target_id, target_calendar
  from public.clients c
  where c.portal_token = access_token
    and c.portal_enabled = true
    and c.status = 'active'
  for update;

  if target_id is null then
    raise exception 'not found';
  end if;
  if jsonb_typeof(target_calendar) <> 'array'
     or not exists (select 1 from jsonb_array_elements(target_calendar) e where e ->> 'id' = item_id) then
    raise exception 'unknown item';
  end if;

  entry := jsonb_build_object('decision', decision, 'comment', clean_comment, 'decided_at', now());

  update public.clients
     set calendar_feedback = coalesce(calendar_feedback, '{}'::jsonb) || jsonb_build_object(item_id, entry)
   where id = target_id;

  insert into public.portal_audit_log (client_id, event_type, details)
  values (target_id, 'calendar_' || decision, jsonb_build_object('item_id', item_id, 'comment', clean_comment));

  return entry;
end
$$;

revoke all on function public.respond_to_calendar_item(uuid, text, text, text) from public;
grant execute on function public.respond_to_calendar_item(uuid, text, text, text) to anon, authenticated;

-- Portal response: same as before, plus the client's own calendar answers.
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('business_name',c.business_name,'contact_name',c.contact_name,'language',c.language,'updated_at',c.portal_updated_at,'account_manager',c.account_manager,'dashboard',c.dashboard_data,
  'calendar_feedback',coalesce(c.calendar_feedback,'{}'::jsonb),
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('title',t.title,'description',t.client_update,'status',t.status,'due_date',t.due_date) order by t.due_date) from public.client_tasks t where t.client_id=c.id and t.client_visible and t.status<>'completed'),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,'visual_url',i.visual_url,'status',i.status,'publication_url',i.publication_url,'approval_token',case when i.status='ready_for_approval' then i.approval_token else null end) order by i.publish_date) from public.content_items i where i.client_id=c.id and i.client_visible),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;

revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
