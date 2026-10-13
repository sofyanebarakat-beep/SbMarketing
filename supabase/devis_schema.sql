-- Run this file once in Supabase: SQL Editor > New query > Run.
-- Safe to re-run (everything is "if not exists" / "on conflict do nothing").
-- Backs the admin /admin/#devis tab: quotes (devis) built from a service
-- catalog, exported as PDF and emailed to the client by the send-devis
-- Edge Function. Needs supabase/clients_schema.sql to have run first
-- (devis.client_id references clients).

-- ── Devis ─────────────────────────────────────────────────────────
-- The recipient's details are copied onto the devis (not just linked via
-- client_id) so a sent quote keeps showing exactly what the client
-- received, even if the client record changes or is deleted later.
create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  number text not null unique,
  status text not null default 'draft' check (status in ('draft','sent','accepted','refused')),
  client_id uuid references public.clients(id) on delete set null,
  -- recipient snapshot
  client_name text,
  client_company text,
  client_email text,
  client_phone text,
  client_address text,
  client_siret text,
  client_vat text,
  language text not null default 'fr' check (language in ('fr','en')),
  -- content
  title text,
  intro text,
  issue_date date not null default current_date,
  valid_until date,
  -- [{ name, description, quantity, unit, unit_price }]
  items jsonb not null default '[]'::jsonb,
  discount_percent numeric(5,2) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  vat_exempt boolean not null default false,
  deposit_percent numeric(5,2) not null default 0,
  payment_terms text,
  notes text,
  -- totals, stored so the list and stats don't recompute from items
  subtotal_ht numeric(12,2) not null default 0,
  total_ht numeric(12,2) not null default 0,
  total_vat numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  -- sending
  email_message text,
  sent_at timestamptz,
  send_count integer not null default 0,
  responded_at timestamptz
);

alter table public.devis enable row level security;
grant select, insert, update, delete on table public.devis to authenticated;

drop policy if exists "Admin can manage devis" on public.devis;
create policy "Admin can manage devis"
on public.devis for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists devis_created_at_idx on public.devis (created_at desc);
create index if not exists devis_status_idx on public.devis (status);
create index if not exists devis_client_id_idx on public.devis (client_id);

-- ── Service catalog ───────────────────────────────────────────────
-- What the "Add a service" picker in the devis editor offers. Prices are
-- starting points (HT) — every line stays editable on the devis itself,
-- and the catalog is managed from the admin ("Services" button).
create table if not exists public.devis_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order integer not null default 0,
  category text not null default 'Autre',
  name text not null,
  description text,
  unit text not null default 'forfait',
  unit_price numeric(12,2) not null default 0,
  active boolean not null default true
);

alter table public.devis_services enable row level security;
grant select, insert, update, delete on table public.devis_services to authenticated;

drop policy if exists "Admin can manage devis services" on public.devis_services;
create policy "Admin can manage devis services"
on public.devis_services for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create index if not exists devis_services_sort_idx on public.devis_services (sort_order, name);

-- Seed only into an empty catalog, so re-running never duplicates or
-- overwrites prices edited from the admin.
insert into public.devis_services (sort_order, category, name, description, unit, unit_price)
select * from (values
  (10,  'Offres',                 'Pack Présence Digitale', 'Création ou refonte de site internet, 1 shooting photo/vidéo à Nice, 1 mois de gestion réseaux sociaux et SEO setup inclus.', 'forfait', 499),
  (20,  'Site web',               'Site vitrine', 'Design moderne et responsive, jusqu''à 5 pages, optimisation mobile, formulaire de contact, mise en ligne.', 'forfait', 1200),
  (21,  'Site web',               'Refonte de site internet', 'Nouveau design, restructuration des contenus, optimisation de la vitesse et du parcours de conversion.', 'forfait', 900),
  (22,  'Site web',               'Landing page', 'Page de conversion dédiée à une offre ou une campagne publicitaire, avec suivi des conversions.', 'forfait', 450),
  (23,  'Site web',               'Site e-commerce', 'Boutique en ligne : catalogue produits, paiement sécurisé, gestion des commandes.', 'forfait', 2500),
  (24,  'Site web',               'Page supplémentaire', 'Conception et intégration d''une page supplémentaire.', 'page', 120),
  (25,  'Site web',               'Maintenance & hébergement', 'Hébergement, mises à jour, sauvegardes, petites modifications et support.', 'mois', 49),
  (30,  'Réseaux sociaux',        'Gestion des réseaux sociaux', 'Calendrier éditorial, création et publication des contenus, modération, rapport mensuel.', 'mois', 450),
  (31,  'Réseaux sociaux',        'Création d''un post', 'Visuel et texte optimisés pour Instagram / Facebook / LinkedIn.', 'unité', 40),
  (32,  'Réseaux sociaux',        'Optimisation des profils', 'Bio, visuels de profil et de couverture, liens, mise en cohérence de l''image de marque.', 'forfait', 150),
  (40,  'Création de contenu',    'Shooting photo / vidéo', 'Shooting sur place à Nice et alentours, photos retouchées et rushs vidéo.', 'forfait', 350),
  (41,  'Création de contenu',    'Vidéo courte (Reel / TikTok)', 'Tournage, montage, sous-titres et musique pour un format vertical.', 'unité', 120),
  (42,  'Création de contenu',    'Rédaction de contenu', 'Textes pour site web, articles de blog ou fiches produits, optimisés SEO.', 'page', 90),
  (50,  'Publicité',              'Gestion campagnes Meta Ads', 'Stratégie, création des publicités, ciblage, optimisation et reporting (budget publicitaire non inclus).', 'mois', 350),
  (51,  'Publicité',              'Gestion campagnes Google Ads', 'Recherche de mots-clés, annonces, suivi des conversions, optimisation et reporting (budget publicitaire non inclus).', 'mois', 350),
  (52,  'Publicité',              'Gestion campagnes TikTok Ads', 'Création des campagnes et des publicités, optimisation et reporting (budget publicitaire non inclus).', 'mois', 350),
  (53,  'Publicité',              'Mise en place des campagnes', 'Création des comptes, pixel / balises de conversion, audiences et structure de campagnes.', 'forfait', 250),
  (60,  'SEO & référencement',    'SEO local', 'Optimisation Google Business Profile, citations locales, pages locales et suivi du positionnement.', 'mois', 300),
  (61,  'SEO & référencement',    'Audit SEO', 'Audit technique, contenu et concurrence avec plan d''actions priorisé.', 'forfait', 350),
  (62,  'SEO & référencement',    'Optimisation Google Business Profile', 'Fiche complète, catégories, photos, posts et stratégie d''avis clients.', 'forfait', 190),
  (70,  'Branding',               'Création de logo', 'Plusieurs propositions, révisions et fichiers sources dans tous les formats.', 'forfait', 450),
  (71,  'Branding',               'Identité visuelle complète', 'Logo, palette de couleurs, typographies, charte graphique et déclinaisons.', 'forfait', 1200),
  (80,  'Email marketing',        'Campagne emailing', 'Conception du template, rédaction, envoi et analyse des résultats.', 'unité', 200),
  (81,  'Email marketing',        'Newsletter mensuelle', 'Rédaction, mise en page et envoi d''une newsletter par mois.', 'mois', 250),
  (90,  'Génération de leads',    'Génération de leads', 'Tunnel d''acquisition, campagnes et qualification des prospects.', 'mois', 600),
  (91,  'Génération de leads',    'Centre d''appel & qualification', 'Appels de qualification des prospects et prise de rendez-vous.', 'heure', 35),
  (100, 'Développement',          'Développement d''application', 'Application web ou mobile sur mesure — périmètre défini lors de l''atelier de cadrage.', 'jour', 450),
  (110, 'Conseil',                'Audit marketing digital', 'Analyse du site, des réseaux sociaux et de la visibilité Google, avec recommandations.', 'forfait', 0),
  (111, 'Conseil',                'Accompagnement / formation', 'Session de conseil ou de formation (visio ou sur place à Nice).', 'heure', 80)
) as seed(sort_order, category, name, description, unit, unit_price)
where not exists (select 1 from public.devis_services);

-- ── Devis settings ────────────────────────────────────────────────
-- Single row: the legal / bank details printed on every devis PDF and
-- the defaults a new devis starts from. Edited from the admin
-- ("Devis settings" button), so nothing here needs a code change.
create table if not exists public.devis_settings (
  id text primary key default 'default',
  legal_name text not null default 'SB Marketing',
  legal_form text,
  address text default 'Nice, France',
  siret text,
  vat_number text,
  email text default 'admin@partners.sbmarketing.fr',
  phone text,
  website text default 'www.sbmarketing.fr',
  iban text,
  bic text,
  number_prefix text not null default 'DEV',
  default_vat_rate numeric(5,2) not null default 20,
  vat_exempt boolean not null default false,
  vat_exempt_mention text not null default 'TVA non applicable, art. 293 B du CGI',
  validity_days integer not null default 30,
  default_deposit_percent numeric(5,2) not null default 30,
  default_payment_terms text default 'Acompte à la signature, solde à la livraison. Paiement par virement bancaire.',
  default_notes text default 'Pour accepter ce devis, merci de le retourner daté et signé avec la mention « Bon pour accord », ou de répondre simplement à l''email qui l''accompagne.',
  default_email_message text,
  updated_at timestamptz not null default now()
);

alter table public.devis_settings enable row level security;
grant select, insert, update on table public.devis_settings to authenticated;

drop policy if exists "Admin can manage devis settings" on public.devis_settings;
create policy "Admin can manage devis settings"
on public.devis_settings for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

insert into public.devis_settings (id) values ('default') on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- v2 — online acceptance (/devis/ page), "viewed" tracking, automatic
-- reminders, invoices, templates, versions and PDF design settings.
-- Everything below is idempotent too; it can run on top of v1.
-- Emails sent from the database use the same Vault secret as
-- contact_schema.sql: select vault.create_secret('re_…', 'resend_api_key');
-- ════════════════════════════════════════════════════════════════════
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

alter table public.devis
  -- private link for the client's /devis/?id=…&t=… page
  add column if not exists public_token text not null
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  add column if not exists first_viewed_at timestamptz,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists view_count integer not null default 0,
  -- electronic signature (kept as proof: name, image, time, IP, browser)
  add column if not exists signed_name text,
  add column if not exists signature_data text,
  add column if not exists signed_at timestamptz,
  add column if not exists signed_ip text,
  add column if not exists signed_user_agent text,
  add column if not exists refused_reason text,
  -- reminders (reminder_days null = use devis_settings.reminder_days)
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_days integer,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists expiry_reminder_sent_at timestamptz,
  -- versions: v2, v3… point at the first devis (parent_id)
  add column if not exists parent_id uuid references public.devis(id) on delete set null,
  add column if not exists version integer not null default 1,
  -- PDF / email options
  add column if not exists cover_page boolean not null default false,
  add column if not exists attach_cgv boolean not null default false,
  add column if not exists attach_portfolio boolean not null default false;

alter table public.devis drop constraint if exists devis_status_check;
alter table public.devis add constraint devis_status_check
  check (status in ('draft','sent','accepted','refused','superseded'));
create index if not exists devis_parent_id_idx on public.devis (parent_id);

alter table public.devis_settings
  add column if not exists accent_color text not null default '#f2c94c',
  add column if not exists cgv_url text,
  add column if not exists portfolio_pdf_url text,
  add column if not exists portfolio_images jsonb not null default '[]'::jsonb,
  add column if not exists default_cover_page boolean not null default false,
  add column if not exists default_attach_cgv boolean not null default false,
  add column if not exists reminder_days integer not null default 5,
  add column if not exists expiry_reminder_days integer not null default 3,
  add column if not exists notify_email text default 'sofyanebarakat@gmail.com',
  add column if not exists invoice_prefix text not null default 'FAC',
  add column if not exists invoice_payment_days integer not null default 30,
  add column if not exists invoice_legal_text text default
    'En cas de retard de paiement, des pénalités sont exigibles au taux de 3 fois le taux d''intérêt légal, ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). Pas d''escompte pour paiement anticipé.';

-- ── Devis templates ("Pack boucherie", "Pack restaurant"…) ────────
create table if not exists public.devis_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  payload jsonb not null default '{}'::jsonb
);
alter table public.devis_templates enable row level security;
grant select, insert, update, delete on table public.devis_templates to authenticated;
drop policy if exists "Admin can manage devis templates" on public.devis_templates;
create policy "Admin can manage devis templates"
on public.devis_templates for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- ── Invoices (factures) ───────────────────────────────────────────
-- Created from an accepted devis: a deposit invoice, then the balance
-- (which deducts the deposit), or one full invoice. Numbering must stay
-- sequential with no gaps, so invoices can be cancelled but never
-- deleted (no delete grant).
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  number text not null unique,
  devis_id uuid references public.devis(id) on delete set null,
  kind text not null default 'full' check (kind in ('deposit','balance','full')),
  status text not null default 'unpaid' check (status in ('unpaid','paid','cancelled')),
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  client_company text,
  client_email text,
  client_phone text,
  client_address text,
  client_siret text,
  client_vat text,
  language text not null default 'fr' check (language in ('fr','en')),
  title text,
  issue_date date not null default current_date,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  discount_percent numeric(5,2) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  vat_exempt boolean not null default false,
  subtotal_ht numeric(12,2) not null default 0,
  total_ht numeric(12,2) not null default 0,
  total_vat numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  deposit_deducted numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  payment_terms text,
  notes text,
  sent_at timestamptz,
  send_count integer not null default 0,
  paid_at timestamptz
);
alter table public.factures enable row level security;
grant select, insert, update on table public.factures to authenticated;
drop policy if exists "Admin can manage factures" on public.factures;
create policy "Admin can manage factures"
on public.factures for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');
create index if not exists factures_created_at_idx on public.factures (created_at desc);
create index if not exists factures_devis_id_idx on public.factures (devis_id);

-- ── Helpers ───────────────────────────────────────────────────────
-- Same definition as in contact_schema.sql, so either file can run first.
create or replace function public.html_escape(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(value, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

create or replace function public.devis_money(amount numeric, lang text default 'fr')
returns text
language sql
immutable
set search_path = ''
as $$
  select case when lang = 'en'
    then '€' || to_char(coalesce(amount, 0), 'FM999,999,990.00')
    else replace(replace(replace(to_char(coalesce(amount, 0), 'FM999,999,990.00'), ',', '#'), '.', ','), '#', ' ') || ' €'
  end;
$$;

-- Same rules as computeTotals() in js/devis-core.js: every line carries
-- its own total; sections and unselected options don't count.
create or replace function public.devis_compute_totals(p_items jsonb, p_discount numeric, p_vat numeric, p_exempt boolean)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  subtotal numeric := 0;
  disc numeric;
  ht numeric;
  vat numeric;
begin
  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    continue when coalesce(item->>'type', 'item') = 'section';
    continue when coalesce((item->>'optional')::boolean, false) and not coalesce((item->>'selected')::boolean, false);
    subtotal := subtotal + coalesce(nullif(item->>'total', '')::numeric, 0);
  end loop;
  subtotal := round(subtotal, 2);
  disc := round(subtotal * coalesce(p_discount, 0) / 100, 2);
  ht := subtotal - disc;
  vat := case when p_exempt then 0 else round(ht * coalesce(p_vat, 0) / 100, 2) end;
  return jsonb_build_object('subtotal_ht', subtotal, 'total_ht', ht, 'total_vat', vat, 'total_ttc', ht + vat);
end;
$$;

-- Sends one email through Resend from the database (background, via
-- pg_net). Silently does nothing until the Vault secret exists.
create or replace function public.devis_send_mail(p_to text, p_subject text, p_html text, p_reply_to text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_key text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null or coalesce(p_to, '') = '' then return; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object(
      'from', 'SB Marketing <admin@partners.sbmarketing.fr>',
      'to', jsonb_build_array(p_to),
      'subject', p_subject,
      'html', p_html
    ) || case when coalesce(p_reply_to, '') <> '' then jsonb_build_object('reply_to', p_reply_to) else '{}'::jsonb end
  );
exception when others then
  raise warning 'devis_send_mail failed: %', sqlerrm;
end;
$$;
revoke all on function public.devis_send_mail(text, text, text, text) from public, anon, authenticated;

-- Branded HTML shell for the database-sent emails (reminders, alerts).
create or replace function public.devis_mail_html(p_heading text, p_paragraphs text[], p_cta_label text default null, p_cta_url text default null)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  body text := '';
  p text;
begin
  foreach p in array coalesce(p_paragraphs, array[]::text[]) loop
    body := body || '<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 14px">'
      || replace(public.html_escape(p), E'\n', '<br>') || '</p>';
  end loop;
  return '<div style="background:#f5f6f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
    || '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden">'
    || '<div style="background:#041021;padding:22px 28px"><img src="https://www.sbmarketing.fr/images/sb-marketing-email-logo.png" alt="SB Marketing" width="160" style="display:block;border:0"></div>'
    || '<div style="padding:28px">'
    || '<h1 style="margin:0 0 18px;font-size:21px;color:#111c2b">' || public.html_escape(p_heading) || '</h1>'
    || body
    || case when coalesce(p_cta_url, '') <> '' then
         '<p style="text-align:center;margin:26px 0 6px"><a href="' || public.html_escape(p_cta_url)
         || '" style="background:#f2c94c;color:#041021;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">'
         || public.html_escape(p_cta_label) || '</a></p>'
       else '' end
    || '</div><div style="padding:16px 28px;background:#041021;color:#9aa7c2;font-size:12px">SB Marketing · <a href="https://www.sbmarketing.fr" style="color:#f2c94c;text-decoration:none">www.sbmarketing.fr</a></div>'
    || '</div></div>';
end;
$$;

-- ── Public page: read a devis (and record the visit) ────────────────
-- Called by /devis/ with the id + token from the link. Drafts are never
-- visible. Returns only what the page and its PDF need.
create or replace function public.get_public_devis(p_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.devis;
  s public.devis_settings;
  a public.app_settings;
  newer_id uuid;
  newer_token text;
  newer_number text;
  who text;
begin
  select * into d from public.devis where id = p_id and public_token = p_token and status <> 'draft';
  if not found then return null; end if;

  update public.devis
     set first_viewed_at = coalesce(first_viewed_at, now()), last_viewed_at = now(), view_count = view_count + 1
   where id = d.id;

  select * into s from public.devis_settings where id = 'default';
  select * into a from public.app_settings where id = 'default';

  if d.status = 'superseded' then
    select id, public_token, number into newer_id, newer_token, newer_number
      from public.devis
     where (id = coalesce(d.parent_id, d.id) or parent_id = coalesce(d.parent_id, d.id))
       and status not in ('draft', 'superseded')
     order by version desc
     limit 1;
  end if;

  if d.first_viewed_at is null and d.status = 'sent' then
    who := coalesce(nullif(d.client_company, ''), nullif(d.client_name, ''), d.client_email);
    perform public.devis_send_mail(
      s.notify_email,
      '👁 Devis ' || d.number || ' ouvert par ' || coalesce(who, 'le client'),
      public.devis_mail_html('Votre devis vient d''être ouvert',
        array[who || ' a ouvert le devis ' || d.number || coalesce(' (« ' || d.title || ' »)', '') || ' — '
          || public.devis_money(d.total_ttc) || '.', 'C''est le bon moment pour une petite relance !'],
        'Voir dans l''admin', 'https://www.sbmarketing.fr/admin/#devis'));
  end if;

  return jsonb_build_object(
    'devis', to_jsonb(d) - 'public_token' - 'email_message' - 'client_id' - 'reminder_sent_at'
      - 'expiry_reminder_sent_at' - 'reminders_enabled' - 'reminder_days' - 'signed_ip'
      - 'signed_user_agent' - 'send_count' - 'view_count' - 'first_viewed_at' - 'last_viewed_at',
    'settings', to_jsonb(s) - 'notify_email' - 'default_email_message',
    'brand', jsonb_build_object('company_name', a.company_name, 'website_url', a.website_url,
      'phone', a.phone, 'whatsapp_number', a.whatsapp_number, 'reply_to_email', a.reply_to_email),
    'newer', case when newer_id is not null and newer_id <> d.id
      then jsonb_build_object('id', newer_id, 't', newer_token, 'number', newer_number) end
  );
end;
$$;
grant execute on function public.get_public_devis(uuid, text) to anon, authenticated;

-- ── Public page: accept + sign ──────────────────────────────────────
-- p_selected = indexes (in items) of the optional lines the client ticked.
-- Totals are recomputed here, never trusted from the browser.
create or replace function public.accept_devis(p_id uuid, p_token text, p_name text, p_signature text, p_selected integer[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.devis;
  s public.devis_settings;
  new_items jsonb;
  totals jsonb;
  headers json;
  who text;
begin
  select * into d from public.devis where id = p_id and public_token = p_token for update;
  if not found then raise exception 'Devis introuvable.'; end if;
  if d.status <> 'sent' then raise exception 'Ce devis ne peut plus être accepté.'; end if;
  if d.valid_until is not null and d.valid_until < current_date then raise exception 'Ce devis a expiré.'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 120 then raise exception 'Merci d''indiquer votre nom.'; end if;
  if p_signature is null or p_signature not like 'data:image/png;base64,%' or char_length(p_signature) > 400000 then
    raise exception 'Signature invalide.';
  end if;

  select coalesce(jsonb_agg(
           case when coalesce((e.value->>'optional')::boolean, false)
             then e.value || jsonb_build_object('selected', (e.ord - 1)::integer = any(coalesce(p_selected, '{}')))
             else e.value end
           order by e.ord), '[]'::jsonb)
    into new_items
    from jsonb_array_elements(d.items) with ordinality as e(value, ord);
  totals := public.devis_compute_totals(new_items, d.discount_percent, d.vat_rate, d.vat_exempt);

  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;

  update public.devis set
    items = new_items,
    subtotal_ht = (totals->>'subtotal_ht')::numeric,
    total_ht = (totals->>'total_ht')::numeric,
    total_vat = (totals->>'total_vat')::numeric,
    total_ttc = (totals->>'total_ttc')::numeric,
    status = 'accepted',
    signed_name = trim(p_name),
    signature_data = p_signature,
    signed_at = now(),
    signed_ip = nullif(trim(split_part(coalesce(headers->>'x-forwarded-for', headers->>'x-real-ip', ''), ',', 1)), ''),
    signed_user_agent = left(headers->>'user-agent', 300),
    responded_at = now(),
    updated_at = now()
  where id = d.id
  returning * into d;

  select * into s from public.devis_settings where id = 'default';
  who := coalesce(nullif(d.client_company, ''), nullif(d.client_name, ''), d.client_email);
  perform public.devis_send_mail(
    s.notify_email,
    '✅ Devis ' || d.number || ' accepté — ' || coalesce(who, '') || ' (' || public.devis_money(d.total_ttc) || ')',
    public.devis_mail_html('Devis accepté et signé 🎉',
      array['Le devis ' || d.number || coalesce(' (« ' || d.title || ' »)', '') || ' a été accepté et signé en ligne par '
        || d.signed_name || coalesce(' pour ' || who, '') || '.',
        'Montant : ' || public.devis_money(d.total_ttc) || case when d.vat_exempt then '' else ' TTC' end
        || ' (' || public.devis_money(d.total_ht) || ' HT).',
        'Prochaine étape : créer la facture d''acompte depuis l''admin.'],
      'Ouvrir l''admin', 'https://www.sbmarketing.fr/admin/#devis'),
    d.client_email);

  return jsonb_build_object('ok', true, 'status', d.status, 'total_ttc', d.total_ttc, 'signed_at', d.signed_at);
end;
$$;
grant execute on function public.accept_devis(uuid, text, text, text, integer[]) to anon, authenticated;

-- ── Public page: refuse ─────────────────────────────────────────────
create or replace function public.refuse_devis(p_id uuid, p_token text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.devis;
  s public.devis_settings;
  who text;
begin
  select * into d from public.devis where id = p_id and public_token = p_token for update;
  if not found then raise exception 'Devis introuvable.'; end if;
  if d.status <> 'sent' then raise exception 'Ce devis ne peut plus être modifié.'; end if;

  update public.devis
     set status = 'refused', refused_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 2000),
         responded_at = now(), updated_at = now()
   where id = d.id
   returning * into d;

  select * into s from public.devis_settings where id = 'default';
  who := coalesce(nullif(d.client_company, ''), nullif(d.client_name, ''), d.client_email);
  perform public.devis_send_mail(
    s.notify_email,
    '❌ Devis ' || d.number || ' refusé — ' || coalesce(who, ''),
    public.devis_mail_html('Devis refusé',
      array['Le devis ' || d.number || coalesce(' (« ' || d.title || ' »)', '') || ' a été refusé par ' || coalesce(who, 'le client') || '.',
        'Raison : ' || coalesce(d.refused_reason, 'non précisée') || '.',
        'Une nouvelle version ajustée peut être créée depuis l''admin.'],
      'Ouvrir l''admin', 'https://www.sbmarketing.fr/admin/#devis'),
    d.client_email);

  return jsonb_build_object('ok', true, 'status', d.status);
end;
$$;
grant execute on function public.refuse_devis(uuid, text, text) to anon, authenticated;

-- ── Automatic reminders (daily, pg_cron) ────────────────────────────
-- For each sent devis with reminders on: one follow-up after
-- reminder_days without an answer, and one shortly before it expires.
create or replace function public.send_devis_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.devis_settings;
  d public.devis;
  sent integer := 0;
  en boolean;
  url text;
  greet text;
  sign text;
  what text;
  valid text;
begin
  select * into s from public.devis_settings where id = 'default';
  if not found then return 0; end if;

  for d in
    select * from public.devis
     where status = 'sent' and reminders_enabled and coalesce(client_email, '') <> ''
       and sent_at is not null and (valid_until is null or valid_until >= current_date)
  loop
    en := d.language = 'en';
    url := 'https://www.sbmarketing.fr/devis/?id=' || d.id || '&t=' || d.public_token;
    greet := case when en then 'Hi ' else 'Bonjour ' end || coalesce(nullif(d.client_name, ''), nullif(d.client_company, ''), '') || ',';
    sign := case when en then 'Have a great day,' || E'\n' || 'The ' || coalesce(s.legal_name, 'SB Marketing') || ' team'
                         else 'Belle journée,' || E'\n' || 'L''équipe ' || coalesce(s.legal_name, 'SB Marketing') end;
    what := d.number || coalesce(case when en then ' for “' || d.title || '”' else ' pour « ' || d.title || ' »' end, '');
    valid := to_char(d.valid_until, 'DD/MM/YYYY');

    if d.expiry_reminder_sent_at is null and d.valid_until is not null
       and d.valid_until - current_date <= s.expiry_reminder_days and d.sent_at < now() - interval '1 day' then
      perform public.devis_send_mail(
        d.client_email,
        case when en then 'Your quote ' || d.number || ' expires on ' || valid
             else 'Votre devis ' || d.number || ' expire le ' || valid end,
        public.devis_mail_html(greet,
          case when en then array['A quick reminder: quote ' || what || ' expires on ' || valid || '.',
                                  'To approve it, click the button below and sign online — it takes a minute. Need more time or a change? Just reply to this email.', sign]
               else array['Petit rappel : le devis ' || what || ' arrive à échéance le ' || valid || '.',
                          'Pour le valider, cliquez sur le bouton ci-dessous et signez en ligne, cela prend une minute. Besoin de plus de temps ou d''un ajustement ? Répondez simplement à cet email.', sign] end,
          case when en then 'View the quote' else 'Voir le devis' end, url),
        s.email);
      update public.devis set expiry_reminder_sent_at = now(), reminder_sent_at = coalesce(reminder_sent_at, now()) where id = d.id;
      sent := sent + 1;
    elsif d.reminder_sent_at is null
       and d.sent_at < now() - make_interval(days => coalesce(d.reminder_days, s.reminder_days, 5)) then
      perform public.devis_send_mail(
        d.client_email,
        case when en then 'Your quote ' || d.number || ' — any questions?'
             else 'Votre devis ' || d.number || ' — avez-vous des questions ?' end,
        public.devis_mail_html(greet,
          case when en then array['I''m following up on quote ' || what || ' we sent you on ' || to_char(d.sent_at, 'DD/MM/YYYY') || '.',
                                  'Have you had a chance to look at it? You can review and accept it online in one click, or simply reply to this email if you''d like to discuss or adjust anything.', sign]
               else array['Je reviens vers vous au sujet du devis ' || what || ' envoyé le ' || to_char(d.sent_at, 'DD/MM/YYYY') || '.',
                          'Avez-vous eu le temps de le consulter ? Vous pouvez le relire et l''accepter en ligne en un clic, ou simplement répondre à cet email si vous souhaitez en discuter ou l''ajuster.', sign] end,
          case when en then 'View the quote' else 'Voir le devis' end, url),
        s.email);
      update public.devis set reminder_sent_at = now() where id = d.id;
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;
revoke all on function public.send_devis_reminders() from public, anon, authenticated;

-- Every day at 07:00 UTC (09:00 in Nice in summer, 08:00 in winter).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'devis-reminders') then
    perform cron.unschedule('devis-reminders');
  end if;
  perform cron.schedule('devis-reminders', '0 7 * * *', 'select public.send_devis_reminders()');
end
$$;

-- ── v3: simple devis + configurable first number ───────────────────
-- simple = PDF/page with only the logo, client, lines and one Total (no
-- HT/TVA lines, conditions or payment terms). Simple devis are saved
-- with vat_exempt = true / vat_rate = 0, so every total stays consistent.
-- number_start: the first number of each year's sequence (e.g. 50 →
-- DEV-2026-050), used when it's higher than the last number issued.
alter table public.devis
  add column if not exists simple boolean not null default false;
alter table public.devis_settings
  add column if not exists default_simple boolean not null default true,
  add column if not exists number_start integer not null default 1;
