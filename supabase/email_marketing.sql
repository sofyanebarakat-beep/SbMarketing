-- SB Marketing — Email marketing (MailerLite-style) for the /admin/ dashboard.
-- Subscribers, groups, templates (block builder), campaigns, automations,
-- sign-up forms and a per-recipient send log. Run once in the Supabase SQL
-- editor (safe to re-run). Admin-only, like every other admin table; the
-- public sign-up form and the unsubscribe link go through two narrow
-- security-definer RPCs at the bottom.

-- ── Subscribers ───────────────────────────────────────────────────
create table if not exists public.em_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  name text,
  last_name text,
  company text,
  phone text,
  city text,
  language text not null default 'fr' check (language in ('fr','en')),
  status text not null default 'active' check (status in ('active','unsubscribed','bounced','junk','unconfirmed')),
  source text not null default 'manual', -- manual, import, form, client, lead, contact
  client_id uuid references public.clients(id) on delete set null,
  form_id uuid,
  fields jsonb not null default '{}'::jsonb,
  notes text,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  sent_count integer not null default 0
);
create unique index if not exists em_subscribers_email_key on public.em_subscribers (lower(email));
create index if not exists em_subscribers_status_idx on public.em_subscribers (status);

-- ── Groups ────────────────────────────────────────────────────────
create table if not exists public.em_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  color text not null default '#041021'
);

create table if not exists public.em_subscriber_groups (
  subscriber_id uuid not null references public.em_subscribers(id) on delete cascade,
  group_id uuid not null references public.em_groups(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (subscriber_id, group_id)
);
create index if not exists em_subscriber_groups_group_idx on public.em_subscriber_groups (group_id);

-- ── Templates (drag & drop block builder) ────────────────────────
create table if not exists public.em_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text not null default 'newsletter',
  subject text,
  preheader text,
  language text not null default 'fr',
  design jsonb not null default '{}'::jsonb, -- { bg, content_bg, accent, font, width }
  blocks jsonb not null default '[]'::jsonb
);

-- ── Campaigns ─────────────────────────────────────────────────────
create table if not exists public.em_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  type text not null default 'regular' check (type in ('regular','ab')),
  subject text,
  subject_b text, -- A/B test: second subject line
  preheader text,
  from_name text,
  reply_to text,
  language text not null default 'fr',
  template_id uuid references public.em_templates(id) on delete set null,
  design jsonb not null default '{}'::jsonb,
  blocks jsonb not null default '[]'::jsonb,
  audience jsonb not null default '{"mode":"all","groups":[],"exclude_groups":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','paused','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats jsonb not null default '{}'::jsonb -- { recipients, sent, failed, unsubscribed }
);
create index if not exists em_campaigns_status_idx on public.em_campaigns (status);

-- ── Automations ───────────────────────────────────────────────────
-- trigger: { type: 'joins_group' | 'subscribes' | 'form', group_id?, form_id? }
-- steps:   [ { type:'email', subject, preheader, blocks, design } | { type:'delay', amount, unit:'hours'|'days'|'weeks' } ]
create table if not exists public.em_automations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  trigger jsonb not null default '{"type":"joins_group"}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  stats jsonb not null default '{}'::jsonb
);

create table if not exists public.em_automation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  automation_id uuid not null references public.em_automations(id) on delete cascade,
  subscriber_id uuid not null references public.em_subscribers(id) on delete cascade,
  step_index integer not null default 0,
  next_run_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','completed','cancelled','failed')),
  last_error text,
  unique (automation_id, subscriber_id)
);
create index if not exists em_automation_runs_due_idx on public.em_automation_runs (status, next_run_at);

-- ── Sign-up forms ─────────────────────────────────────────────────
create table if not exists public.em_forms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  type text not null default 'embedded' check (type in ('embedded','popup','landing')),
  group_ids uuid[] not null default '{}',
  title text,
  description text,
  button_label text not null default 'Je m''inscris',
  success_title text,
  success_message text,
  fields jsonb not null default '[{"key":"email","label":"Email","required":true},{"key":"name","label":"Prénom","required":false}]'::jsonb,
  design jsonb not null default '{}'::jsonb,
  consent_text text,
  status text not null default 'active' check (status in ('active','disabled')),
  submissions integer not null default 0
);

-- ── Send log (one row per email sent to a subscriber) ────────────
create table if not exists public.em_sends (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  campaign_id uuid references public.em_campaigns(id) on delete cascade,
  automation_id uuid references public.em_automations(id) on delete cascade,
  subscriber_id uuid references public.em_subscribers(id) on delete set null,
  email text not null,
  subject text,
  variant text,
  status text not null default 'sent' check (status in ('sent','failed')),
  error text,
  provider_id text
);
create index if not exists em_sends_campaign_idx on public.em_sends (campaign_id);
create index if not exists em_sends_automation_idx on public.em_sends (automation_id);
create index if not exists em_sends_subscriber_idx on public.em_sends (subscriber_id);
create unique index if not exists em_sends_campaign_subscriber_key on public.em_sends (campaign_id, subscriber_id) where campaign_id is not null and status = 'sent';

-- ── Row level security: admin only ───────────────────────────────
do $$ declare t text; begin
  foreach t in array array['em_subscribers','em_groups','em_subscriber_groups','em_templates','em_campaigns','em_automations','em_automation_runs','em_forms','em_sends'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('drop policy if exists "Admin manages %s" on public.%I', t, t);
    execute format('create policy "Admin manages %s" on public.%I for all to authenticated using (lower(auth.jwt() ->> ''email'') = ''sofyanebarakat@gmail.com'') with check (lower(auth.jwt() ->> ''email'') = ''sofyanebarakat@gmail.com'')', t, t);
  end loop;
end $$;

-- ── Automation enrolment ──────────────────────────────────────────
-- When a subscriber joins a group, every active "joins group" automation
-- for that group gets a run row; the admin dashboard sends due steps.
create or replace function public.em_enrol_on_group_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.em_automation_runs (automation_id, subscriber_id)
  select a.id, new.subscriber_id
  from public.em_automations a
  join public.em_subscribers s on s.id = new.subscriber_id and s.status = 'active'
  where a.status = 'active'
    and a.trigger ->> 'type' = 'joins_group'
    and a.trigger ->> 'group_id' = new.group_id::text
  on conflict (automation_id, subscriber_id) do nothing;
  return new;
end;
$$;

drop trigger if exists em_enrol_on_group_join on public.em_subscriber_groups;
create trigger em_enrol_on_group_join
after insert on public.em_subscriber_groups
for each row execute function public.em_enrol_on_group_join();

-- New subscriber (any source) → "subscribes" automations; form sign-up → matching "form" automations.
create or replace function public.em_enrol_on_subscribe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' then return new; end if;
  insert into public.em_automation_runs (automation_id, subscriber_id)
  select a.id, new.id
  from public.em_automations a
  where a.status = 'active'
    and (a.trigger ->> 'type' = 'subscribes'
         or (a.trigger ->> 'type' = 'form' and new.form_id is not null and a.trigger ->> 'form_id' = new.form_id::text))
  on conflict (automation_id, subscriber_id) do nothing;
  return new;
end;
$$;

drop trigger if exists em_enrol_on_subscribe on public.em_subscribers;
create trigger em_enrol_on_subscribe
after insert on public.em_subscribers
for each row execute function public.em_enrol_on_subscribe();

-- ── Public sign-up (embedded / hosted forms) ─────────────────────
-- Anyone can call POST /rest/v1/rpc/em_subscribe. It can only add (or
-- re-activate) one subscriber and attach the form's groups — nothing is
-- returned except ok, so it cannot be used to read the list.
create or replace function public.em_subscribe(
  target_form uuid,
  target_email text,
  target_name text default null,
  target_fields jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.em_forms;
  sid uuid;
  g uuid;
  clean_email text := lower(trim(coalesce(target_email, '')));
begin
  select * into f from public.em_forms where id = target_form and status = 'active';
  if not found then raise exception 'form not found'; end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(clean_email) > 254 then raise exception 'invalid email'; end if;

  insert into public.em_subscribers (email, name, source, form_id, fields, status)
  values (clean_email, nullif(left(trim(coalesce(target_name, '')), 120), ''), 'form', f.id,
          coalesce(target_fields, '{}'::jsonb) - 'email' - 'name', 'active')
  on conflict (lower(email)) do update
    set status = case when public.em_subscribers.status in ('unsubscribed','unconfirmed') then 'active' else public.em_subscribers.status end,
        unsubscribed_at = null,
        name = coalesce(public.em_subscribers.name, excluded.name),
        fields = public.em_subscribers.fields || excluded.fields,
        updated_at = now()
  returning id into sid;

  foreach g in array f.group_ids loop
    insert into public.em_subscriber_groups (subscriber_id, group_id) values (sid, g) on conflict do nothing;
  end loop;

  update public.em_forms set submissions = submissions + 1 where id = f.id;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.em_subscribe(uuid, text, text, jsonb) to anon, authenticated;

-- Public form settings for the hosted /subscribe/ page (no list data).
create or replace function public.em_form_public(target_form uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('id', id, 'title', title, 'description', description, 'button_label', button_label,
    'success_title', success_title, 'success_message', success_message, 'fields', fields, 'design', design, 'consent_text', consent_text)
  from public.em_forms where id = target_form and status = 'active';
$$;
grant execute on function public.em_form_public(uuid) to anon, authenticated;

-- Public unsubscribe: only flips status on the one subscriber given.
create or replace function public.em_unsubscribe(target_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.em_subscribers set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
  where id = target_id and status <> 'unsubscribed';
  update public.em_automation_runs set status = 'cancelled' where subscriber_id = target_id and status = 'active';
$$;
grant execute on function public.em_unsubscribe(uuid) to anon, authenticated;

-- ── Starter groups ────────────────────────────────────────────────
insert into public.em_groups (name, description, color)
select * from (values
  ('Clients', 'Active SB Marketing clients', '#041021'),
  ('Prospects', 'Leads and contact requests', '#9240fb'),
  ('Newsletter', 'People who signed up through a form', '#05c168')
) as v(name, description, color)
where not exists (select 1 from public.em_groups);
