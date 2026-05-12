update public.regulations
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=HC-BP',
    official_source_url = 'https://sasb.ifrs.org'
where id::text = '5b5fa413-5cd7-542f-9a87-e80cf9f1fe3f';

update public.regulation_source_documents
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=HC-BP',
    official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '5b5fa413-5cd7-542f-9a87-e80cf9f1fe3f';

update public.regulations
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B1%5D=RR-FM',
    official_source_url = 'https://sasb.ifrs.org'
where id::text = '3e197e1e-337c-5820-abf5-b6c007164673';

update public.regulation_source_documents
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B1%5D=RR-FM',
    official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = '3e197e1e-337c-5820-abf5-b6c007164673';

update public.regulations
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RT-IG',
    official_source_url = 'https://sasb.ifrs.org'
where id::text = 'f60a4315-7b68-5775-83cb-e2954f867461';

update public.regulation_source_documents
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RT-IG',
    official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = 'f60a4315-7b68-5775-83cb-e2954f867461';

update public.regulations
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RT-CH',
    official_source_url = 'https://sasb.ifrs.org'
where id::text = 'f6b8ee69-80c8-5a8f-adaa-aec1fa4555d6';

update public.regulation_source_documents
set policy_page_url = 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=RT-CH',
    official_source_url = 'https://sasb.ifrs.org'
where regulation_id::text = 'f6b8ee69-80c8-5a8f-adaa-aec1fa4555d6';
