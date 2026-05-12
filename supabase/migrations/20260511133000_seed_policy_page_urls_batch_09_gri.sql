-- Curated GRI policy pages (batch 09).
-- These are issuer-hosted HTML pages for specific GRI standards and sector standards.

update public.regulations
set
  policy_page_url = 'https://www.globalreporting.org/standards/standards-development/sector-standard-for-agriculture-aquaculture-and-fishing-gri-13/',
  official_source_url = 'https://www.globalreporting.org'
where id::text = '0d6ebb88-6a6f-5337-a09d-0dd1d0f1fd69';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.globalreporting.org/standards/standards-development/sector-standard-for-agriculture-aquaculture-and-fishing-gri-13/',
  official_source_url = 'https://www.globalreporting.org'
where regulation_id::text = '0d6ebb88-6a6f-5337-a09d-0dd1d0f1fd69';

update public.regulations
set
  policy_page_url = 'https://www.globalreporting.org/publications/documents/english/gri-409-forced-or-compulsory-labor-2016/',
  official_source_url = 'https://www.globalreporting.org'
where id::text = '15a305f8-1d6e-589b-80f7-743c4d55856a';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.globalreporting.org/publications/documents/english/gri-409-forced-or-compulsory-labor-2016/',
  official_source_url = 'https://www.globalreporting.org'
where regulation_id::text = '15a305f8-1d6e-589b-80f7-743c4d55856a';

update public.regulations
set
  policy_page_url = 'https://www.globalreporting.org/publications/documents/english/gri-206-anti-competitive-behavior-2016/',
  official_source_url = 'https://www.globalreporting.org'
where id::text = '36ed8c6b-3902-5b16-9c3f-f23f19391ba8';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.globalreporting.org/publications/documents/english/gri-206-anti-competitive-behavior-2016/',
  official_source_url = 'https://www.globalreporting.org'
where regulation_id::text = '36ed8c6b-3902-5b16-9c3f-f23f19391ba8';

update public.regulations
set
  policy_page_url = 'https://www.globalreporting.org/standards/standards-development/sector-standard-for-mining/',
  official_source_url = 'https://www.globalreporting.org'
where id::text = '4776e6e3-bdca-5911-af1f-354fdf3d6047';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.globalreporting.org/standards/standards-development/sector-standard-for-mining/',
  official_source_url = 'https://www.globalreporting.org'
where regulation_id::text = '4776e6e3-bdca-5911-af1f-354fdf3d6047';
