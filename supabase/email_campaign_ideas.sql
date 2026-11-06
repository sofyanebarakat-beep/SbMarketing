-- Client-submitted ideas for future email campaigns.
-- Run once in the SB Marketing Supabase SQL Editor. Safe to run again.

create table if not exists public.email_campaign_ideas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  idea_type text not null default 'other' check (idea_type in ('offer','service','news','other')),
  idea text not null check (char_length(btrim(idea)) between 2 and 1500),
  status text not null default 'new' check (status in ('new','planned','used')),
  created_at timestamptz not null default now()
);

create index if not exists email_campaign_ideas_client_created_idx
  on public.email_campaign_ideas (client_id, created_at desc);

alter table public.email_campaign_ideas enable row level security;
grant select, update, delete on public.email_campaign_ideas to authenticated;

drop policy if exists "Admin manages email campaign ideas" on public.email_campaign_ideas;
create policy "Admin manages email campaign ideas" on public.email_campaign_ideas
  for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

create or replace function public.submit_email_campaign_idea(access_token uuid, idea_type text, idea_text text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target_client uuid; clean_type text; clean_idea text; saved public.email_campaign_ideas%rowtype;
begin
  clean_type := case when idea_type in ('offer','service','news','other') then idea_type else 'other' end;
  clean_idea := left(btrim(coalesce(idea_text,'')),1500);
  if length(clean_idea) < 2 then raise exception 'idea required'; end if;
  select id into target_client from public.clients
    where portal_token=access_token and portal_enabled=true and status='active';
  if target_client is null then raise exception 'not found'; end if;
  insert into public.email_campaign_ideas(client_id,idea_type,idea)
    values(target_client,clean_type,clean_idea) returning * into saved;
  insert into public.portal_audit_log(client_id,event_type,details)
    values(target_client,'email_campaign_idea',jsonb_build_object('idea_id',saved.id,'idea_type',saved.idea_type));
  return jsonb_build_object('id',saved.id,'idea_type',saved.idea_type,'idea',saved.idea,'status',saved.status,'created_at',saved.created_at);
end $$;

create or replace function public.get_email_campaign_ideas(access_token uuid)
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'idea_type',i.idea_type,'idea',i.idea,'status',i.status,'created_at',i.created_at) order by i.created_at desc),'[]'::jsonb)
  from public.email_campaign_ideas i join public.clients c on c.id=i.client_id
  where c.portal_token=access_token and c.portal_enabled=true and c.status='active';
$$;

revoke all on function public.submit_email_campaign_idea(uuid,text,text) from public;
revoke all on function public.get_email_campaign_ideas(uuid) from public;
grant execute on function public.submit_email_campaign_idea(uuid,text,text) to anon, authenticated;
grant execute on function public.get_email_campaign_ideas(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
