alter table public.regulation_source_documents
  add column if not exists document_type text not null default 'html' check (document_type in ('html', 'pdf', 'other')),
  add column if not exists version_label text not null default 'current',
  add column if not exists archived_storage_path text,
  add column if not exists archived_public_url text,
  add column if not exists archived_mime_type text,
  add column if not exists content_sha256 text;

insert into storage.buckets (id, name, public)
values ('regulation-source-archives', 'regulation-source-archives', true)
on conflict (id) do update
set public = excluded.public;
