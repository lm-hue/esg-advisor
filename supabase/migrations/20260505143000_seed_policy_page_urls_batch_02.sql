update public.regulations
set policy_page_url = 'https://www.psoj.org/corporate-gov/'
where id::text = '0018d0c0-4c26-518d-8b65-29b6e763e7cc'
  and coalesce(policy_page_url, '') = '';

update public.regulation_source_documents
set policy_page_url = 'https://www.psoj.org/corporate-gov/'
where regulation_id::text = '0018d0c0-4c26-518d-8b65-29b6e763e7cc'
  and coalesce(policy_page_url, '') = '';

update public.regulations
set official_source_url = 'https://www.psoj.org'
where id::text = '0018d0c0-4c26-518d-8b65-29b6e763e7cc'
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );

update public.regulation_source_documents
set official_source_url = 'https://www.psoj.org'
where regulation_id::text = '0018d0c0-4c26-518d-8b65-29b6e763e7cc'
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );

update public.regulations
set policy_page_url = 'https://www.gpw.pl/best-practice2021'
where id::text = '0023d4b6-d3da-5e01-8b3e-1c9d0c27f6ad'
  and coalesce(policy_page_url, '') = '';

update public.regulation_source_documents
set policy_page_url = 'https://www.gpw.pl/best-practice2021'
where regulation_id::text = '0023d4b6-d3da-5e01-8b3e-1c9d0c27f6ad'
  and coalesce(policy_page_url, '') = '';

update public.regulations
set official_source_url = 'https://www.gpw.pl'
where id::text = '0023d4b6-d3da-5e01-8b3e-1c9d0c27f6ad'
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );

update public.regulation_source_documents
set official_source_url = 'https://www.gpw.pl'
where regulation_id::text = '0023d4b6-d3da-5e01-8b3e-1c9d0c27f6ad'
  and (
    coalesce(official_source_url, '') = ''
    or official_source_url = policy_page_url
  );
