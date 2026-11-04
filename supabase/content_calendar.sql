-- Content calendar (admin: Client portal → Content calendar, client: Calendrier de contenu).
-- Run once in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once. Requires supabase/client_dashboard_setup.sql
-- (content_items table) and supabase/client_calendar_feedback.sql.
-- Images/videos are uploaded to the "client-content" bucket (supabase/client_content_storage.sql).

-- Posts are rows in public.content_items (one row per publication), so saving one
-- post can never overwrite another. Add a publish time and a free-form channel list.
alter table public.clients
  add column if not exists calendar_feedback jsonb not null default '{}'::jsonb;

alter table public.content_items
  add column if not exists publish_time time,
  add column if not exists media_type text;

create index if not exists content_items_client_date_idx on public.content_items (client_id, publish_date);

-- Client answer on a post: 'approved' | 'rejected' | 'changes_requested'
-- (a comment is required for changes_requested). Only posts of that client that
-- are visible to them and not yet published can be answered.
create or replace function public.respond_to_content_item(access_token uuid, item_id uuid, decision text, comment_text text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_client uuid;
  target_status text;
  new_status text;
  clean_comment text := left(nullif(btrim(coalesce(comment_text, '')), ''), 2000);
begin
  if decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'invalid decision';
  end if;
  if decision = 'changes_requested' and clean_comment is null then
    raise exception 'comment required';
  end if;

  select c.id, i.status into target_client, target_status
  from public.clients c
  join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token
    and c.portal_enabled = true
    and c.status = 'active'
    and i.id = item_id
    and i.client_visible = true
    and i.status not in ('idea', 'published')
  for update of i;

  if target_client is null then
    raise exception 'not found';
  end if;

  new_status := case
    when decision = 'approved' and target_status in ('ready_for_approval', 'draft', 'design_in_progress') then 'approved'
    when decision <> 'approved' and target_status in ('ready_for_approval', 'approved') then 'draft'
    else target_status
  end;

  update public.content_items
     set client_decision = decision,
         client_comment = clean_comment,
         decided_at = now(),
         status = new_status,
         updated_at = now()
   where id = item_id;

  insert into public.portal_audit_log (client_id, event_type, details)
  values (target_client, 'content_' || decision, jsonb_build_object('content_id', item_id, 'comment', clean_comment));

  return jsonb_build_object('decision', decision, 'comment', clean_comment, 'decided_at', now(), 'status', new_status);
end
$$;

revoke all on function public.respond_to_content_item(uuid, uuid, text, text) from public;
grant execute on function public.respond_to_content_item(uuid, uuid, text, text) to anon, authenticated;

-- Portal response: posts now include their time and the client's own answer.
-- Ideas stay internal (not shown to the client).
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('business_name',c.business_name,'contact_name',c.contact_name,'language',c.language,'updated_at',c.portal_updated_at,'account_manager',c.account_manager,'dashboard',c.dashboard_data,
  'calendar_feedback',coalesce(c.calendar_feedback,'{}'::jsonb),
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('title',t.title,'description',t.client_update,'status',t.status,'due_date',t.due_date) order by t.due_date) from public.client_tasks t where t.client_id=c.id and t.client_visible and t.status<>'completed'),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'time',to_char(i.publish_time,'HH24:MI'),'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,'visual_url',i.visual_url,'media_type',i.media_type,'status',i.status,'publication_url',i.publication_url,'client_decision',i.client_decision,'client_comment',i.client_comment,'decided_at',i.decided_at) order by i.publish_date, i.publish_time) from public.content_items i where i.client_id=c.id and i.client_visible and i.status<>'idea'),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;

revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
