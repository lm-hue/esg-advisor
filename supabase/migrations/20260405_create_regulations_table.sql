-- Create the base regulations table for fresh Supabase projects.
-- Later migrations expand this table further, but a clean project needs
-- the core table before alter/import migrations can run.

create table if not exists public.regulations (
  id text primary key,
  title text not null,
  formal_title text,
  summary text,
  description text,
  full_description text,
  region text not null,
  category text not null,
  status text not null,
  effective_date date,
  source_name text,
  source_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_regulations_region
  on public.regulations (region);

create index if not exists idx_regulations_category
  on public.regulations (category);

create index if not exists idx_regulations_status
  on public.regulations (status);

create index if not exists idx_regulations_effective_date
  on public.regulations (effective_date desc);
