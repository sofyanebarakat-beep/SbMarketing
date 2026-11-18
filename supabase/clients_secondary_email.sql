-- Second email per client (e.g. owner + associate). Every email the admin
-- sends to a client also goes to this address. Safe to re-run.
alter table public.clients
  add column if not exists email_secondary text;
