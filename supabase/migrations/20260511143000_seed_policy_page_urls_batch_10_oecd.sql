-- Curated OECD publication pages (batch 10).
-- These are issuer-hosted HTML publication pages for specific OECD guidance and governance publications.

update public.regulations
set
  policy_page_url = 'https://www.oecd.org/en/publications/g20-oecd-principles-of-corporate-governance-2023_ed750b30-en.html',
  official_source_url = 'https://www.oecd.org'
where id::text = '18edd955-5797-5e0f-8755-c67477612017';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.oecd.org/en/publications/g20-oecd-principles-of-corporate-governance-2023_ed750b30-en.html',
  official_source_url = 'https://www.oecd.org'
where regulation_id::text = '18edd955-5797-5e0f-8755-c67477612017';

update public.regulations
set
  policy_page_url = 'https://www.oecd.org/en/publications/oecd-principles-of-corporate-governance-2004_9789264015999-en',
  official_source_url = 'https://www.oecd.org'
where id::text = '1b7ac76b-62fa-54bb-bec4-a9bcaedfe441';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.oecd.org/en/publications/oecd-principles-of-corporate-governance-2004_9789264015999-en',
  official_source_url = 'https://www.oecd.org'
where regulation_id::text = '1b7ac76b-62fa-54bb-bec4-a9bcaedfe441';

update public.regulations
set
  policy_page_url = 'https://www.oecd.org/en/publications/oecd-due-diligence-guidance-for-responsible-business-conduct_15f5f4b3-en.html',
  official_source_url = 'https://www.oecd.org'
where id::text = '25d243d6-7c81-5f19-bf23-320ec2a74431';

update public.regulation_source_documents
set
  policy_page_url = 'https://www.oecd.org/en/publications/oecd-due-diligence-guidance-for-responsible-business-conduct_15f5f4b3-en.html',
  official_source_url = 'https://www.oecd.org'
where regulation_id::text = '25d243d6-7c81-5f19-bf23-320ec2a74431';
