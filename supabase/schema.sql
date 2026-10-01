-- Run this file once in Supabase: SQL Editor > New query > Run.
create table if not exists public.butcher_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  language text not null default 'fr' check (language in ('fr','en')),
  full_name text not null,
  butcher_shop text not null,
  phone text not null,
  email text not null,
  city_country text not null,
  website text,
  has_website text,
  privacy_consent boolean not null default false,
  source_page text,
  status text not null default 'new' check (status in ('new','contacted','qualified','customer','closed'))
);

alter table public.butcher_leads enable row level security;
grant insert on table public.butcher_leads to anon, authenticated;
grant select, update on table public.butcher_leads to authenticated;

drop policy if exists "Public can submit butcher leads" on public.butcher_leads;
create policy "Public can submit butcher leads"
on public.butcher_leads for insert
to anon, authenticated
with check (
  privacy_consent = true
  and char_length(full_name) between 2 and 150
  and char_length(email) between 3 and 254
  and char_length(phone) between 3 and 80
);

drop policy if exists "Admin can read butcher leads" on public.butcher_leads;
create policy "Admin can read butcher leads"
on public.butcher_leads for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

drop policy if exists "Admin can update butcher leads" on public.butcher_leads;
create policy "Admin can update butcher leads"
on public.butcher_leads for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists butcher_leads_created_at_idx on public.butcher_leads (created_at desc);
create index if not exists butcher_leads_status_idx on public.butcher_leads (status);
