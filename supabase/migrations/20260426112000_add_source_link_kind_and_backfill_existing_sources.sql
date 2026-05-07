-- Track what kind of source link the primary source CTA is opening so the UI
-- can distinguish official pages from archived or reference-only fallbacks.

alter table public.regulations
  add column if not exists source_link_kind text
    check (source_link_kind in ('official', 'archived_pdf', 'reference_pdf', 'reference_page'));

alter table public.regulation_source_documents
  add column if not exists source_link_kind text
    check (source_link_kind in ('official', 'archived_pdf', 'reference_pdf', 'reference_page'));

-- Existing explicit official URLs remain official.
update public.regulations
set source_link_kind = 'official'
where coalesce(official_source_url, '') <> ''
  and official_source_url not like '%carrotsandsticks.org%'
  and official_source_url not like 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%'
  and coalesce(source_link_kind, '') = '';

-- If the stored source_url is already a real official/public source, mirror it.
update public.regulations
set official_source_url = source_url,
    source_link_kind = 'official'
where coalesce(official_source_url, '') = ''
  and coalesce(source_url, '') <> ''
  and source_url not like '%carrotsandsticks.org%'
  and source_url not like 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%';

-- Archived local PDFs are still valid working sources, but they are not
-- official publisher pages.
update public.regulations
set official_source_url = source_url,
    source_link_kind = 'archived_pdf'
where coalesce(official_source_url, '') = ''
  and source_url like 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%';

-- Mirror the regulation-level source CTA metadata into existing source document
-- rows so the detail page can show consistent provenance.
update public.regulation_source_documents as documents
set official_source_url = regulations.official_source_url,
    source_link_kind = regulations.source_link_kind
from public.regulations as regulations
where documents.regulation_id = regulations.id::text
  and coalesce(documents.official_source_url, '') = ''
  and coalesce(regulations.official_source_url, '') <> '';
