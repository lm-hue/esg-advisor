create extension if not exists pgcrypto;

create table if not exists public.regulation_source_documents (
  id uuid primary key default gen_random_uuid(),
  regulation_id text not null,
  title text not null,
  source_name text not null,
  source_url text not null,
  document_url text,
  fetch_status text not null default 'pending' check (fetch_status in ('pending', 'indexed', 'failed')),
  error_message text,
  extracted_text text,
  last_indexed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists regulation_source_documents_unique_source
  on public.regulation_source_documents (regulation_id, source_url, coalesce(document_url, ''));

create index if not exists regulation_source_documents_regulation_id_idx
  on public.regulation_source_documents (regulation_id);

create table if not exists public.regulation_source_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.regulation_source_documents(id) on delete cascade,
  regulation_id text not null,
  chunk_index integer not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists regulation_source_chunks_document_chunk_idx
  on public.regulation_source_chunks (document_id, chunk_index);

create index if not exists regulation_source_chunks_regulation_id_idx
  on public.regulation_source_chunks (regulation_id);

alter table public.regulation_source_documents enable row level security;
alter table public.regulation_source_chunks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regulation_source_documents' and policyname = 'Public can read indexed regulation source documents'
  ) then
    create policy "Public can read indexed regulation source documents"
      on public.regulation_source_documents
      for select
      using (fetch_status = 'indexed');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'regulation_source_chunks' and policyname = 'Public can read regulation source chunks'
  ) then
    create policy "Public can read regulation source chunks"
      on public.regulation_source_chunks
      for select
      using (true);
  end if;
end
$$;
