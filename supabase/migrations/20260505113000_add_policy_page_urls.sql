alter table public.regulations
  add column if not exists policy_page_url text;

alter table public.regulation_source_documents
  add column if not exists policy_page_url text;

update public.regulations
set policy_page_url = null
where coalesce(policy_page_url, '') <> ''
  and (
    policy_page_url ilike '%carrotsandsticks.org%'
    or policy_page_url ilike 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%'
    or policy_page_url ~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
    or policy_page_url !~* '^https?://[^/]+/.+'
  );

update public.regulation_source_documents
set policy_page_url = null
where coalesce(policy_page_url, '') <> ''
  and (
    policy_page_url ilike '%carrotsandsticks.org%'
    or policy_page_url ilike 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/%'
    or policy_page_url ~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
    or policy_page_url !~* '^https?://[^/]+/.+'
  );

update public.regulations
set policy_page_url = source_url
where coalesce(policy_page_url, '') = ''
  and coalesce(source_url, '') <> ''
  and source_url !~* 'carrotsandsticks\.org'
  and source_url !~* '^https://twjaqynuamghrobhdasf\.supabase\.co/storage/v1/object/public/regulation-source-archives/'
  and source_url !~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
  and source_url ~* '^https?://[^/]+/.+';

update public.regulations
set policy_page_url = official_source_url
where coalesce(policy_page_url, '') = ''
  and coalesce(official_source_url, '') <> ''
  and official_source_url !~* 'carrotsandsticks\.org'
  and official_source_url !~* '^https://twjaqynuamghrobhdasf\.supabase\.co/storage/v1/object/public/regulation-source-archives/'
  and official_source_url !~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
  and official_source_url ~* '^https?://[^/]+/.+';

update public.regulation_source_documents
set policy_page_url = coalesce(
  nullif(document_url, ''),
  nullif(source_url, '')
)
where coalesce(policy_page_url, '') = ''
  and (
    (
      coalesce(document_url, '') <> ''
      and document_url !~* 'carrotsandsticks\.org'
      and document_url !~* '^https://twjaqynuamghrobhdasf\.supabase\.co/storage/v1/object/public/regulation-source-archives/'
      and document_url !~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
      and document_url ~* '^https?://[^/]+/.+'
    )
    or (
      coalesce(source_url, '') <> ''
      and source_url !~* 'carrotsandsticks\.org'
      and source_url !~* '^https://twjaqynuamghrobhdasf\.supabase\.co/storage/v1/object/public/regulation-source-archives/'
      and source_url !~* '(\.pdf($|[?#])|/api/download-pdf|[?&]format=pdf\b|[?&]download=1\b)'
      and source_url ~* '^https?://[^/]+/.+'
    )
  );

with ranked_document_pages as (
  select distinct on (regulation_id)
    regulation_id,
    policy_page_url
  from public.regulation_source_documents
  where coalesce(policy_page_url, '') <> ''
  order by regulation_id, length(policy_page_url) desc, updated_at desc
)
update public.regulations
set policy_page_url = ranked_document_pages.policy_page_url
from ranked_document_pages
where public.regulations.id::text = ranked_document_pages.regulation_id
  and coalesce(public.regulations.policy_page_url, '') = '';

update public.regulation_source_documents
set policy_page_url = public.regulations.policy_page_url
from public.regulations
where public.regulation_source_documents.regulation_id = public.regulations.id::text
  and coalesce(public.regulation_source_documents.policy_page_url, '') = ''
  and coalesce(public.regulations.policy_page_url, '') <> '';

update public.regulations
set policy_page_url = 'https://environment.ec.europa.eu/topics/circular-economy-topics/green-claims_en'
where id in (
  '01499d49-6ae3-586a-b473-7be9acb529bc',
  '425e89b1-207b-416d-b55f-c52855e66359'
);

update public.regulation_source_documents
set policy_page_url = 'https://environment.ec.europa.eu/topics/circular-economy-topics/green-claims_en'
where regulation_id in (
  '01499d49-6ae3-586a-b473-7be9acb529bc',
  '425e89b1-207b-416d-b55f-c52855e66359'
);

update public.regulations
set policy_page_url = 'https://www.meti.go.jp/english/press/2022/0913_001.html'
where id::text = '000e34f0-756f-54c9-8e07-083687b1afa1';

update public.regulation_source_documents
set policy_page_url = 'https://www.meti.go.jp/english/press/2022/0913_001.html'
where regulation_id::text = '000e34f0-756f-54c9-8e07-083687b1afa1';

update public.regulations
set policy_page_url = 'https://laws-lois.justice.gc.ca/eng/regulations/SOR-90-97/'
where id::text = '00490b37-3fac-5dd0-82cd-32817c7f8f62';

update public.regulation_source_documents
set policy_page_url = 'https://laws-lois.justice.gc.ca/eng/regulations/SOR-90-97/'
where regulation_id::text = '00490b37-3fac-5dd0-82cd-32817c7f8f62';

update public.regulations
set official_source_url = regexp_replace(policy_page_url, '^(https?://[^/]+).*$' , '\1')
where coalesce(policy_page_url, '') <> ''
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );

update public.regulation_source_documents
set official_source_url = regexp_replace(policy_page_url, '^(https?://[^/]+).*$' , '\1')
where coalesce(policy_page_url, '') <> ''
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );
