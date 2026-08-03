create extension if not exists pgcrypto;

create table if not exists public.artist_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null default '',
  preferred_name text not null default '',
  age int not null default 0,
  email text not null default '',
  phone text,
  guardian_name text,
  guardian_contact text,
  city text not null default '',
  state_province text,
  country text not null default '',
  instagram text,
  website text,
  portfolio_link text,
  face_photo_link text not null default '',
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

alter table public.artist_applications
  add column if not exists guardian_name text,
  add column if not exists guardian_contact text,
  add column if not exists face_photo_link text not null default '';

alter table public.artist_applications
  alter column age set default 0;
