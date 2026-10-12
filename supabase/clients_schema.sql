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

-- ── Report history ──────────────────────────────────────────────
-- One row per report actually sent, so the admin can look back at what
-- went out each month and reuse last month's highlight labels instead of
-- retyping them.
create table if not exists public.client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  month_label text not null,
  highlights jsonb not null default '[]'::jsonb,
  summary text,
  report_url text,
  sent_at timestamptz not null default now()
);

alter table public.client_reports enable row level security;
grant select, insert, update, delete on table public.client_reports to authenticated;

drop policy if exists "Admin can manage client reports" on public.client_reports;
create policy "Admin can manage client reports"
on public.client_reports for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists client_reports_client_id_idx on public.client_reports (client_id);
create index if not exists client_reports_sent_at_idx on public.client_reports (sent_at desc);
