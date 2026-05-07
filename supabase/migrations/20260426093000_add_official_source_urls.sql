-- Preserve an explicit official source URL separately from archived PDFs and
-- Carrots & Sticks provenance links used in versioned source documents.

alter table public.regulations
  add column if not exists official_source_url text;

alter table public.regulation_source_documents
  add column if not exists official_source_url text;

-- Backfill regulations that already have a direct official/public source URL
-- in source_url. Archived PDFs and Carrots & Sticks provenance links should
-- not be treated as official source destinations.
update public.regulations
set official_source_url = source_url
where official_source_url is null
  and coalesce(source_url, '') <> ''
  and source_url not like '%carrotsandsticks.org%'
  and source_url not like 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%';

-- Mirror the regulation-level official source into existing source-document
-- rows so the detail page can reference it without losing document provenance.
update public.regulation_source_documents as documents
set official_source_url = regulations.official_source_url
from public.regulations as regulations
where documents.regulation_id = regulations.id::text
  and documents.official_source_url is null
  and regulations.official_source_url is not null;

-- Seed the Norway food-waste proposition with the official government source
-- page so the main CTA can point to the public legislative document while the
-- archived PDF remains available separately in the versioned source files list.
update public.regulations
set official_source_url = 'https://www.regjeringen.no/no/dokumenter/prop.-130-l-20242025/id3096529/?ch=2'
where id = '516f718b-2ad2-586e-a922-4914c473d59a';

update public.regulation_source_documents
set official_source_url = 'https://www.regjeringen.no/no/dokumenter/prop.-130-l-20242025/id3096529/?ch=2'
where regulation_id = '516f718b-2ad2-586e-a922-4914c473d59a';
