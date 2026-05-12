-- Curated SASB materiality-finder policy pages (batch 08).
-- These are issuer-hosted HTML pages for industry-specific SASB standards.

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=TC-SC',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '0b847ecd-7136-5d60-a919-4fba29c12732';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=TC-SC',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '0b847ecd-7136-5d60-a919-4fba29c12732';

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=TC-SI',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '1e7b1051-4b07-56f9-a044-026a2dafdcfa';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=TC-SI',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '1e7b1051-4b07-56f9-a044-026a2dafdcfa';

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RR-PP',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '14516a99-19fb-59ab-9f95-9c916e568eb9';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RR-PP',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '14516a99-19fb-59ab-9f95-9c916e568eb9';

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=IF-WM',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '2d474baa-1848-59e3-8b5d-598c7b8f9955';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=IF-WM',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '2d474baa-1848-59e3-8b5d-598c7b8f9955';

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=IF-EN',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '4286c0d7-f065-58ad-8447-640b0b26a5d8';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=IF-EN',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '4286c0d7-f065-58ad-8447-640b0b26a5d8';

update public.regulations
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=SV-ME',
  official_source_url = 'https://sasb.ifrs.org'
where id::text = '4e64adaa-1f18-52d9-baa5-d291f0303a76';

update public.regulation_source_documents
set
  policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=SV-ME',
  official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '4e64adaa-1f18-52d9-baa5-d291f0303a76';
