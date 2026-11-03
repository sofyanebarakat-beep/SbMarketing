-- Client dashboard images — one-time setup.
-- Creates the public "client-content" storage bucket used by the admin's
-- content-calendar image upload. Run once in Supabase: SQL Editor > New query > Run.
-- Safe to run more than once.
insert into storage.buckets (id, name, public)
values ('client-content', 'client-content', true)
on conflict (id) do nothing;

-- Anyone can view the images (they are shown on the client's private dashboard).
drop policy if exists "Client content is publicly readable" on storage.objects;
create policy "Client content is publicly readable"
on storage.objects for select
to public
using (bucket_id = 'client-content');

-- Only the admin account can upload, replace or delete them.
drop policy if exists "Admin can manage client content" on storage.objects;
create policy "Admin can manage client content"
on storage.objects for all
to authenticated
using (bucket_id = 'client-content' and lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com')
with check (bucket_id = 'client-content' and lower(auth.jwt() ->> 'email') = 'sofyanebarakat@gmail.com');
