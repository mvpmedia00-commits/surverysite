create extension if not exists pgcrypto;

create table if not exists public.model_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  preferred_name text not null,
  age int not null,
  email text not null,
  city text not null,
  country text not null,
  instagram text,
  tiktok text,
  hear_about text not null,
  height text not null,
  clothing_size text not null,
  bra_size text,
  bust_measurement text,
  waist_measurement text,
  hip_measurement text,
  shoe_size text not null,
  hair_color text not null,
  eye_color text not null,
  experience text not null,
  worked_with_photographers text not null,
  comfortable_snapshots text not null,
  interests jsonb not null default '[]'::jsonb,
  comfort_level text not null,
  avoid_concepts text not null,
  availability jsonb not null default '[]'::jsonb,
  frequency text not null,
  travel_willing text not null,
  travel_distance text not null,
  comp_interest text not null,
  expected_comp text not null,
  unpaid_tfp_willing boolean not null default false,
  why_work text not null,
  good_fit text not null,
  anything_else text,
  consents jsonb not null default '[]'::jsonb,
  headshot_filename text,
  full_body_filename text,
  language text not null default 'en',
  review_status text not null default 'pending',
  review_updated_at timestamptz
);

alter table public.model_applications
  add column if not exists review_status text not null default 'pending';

alter table public.model_applications
  add column if not exists review_updated_at timestamptz;

alter table public.model_applications
  add column if not exists unpaid_tfp_willing boolean not null default false;

alter table public.model_applications
  drop constraint if exists model_applications_unpaid_tfp_required;

create index if not exists idx_model_applications_created_at on public.model_applications (created_at);
create index if not exists idx_model_applications_source on public.model_applications (hear_about);
create index if not exists idx_model_applications_review_status on public.model_applications (review_status);
