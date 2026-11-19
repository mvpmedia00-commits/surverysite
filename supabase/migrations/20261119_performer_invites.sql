-- Performer invite links. Run this in the Supabase SQL editor.
-- Do not expose these tables to the browser: row level security is on and
-- there are no public policies. The server uses the service role key, which
-- bypasses row level security.

create extension if not exists pgcrypto;

create table if not exists public.performer_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text not null default '',
  notes text not null default '',
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.performer_invite_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.performer_invites (id) on delete cascade,
  token text not null,
  opened_at timestamptz not null default now(),
  user_agent text not null default '',
  country text not null default '',
  ip_hash text not null default ''
);

create index if not exists performer_invite_events_invite_opened_idx
  on public.performer_invite_events (invite_id, opened_at desc);

alter table public.performer_invites enable row level security;
alter table public.performer_invite_events enable row level security;
