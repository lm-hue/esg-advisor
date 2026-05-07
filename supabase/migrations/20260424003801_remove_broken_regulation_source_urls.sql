-- Remove broken official source URLs identified by the 2026-04-24 link audit.
-- This keeps the dataset from advertising dead "official source" links while
-- preserving the regulation records themselves.

update public.regulations
set
  source_url = null,
  updated_at = timezone('utc', now())
where
  source_url ilike 'https://www.carrotsandsticks.org/%'
  or source_url ilike 'http://www.carrotsandsticks.org/%';

update public.regulations
set
  source_url = null,
  updated_at = timezone('utc', now())
where source_url in (
  'https://dl.icdst.org/pdfs/files4/2e3075a9706302387ee828a4435259c2.pdf',
  'https://publicgovernance.de/media/CG_OECD_Guidelines_2005.pdf',
  'https://tnfd.global/framework/',
  'https://www.aasb.gov.au/news/aasb-climate-related-financial-disclosures/',
  'https://www.asean-csr-network.org/c/images/RegionalStrategyonCSRandHumanRightsinASEANJune2017.pdf',
  'https://www.bafa.de/DE/Lieferketten/lieferketten_node.html',
  'https://www.bolagsverket.se/foretag/aktiebolag/arsredovisning/hallbarhetsrapportering.html',
  'https://www.bursamalaysia.com/about_bursa/about_us/sustainability/sustainability-reporting',
  'https://www.climate-transparency.org/wp-content/uploads/2021/10/CT2021Mexico.pdf',
  'https://www.cma.or.ke/sustainable-finance/',
  'https://www.cma.org.sa/',
  'https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-28094.html',
  'https://www.cnbv.gob.mx/',
  'https://www.cnv.gob.ar/SitioWeb/Home/Transparencia',
  'https://www.cscp.org/wp-content/uploads/2016/05/39_CSCP__2011__-_SCP_Policies_A_Guide_for_CSO_en.pdf',
  'https://www.csrc.gov.cn/csrc/c100028/c7627484/content.shtml',
  'https://www.cssf.lu/en/Document/regulation-eu-2019-2089-of-the-european-parliament-and-of-the-council-of-27-november-2019/',
  'https://www.ecgi.global/sites/default/files/codes/documents/cg_principles_malta_lc_nov2005_en.pdf',
  'https://www.ecgi.global/sites/default/files/codes/documents/mexico_code_en.pdf',
  'https://www.ecgi.global/sites/default/files/codes/documents/mongolia_code_2007_en.pdf',
  'https://www.ecgi.global/sites/default/files/codes/documents/oecd_guidelines_dec2004.pdf',
  'https://www.ecgi.global/sites/default/files/codes/documents/oecd_soe_guidelines_may2014_en.pdf',
  'https://www.ekvilib.org/wp-content/uploads/2018/03/GRI-standardi-2016.pdf',
  'https://www.europarl.europa.eu/RegData/etudes/BRIE/2023/753958/EPRS_BRI(2023)753958_EN.pdf',
  'https://www.europarl.europa.eu/RegData/etudes/STUD/2020/658541/IPOL_STU(2020)658541_EN.pdf',
  'https://www.europarl.europa.eu/thinktank/en/document/IPOL-FEMM_NT(2014)493052',
  'https://www.europeansources.info/record/proposal-for-a-directive-amending-directive-2003-87-ec-establishing-a-system-for-greenhouse-gas-emission-allowance-trading-within-the-union-decision-eu-2015-1814-concerning-the-establishment-and-op/',
  'https://www.europeansources.info/record/proposal-for-a-regulation-on-european-green-bonds/',
  'https://www.fca.org.uk/firms/esg/sustainability-disclosure-requirements',
  'https://www.frc.org.uk/sustainability/uk-sustainability-reporting-standards/',
  'https://www.geciclaw.com/wp-content/uploads/2025/02/proposal-postponing-requirements-csrd-transposition-deadline-application-csddd_en.pdf',
  'https://www.giz.de/de/downloads/FS-SiCEM-engl-180912.pdf',
  'https://www.globalreporting.org/standards/media/1910/gri-403-occupational-health-and-safety-2018.pdf',
  'https://www.gov.br/cvm/pt-br/assuntos/noticias/2023/cvm-lanca-roteiro-para-adocao-das-normas-do-issb',
  'https://www.hkex.com.hk/Listing/Rules-and-Guidance/Environmental-Social-and-Governance/ESG-Reporting-Guide-and-FAQs',
  'https://www.icgam.com/who-we-are/leadership-governance/policies-disclosures/shareholder-rights-directive/',
  'https://www.ifrs.org/content/dam/ifrs/groups/cdsb/cdsb-framework-2022.pdf',
  'https://www.ifrs.org/issued-standards/ifrs-sustainability-disclosure-standards/ifrs-s1-general-requirements/',
  'https://www.ifrs.org/issued-standards/ifrs-sustainability-disclosure-standards/ifrs-s2-climate-related-disclosures/',
  'https://www.ifrs.org/issued-standards/sasb-standards/',
  'https://www.jse.co.za/services/sustainability/sustainability-disclosure-guidance',
  'https://www.kgk.gov.tr/',
  'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000034290626',
  'https://www.legislation.gov.uk/eur/2006/166/contents',
  'https://www.legislation.gov.uk/ukpga/2015/30/section/54',
  'https://www.maib.md/files/2016/9/26/codul-de-guvernanta-corporativa-al-bc-moldova-agroindbank-s-a-1/codul-de-guvernanta-corporativa-al-bc-moldova-agroindbank-s-a-1.pdf',
  'https://www.maicsa.org.my/media/8632/technical_announcements_230925_1_2.pdf',
  'https://www.motie.go.kr/motie/ms/nt/announce3/bbs/bbsView.do',
  'https://www.mra.mu/download/CSRGuide.pdf',
  'https://www.mra.mu/download/ITAConsolidated.pdf',
  'https://www.oecd.org/en/publications/2011/09/oecd-guidelines-for-multinational-enterprises-2011-edition_g1g13daf.html',
  'https://www.ojk.go.id/sustainable-finance',
  'https://www.parl.ca/DocumentViewer/en/44-1/bill/S-211/royal-assent',
  'https://www.perezllorca.com/wp-content/uploads/2024/03/Legal-Briefing-Directive-EU-2024825-of-the-European-Parliament-and-of-the-Council-of-28-February-2024.pdf',
  'https://www.profepa.gob.mx/innovaportal/file/3295/1/nom-002-semarnat-1996.pdf',
  'https://www.sca.gov.ae/',
  'https://www.sebi.gov.in/legal/circulars/jul-2023/brsr-core-framework-for-assurance-and-esg-disclosures-for-value-chain_74193.html',
  'https://www.sec.gov.ng/',
  'https://www.sec.gov.ph/rules-and-regulations/sustainability-reporting-guidelines/',
  'https://www.sec.or.th/EN/Pages/AboutSEC/OneReport.aspx',
  'https://www.ssbj.jp/en/',
  'https://www.stradalex.eu/en/se_src_publ_leg_eur_jo/document/ojeu_2021.277.01.0137.01',
  'https://www.superfinanciera.gov.co/inicio/industria-y-mercados/sostenibilidad-y-finanzas-sostenibles',
  'https://www.susdep.com/wp-content/uploads/2021/03/gri-204-procurement-practices-2016.pdf',
  'https://www.undp.org/sites/g/files/zskgke326/files/2022-08/ESG%20reporting%20ENG.pdf',
  'https://www.xrb.govt.nz/standards/climate-related-disclosures/'
);
