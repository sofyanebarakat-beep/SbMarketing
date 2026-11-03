-- Client dashboard drafts and admin-only statistics notes.
-- Run once in the Supabase SQL Editor for existing installations.
-- Safe to run repeatedly; published dashboard_data is not changed.

alter table public.clients
  add column if not exists portal_draft_data jsonb,
  add column if not exists portal_draft_saved_at timestamptz,
  add column if not exists portal_published_at timestamptz,
  add column if not exists dashboard_data_source text,
  add column if not exists dashboard_admin_notes text;

update public.clients
set portal_published_at = portal_updated_at
where portal_enabled = true
  and portal_published_at is null
  and portal_updated_at is not null;

notify pgrst, 'reload schema';
