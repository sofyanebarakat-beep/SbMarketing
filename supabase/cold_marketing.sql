-- SB Marketing Cold Marketing workspace. Safe to re-run in Supabase SQL Editor.
create table if not exists public.cm_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_name text not null,
  full_name text,
  email text,
  service text not null,
  whatsapp_country text not null default '+33',
  whatsapp_number text,
  status text not null default 'pending' check (status in ('pending','contacted','clicked','replied','qualified','closed')),
  notes text,
  last_contacted_at timestamptz,
  last_clicked_at timestamptz,
  click_count integer not null default 0
);
alter table public.cm_contacts add column if not exists full_name text;
create index if not exists cm_contacts_status_idx on public.cm_contacts(status);
create index if not exists cm_contacts_email_idx on public.cm_contacts(lower(email));

create table if not exists public.cm_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  channel text not null default 'email' check (channel in ('email','whatsapp')),
  step_number integer not null default 1,
  delay_days integer not null default 0,
  subject text,
  message text not null,
  cta_label text,
  cta_url text,
  active boolean not null default true
);
create index if not exists cm_templates_sequence_idx on public.cm_templates(channel,step_number);

create table if not exists public.cm_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_id uuid not null references public.cm_contacts(id) on delete cascade,
  template_id uuid references public.cm_templates(id) on delete set null,
  event_type text not null check (event_type in ('email_opened','email_sent','whatsapp_opened','click','reply','note')),
  destination_url text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists cm_events_contact_idx on public.cm_events(contact_id,created_at desc);
create index if not exists cm_events_type_idx on public.cm_events(event_type,created_at desc);

alter table public.cm_contacts enable row level security;
alter table public.cm_templates enable row level security;
alter table public.cm_events enable row level security;
drop policy if exists cm_contacts_admin on public.cm_contacts;
drop policy if exists cm_templates_admin on public.cm_templates;
drop policy if exists cm_events_admin on public.cm_events;
create policy cm_contacts_admin on public.cm_contacts for all to authenticated using (true) with check (true);
create policy cm_templates_admin on public.cm_templates for all to authenticated using (true) with check (true);
create policy cm_events_admin on public.cm_events for all to authenticated using (true) with check (true);

create or replace function public.cm_track_click(target_contact uuid, target_template uuid, target_url text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if target_url is null or target_url !~ '^https?://' then raise exception 'invalid destination'; end if;
  if not exists(select 1 from public.cm_contacts where id=target_contact) then raise exception 'contact not found'; end if;
  insert into public.cm_events(contact_id,template_id,event_type,destination_url)
  values(target_contact,target_template,'click',left(target_url,2000));
  update public.cm_contacts set status='clicked',last_clicked_at=now(),click_count=click_count+1,updated_at=now()
  where id=target_contact;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.cm_track_click(uuid,uuid,text) from public;
grant execute on function public.cm_track_click(uuid,uuid,text) to anon,authenticated;

insert into public.cm_templates(name,channel,step_number,delay_days,subject,message,cta_label,cta_url)
select 'Introduction — services','email',1,0,'Une idée pour {{business}}',E'Bonjour,\n\nJe me permets de vous contacter au sujet de {{business}}. Nous aidons les entreprises avec {{service}} afin de générer plus de demandes qualifiées.\n\nSeriez-vous disponible pour un échange rapide cette semaine ?\n\nBien cordialement,\nSB Marketing','Découvrir SB Marketing','https://www.sbmarketing.fr/'
where not exists(select 1 from public.cm_templates);
insert into public.cm_templates(name,channel,step_number,delay_days,message,cta_label,cta_url)
select 'Relance WhatsApp','whatsapp',2,3,'Bonjour, je vous ai envoyé un message concernant {{service}} pour {{business}}. Est-ce un sujet que vous souhaitez développer actuellement ?','Voir notre travail','https://www.sbmarketing.fr/projets/'
where not exists(select 1 from public.cm_templates where channel='whatsapp');
