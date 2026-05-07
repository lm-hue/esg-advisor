-- Curated fallback links for non-Carrots records that still have no working
-- source destination after the official and archived-source backfills.

with mapped(regulation_id, fallback_url, fallback_kind) as (
  values
    ('04667636-92aa-4731-935c-d98f8c4c34b0', 'https://www.ssb-j.jp/en/ssbj_standards.html', 'official'),
    ('1a64f7c1-b5f5-46b7-9ac2-0a3d26a5d1ed', 'https://english.motie.go.kr/', 'reference_page'),
    ('27286cd0-3c63-45fc-9e09-458741c11630', 'https://www.csrc.gov.cn/csrc_en/index.shtml', 'reference_page'),
    ('2b1e50e6-b702-421a-9394-c136f9f60f8c', 'https://www.parl.ca/LegisInfo/en/bill/44-1/s-211', 'official'),
    ('2c911030-b68a-4f62-af63-cd9584fc8e14', 'https://www.cmfchile.cl/portal/principal/613/w3-channel.html', 'reference_page'),
    ('34d6bb3f-897d-4cce-957e-ae58bd3aca18', 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000034290626', 'official'),
    ('3b5e6877-6936-4185-8052-b889e2608f96', 'https://www.aasb.gov.au/pronouncements/sustainability-reporting-standards/', 'official'),
    ('4a798171-a6b5-41c1-9b3e-c8c3336f4a12', 'https://www.sec.gov.ph/', 'reference_page'),
    ('4a9152ee-75cc-4aaa-a4e3-d6ac4af54c38', 'https://sasb.ifrs.org/standards/', 'official'),
    ('4e63b478-6e33-47a2-82b9-52a56ba03037', 'https://www.hkex.com.hk/Listing/Sustainable-Development/ESG-Guide?sc_lang=en', 'reference_page'),
    ('6943c1de-b114-4604-a42a-48a124069f05', 'https://www.bafa.de/EN/Foreign_Trade/Corporate_Due_Diligence/corporate_due_diligence_node.html', 'official'),
    ('6a1404e1-1c9e-4168-9eb9-af6e054a3d25', 'https://www.gov.uk/government/consultations/exposure-drafts-uk-sustainability-reporting-standards/exposure-draft-of-uk-sustainability-reporting-standards-uk-srs-s1-and-uk-srs-s2', 'official'),
    ('6d032348-8820-4fbd-8427-6fa249a3b33a', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s1-general-requirements.html', 'official'),
    ('710f8695-3bbf-4829-8791-84122884462b', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures.html', 'official'),
    ('71ad205a-ac43-4129-831e-3d1058f30773', 'https://bolagsverket.se/', 'reference_page'),
    ('77a294bc-63e9-4160-adda-c8b1f5293908', 'https://ojk.go.id/en/Pages/default.aspx', 'reference_page'),
    ('80386ab4-8a34-441e-b734-9a864f1a846d', 'https://www.gob.mx/cnbv', 'reference_page'),
    ('8b758b7e-2e06-464f-b2d8-bcca330b4135', 'https://www.cma.or.ke/', 'reference_page'),
    ('8f9e5dd2-896d-4df9-a4fe-dfba1033f756', 'https://www.legislation.gov.uk/ukpga/2015/30/contents/enacted', 'official'),
    ('961ff166-e61f-4ee5-bb8a-0ae219259843', 'https://www.jse.co.za/our-business/sustainability', 'reference_page'),
    ('982a6395-3723-4394-a096-3f0278f0fac2', 'https://cma.org.sa/en/RulesRegulations/Pages/default.aspx', 'reference_page'),
    ('a331c097-a9b6-4a30-9cf6-be7bc0f8d0df', 'https://www.sebi.gov.in/legal/circulars/jul-2023/business-responsibility-and-sustainability-reporting-core-framework-for-assurance-and-esg-disclosures-for-value-chain_74065.html', 'official'),
    ('a6bd66c3-0e8e-4333-9628-563ff200f23e', 'https://tnfd.global/framework/', 'official'),
    ('b684b753-943c-4a3b-ac6f-0956a33cf2af', 'https://www.sca.gov.ae/en/', 'reference_page'),
    ('c560f839-277e-4f7f-812c-d64b5ad9666e', 'https://kgk.gov.tr/', 'reference_page'),
    ('da968472-d76a-42c4-b3dc-40f7a64d72b9', 'https://www.gov.br/cvm/pt-br/assuntos/noticias/2024/cvm-edita-resolucao-que-institui-o-relato-financeiro-de-sustentabilidade-no-brasil', 'official'),
    ('da9b295f-3ddc-4cbc-aa98-dc55beb36f5b', 'https://www.fca.org.uk/publications/policy-statements/ps23-16-sustainability-disclosure-requirements-sdr-investment-labels', 'official'),
    ('e0cd11bd-d1e1-4181-8244-186458552f07', 'https://www.xrb.govt.nz/standards/adoption-of-climate-standards/', 'official'),
    ('e74041f5-a939-4e20-9497-559f3b88a8f5', 'https://www.superfinanciera.gov.co/', 'reference_page'),
    ('f2bbd4b3-b665-4779-88f5-46ca58dc3234', 'https://www.argentina.gob.ar/cnv', 'reference_page'),
    ('f362c6df-1e76-4275-9d2e-c64243056b1a', 'https://www.sec.or.th/EN/Pages/Home.aspx', 'reference_page'),
    ('f5884250-979a-45e9-8a57-83cb1700d7e5', 'https://www.bursamalaysia.com/sustainability/sustainability_reporting', 'reference_page'),
    ('f61bd062-9289-46e2-83ad-2164e7d437d4', 'https://sec.gov.ng/', 'reference_page')
)
update public.regulations as regulations
set official_source_url = mapped.fallback_url,
    source_link_kind = mapped.fallback_kind
from mapped
where regulations.id::text = mapped.regulation_id
  and coalesce(regulations.official_source_url, '') = '';

with mapped(regulation_id, fallback_url, fallback_kind) as (
  values
    ('04667636-92aa-4731-935c-d98f8c4c34b0', 'https://www.ssb-j.jp/en/ssbj_standards.html', 'official'),
    ('1a64f7c1-b5f5-46b7-9ac2-0a3d26a5d1ed', 'https://english.motie.go.kr/', 'reference_page'),
    ('27286cd0-3c63-45fc-9e09-458741c11630', 'https://www.csrc.gov.cn/csrc_en/index.shtml', 'reference_page'),
    ('2b1e50e6-b702-421a-9394-c136f9f60f8c', 'https://www.parl.ca/LegisInfo/en/bill/44-1/s-211', 'official'),
    ('2c911030-b68a-4f62-af63-cd9584fc8e14', 'https://www.cmfchile.cl/portal/principal/613/w3-channel.html', 'reference_page'),
    ('34d6bb3f-897d-4cce-957e-ae58bd3aca18', 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000034290626', 'official'),
    ('3b5e6877-6936-4185-8052-b889e2608f96', 'https://www.aasb.gov.au/pronouncements/sustainability-reporting-standards/', 'official'),
    ('4a798171-a6b5-41c1-9b3e-c8c3336f4a12', 'https://www.sec.gov.ph/', 'reference_page'),
    ('4a9152ee-75cc-4aaa-a4e3-d6ac4af54c38', 'https://sasb.ifrs.org/standards/', 'official'),
    ('4e63b478-6e33-47a2-82b9-52a56ba03037', 'https://www.hkex.com.hk/Listing/Sustainable-Development/ESG-Guide?sc_lang=en', 'reference_page'),
    ('6943c1de-b114-4604-a42a-48a124069f05', 'https://www.bafa.de/EN/Foreign_Trade/Corporate_Due_Diligence/corporate_due_diligence_node.html', 'official'),
    ('6a1404e1-1c9e-4168-9eb9-af6e054a3d25', 'https://www.gov.uk/government/consultations/exposure-drafts-uk-sustainability-reporting-standards/exposure-draft-of-uk-sustainability-reporting-standards-uk-srs-s1-and-uk-srs-s2', 'official'),
    ('6d032348-8820-4fbd-8427-6fa249a3b33a', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s1-general-requirements.html', 'official'),
    ('710f8695-3bbf-4829-8791-84122884462b', 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures.html', 'official'),
    ('71ad205a-ac43-4129-831e-3d1058f30773', 'https://bolagsverket.se/', 'reference_page'),
    ('77a294bc-63e9-4160-adda-c8b1f5293908', 'https://ojk.go.id/en/Pages/default.aspx', 'reference_page'),
    ('80386ab4-8a34-441e-b734-9a864f1a846d', 'https://www.gob.mx/cnbv', 'reference_page'),
    ('8b758b7e-2e06-464f-b2d8-bcca330b4135', 'https://www.cma.or.ke/', 'reference_page'),
    ('8f9e5dd2-896d-4df9-a4fe-dfba1033f756', 'https://www.legislation.gov.uk/ukpga/2015/30/contents/enacted', 'official'),
    ('961ff166-e61f-4ee5-bb8a-0ae219259843', 'https://www.jse.co.za/our-business/sustainability', 'reference_page'),
    ('982a6395-3723-4394-a096-3f0278f0fac2', 'https://cma.org.sa/en/RulesRegulations/Pages/default.aspx', 'reference_page'),
    ('a331c097-a9b6-4a30-9cf6-be7bc0f8d0df', 'https://www.sebi.gov.in/legal/circulars/jul-2023/business-responsibility-and-sustainability-reporting-core-framework-for-assurance-and-esg-disclosures-for-value-chain_74065.html', 'official'),
    ('a6bd66c3-0e8e-4333-9628-563ff200f23e', 'https://tnfd.global/framework/', 'official'),
    ('b684b753-943c-4a3b-ac6f-0956a33cf2af', 'https://www.sca.gov.ae/en/', 'reference_page'),
    ('c560f839-277e-4f7f-812c-d64b5ad9666e', 'https://kgk.gov.tr/', 'reference_page'),
    ('da968472-d76a-42c4-b3dc-40f7a64d72b9', 'https://www.gov.br/cvm/pt-br/assuntos/noticias/2024/cvm-edita-resolucao-que-institui-o-relato-financeiro-de-sustentabilidade-no-brasil', 'official'),
    ('da9b295f-3ddc-4cbc-aa98-dc55beb36f5b', 'https://www.fca.org.uk/publications/policy-statements/ps23-16-sustainability-disclosure-requirements-sdr-investment-labels', 'official'),
    ('e0cd11bd-d1e1-4181-8244-186458552f07', 'https://www.xrb.govt.nz/standards/adoption-of-climate-standards/', 'official'),
    ('e74041f5-a939-4e20-9497-559f3b88a8f5', 'https://www.superfinanciera.gov.co/', 'reference_page'),
    ('f2bbd4b3-b665-4779-88f5-46ca58dc3234', 'https://www.argentina.gob.ar/cnv', 'reference_page'),
    ('f362c6df-1e76-4275-9d2e-c64243056b1a', 'https://www.sec.or.th/EN/Pages/Home.aspx', 'reference_page'),
    ('f5884250-979a-45e9-8a57-83cb1700d7e5', 'https://www.bursamalaysia.com/sustainability/sustainability_reporting', 'reference_page'),
    ('f61bd062-9289-46e2-83ad-2164e7d437d4', 'https://sec.gov.ng/', 'reference_page')
)
update public.regulation_source_documents as documents
set official_source_url = mapped.fallback_url,
    source_link_kind = mapped.fallback_kind
from mapped
where documents.regulation_id::text = mapped.regulation_id
  and coalesce(documents.official_source_url, '') = '';
