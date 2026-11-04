-- Content calendar (admin: Client portal → Content calendar, client: Calendrier de contenu)
-- with a conversation thread on every post.
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

-- ── Conversation on each post (client ⇄ SB Marketing) ─────────────
-- kind 'message' = a chat message; the other kinds are timeline entries
-- (client decisions, post sent for approval) shown inside the same thread.
create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  author text not null check (author in ('client', 'agency')),
  author_name text,
  kind text not null default 'message' check (kind in ('message', 'approved', 'rejected', 'changes_requested', 'sent_for_approval')),
  body text not null default '',
  seen_by_agency boolean not null default false,
  seen_by_client boolean not null default false,
  created_at timestamptz not null default now(),
  constraint content_comments_body_check check (length(body) <= 2000 and (kind <> 'message' or length(btrim(body)) > 0))
);
create index if not exists content_comments_content_idx on public.content_comments (content_id, created_at);
create index if not exists content_comments_client_idx on public.content_comments (client_id, created_at);

alter table public.content_comments enable row level security;
grant select, insert, update, delete on table public.content_comments to authenticated;
drop policy if exists "Admin manages content_comments" on public.content_comments;
create policy "Admin manages content_comments" on public.content_comments for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- Client reads the thread of one of their posts (marks agency messages as seen).
create or replace function public.get_content_thread(access_token uuid, item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_client uuid;
begin
  select c.id into target_client
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  update public.content_comments set seen_by_client = true
   where content_id = item_id and author = 'agency' and seen_by_client = false;

  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'author', m.author, 'author_name', m.author_name, 'kind', m.kind, 'body', m.body, 'created_at', m.created_at) order by m.created_at)
                   from public.content_comments m where m.content_id = item_id), '[]'::jsonb);
end
$$;
revoke all on function public.get_content_thread(uuid, uuid) from public;
grant execute on function public.get_content_thread(uuid, uuid) to anon, authenticated;

-- Client posts a message in the thread of one of their posts.
create or replace function public.add_content_comment(access_token uuid, item_id uuid, body_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_client uuid; who text; clean text := left(btrim(coalesce(body_text, '')), 2000); msg public.content_comments%rowtype;
begin
  if clean = '' then raise exception 'empty message'; end if;
  select c.id, coalesce(nullif(c.contact_name, ''), c.business_name) into target_client, who
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  insert into public.content_comments (content_id, client_id, author, author_name, kind, body, seen_by_client)
  values (item_id, target_client, 'client', who, 'message', clean, true)
  returning * into msg;

  insert into public.portal_audit_log (client_id, event_type, details)
  values (target_client, 'content_comment', jsonb_build_object('content_id', item_id));

  return jsonb_build_object('id', msg.id, 'author', msg.author, 'author_name', msg.author_name, 'kind', msg.kind, 'body', msg.body, 'created_at', msg.created_at);
end
$$;
revoke all on function public.add_content_comment(uuid, uuid, text) from public;
grant execute on function public.add_content_comment(uuid, uuid, text) to anon, authenticated;

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

  insert into public.content_comments (content_id, client_id, author, author_name, kind, body, seen_by_client)
  select item_id, target_client, 'client', coalesce(nullif(c.contact_name, ''), c.business_name), decision, coalesce(clean_comment, ''), true
  from public.clients c where c.id = target_client;

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
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'time',to_char(i.publish_time,'HH24:MI'),'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,'visual_url',i.visual_url,'media_type',i.media_type,'status',i.status,'publication_url',i.publication_url,'client_decision',i.client_decision,'client_comment',i.client_comment,'decided_at',i.decided_at,'comments_count',(select count(*) from public.content_comments m where m.content_id=i.id),'unread',(select count(*) from public.content_comments m where m.content_id=i.id and m.author='agency' and not m.seen_by_client)) order by i.publish_date, i.publish_time) from public.content_items i where i.client_id=c.id and i.client_visible and i.status<>'idea'),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;

revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
