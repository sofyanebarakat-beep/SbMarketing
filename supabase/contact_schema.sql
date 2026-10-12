-- Run this file in Supabase: SQL Editor > New query > Run. It is safe to
-- run again: every statement is idempotent, and it upgrades an existing
-- contact_submissions table in place.
--
-- Backs the native contact form on /contact/ and /en/contact/ (it replaced
-- the old iframe to sbmarketing2.lovable.app) and the admin "Contact" tab.
-- Rows arrive either through the submit-contact Edge Function or, if that
-- is unreachable, straight from the page (the anon insert policy below).
-- Either way the trigger at the bottom emails the admin, so no lead is
-- missed whichever path saved it.
--
-- ONE-TIME SETUP for the alert email (the email is skipped until this
-- exists; the form works without it). Run once, with your Resend API key:
--   select vault.create_secret('re_your_key_here', 'resend_api_key');

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

-- GDPR: the visitor ticks "J'accepte la politique de confidentialité";
-- the row's created_at is when they consented.
alter table public.contact_submissions
  add column if not exists privacy_consent boolean not null default false;

-- Where the lead came from (last campaign touch before the form, kept by
-- /js/utm-capture.js across pages): utm_* tags, or derived from a Google /
-- Facebook ad click id, a WhatsApp referral link, or the referring site.
alter table public.contact_submissions
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists landing_page text,
  add column if not exists referrer text;

alter table public.contact_submissions enable row level security;
grant insert on table public.contact_submissions to anon, authenticated;
grant select, update on table public.contact_submissions to authenticated;

drop policy if exists "Public can submit contact form" on public.contact_submissions;
create policy "Public can submit contact form"
on public.contact_submissions for insert
to anon, authenticated
with check (
  status = 'new'
  and privacy_consent = true
  and char_length(full_name) between 2 and 150
  and char_length(email) between 3 and 254
  and char_length(service) between 1 and 120
  and char_length(message) between 1 and 5000
  and char_length(coalesce(company,'')) <= 200
  and char_length(coalesce(phone,'')) <= 80
  and char_length(coalesce(source_page,'')) <= 300
  and char_length(coalesce(utm_source,'') || coalesce(utm_medium,'') || coalesce(utm_campaign,'')
      || coalesce(utm_content,'') || coalesce(utm_term,'')) <= 1000
  and char_length(coalesce(landing_page,'')) <= 300
  and char_length(coalesce(referrer,'')) <= 300
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
create index if not exists contact_submissions_utm_source_idx on public.contact_submissions (utm_source);

-- ── Alert email from the database ───────────────────────────────
-- After every new row, pg_net posts the notification to Resend in the
-- background (the visitor's insert never waits on it or fails because of
-- it). The API key is read from Supabase Vault, never stored in code.
create extension if not exists pg_net with schema extensions;

create or replace function public.html_escape(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(value, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function public.notify_contact_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_key text;
  rows_html text := '';
  source_text text;
  label text;
  val text;
begin
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;
  if api_key is null then
    return new; -- alert email not set up yet; the row is still saved
  end if;

  source_text := nullif(concat_ws(' / ', new.utm_source, new.utm_medium, new.utm_campaign), '');

  foreach label in array array['Nom','Entreprise','Email','Téléphone','Pays','Service','Langue','Source','Page'] loop
    val := case label
      when 'Nom' then new.full_name
      when 'Entreprise' then new.company
      when 'Email' then new.email
      when 'Téléphone' then new.phone
      when 'Pays' then new.country
      when 'Service' then new.service
      when 'Langue' then upper(new.language)
      when 'Source' then source_text
      when 'Page' then new.source_page
    end;
    if coalesce(val, '') <> '' then
      rows_html := rows_html || '<tr><td style="padding:6px 12px 6px 0;color:#667085;white-space:nowrap">'
        || label || '</td><td style="padding:6px 0"><strong>' || public.html_escape(val) || '</strong></td></tr>';
    end if;
  end loop;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object(
      'from', 'SB Marketing <admin@partners.sbmarketing.fr>',
      'to', jsonb_build_array('sofyanebarakat@gmail.com'),
      'reply_to', new.email,
      'subject', 'Nouveau contact : ' || new.full_name
        || coalesce(' (' || nullif(new.company, '') || ')', '') || ' — ' || new.service,
      'html', '<div style="font-family:Arial,sans-serif;color:#041020;max-width:600px">'
        || '<h2 style="margin:0 0 16px">Nouvelle demande de contact</h2>'
        || '<table style="border-collapse:collapse;width:100%">' || rows_html || '</table>'
        || '<p style="margin:20px 0 6px;color:#667085">Message</p>'
        || '<div style="background:#f5f5f5;border-radius:10px;padding:14px;white-space:pre-wrap">'
        || public.html_escape(new.message) || '</div>'
        || '<p style="margin-top:20px"><a href="https://www.sbmarketing.fr/admin/#contacts" style="color:#041020">Voir dans l''admin →</a></p>'
        || '</div>'
    )
  );
  return new;
exception when others then
  raise warning 'notify_contact_submission failed: %', sqlerrm;
  return new; -- never block a lead because the email failed
end;
$$;

revoke all on function public.notify_contact_submission() from public, anon, authenticated;

drop trigger if exists contact_submissions_notify on public.contact_submissions;
create trigger contact_submissions_notify
after insert on public.contact_submissions
for each row execute function public.notify_contact_submission();
