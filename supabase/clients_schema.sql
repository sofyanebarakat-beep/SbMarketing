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

-- Public, narrowly-scoped unsubscribe: callable by anyone (anon) via
-- POST /rest/v1/rpc/unsubscribe_client, but it can only ever set
-- unsubscribed_at on the one row it's given — no other column, no select,
-- no way to enumerate clients. This is what the public /unsubscribe/ page
-- calls from the link in marketing-tip and custom emails.
create or replace function public.unsubscribe_client(target_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.clients set unsubscribed_at = now() where id = target_id;
$$;

grant execute on function public.unsubscribe_client(uuid) to anon, authenticated;

-- ── Report history (legacy — superseded by client_emails below) ──────
-- Kept so nothing breaks if any old deploy still points at it; the admin
-- UI now reads and writes client_emails instead.
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

-- ── Unified email history ─────────────────────────────────────────
-- One row per email actually sent to a client, whatever type it was —
-- monthly report, marketing tip, or a one-off custom message. This is
-- what the client detail dialog's "history" timeline reads from, and
-- clients.last_report_sent_at is only touched for type = 'report' (that's
-- the one the due/sent tracking is about).
create table if not exists public.client_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('report','tip','custom')),
  subject text not null,
  -- report-specific
  month_label text,
  highlights jsonb,
  -- tip/custom-specific
  headline text,
  body text,
  cta_label text,
  cta_url text,
  -- freeform "add your own metric" rows (report emails only) — anything
  -- the built-in catalog doesn't cover, logged separately from highlights
  custom_metrics jsonb,
  sent_at timestamptz not null default now()
);

alter table public.client_emails enable row level security;
grant select, insert, update, delete on table public.client_emails to authenticated;

drop policy if exists "Admin can manage client emails" on public.client_emails;
create policy "Admin can manage client emails"
on public.client_emails for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists client_emails_client_id_idx on public.client_emails (client_id);
create index if not exists client_emails_sent_at_idx on public.client_emails (sent_at desc);

-- In case client_emails already existed from an earlier deploy (CREATE
-- TABLE IF NOT EXISTS above is then a no-op and skips new columns).
alter table public.client_emails
  add column if not exists custom_metrics jsonb;

-- ── Brand settings ─────────────────────────────────────────────────
-- Single-row config the email template reads for header/footer/social
-- links, so that can be updated from Settings in the admin without a
-- code change. Seeded with the current live values.
create table if not exists public.app_settings (
  id text primary key default 'default',
  company_name text not null default 'SB Marketing',
  logo_url text not null default 'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png',
  logo_part1 text not null default 'SB',
  logo_part2 text not null default 'MARKETING',
  footer_tagline_fr text not null default 'Agence marketing digital à Nice, Côte d''Azur',
  footer_tagline_en text not null default 'Digital marketing agency in Nice, French Riviera',
  website_url text not null default 'https://www.sbmarketing.fr',
  reply_to_email text,
  instagram_url text,
  facebook_url text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
grant select, insert, update on table public.app_settings to authenticated;

drop policy if exists "Admin can manage app settings" on public.app_settings;
create policy "Admin can manage app settings"
on public.app_settings for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- In case app_settings already existed from an earlier deploy.
alter table public.app_settings
  add column if not exists logo_url text not null default 'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png';

insert into public.app_settings (id, logo_url, instagram_url, facebook_url, reply_to_email)
values (
  'default',
  'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png',
  'https://www.instagram.com/sb.marketing06/',
  'https://www.facebook.com/profile.php?id=61556671255980',
  'admin@partners.sbmarketing.fr'
)
on conflict (id) do nothing;
