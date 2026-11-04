-- Content calendar — notifications, faster approvals, richer previews,
-- admin productivity, version history and results.
-- Run once in Supabase: SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once. Run AFTER supabase/content_calendar.sql.
-- Emails use the same Resend key as the rest of the site:
--   select vault.create_secret('re_…', 'resend_api_key');   (already done if contact emails work)

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── New fields ──────────────────────────────────────────────────────
alter table public.content_items
  add column if not exists media jsonb not null default '[]'::jsonb,        -- [{url, type:'image'|'video'}] — carousel
  add column if not exists approval_deadline date,                          -- "à valider avant le …"
  add column if not exists internal_notes text,                             -- admin only, never sent to the client
  add column if not exists metrics jsonb not null default '{}'::jsonb,      -- {reach, likes, comments, shares, saves, clicks}
  add column if not exists sent_for_approval_at timestamptz,
  add column if not exists client_notified_at timestamptz,                  -- included in a client approval email
  add column if not exists reminder_sent_at timestamptz,                    -- 48 h reminder sent
  add column if not exists client_seen_at timestamptz;                      -- client opened the post

alter table public.clients
  add column if not exists calendar_digest text not null default 'off',
  add column if not exists brand_tone text,
  add column if not exists last_digest_at timestamptz;
do $$ begin
  alter table public.clients add constraint clients_calendar_digest_check check (calendar_digest in ('off', 'daily', 'weekly'));
exception when duplicate_object then null; end $$;

alter table public.content_comments
  add column if not exists pin_x numeric,
  add column if not exists pin_y numeric,
  add column if not exists media_index integer,
  add column if not exists agency_notified_at timestamptz;

-- ── Version history ─────────────────────────────────────────────────
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  topic text,
  caption text,
  visual_url text,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists content_versions_content_idx on public.content_versions (content_id, created_at desc);
alter table public.content_versions enable row level security;
grant select, insert, update, delete on table public.content_versions to authenticated;
drop policy if exists "Admin manages content_versions" on public.content_versions;
create policy "Admin manages content_versions" on public.content_versions for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- Keeps the previous text/visual once the client has seen the post, and stamps
-- the moment a post is sent for approval (resets reminders/notifications).
create or replace function public.content_items_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.sent_for_approval_at is not null
     and (old.caption is distinct from new.caption or old.visual_url is distinct from new.visual_url or old.media is distinct from new.media) then
    insert into public.content_versions (content_id, topic, caption, visual_url, media)
    values (old.id, old.topic, old.caption, old.visual_url, coalesce(old.media, '[]'::jsonb));
  end if;
  if new.status = 'ready_for_approval' and old.status is distinct from 'ready_for_approval' then
    new.sent_for_approval_at := now();
    new.client_notified_at := null;
    new.reminder_sent_at := null;
  end if;
  return new;
end $$;
drop trigger if exists content_items_before_update_trigger on public.content_items;
create trigger content_items_before_update_trigger before update on public.content_items
  for each row execute function public.content_items_before_update();

create or replace function public.content_items_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ready_for_approval' and new.sent_for_approval_at is null then new.sent_for_approval_at := now(); end if;
  return new;
end $$;
drop trigger if exists content_items_before_insert_trigger on public.content_items;
create trigger content_items_before_insert_trigger before insert on public.content_items
  for each row execute function public.content_items_before_insert();

update public.content_items set sent_for_approval_at = coalesce(updated_at, created_at)
 where status = 'ready_for_approval' and sent_for_approval_at is null;

-- ── Templates & hashtag groups (admin) ──────────────────────────────
create table if not exists public.content_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('caption', 'hashtags')),
  name text not null,
  body text not null,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.content_templates enable row level security;
grant select, insert, update, delete on table public.content_templates to authenticated;
drop policy if exists "Admin manages content_templates" on public.content_templates;
create policy "Admin manages content_templates" on public.content_templates for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

-- ── Email helpers ───────────────────────────────────────────────────
create or replace function public.cc_esc(value text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(value, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function public.cc_mail_html(heading text, intro text, rows_html text, cta_label text, cta_url text)
returns text language sql immutable as $$
  select '<div style="background:#f7f9fc;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
    || '<div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e9eaf3;border-radius:20px;overflow:hidden">'
    || '<div style="background:#041021;padding:22px 28px"><img src="https://www.sbmarketing.fr/images/sb-marketing-email-logo.png" alt="SB Marketing" width="160" style="display:block;border:0"></div>'
    || '<div style="padding:28px">'
    || '<h1 style="margin:0 0 12px;font-size:21px;color:#041021">' || public.cc_esc(heading) || '</h1>'
    || '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4a4d6a">' || replace(public.cc_esc(intro), E'\n', '<br>') || '</p>'
    || coalesce(rows_html, '')
    || case when coalesce(cta_url, '') <> '' then '<p style="text-align:center;margin:26px 0 4px"><a href="' || public.cc_esc(cta_url)
         || '" style="background:#041021;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">'
         || public.cc_esc(cta_label) || '</a></p>' else '' end
    || '</div><div style="padding:16px 28px;background:#f7f9fc;color:#6f7182;font-size:12px;border-top:1px solid #e9eaf3">SB Marketing · <a href="https://www.sbmarketing.fr" style="color:#041021">www.sbmarketing.fr</a></div>'
    || '</div></div>';
$$;

create or replace function public.cc_post_row(p_date date, p_time time, p_platform text, p_topic text, p_note text)
returns text language sql immutable as $$
  select '<div style="padding:12px 14px;margin:0 0 8px;border:1px solid #e9eaf3;border-radius:12px">'
    || '<div style="font-size:12px;color:#6f7182">' || coalesce(to_char(p_date, 'DD/MM/YYYY'), '—') || coalesce(' · ' || to_char(p_time, 'HH24:MI'), '') || coalesce(' · ' || public.cc_esc(p_platform), '') || '</div>'
    || '<div style="font-size:15px;font-weight:700;color:#041021;margin-top:3px">' || public.cc_esc(p_topic) || '</div>'
    || case when coalesce(p_note, '') <> '' then '<div style="font-size:13px;color:#b45309;margin-top:3px">' || public.cc_esc(p_note) || '</div>' else '' end
    || '</div>';
$$;

create or replace function public.cc_send_mail(p_to text, p_subject text, p_html text)
returns void language plpgsql security definer set search_path = '' as $$
declare api_key text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if api_key is null or coalesce(p_to, '') = '' then return; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object('from', 'SB Marketing <admin@partners.sbmarketing.fr>', 'to', jsonb_build_array(p_to),
                               'subject', p_subject, 'html', p_html, 'reply_to', 'contact@sbmarketing.fr'));
exception when others then
  raise warning 'cc_send_mail failed: %', sqlerrm;
end $$;

create or replace function public.cc_portal_url(token uuid) returns text language sql immutable as $$
  select 'https://www.sbmarketing.fr/client-dashboard/?token=' || token::text || '#calendar';
$$;

-- ── 1. Client: posts sent for approval today (one email per client per day) ──
create or replace function public.cc_send_approval_digests()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; rows_html text; n integer; fr boolean; sent integer := 0;
begin
  for c in
    select cl.id, cl.email, cl.business_name, coalesce(nullif(cl.contact_name, ''), cl.business_name) as name, cl.language, cl.portal_token
    from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and exists (select 1 from public.content_items i where i.client_id = cl.id and i.client_visible
                  and i.status = 'ready_for_approval' and i.client_decision is null and i.client_notified_at is null)
  loop
    fr := c.language <> 'en';
    select count(*), string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.approval_deadline is not null then (case when fr then 'À valider avant le ' else 'Please approve by ' end) || to_char(i.approval_deadline, 'DD/MM') end), '' order by i.publish_date, i.publish_time)
      into n, rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status = 'ready_for_approval' and i.client_decision is null and i.client_notified_at is null;

    perform public.cc_send_mail(c.email,
      case when fr then n || ' publication' || case when n > 1 then 's' else '' end || ' à valider' else n || ' post' || case when n > 1 then 's' else '' end || ' to approve' end,
      public.cc_mail_html(
        case when fr then 'Bonjour ' || c.name || ',' else 'Hello ' || c.name || ',' end,
        case when fr then 'SB Marketing vient de préparer de nouvelles publications pour ' || c.business_name || '. Ouvrez votre calendrier pour les approuver, demander une modification ou les refuser.'
             else 'SB Marketing has prepared new posts for ' || c.business_name || '. Open your calendar to approve them, ask for a change or reject them.' end,
        rows_html, case when fr then 'Ouvrir le calendrier' else 'Open the calendar' end, public.cc_portal_url(c.portal_token)));

    update public.content_items set client_notified_at = now()
     where client_id = c.id and client_visible and status = 'ready_for_approval' and client_decision is null and client_notified_at is null;
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 2. Client: reminder after 48 h without an answer ─────────────────
create or replace function public.cc_send_approval_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; rows_html text; n integer; fr boolean; sent integer := 0;
begin
  for c in
    select cl.id, cl.email, cl.business_name, coalesce(nullif(cl.contact_name, ''), cl.business_name) as name, cl.language, cl.portal_token
    from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and exists (select 1 from public.content_items i where i.client_id = cl.id and i.client_visible and i.status = 'ready_for_approval'
                  and i.client_decision is null and i.reminder_sent_at is null and i.sent_for_approval_at < now() - interval '48 hours')
  loop
    fr := c.language <> 'en';
    select count(*), string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.approval_deadline is not null then (case when fr then 'À valider avant le ' else 'Please approve by ' end) || to_char(i.approval_deadline, 'DD/MM') end), '' order by i.publish_date, i.publish_time)
      into n, rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status = 'ready_for_approval' and i.client_decision is null
      and i.reminder_sent_at is null and i.sent_for_approval_at < now() - interval '48 hours';

    perform public.cc_send_mail(c.email,
      case when fr then 'Rappel : ' || n || ' publication' || case when n > 1 then 's attendent' else ' attend' end || ' votre validation'
           else 'Reminder: ' || n || ' post' || case when n > 1 then 's are' else ' is' end || ' waiting for your approval' end,
      public.cc_mail_html(
        case when fr then 'Petit rappel, ' || c.name else 'A quick reminder, ' || c.name end,
        case when fr then 'Ces publications attendent votre accord depuis plus de 48 heures. Un clic suffit pour les approuver, ou dites-nous ce qu’il faut changer.'
             else 'These posts have been waiting for your approval for more than 48 hours. One click is enough to approve them, or tell us what to change.' end,
        rows_html, case when fr then 'Valider mes publications' else 'Review my posts' end, public.cc_portal_url(c.portal_token)));

    update public.content_items set reminder_sent_at = now()
     where client_id = c.id and client_visible and status = 'ready_for_approval' and client_decision is null
       and reminder_sent_at is null and sent_for_approval_at < now() - interval '48 hours';
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 3. Client: optional daily / weekly summary ───────────────────────
create or replace function public.cc_send_summaries()
returns integer language plpgsql security definer set search_path = public as $$
declare c record; fr boolean; to_approve integer; upcoming integer; published integer; rows_html text; sent integer := 0;
        weekly boolean := extract(isodow from now() at time zone 'Europe/Paris') = 1;
begin
  for c in
    select cl.* from public.clients cl
    where cl.portal_enabled and cl.status = 'active'
      and (cl.calendar_digest = 'daily' or (cl.calendar_digest = 'weekly' and weekly))
  loop
    fr := c.language <> 'en';
    select count(*) filter (where status = 'ready_for_approval' and client_decision is null),
           count(*) filter (where status in ('approved', 'scheduled', 'ready_for_approval') and publish_date between current_date and current_date + case when c.calendar_digest = 'daily' then 1 else 7 end),
           count(*) filter (where status = 'published' and publish_date between current_date - case when c.calendar_digest = 'daily' then 1 else 7 end and current_date)
      into to_approve, upcoming, published
    from public.content_items where client_id = c.id and client_visible and status <> 'idea';
    if to_approve = 0 and upcoming = 0 and published = 0 then continue; end if;

    select string_agg(public.cc_post_row(i.publish_date, i.publish_time, i.platform, i.topic,
             case when i.status = 'ready_for_approval' and i.client_decision is null then (case when fr then 'À valider' else 'To approve' end) end), '' order by i.publish_date, i.publish_time)
      into rows_html
    from public.content_items i
    where i.client_id = c.id and i.client_visible and i.status in ('approved', 'scheduled', 'ready_for_approval')
      and i.publish_date between current_date and current_date + case when c.calendar_digest = 'daily' then 1 else 7 end;

    perform public.cc_send_mail(c.email,
      case when fr then case when c.calendar_digest = 'daily' then 'Votre résumé du jour' else 'Votre résumé de la semaine' end
           else case when c.calendar_digest = 'daily' then 'Your daily summary' else 'Your weekly summary' end end
        || ' — ' || c.business_name,
      public.cc_mail_html(
        case when fr then 'Bonjour ' || coalesce(nullif(c.contact_name, ''), c.business_name) || ',' else 'Hello ' || coalesce(nullif(c.contact_name, ''), c.business_name) || ',' end,
        case when fr then to_approve || ' publication(s) à valider · ' || upcoming || ' prévue(s) ' || case when c.calendar_digest = 'daily' then 'd’ici demain' else 'cette semaine' end || ' · ' || published || ' publiée(s) récemment.'
             else to_approve || ' post(s) to approve · ' || upcoming || ' planned ' || case when c.calendar_digest = 'daily' then 'by tomorrow' else 'this week' end || ' · ' || published || ' recently published.' end,
        rows_html, case when fr then 'Ouvrir le calendrier' else 'Open the calendar' end, public.cc_portal_url(c.portal_token)));
    update public.clients set last_digest_at = now() where id = c.id;
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ── 4. Agency: client answers and messages (grouped every 10 minutes) ──
create or replace function public.cc_notify_agency()
returns integer language plpgsql security definer set search_path = public as $$
declare rows_html text; n integer;
begin
  select count(*), string_agg(
           '<div style="padding:12px 14px;margin:0 0 8px;border:1px solid #e9eaf3;border-radius:12px">'
           || '<div style="font-size:12px;color:#6f7182">' || public.cc_esc(cl.business_name) || ' · ' || public.cc_esc(i.topic) || '</div>'
           || '<div style="font-size:14px;font-weight:700;color:' || case m.kind when 'approved' then '#13a570' when 'rejected' then '#dc2b2b' when 'changes_requested' then '#d5691b' else '#041021' end || ';margin-top:3px">'
           || case m.kind when 'approved' then '✓ Approved' when 'rejected' then '✕ Rejected' when 'changes_requested' then '✎ Change requested' else '💬 New message' end
           || ' — ' || public.cc_esc(coalesce(m.author_name, cl.business_name)) || '</div>'
           || case when coalesce(m.body, '') <> '' then '<div style="font-size:14px;color:#303350;margin-top:4px">“' || public.cc_esc(left(m.body, 400)) || '”</div>' else '' end
           || '</div>', '' order by m.created_at)
    into n, rows_html
  from public.content_comments m
  join public.content_items i on i.id = m.content_id
  join public.clients cl on cl.id = m.client_id
  where m.author = 'client' and m.agency_notified_at is null;

  if coalesce(n, 0) = 0 then return 0; end if;
  perform public.cc_send_mail('sofyanebarakat@gmail.com',
    'Content calendar: ' || n || ' new client update' || case when n > 1 then 's' else '' end,
    public.cc_mail_html('New activity from your clients', 'Here is what your clients did on their content calendar.', rows_html,
                        'Open the admin', 'https://www.sbmarketing.fr/admin/#calendar'));
  update public.content_comments set agency_notified_at = now() where author = 'client' and agency_notified_at is null;
  return n;
end $$;

revoke all on function public.cc_send_approval_digests() from public, anon, authenticated;
revoke all on function public.cc_send_approval_reminders() from public, anon, authenticated;
revoke all on function public.cc_send_summaries() from public, anon, authenticated;
revoke all on function public.cc_notify_agency() from public, anon, authenticated;
revoke all on function public.cc_send_mail(text, text, text) from public, anon, authenticated;

-- Schedules (UTC). 17:00 UTC ≈ 18:00 Paris (winter): one approval email per day.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'cc-agency-notify') then perform cron.unschedule('cc-agency-notify'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-approval-digest') then perform cron.unschedule('cc-approval-digest'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-approval-reminders') then perform cron.unschedule('cc-approval-reminders'); end if;
  if exists (select 1 from cron.job where jobname = 'cc-summaries') then perform cron.unschedule('cc-summaries'); end if;
  perform cron.schedule('cc-agency-notify', '*/10 * * * *', 'select public.cc_notify_agency()');
  perform cron.schedule('cc-approval-digest', '0 17 * * *', 'select public.cc_send_approval_digests()');
  perform cron.schedule('cc-approval-reminders', '0 8 * * *', 'select public.cc_send_approval_reminders()');
  perform cron.schedule('cc-summaries', '0 6 * * *', 'select public.cc_send_summaries()');
end $$;

-- ── Client-side functions (private link token) ──────────────────────
-- Approve every waiting post in a list (week / month shown on screen).
create or replace function public.approve_content_items(access_token uuid, item_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare item uuid; n integer := 0;
begin
  foreach item in array coalesce(item_ids, array[]::uuid[]) loop
    begin
      perform public.respond_to_content_item(access_token, item, 'approved', null);
      n := n + 1;
    exception when others then null;
    end;
  end loop;
  return n;
end $$;
revoke all on function public.approve_content_items(uuid, uuid[]) from public;
grant execute on function public.approve_content_items(uuid, uuid[]) to anon, authenticated;

-- Summary email preference chosen by the client.
create or replace function public.set_calendar_digest(access_token uuid, mode text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if mode not in ('off', 'daily', 'weekly') then raise exception 'invalid mode'; end if;
  update public.clients set calendar_digest = mode where portal_token = access_token and portal_enabled and status = 'active';
  if not found then raise exception 'not found'; end if;
  return mode;
end $$;
revoke all on function public.set_calendar_digest(uuid, text) from public;
grant execute on function public.set_calendar_digest(uuid, text) to anon, authenticated;

-- Thread now returns pins and records that the client opened the post.
create or replace function public.get_content_thread(access_token uuid, item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_client uuid;
begin
  select c.id into target_client
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  update public.content_comments set seen_by_client = true where content_id = item_id and author = 'agency' and seen_by_client = false;
  update public.content_items set client_seen_at = now() where id = item_id and client_seen_at is null;

  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'author', m.author, 'author_name', m.author_name, 'kind', m.kind, 'body', m.body,
                                                       'pin_x', m.pin_x, 'pin_y', m.pin_y, 'media_index', m.media_index, 'created_at', m.created_at) order by m.created_at)
                   from public.content_comments m where m.content_id = item_id), '[]'::jsonb);
end $$;
revoke all on function public.get_content_thread(uuid, uuid) from public;
grant execute on function public.get_content_thread(uuid, uuid) to anon, authenticated;

-- Message with an optional pin on the picture (x / y between 0 and 1).
drop function if exists public.add_content_comment(uuid, uuid, text);
create or replace function public.add_content_comment(access_token uuid, item_id uuid, body_text text,
                                                      pin_x numeric default null, pin_y numeric default null, media_index integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_client uuid; who text; clean text := left(btrim(coalesce(body_text, '')), 2000); msg public.content_comments%rowtype;
begin
  if clean = '' then raise exception 'empty message'; end if;
  if (pin_x is not null and (pin_x < 0 or pin_x > 1)) or (pin_y is not null and (pin_y < 0 or pin_y > 1)) then raise exception 'invalid pin'; end if;
  select c.id, coalesce(nullif(c.contact_name, ''), c.business_name) into target_client, who
  from public.clients c join public.content_items i on i.client_id = c.id
  where c.portal_token = access_token and c.portal_enabled = true and c.status = 'active'
    and i.id = item_id and i.client_visible = true and i.status <> 'idea';
  if target_client is null then raise exception 'not found'; end if;

  insert into public.content_comments (content_id, client_id, author, author_name, kind, body, seen_by_client, pin_x, pin_y, media_index)
  values (item_id, target_client, 'client', who, 'message', clean, true, pin_x, pin_y, case when pin_x is null then null else coalesce(media_index, 0) end)
  returning * into msg;

  insert into public.portal_audit_log (client_id, event_type, details) values (target_client, 'content_comment', jsonb_build_object('content_id', item_id));
  return jsonb_build_object('id', msg.id, 'author', msg.author, 'author_name', msg.author_name, 'kind', msg.kind, 'body', msg.body,
                            'pin_x', msg.pin_x, 'pin_y', msg.pin_y, 'media_index', msg.media_index, 'created_at', msg.created_at);
end $$;
revoke all on function public.add_content_comment(uuid, uuid, text, numeric, numeric, integer) from public;
grant execute on function public.add_content_comment(uuid, uuid, text, numeric, numeric, integer) to anon, authenticated;

-- Portal response with media, deadline, results, previous version and digest preference.
-- internal_notes is deliberately never returned.
create or replace function public.get_client_dashboard(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
select jsonb_build_object('business_name',c.business_name,'contact_name',c.contact_name,'language',c.language,'updated_at',c.portal_updated_at,'account_manager',c.account_manager,'dashboard',c.dashboard_data,
  'calendar_feedback',coalesce(c.calendar_feedback,'{}'::jsonb),'calendar_digest',c.calendar_digest,
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('title',t.title,'description',t.client_update,'status',t.status,'due_date',t.due_date) order by t.due_date) from public.client_tasks t where t.client_id=c.id and t.client_visible and t.status<>'completed'),'[]'::jsonb),
  'content',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'date',i.publish_date,'time',to_char(i.publish_time,'HH24:MI'),'platform',i.platform,'type',i.content_type,'topic',i.topic,'caption',i.caption,
      'visual_url',i.visual_url,'media_type',i.media_type,'media',i.media,'status',i.status,'publication_url',i.publication_url,'approval_deadline',i.approval_deadline,
      'metrics',case when i.status='published' then i.metrics else '{}'::jsonb end,
      'client_decision',i.client_decision,'client_comment',i.client_comment,'decided_at',i.decided_at,
      'comments_count',(select count(*) from public.content_comments m where m.content_id=i.id),
      'unread',(select count(*) from public.content_comments m where m.content_id=i.id and m.author='agency' and not m.seen_by_client),
      'previous',(select jsonb_build_object('caption',v.caption,'visual_url',v.visual_url,'media',v.media,'topic',v.topic,'created_at',v.created_at) from public.content_versions v where v.content_id=i.id order by v.created_at desc limit 1)
    ) order by i.publish_date, i.publish_time) from public.content_items i where i.client_id=c.id and i.client_visible and i.status<>'idea'),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'channel',p.channel,'objective',p.objective,'status',p.status,'budget',p.budget,'spend',p.spend,'leads',p.leads,'conversions',p.conversions,'note',p.performance_note)) from public.client_campaigns p where p.client_id=c.id and p.client_visible),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'category',f.category,'url',f.url)) from public.client_files f where f.client_id=c.id and f.client_visible),'[]'::jsonb)
) from public.clients c where c.portal_token=access_token and c.portal_enabled and c.status='active' limit 1;$$;
revoke all on function public.get_client_dashboard(uuid) from public;
grant execute on function public.get_client_dashboard(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
