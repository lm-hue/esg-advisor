import { SourceLinkKind } from '../types'

export interface SourceLinkFallbackEntry {
  url: string
  kind: SourceLinkKind
}

// Curated fallbacks for non-Carrots records that currently have no stored source
// URL or source-document row in the live dataset. These are deliberately kept
// separate from the generated Carrots fallback map so they stay reviewable.
export const MANUAL_SOURCE_LINK_FALLBACKS: Record<string, SourceLinkFallbackEntry> = {
  '04667636-92aa-4731-935c-d98f8c4c34b0': { url: 'https://www.ssb-j.jp/en/ssbj_standards.html', kind: 'official' },
  '1a64f7c1-b5f5-46b7-9ac2-0a3d26a5d1ed': { url: 'https://english.motie.go.kr/', kind: 'reference_page' },
  '27286cd0-3c63-45fc-9e09-458741c11630': { url: 'https://www.csrc.gov.cn/csrc_en/index.shtml', kind: 'reference_page' },
  '2b1e50e6-b702-421a-9394-c136f9f60f8c': { url: 'https://www.parl.ca/LegisInfo/en/bill/44-1/s-211', kind: 'official' },
  '2c911030-b68a-4f62-af63-cd9584fc8e14': { url: 'https://www.cmfchile.cl/portal/principal/613/w3-channel.html', kind: 'reference_page' },
  '34d6bb3f-897d-4cce-957e-ae58bd3aca18': { url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000034290626', kind: 'official' },
  '3b5e6877-6936-4185-8052-b889e2608f96': { url: 'https://www.aasb.gov.au/pronouncements/sustainability-reporting-standards/', kind: 'official' },
  '4a798171-a6b5-41c1-9b3e-c8c3336f4a12': { url: 'https://www.sec.gov.ph/', kind: 'reference_page' },
  '4a9152ee-75cc-4aaa-a4e3-d6ac4af54c38': { url: 'https://sasb.ifrs.org/standards/', kind: 'official' },
  '4e63b478-6e33-47a2-82b9-52a56ba03037': { url: 'https://www.hkex.com.hk/Listing/Sustainable-Development/ESG-Guide?sc_lang=en', kind: 'reference_page' },
  '6943c1de-b114-4604-a42a-48a124069f05': { url: 'https://www.bafa.de/EN/Foreign_Trade/Corporate_Due_Diligence/corporate_due_diligence_node.html', kind: 'official' },
  '6a1404e1-1c9e-4168-9eb9-af6e054a3d25': { url: 'https://www.gov.uk/government/consultations/exposure-drafts-uk-sustainability-reporting-standards/exposure-draft-of-uk-sustainability-reporting-standards-uk-srs-s1-and-uk-srs-s2', kind: 'official' },
  '6d032348-8820-4fbd-8427-6fa249a3b33a': { url: 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s1-general-requirements.html', kind: 'official' },
  '710f8695-3bbf-4829-8791-84122884462b': { url: 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures.html', kind: 'official' },
  '71ad205a-ac43-4129-831e-3d1058f30773': { url: 'https://bolagsverket.se/', kind: 'reference_page' },
  '77a294bc-63e9-4160-adda-c8b1f5293908': { url: 'https://ojk.go.id/en/Pages/default.aspx', kind: 'reference_page' },
  '80386ab4-8a34-441e-b734-9a864f1a846d': { url: 'https://www.gob.mx/cnbv', kind: 'reference_page' },
  '8b758b7e-2e06-464f-b2d8-bcca330b4135': { url: 'https://www.cma.or.ke/', kind: 'reference_page' },
  '8f9e5dd2-896d-4df9-a4fe-dfba1033f756': { url: 'https://www.legislation.gov.uk/ukpga/2015/30/contents/enacted', kind: 'official' },
  '961ff166-e61f-4ee5-bb8a-0ae219259843': { url: 'https://www.jse.co.za/our-business/sustainability', kind: 'reference_page' },
  '982a6395-3723-4394-a096-3f0278f0fac2': { url: 'https://cma.org.sa/en/RulesRegulations/Pages/default.aspx', kind: 'reference_page' },
  'a331c097-a9b6-4a30-9cf6-be7bc0f8d0df': { url: 'https://www.sebi.gov.in/legal/circulars/jul-2023/business-responsibility-and-sustainability-reporting-core-framework-for-assurance-and-esg-disclosures-for-value-chain_74065.html', kind: 'official' },
  'a6bd66c3-0e8e-4333-9628-563ff200f23e': { url: 'https://tnfd.global/framework/', kind: 'official' },
  'b684b753-943c-4a3b-ac6f-0956a33cf2af': { url: 'https://www.sca.gov.ae/en/', kind: 'reference_page' },
  'c560f839-277e-4f7f-812c-d64b5ad9666e': { url: 'https://kgk.gov.tr/', kind: 'reference_page' },
  'da968472-d76a-42c4-b3dc-40f7a64d72b9': { url: 'https://www.gov.br/cvm/pt-br/assuntos/noticias/2024/cvm-edita-resolucao-que-institui-o-relato-financeiro-de-sustentabilidade-no-brasil', kind: 'official' },
  'da9b295f-3ddc-4cbc-aa98-dc55beb36f5b': { url: 'https://www.fca.org.uk/publications/policy-statements/ps23-16-sustainability-disclosure-requirements-sdr-investment-labels', kind: 'official' },
  'e0cd11bd-d1e1-4181-8244-186458552f07': { url: 'https://www.xrb.govt.nz/standards/adoption-of-climate-standards/', kind: 'official' },
  'e74041f5-a939-4e20-9497-559f3b88a8f5': { url: 'https://www.superfinanciera.gov.co/', kind: 'reference_page' },
  'f2bbd4b3-b665-4779-88f5-46ca58dc3234': { url: 'https://www.argentina.gob.ar/cnv', kind: 'reference_page' },
  'f362c6df-1e76-4275-9d2e-c64243056b1a': { url: 'https://www.sec.or.th/EN/Pages/Home.aspx', kind: 'reference_page' },
  'f5884250-979a-45e9-8a57-83cb1700d7e5': { url: 'https://www.bursamalaysia.com/sustainability/sustainability_reporting', kind: 'reference_page' },
  'f61bd062-9289-46e2-83ad-2164e7d437d4': { url: 'https://sec.gov.ng/', kind: 'reference_page' },
}
