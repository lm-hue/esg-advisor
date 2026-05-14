alter table public.regulations
  add column if not exists human_verified boolean not null default false;
