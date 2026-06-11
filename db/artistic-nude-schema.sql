create extension if not exists pgcrypto;

create table if not exists public.artistic_nude_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  preferred_name text not null,
  pronouns text,
  age int not null,
  email text not null,
  phone text,
  city text not null,
  state_province text,
  country text not null,
  instagram text,
  tiktok text,
  hear_about text not null,
  previous_modeling_experience text,
  experience_types jsonb not null default '[]'::jsonb,
  nude_experience_level text,
  portfolio_link text,
  height text not null,
  body_type text,
  clothing_size text not null,
  bra_size text,
  bust_measurement text,
  waist_measurement text,
  hip_measurement text,
  shoe_size text not null,
  hair_color text not null,
  eye_color text not null,
  notable_features text,
  visible_marks text,
  health_notes text,
  experience text not null,
  worked_with_photographers text not null,
  comfortable_snapshots text not null,
  interests jsonb not null default '[]'::jsonb,
  nudity_comfort_levels jsonb not null default '[]'::jsonb,
  comfort_level text not null,
  avoid_concepts text not null,
  hard_limits text,
  special_conditions text,
  availability jsonb not null default '[]'::jsonb,
  availability_notes text,
  frequency text not null,
  travel_willing text not null,
  travel_distance text not null,
  travel_preference text,
  comp_interest text not null,
  compensation_types jsonb not null default '[]'::jsonb,
  unpaid_tfp_willing boolean not null default false,
  expected_comp text not null,
  why_work text not null,
  good_fit text not null,
  release_understanding text,
  intended_use jsonb not null default '[]'::jsonb,
  emergency_contact_name text,
  emergency_contact_phone text,
  organizer_questions text,
  confirm_18_truth boolean not null default false,
  anything_else text,
  consents jsonb not null default '[]'::jsonb,
  headshot_filename text,
  full_body_filename text,
  language text not null default 'en',
  review_status text not null default 'pending',
  review_updated_at timestamptz
);

alter table public.artistic_nude_applications add column if not exists full_name text not null default '';
alter table public.artistic_nude_applications add column if not exists preferred_name text not null default '';
alter table public.artistic_nude_applications add column if not exists pronouns text;
alter table public.artistic_nude_applications add column if not exists age int not null default 18;
alter table public.artistic_nude_applications add column if not exists email text not null default '';
alter table public.artistic_nude_applications add column if not exists phone text;
alter table public.artistic_nude_applications add column if not exists city text not null default '';
alter table public.artistic_nude_applications add column if not exists state_province text;
alter table public.artistic_nude_applications add column if not exists country text not null default '';
alter table public.artistic_nude_applications add column if not exists instagram text;
alter table public.artistic_nude_applications add column if not exists tiktok text;
alter table public.artistic_nude_applications add column if not exists hear_about text not null default '';
alter table public.artistic_nude_applications add column if not exists previous_modeling_experience text;
alter table public.artistic_nude_applications add column if not exists experience_types jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists nude_experience_level text;
alter table public.artistic_nude_applications add column if not exists portfolio_link text;
alter table public.artistic_nude_applications add column if not exists height text not null default '';
alter table public.artistic_nude_applications add column if not exists body_type text;
alter table public.artistic_nude_applications add column if not exists clothing_size text not null default '';
alter table public.artistic_nude_applications add column if not exists bra_size text;
alter table public.artistic_nude_applications add column if not exists bust_measurement text;
alter table public.artistic_nude_applications add column if not exists waist_measurement text not null default '';
alter table public.artistic_nude_applications add column if not exists hip_measurement text;
alter table public.artistic_nude_applications add column if not exists shoe_size text not null default '';
alter table public.artistic_nude_applications add column if not exists hair_color text not null default '';
alter table public.artistic_nude_applications add column if not exists eye_color text not null default '';
alter table public.artistic_nude_applications add column if not exists notable_features text;
alter table public.artistic_nude_applications add column if not exists visible_marks text;
alter table public.artistic_nude_applications add column if not exists health_notes text;
alter table public.artistic_nude_applications add column if not exists experience text not null default '';
alter table public.artistic_nude_applications add column if not exists worked_with_photographers text not null default '';
alter table public.artistic_nude_applications add column if not exists comfortable_snapshots text not null default '';
alter table public.artistic_nude_applications add column if not exists interests jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists nudity_comfort_levels jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists comfort_level text not null default '';
alter table public.artistic_nude_applications add column if not exists avoid_concepts text not null default '';
alter table public.artistic_nude_applications add column if not exists hard_limits text;
alter table public.artistic_nude_applications add column if not exists special_conditions text;
alter table public.artistic_nude_applications add column if not exists availability jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists availability_notes text;
alter table public.artistic_nude_applications add column if not exists frequency text not null default '';
alter table public.artistic_nude_applications add column if not exists travel_willing text not null default '';
alter table public.artistic_nude_applications add column if not exists travel_distance text not null default '';
alter table public.artistic_nude_applications add column if not exists travel_preference text;
alter table public.artistic_nude_applications add column if not exists comp_interest text not null default '';
alter table public.artistic_nude_applications add column if not exists compensation_types jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists unpaid_tfp_willing boolean not null default false;
alter table public.artistic_nude_applications add column if not exists expected_comp text not null default '';
alter table public.artistic_nude_applications add column if not exists why_work text not null default '';
alter table public.artistic_nude_applications add column if not exists good_fit text not null default '';
alter table public.artistic_nude_applications add column if not exists release_understanding text;
alter table public.artistic_nude_applications add column if not exists intended_use jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists emergency_contact_name text;
alter table public.artistic_nude_applications add column if not exists emergency_contact_phone text;
alter table public.artistic_nude_applications add column if not exists organizer_questions text;
alter table public.artistic_nude_applications add column if not exists confirm_18_truth boolean not null default false;
alter table public.artistic_nude_applications add column if not exists anything_else text;
alter table public.artistic_nude_applications add column if not exists consents jsonb not null default '[]'::jsonb;
alter table public.artistic_nude_applications add column if not exists headshot_filename text;
alter table public.artistic_nude_applications add column if not exists full_body_filename text;
alter table public.artistic_nude_applications add column if not exists language text not null default 'en';
alter table public.artistic_nude_applications add column if not exists review_status text not null default 'pending';
alter table public.artistic_nude_applications add column if not exists review_updated_at timestamptz;

alter table public.artistic_nude_applications
  drop constraint if exists artistic_nude_unpaid_tfp_required;

create index if not exists idx_artistic_nude_created_at on public.artistic_nude_applications (created_at);
create index if not exists idx_artistic_nude_review_status on public.artistic_nude_applications (review_status);
create index if not exists idx_artistic_nude_source on public.artistic_nude_applications (hear_about);
