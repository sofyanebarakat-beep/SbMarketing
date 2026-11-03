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
