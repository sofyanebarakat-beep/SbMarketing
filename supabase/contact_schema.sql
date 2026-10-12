-- Run this file once in Supabase: SQL Editor > New query > Run.
-- Backs the native contact form on /contact/ and /en/contact/ (it replaced
-- the old iframe to sbmarketing2.lovable.app) and the admin "Contact" tab.
-- Submissions normally arrive through the submit-contact Edge Function
-- (which also emails the admin); the anon insert policy is the fallback
-- path the page uses if that function is unreachable, so no lead is lost.
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  language text not null default 'fr' check (language in ('fr','en')),
  full_name text not null,
  company text,
  email text not null,
  country text,
  phone text,
  service text not null,
  message text not null,
  source_page text,
  status text not null default 'new' check (status in ('new','contacted','qualified','customer','closed'))
);

alter table public.contact_submissions enable row level security;
grant insert on table public.contact_submissions to anon, authenticated;
grant select, update on table public.contact_submissions to authenticated;

drop policy if exists "Public can submit contact form" on public.contact_submissions;
create policy "Public can submit contact form"
on public.contact_submissions for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(full_name) between 2 and 150
  and char_length(email) between 3 and 254
  and char_length(service) between 1 and 120
  and char_length(message) between 1 and 5000
  and char_length(coalesce(company,'')) <= 200
  and char_length(coalesce(phone,'')) <= 80
);

drop policy if exists "Admin can read contact submissions" on public.contact_submissions;
create policy "Admin can read contact submissions"
on public.contact_submissions for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

drop policy if exists "Admin can update contact submissions" on public.contact_submissions;
create policy "Admin can update contact submissions"
on public.contact_submissions for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists contact_submissions_created_at_idx on public.contact_submissions (created_at desc);
create index if not exists contact_submissions_status_idx on public.contact_submissions (status);
