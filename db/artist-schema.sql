create extension if not exists pgcrypto;

create table if not exists public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null default '',
  preferred_name text not null default '',
  age int not null default 18,
  email text not null default '',
  phone text,
  city text not null default '',
  state_province text,
  country text not null default '',
  instagram text,
  website text,
  portfolio_link text,
  hear_about text not null default '',
  artist_disciplines jsonb not null default '[]'::jsonb,
  preferred_work jsonb not null default '[]'::jsonb,
  experience_level text not null default '',
  body_paint_experience text,
  artist_strengths text not null default '',
  tools_materials text,
  availability jsonb not null default '[]'::jsonb,
  availability_notes text,
  travel_willing text,
  travel_distance text,
  expected_rate text not null default '',
  why_work text not null default '',
  good_fit text not null default '',
  anything_else text,
  consents jsonb not null default '[]'::jsonb,
  review_status text not null default 'pending',
  review_updated_at timestamptz,
  admin_notes text
);

create index if not exists idx_artist_applications_created_at on public.artist_applications (created_at);
create index if not exists idx_artist_applications_review_status on public.artist_applications (review_status);
create index if not exists idx_artist_applications_source on public.artist_applications (hear_about);
