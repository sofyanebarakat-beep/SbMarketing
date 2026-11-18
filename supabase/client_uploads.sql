-- Client portal picture uploads. Run once in Supabase SQL Editor.
-- Supports multiple images up to 100 MB each and records who uploaded what and when.
create table if not exists public.client_uploads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  object_path text not null unique,
  original_name text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 104857600),
  mime_type text not null check (mime_type like 'image/%'),
  created_at timestamptz not null default now()
);
create index if not exists client_uploads_client_created_idx on public.client_uploads(client_id,created_at desc);
alter table public.client_uploads enable row level security;

drop policy if exists "Admin can read client uploads" on public.client_uploads;
create policy "Admin can read client uploads" on public.client_uploads for select to authenticated
using (lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('client-uploads','client-uploads',true,104857600,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/tiff','image/bmp','image/svg+xml'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_upload_client_file(object_name text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.clients c where c.portal_token::text=split_part(object_name,'/',1) and c.portal_enabled and c.status='active');
$$;
revoke all on function public.can_upload_client_file(text) from public;
grant execute on function public.can_upload_client_file(text) to anon,authenticated;

drop policy if exists "Portal clients can upload pictures" on storage.objects;
create policy "Portal clients can upload pictures" on storage.objects for insert to anon,authenticated
with check (bucket_id='client-uploads' and public.can_upload_client_file(name));
drop policy if exists "Client uploads are publicly readable" on storage.objects;
create policy "Client uploads are publicly readable" on storage.objects for select to public using (bucket_id='client-uploads');
drop policy if exists "Admin can manage client uploads" on storage.objects;
create policy "Admin can manage client uploads" on storage.objects for all to authenticated
using (bucket_id='client-uploads' and lower(auth.jwt() ->> 'email')='sofyanebarakat@gmail.com')
with check (bucket_id='client-uploads' and lower(auth.jwt() ->> 'email')='sofyanebarakat@gmail.com');

create or replace function public.register_client_upload(access_token uuid,object_path text,original_name text,file_size bigint,mime_type text)
returns public.client_uploads language plpgsql security definer set search_path=public as $$
declare c public.clients; saved public.client_uploads;
begin
  select * into c from public.clients where portal_token=access_token and portal_enabled and status='active';
  if c.id is null or split_part(object_path,'/',1)<>access_token::text then raise exception 'Invalid portal access'; end if;
  if mime_type not like 'image/%' or file_size<=0 or file_size>104857600 then raise exception 'Invalid image'; end if;
  insert into public.client_uploads(client_id,object_path,original_name,file_size,mime_type) values(c.id,object_path,left(original_name,255),file_size,mime_type) returning * into saved;
  return saved;
end;$$;

create or replace function public.get_client_uploads(access_token uuid) returns table(id uuid,original_name text,file_size bigint,mime_type text,created_at timestamptz,public_url text)
language sql stable security definer set search_path=public as $$
  select u.id,u.original_name,u.file_size,u.mime_type,u.created_at,
    'https://juoyoqcmpqkcwsdtanhv.supabase.co/storage/v1/object/public/client-uploads/'||replace(u.object_path,' ','%20')
  from public.client_uploads u join public.clients c on c.id=u.client_id
  where c.portal_token=access_token and c.portal_enabled and c.status='active' order by u.created_at desc;
$$;
revoke all on function public.register_client_upload(uuid,text,text,bigint,text) from public;
revoke all on function public.get_client_uploads(uuid) from public;
grant execute on function public.register_client_upload(uuid,text,text,bigint,text) to anon,authenticated;
grant execute on function public.get_client_uploads(uuid) to anon,authenticated;

create or replace view public.client_upload_admin with (security_invoker=true) as
select u.*,c.business_name,
  'https://juoyoqcmpqkcwsdtanhv.supabase.co/storage/v1/object/public/client-uploads/'||replace(u.object_path,' ','%20') as public_url
from public.client_uploads u join public.clients c on c.id=u.client_id;
grant select on public.client_upload_admin to authenticated;
