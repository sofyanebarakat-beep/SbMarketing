-- SB Marketing — content calendar: complete database setup (one paste).
-- Supabase project juoyoqcmpqkcwsdtanhv → SQL Editor → New query → paste everything → Run.
-- Safe to run more than once; it never deletes data. Generated from, in order:
--   supabase/client_dashboard_setup.sql
--   supabase/client_dashboard_drafts.sql
--   supabase/client_content_storage.sql
--   supabase/client_calendar_feedback.sql
--   supabase/content_calendar.sql
--   supabase/content_calendar_pro.sql


-- ════════════ supabase/client_dashboard_setup.sql ════════════
-- Client dashboards — one-time setup.
-- Fixes: "Could not find the 'dashboard_data' column of 'clients' in the schema cache".
-- Run once in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once: it only adds what is missing and never deletes data.
-- Requires the base "clients" table (top of supabase/clients_schema.sql).

-- ── Richer client profile ───────────────────────────────────────
-- whatsapp_number is stored E.164 (e.g. +33612345678) so it's always a
-- valid wa.me link. activity is free text (with suggestions in the admin
-- UI) so clients can later be filtered for targeted tip campaigns.
alter table public.clients
  add column if not exists whatsapp_number text,
  add column if not exists activity text,
  add column if not exists marketing_consent boolean not null default true,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists tracked_metrics jsonb not null default
    '["website_visits","google_impressions","google_clicks","google_avg_position"]'::jsonb;

-- Passwordless client portal. The token is deliberately separate from the
-- client id and is the only credential carried in the private dashboard URL.
alter table public.clients
  add column if not exists portal_token uuid not null default gen_random_uuid(),
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists portal_updated_at timestamptz,
  add column if not exists dashboard_data jsonb not null default '{}'::jsonb,
  add column if not exists portal_draft_data jsonb,
  add column if not exists portal_draft_saved_at timestamptz,
  add column if not exists portal_published_at timestamptz,
  add column if not exists dashboard_data_source text,
  add column if not exists dashboard_admin_notes text;

update public.clients
set portal_published_at = portal_updated_at
where portal_enabled = true
  and portal_published_at is null
  and portal_updated_at is not null;

create unique index if not exists clients_portal_token_idx on public.clients (portal_token);

-- The public portal can only retrieve a deliberately limited projection for
-- one enabled client with the exact secret token. It cannot enumerate clients
-- or read email addresses, notes, phone numbers, or any admin-only fields.
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'business_name', c.business_name,
    'contact_name', c.contact_name,
    'language', c.language,
    'updated_at', c.portal_updated_at,
    'dashboard', c.dashboard_data
  )
  from public.clients c
  where c.portal_token = access_token
    and c.portal_enabled = true
    and c.status = 'active'
  limit 1;
$$;

revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

-- ── Agency operations: profiles, tasks, content, campaigns, files ──
alter table public.clients
  add column if not exists package_name text,
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists start_date date,
  add column if not exists monthly_price numeric(12,2),
  add column if not exists main_objective text,
  add column if not exists account_manager text default 'SB Marketing',
  add column if not exists next_report_date date,
  add column if not exists preferred_channel text default 'email',
  add column if not exists access_links jsonb not null default '{}'::jsonb;

create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  title text not null, description text, service text, priority text not null default 'medium',
  status text not null default 'planned', owner text, due_date date, internal_notes text,
  client_update text, client_visible boolean not null default true, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  publish_date date, platform text, content_type text, topic text not null, caption text, visual_url text,
  status text not null default 'idea', publication_url text, client_visible boolean not null default true,
  approval_token uuid not null default gen_random_uuid(), approval_expires_at timestamptz default (now()+interval '30 days'),
  client_decision text, client_comment text, decided_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.client_campaigns (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  name text not null, channel text, objective text, status text not null default 'planned', budget numeric(12,2),
  spend numeric(12,2), leads integer, conversions integer, performance_note text, start_date date, end_date date,
  client_visible boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  name text not null, category text, url text not null, client_visible boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.client_communications (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  type text not null, subject text not null, summary text, direction text not null default 'internal',
  next_action_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.email_schedule (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete cascade,
  email_type text not null default 'custom', subject text not null, scheduled_for timestamptz not null,
  status text not null default 'scheduled', payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.portal_audit_log (
  id bigint generated always as identity primary key, client_id uuid references public.clients(id) on delete cascade,
  event_type text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

do $$ declare t text; begin foreach t in array array['client_tasks','content_items','client_campaigns','client_files','client_communications','email_schedule','portal_audit_log'] loop execute format('alter table public.%I enable row level security',t);execute format('grant select, insert, update, delete on table public.%I to authenticated',t);execute format('drop policy if exists "Admin manages %s" on public.%I',t,t);execute format('create policy "Admin manages %s" on public.%I for all to authenticated using (lower(auth.jwt() ->> ''email'') = ''sofyanebarakat@gmail.com'') with check (lower(auth.jwt() ->> ''email'') = ''sofyanebarakat@gmail.com'')',t,t);end loop;end $$;

create or replace function public.respond_to_content(access_token uuid, action_token uuid, decision text, comment_text text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare target_client uuid; target_content uuid;
begin
  select c.id, i.id into target_client,target_content from public.clients c join public.content_items i on i.client_id=c.id
  where c.portal_token=access_token and c.portal_enabled and c.status='active' and i.approval_token=action_token
    and i.approval_expires_at>now() and i.status='ready_for_approval' and decision in ('approved','changes_requested') limit 1;
  if target_content is null then return false; end if;
  update public.content_items set client_decision=decision,client_comment=comment_text,decided_at=now(),status=case when decision='approved' then 'approved' else 'draft' end,updated_at=now() where id=target_content;
  insert into public.portal_audit_log(client_id,event_type,details) values(target_client,'content_'||decision,jsonb_build_object('content_id',target_content,'comment',comment_text));return true;
end $$;
grant execute on function public.respond_to_content(uuid,uuid,text,text) to anon,authenticated;

create or replace function public.audit_client_portal_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.dashboard_data is distinct from new.dashboard_data then insert into public.portal_audit_log(client_id,event_type,details) values(new.id,'dashboard_updated',jsonb_build_object('updated_at',now())); end if;
  if old.portal_token is distinct from new.portal_token then insert into public.portal_audit_log(client_id,event_type,details) values(new.id,'private_link_regenerated','{}'::jsonb); end if;
  return new;
end $$;
drop trigger if exists audit_client_portal_change_trigger on public.clients;
create trigger audit_client_portal_change_trigger after update on public.clients for each row execute function public.audit_client_portal_change();

-- Extend the portal response with safe operational data only.
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('business_name',c.business_name,'contact_name',c.contact_name,'language',c.language,'updated_at',c.portal_updated_at,'account_manager',c.account_manager,'dashboard',c.dashboard_data,
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('title',t.title,'description',t.client_update,'status',t.status,'due_date',t.due_date) order by t.due_date) from public.client_tasks t where t.client_id=c.id and t.client_visible and t.status<>'completed'),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,'visual_url',i.visual_url,'status',i.status,'publication_url',i.publication_url,'approval_token',case when i.status='ready_for_approval' then i.approval_token else null end) order by i.publish_date) from public.content_items i where i.client_id=c.id and i.client_visible),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;


-- Make the API see the new columns immediately (clears the schema cache).
notify pgrst, 'reload schema';

-- ════════════ supabase/client_dashboard_drafts.sql ════════════
-- Client dashboard drafts and admin-only statistics notes.
-- Run once in the Supabase SQL Editor for existing installations.
-- Safe to run repeatedly; published dashboard_data is not changed.

alter table public.clients
  add column if not exists portal_draft_data jsonb,
  add column if not exists portal_draft_saved_at timestamptz,
  add column if not exists portal_published_at timestamptz,
  add column if not exists dashboard_data_source text,
  add column if not exists dashboard_admin_notes text;

update public.clients
set portal_published_at = portal_updated_at
where portal_enabled = true
  and portal_published_at is null
  and portal_updated_at is not null;

notify pgrst, 'reload schema';

-- ════════════ supabase/client_content_storage.sql ════════════
-- Client dashboard images — one-time setup.
-- Creates the public "client-content" storage bucket used by the admin's
-- content-calendar image upload. Run once in Supabase: SQL Editor > New query > Run.
-- Safe to run more than once.
insert into storage.buckets (id, name, public)
values ('client-content', 'client-content', true)
on conflict (id) do nothing;

-- Anyone can view the images (they are shown on the client's private dashboard).
drop policy if exists "Client content is publicly readable" on storage.objects;
create policy "Client content is publicly readable"
on storage.objects for select
to public
using (bucket_id = 'client-content');

-- Only the admin account can upload, replace or delete them.
drop policy if exists "Admin can manage client content" on storage.objects;
create policy "Admin can manage client content"
on storage.objects for all
to authenticated
using (bucket_id = 'client-content' and lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (bucket_id = 'client-content' and lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- ════════════ supabase/client_calendar_feedback.sql ════════════
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

-- ════════════ supabase/content_calendar.sql ════════════
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

-- ════════════ supabase/content_calendar_pro.sql ════════════
-- Content calendar — notifications, faster approvals, richer previews,
-- admin productivity, version history and results.
-- Run once in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once. Run AFTER supabase/content_calendar.sql.
-- Emails use the same Resend key as the rest of the site:
--   select vault.create_secret('re_…', 'resend_api_key');   (already done if contact emails work)

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── New fields ──────────────────────────────────────────────────────
alter table public.content_items
  add column if not exists media jsonb not null default '[]'::jsonb,        -- [{url, type:'image'|'video'}] — carousel
  add column if not exists approval_deadline date,                          -- "à valider avant le …"
  add column if not exists internal_notes text,                             -- admin only, never sent to the client
  add column if not exists metrics jsonb not null default '{}'::jsonb,      -- {reach, likes, comments, shares, saves, clicks}
  add column if not exists sent_for_approval_at timestamptz,
  add column if not exists client_notified_at timestamptz,                  -- included in a client approval email
  add column if not exists reminder_sent_at timestamptz,                    -- 48 h reminder sent
  add column if not exists client_seen_at timestamptz;                      -- client opened the post

alter table public.clients
  add column if not exists calendar_digest text not null default 'off',
  add column if not exists brand_tone text,
  add column if not exists last_digest_at timestamptz;
do $$ begin
  alter table public.clients add constraint clients_calendar_digest_check check (calendar_digest in ('off', 'daily', 'weekly'));
exception when duplicate_object then null; end $$;

alter table public.content_comments
  add column if not exists pin_x numeric,
  add column if not exists pin_y numeric,
  add column if not exists media_index integer,
  add column if not exists agency_notified_at timestamptz;

-- ── Version history ─────────────────────────────────────────────────
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  topic text,
  caption text,
  visual_url text,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists content_versions_content_idx on public.content_versions (content_id, created_at desc);
alter table public.content_versions enable row level security;
grant select, insert, update, delete on table public.content_versions to authenticated;
drop policy if exists "Admin manages content_versions" on public.content_versions;
create policy "Admin manages content_versions" on public.content_versions for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- Keeps the previous text/visual once the client has seen the post, and stamps
-- the moment a post is sent for approval (resets reminders/notifications).
create or replace function public.content_items_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.sent_for_approval_at is not null
     and (old.caption is distinct from new.caption or old.visual_url is distinct from new.visual_url or old.media is distinct from new.media) then
    insert into public.content_versions (content_id, topic, caption, visual_url, media)
    values (old.id, old.topic, old.caption, old.visual_url, coalesce(old.media, '[]'::jsonb));
  end if;
  if new.status = 'ready_for_approval' and old.status is distinct from 'ready_for_approval' then
    new.sent_for_approval_at := now();
    new.client_notified_at := null;
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;
drop trigger if exists content_items_before_update_trigger on public.content_items;
create trigger content_items_before_update_trigger before update on public.content_items
  for each row execute function public.content_items_before_update();

create or replace function public.content_items_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready_for_approval' and new.sent_for_approval_at is null then new.sent_for_approval_at := now(); end if;
  return new;
end $$;
drop trigger if exists content_items_before_insert_trigger on public.content_items;
create trigger content_items_before_insert_trigger before insert on public.content_items
  for each row execute function public.content_items_before_insert();

update public.content_items set sent_for_approval_at = coalesce(updated_at, created_at)
 where status = 'ready_for_approval' and sent_for_approval_at is null;

-- ── Templates & hashtag groups (admin) ──────────────────────────────
create table if not exists public.content_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('caption', 'hashtags')),
  name text not null,
  body text not null,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.content_templates enable row level security;
grant select, insert, update, delete on table public.content_templates to authenticated;
drop policy if exists "Admin manages content_templates" on public.content_templates;
create policy "Admin manages content_templates" on public.content_templates for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- ── Email helpers ───────────────────────────────────────────────────
create or replace function public.cc_esc(value text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(value, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function public.cc_mail_html(heading text, intro text, rows_html text, cta_label text, cta_url text)
returns text language sql immutable as $$
  select '<div style="background:#f7f9fc;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
    || '<div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e9eaf3;border-radius:20px;overflow:hidden">'
    || '<div style="background:#041021;padding:22px 28px"><img src="https://www.sbmarketing.fr/images/sb-marketing-email-logo.png" alt="SB Marketing" width="160" style="display:block;border:0"></div>'
    || '<div style="padding:28px">'
    || '<h1 style="margin:0 0 12px;font-size:21px;color:#041021">' || public.cc_esc(heading) || '</h1>'
    || '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4a4d6a">' || replace(public.cc_esc(intro), E'\n', '<br>') || '</p>'
    || coalesce(rows_html, '')
    || case when coalesce(cta_url, '') <> '' then '<p style="text-align:center;margin:26px 0 4px"><a href="' || public.cc_esc(cta_url)
         || '" style="background:#041021;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">'
         || public.cc_esc(cta_label) || '</a></p>' else '' end
    || '</div><div style="padding:16px 28px;background:#f7f9fc;color:#6f7182;font-size:12px;border-top:1px solid #e9eaf3">SB Marketing · <a href="https://www.sbmarketing.fr" style="color:#041021">www.sbmarketing.fr</a></div>'
    || '</div></div>';
$$;

create or replace function public.cc_post_row(p_date date, p_time time, p_platform text, p_topic text, p_note text)
returns text language sql immutable as $$
  select '<div style="padding:12px 14px;margin:0 0 8px;border:1px solid #e9eaf3;border-radius:12px">'
    || '<div style="font-size:12px;color:#6f7182">' || coalesce(to_char(p_date, 'DD/MM/YYYY'), '—') || coalesce(' · ' || to_char(p_time, 'HH24:MI'), '') || coalesce(' · ' || public.cc_esc(p_platform), '') || '</div>'
    || '<div style="font-size:15px;font-weight:700;color:#041021;margin-top:3px">' || public.cc_esc(p_topic) || '</div>'
    || case when coalesce(p_note, '') <> '' then '<div style="font-size:13px;color:#b45309;margin-top:3px">' || public.cc_esc(p_note) || '</div>' else '' end
    || '</div>';
$$;

create or replace function public.cc_send_mail(p_to text, p_subject text, p_html text)
returns void language plpgsql security definer set search_path = '' as $$
declare api_key text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null or coalesce(p_to, '') = '' then return; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object('from', 'SB Marketing <admin@partners.sbmarketing.fr>', 'to', jsonb_build_array(p_to),
                               'subject', p_subject, 'html', p_html, 'reply_to', 'contact@sbmarketing.fr'));
exception when others then
  raise warning 'cc_send_mail failed: %', sqlerrm;
end $$;

create or replace function public.cc_portal_url(token uuid) returns text language sql immutable as $$
  select 'https://www.sbmarketing.fr/client-dashboard/?token=' || token::text || '#calendar';
$$;

-- ── 1. Client: posts sent for approval today (one email per client per day) ──
create or replace function public.cc_send_approval_digests()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; rows_html text; n integer; fr boolean; sent integer := 0;
begin
  for c in
    select cl.id, cl.email, cl.business_name, coalesce(nullif(cl.contact_name, ''), cl.business_name) as name, cl.language, cl.portal_token
    from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and exists (select 1 from public.content_items i where i.client_id = cl.id and i.client_visible
                  and i.status = 'ready_for_approval' and i.client_decision is null and i.client_notified_at is null)
  loop
    fr := c.language <> 'en';
    select count(*), string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.approval_deadline is not null then (case when fr then 'À valider avant le ' else 'Please approve by ' end) || to_char(i.approval_deadline, 'DD/MM') end), '' order by i.publish_date, i.publish_time)
      into n, rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status = 'ready_for_approval' and i.client_decision is null and i.client_notified_at is null;

    perform public.cc_send_mail(c.email,
      case when fr then n || ' publication' || case when n > 1 then 's' else '' end || ' à valider' else n || ' post' || case when n > 1 then 's' else '' end || ' to approve' end,
      public.cc_mail_html(
        case when fr then 'Bonjour ' || c.name || ',' else 'Hello ' || c.name || ',' end,
        case when fr then 'SB Marketing vient de préparer de nouvelles publications pour ' || c.business_name || '. Ouvrez votre calendrier pour les approuver, demander une modification ou les refuser.'
             else 'SB Marketing has prepared new posts for ' || c.business_name || '. Open your calendar to approve them, ask for a change or reject them.' end,
        rows_html, case when fr then 'Ouvrir le calendrier' else 'Open the calendar' end, public.cc_portal_url(c.portal_token)));

    update public.content_items set client_notified_at = now()
     where client_id = c.id and client_visible and status = 'ready_for_approval' and client_decision is null and client_notified_at is null;
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 2. Client: reminder after 48 h without an answer ─────────────────
create or replace function public.cc_send_approval_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; rows_html text; n integer; fr boolean; sent integer := 0;
begin
  for c in
    select cl.id, cl.email, cl.business_name, coalesce(nullif(cl.contact_name, ''), cl.business_name) as name, cl.language, cl.portal_token
    from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and exists (select 1 from public.content_items i where i.client_id = cl.id and i.client_visible and i.status = 'ready_for_approval'
                  and i.client_decision is null and i.reminder_sent_at is null and i.sent_for_approval_at < now() - interval '48 hours')
  loop
    fr := c.language <> 'en';
    select count(*), string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.approval_deadline is not null then (case when fr then 'À valider avant le ' else 'Please approve by ' end) || to_char(i.approval_deadline, 'DD/MM') end), '' order by i.publish_date, i.publish_time)
      into n, rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status = 'ready_for_approval' and i.client_decision is null
      and i.reminder_sent_at is null and i.sent_for_approval_at < now() - interval '48 hours';

    perform public.cc_send_mail(c.email,
      case when fr then 'Rappel : ' || n || ' publication' || case when n > 1 then 's attendent' else ' attend' end || ' votre validation'
           else 'Reminder: ' || n || ' post' || case when n > 1 then 's are' else ' is' end || ' waiting for your approval' end,
      public.cc_mail_html(
        case when fr then 'Petit rappel, ' || c.name else 'A quick reminder, ' || c.name end,
        case when fr then 'Ces publications attendent votre accord depuis plus de 48 heures. Un clic suffit pour les approuver, ou dites-nous ce qu’il faut changer.'
             else 'These posts have been waiting for your approval for more than 48 hours. One click is enough to approve them, or tell us what to change.' end,
        rows_html, case when fr then 'Valider mes publications' else 'Review my posts' end, public.cc_portal_url(c.portal_token)));

    update public.content_items set reminder_sent_at = now()
     where client_id = c.id and client_visible and status = 'ready_for_approval' and client_decision is null
       and reminder_sent_at is null and sent_for_approval_at < now() - interval '48 hours';
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 3. Client: optional daily / weekly summary ───────────────────────
create or replace function public.cc_send_summaries()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; fr boolean; to_approve integer; upcoming integer; published integer; rows_html text; sent integer := 0;
        weekly boolean := extract(isodow from now() at time zone 'Europe/Paris') = 1;
begin
  for c in
    select cl.* from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and (cl.calendar_digest = 'daily' or (cl.calendar_digest = 'weekly' and weekly))
  loop
    fr := c.language <> 'en';
    select count(*) filter (where status = 'ready_for_approval' and client_decision is null),
           count(*) filter (where status in ('approved', 'scheduled', 'ready_for_approval') and publish_date between current_date and current_date + case when c.calendar_digest = 'daily' then 1 else 7 end),
           count(*) filter (where status = 'published' and publish_date between current_date - case when c.calendar_digest = 'daily' then 1 else 7 end and current_date)
      into to_approve, upcoming, published
    from public.content_items where client_id = c.id and client_visible and status <> 'idea';
    if to_approve = 0 and upcoming = 0 and published = 0 then continue; end if;

    select string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.status = 'ready_for_approval' and i.client_decision is null then (case when fr then 'À valider' else 'To approve' end) end), '' order by i.publish_date, i.publish_time)
      into rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status in ('approved', 'scheduled', 'ready_for_approval')
      and i.publish_date between current_date and current_date + case when c.calendar_digest = 'daily' then 1 else 7 end;

    perform public.cc_send_mail(c.email,
      case when fr then case when c.calendar_digest = 'daily' then 'Votre résumé du jour' else 'Votre résumé de la semaine' end
           else case when c.calendar_digest = 'daily' then 'Your daily summary' else 'Your weekly summary' end end
        || ' — ' || c.business_name,
      public.cc_mail_html(
        case when fr then 'Bonjour ' || coalesce(nullif(c.contact_name, ''), c.business_name) || ',' else 'Hello ' || coalesce(nullif(c.contact_name, ''), c.business_name) || ',' end,
        case when fr then to_approve || ' publication(s) à valider · ' || upcoming || ' prévue(s) ' || case when c.calendar_digest = 'daily' then 'd’ici demain' else 'cette semaine' end || ' · ' || published || ' publiée(s) récemment.'
             else to_approve || ' post(s) to approve · ' || upcoming || ' planned ' || case when c.calendar_digest = 'daily' then 'by tomorrow' else 'this week' end || ' · ' || published || ' recently published.' end,
        rows_html, case when fr then 'Ouvrir le calendrier' else 'Open the calendar' end, public.cc_portal_url(c.portal_token)));
    update public.clients set last_digest_at = now() where id = c.id;
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 4. Agency: client answers and messages (grouped every 10 minutes) ──
create or replace function public.cc_notify_agency()
returns integer language plpgsql security definer set search_path = public as $$
declare rows_html text; n integer;
begin
  select count(*), string_agg(
           '<div style="padding:12px 14px;margin:0 0 8px;border:1px solid #e9eaf3;border-radius:12px">'
           || '<div style="font-size:12px;color:#6f7182">' || public.cc_esc(cl.business_name) || ' · ' || public.cc_esc(i.topic) || '</div>'
           || '<div style="font-size:14px;font-weight:700;color:' || case m.kind when 'approved' then '#13a570' when 'rejected' then '#dc2b2b' when 'changes_requested' then '#d5691b' else '#041021' end || ';margin-top:3px">'
           || case m.kind when 'approved' then '✓ Approved' when 'rejected' then '✕ Rejected' when 'changes_requested' then '✎ Change requested' else '💬 New message' end
           || ' — ' || public.cc_esc(coalesce(m.author_name, cl.business_name)) || '</div>'
           || case when coalesce(m.body, '') <> '' then '<div style="font-size:14px;color:#303350;margin-top:4px">“' || public.cc_esc(left(m.body, 400)) || '”</div>' else '' end
           || '</div>', '' order by m.created_at)
    into n, rows_html
  from public.content_comments m
  join public.content_items i on i.id = m.content_id
  join public.clients cl on cl.id = m.client_id
  where m.author = 'client' and m.agency_notified_at is null;

  if coalesce(n, 0) = 0 then return 0; end if;
  perform public.cc_send_mail('sofyanebarakat@gmail.com',
    'Content calendar: ' || n || ' new client update' || case when n > 1 then 's' else '' end,
    public.cc_mail_html('New activity from your clients', 'Here is what your clients did on their content calendar.', rows_html,
                        'Open the admin', 'https://www.sbmarketing.fr/admin/#calendar'));
  update public.content_comments set agency_notified_at = now() where author = 'client' and agency_notified_at is null;
  return n;
end $$;

revoke all on function public.cc_send_approval_digests() from public, anon, authenticated;
revoke all on function public.cc_send_approval_reminders() from public, anon, authenticated;
revoke all on function public.cc_send_summaries() from public, anon, authenticated;
revoke all on function public.cc_notify_agency() from public, anon, authenticated;
revoke all on function public.cc_send_mail(text, text, text) from public, anon, authenticated;

-- Schedules (UTC). 17:00 UTC ≈ 18:00 Paris (winter): one approval email per day.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'cc-agency-notify') then perform cron.unschedule('cc-agency-notify'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-approval-digest') then perform cron.unschedule('cc-approval-digest'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-approval-reminders') then perform cron.unschedule('cc-approval-reminders'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-summaries') then perform cron.unschedule('cc-summaries'); end if;
  perform cron.schedule('cc-agency-notify', '*/10 * * * *', 'select public.cc_notify_agency()');
  perform cron.schedule('cc-approval-digest', '0 17 * * *', 'select public.cc_send_approval_digests()');
  perform cron.schedule('cc-approval-reminders', '0 8 * * *', 'select public.cc_send_approval_reminders()');
  perform cron.schedule('cc-summaries', '0 6 * * *', 'select public.cc_send_summaries()');
end $$;

-- ── Client-side functions (private link token) ──────────────────────
-- Approve every waiting post in a list (week / month shown on screen).
create or replace function public.approve_content_items(access_token uuid, item_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare item uuid; n integer := 0;
begin
  foreach item in array coalesce(item_ids, array[]::uuid[]) loop
    begin
      perform public.respond_to_content_item(access_token, item, 'approved', null);
      n := n + 1;
    exception when others then null;
    end;
  end loop;
  return n;
end $$;
revoke all on function public.approve_content_items(uuid, uuid[]) from public;
grant execute on function public.approve_content_items(uuid, uuid[]) to anon, authenticated;

-- Summary email preference chosen by the client.
create or replace function public.set_calendar_digest(access_token uuid, mode text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if mode not in ('off', 'daily', 'weekly') then raise exception 'invalid mode'; end if;
  update public.clients set calendar_digest = mode where portal_token = access_token and portal_enabled and status = 'active';
  if not found then raise exception 'not found'; end if;
  return mode;
end $$;
revoke all on function public.set_calendar_digest(uuid, text) from public;
grant execute on function public.set_calendar_digest(uuid, text) to anon, authenticated;

-- Thread now returns pins and records that the client opened the post.
create or replace function public.get_content_thread(access_token uuid, item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_client uuid;
begin
  select c.id into target_client
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  update public.content_comments set seen_by_client = true where content_id = item_id and author = 'agency' and seen_by_client = false;
  update public.content_items set client_seen_at = now() where id = item_id and client_seen_at is null;

  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'author', m.author, 'author_name', m.author_name, 'kind', m.kind, 'body', m.body,
                                                       'pin_x', m.pin_x, 'pin_y', m.pin_y, 'media_index', m.media_index, 'created_at', m.created_at) order by m.created_at)
                   from public.content_comments m where m.content_id = item_id), '[]'::jsonb);
end $$;
revoke all on function public.get_content_thread(uuid, uuid) from public;
grant execute on function public.get_content_thread(uuid, uuid) to anon, authenticated;

-- Message with an optional pin on the picture (x / y between 0 and 1).
drop function if exists public.add_content_comment(uuid, uuid, text);
create or replace function public.add_content_comment(access_token uuid, item_id uuid, body_text text,
                                                      pin_x numeric default null, pin_y numeric default null, media_index integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_client uuid; who text; clean text := left(btrim(coalesce(body_text, '')), 2000); msg public.content_comments%rowtype;
begin
  if clean = '' then raise exception 'empty message'; end if;
  if (pin_x is not null and (pin_x < 0 or pin_x > 1)) or (pin_y is not null and (pin_y < 0 or pin_y > 1)) then raise exception 'invalid pin'; end if;
  select c.id, coalesce(nullif(c.contact_name, ''), c.business_name) into target_client, who
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  insert into public.content_comments (content_id, client_id, author, author_name, kind, body, seen_by_client, pin_x, pin_y, media_index)
  values (item_id, target_client, 'client', who, 'message', clean, true, pin_x, pin_y, case when pin_x is null then null else coalesce(media_index, 0) end)
  returning * into msg;

  insert into public.portal_audit_log (client_id, event_type, details) values (target_client, 'content_comment', jsonb_build_object('content_id', item_id));
  return jsonb_build_object('id', msg.id, 'author', msg.author, 'author_name', msg.author_name, 'kind', msg.kind, 'body', msg.body,
                            'pin_x', msg.pin_x, 'pin_y', msg.pin_y, 'media_index', msg.media_index, 'created_at', msg.created_at);
end $$;
revoke all on function public.add_content_comment(uuid, uuid, text, numeric, numeric, integer) from public;
grant execute on function public.add_content_comment(uuid, uuid, text, numeric, numeric, integer) to anon, authenticated;

-- Portal response with media, deadline, results, previous version and digest preference.
-- internal_notes is deliberately never returned.
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('business_name',c.business_name,'contact_name',c.contact_name,'language',c.language,'updated_at',c.portal_updated_at,'account_manager',c.account_manager,'dashboard',c.dashboard_data,
  'calendar_feedback',coalesce(c.calendar_feedback,'{}'::jsonb),'calendar_digest',c.calendar_digest,
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('title',t.title,'description',t.client_update,'status',t.status,'due_date',t.due_date) order by t.due_date) from public.client_tasks t where t.client_id=c.id and t.client_visible and t.status<>'completed'),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'time',to_char(i.publish_time,'HH24:MI'),'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,
      'visual_url',i.visual_url,'media_type',i.media_type,'media',i.media,'status',i.status,'publication_url',i.publication_url,'approval_deadline',i.approval_deadline,
      'metrics',case when i.status='published' then i.metrics else '{}'::jsonb end,
      'client_decision',i.client_decision,'client_comment',i.client_comment,'decided_at',i.decided_at,
      'comments_count',(select count(*) from public.content_comments m where m.content_id=i.id),
      'unread',(select count(*) from public.content_comments m where m.content_id=i.id and m.author='agency' and not m.seen_by_client),
      'previous',(select jsonb_build_object('caption',v.caption,'visual_url',v.visual_url,'media',v.media,'topic',v.topic,'created_at',v.created_at) from public.content_versions v where v.content_id=i.id order by v.created_at desc limit 1)
    ) order by i.publish_date, i.publish_time) from public.content_items i where i.client_id=c.id and i.client_visible and i.status<>'idea'),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;
revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
