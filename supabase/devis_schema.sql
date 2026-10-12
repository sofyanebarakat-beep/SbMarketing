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
