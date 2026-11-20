-- Adult performer applications. Run this in the Supabase SQL editor.
-- Do not expose this table to the browser: row level security is on and
-- there are no public policies. The server uses the service role key, which
-- bypasses row level security.

create extension if not exists pgcrypto;

create table if not exists public.performer_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lang text not null default '',
  invite_token text not null default '',
  name text not null default '',
  whatsapp text not null default '',
  tier text not null default '',
  payload jsonb not null
);

create index if not exists performer_applications_created_at_idx
  on public.performer_applications (created_at desc);

alter table public.performer_applications enable row level security;
