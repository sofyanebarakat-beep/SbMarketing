-- Run this file once in Supabase: SQL Editor > New query > Run.
-- Adds the "clients" table backing the admin /admin/ "Clients" tab —
-- the list of clients who get a monthly report by email.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null,
  contact_name text,
  email text not null,
  language text not null default 'fr' check (language in ('fr','en')),
  status text not null default 'active' check (status in ('active','paused')),
  notes text,
  last_report_sent_at timestamptz
);

alter table public.clients enable row level security;
grant select, insert, update, delete on table public.clients to authenticated;

-- Unlike butcher_leads, clients are entered by the admin only — there is no
-- public-facing form, so there is no anon insert policy.
drop policy if exists "Admin can manage clients" on public.clients;
create policy "Admin can manage clients"
on public.clients for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists clients_created_at_idx on public.clients (created_at desc);
create index if not exists clients_status_idx on public.clients (status);
