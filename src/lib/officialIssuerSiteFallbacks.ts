type OfficialContext = {
  title?: string | null
  formal_title?: string | null
  region?: string | null
  source_name?: string | null
}

const NON_OFFICIAL_HOST_SNIPPETS = [
  'carrotsandsticks.org',
  'supabase.co',
  'wikipedia.org',
  'wikidata.org',
  'scribd.com',
  'researchgate.net',
  'semanticscholar.org',
  'climate-laws.org',
  'europeansources.info',
  'training.itcilo.org',
  'ecgi.global',
  'kpmg.',
  'deloitte.',
  'pwc.',
  'ey.com',
  'cliffordchance.com',
  'aoshearman.com',
  'whitecase.com',
  'bakermckenzie.com',
  'dechert.com',
  'linklaters.com',
  'dlapiper.com',
  'jpmorgan.com',
  'law-firm',
  'reddit.com',
  'zhihu.com',
  'semanticscholar.org',
  'scielo.br',
  'futureproofed.com',
  'nexioprojects.com',
  'usetappr.com',
  'senken.io',
  'suderowfernandez.com',
  'ecolstudio.com',
  'marketac.eu',
  'transparencylab.org',
  'wapsustainability.com',
  'sosesg.com',
]

const TRUSTED_OFFICIAL_HOSTS = [
  'eur-lex.europa.eu',
  'commission.europa.eu',
  'europarl.europa.eu',
  'esma.europa.eu',
  'legislation.gov.uk',
  'gov.uk',
  'fca.org.uk',
  'frc.org.uk',
  'bankofengland.co.uk',
  'legislation.gov.au',
  'asx.com.au',
  'aasb.gov.au',
  'asic.gov.au',
  'cleanenergyregulator.gov.au',
  'treasury.gov.au',
  'environment.gov.au',
  'laws-lois.justice.gc.ca',
  'canada.ca',
  'osfi-bsif.gc.ca',
  'osc.ca',
  'asc.ca',
  'bcsc.bc.ca',
  'securities-administrators.ca',
  'sec.gov',
  'congress.gov',
  'govinfo.gov',
  'ecfr.gov',
  'federalregister.gov',
  'epa.gov',
  'dol.gov',
  'nasdaq.com',
  'nyse.com',
  'gov.cn',
  'csrc.gov.cn',
  'mee.gov.cn',
  'mof.gov.cn',
  'szse.cn',
  'sse.com.cn',
  'boe.es',
  'cnmv.es',
  'miteco.gob.es',
  'gov.br',
  'planalto.gov.br',
  'cvm.gov.br',
  'b3.com.br',
  'gesetze-im-internet.de',
  'bundesanzeiger.de',
  'bafin.de',
  'bafa.de',
  'bmuv.de',
  'legifrance.gouv.fr',
  'amf-france.org',
  'ecologie.gouv.fr',
  'economie.gouv.fr',
  'hkex.com.hk',
  'elegislation.gov.hk',
  'sfc.hk',
  'sebi.gov.in',
  'egazette.nic.in',
  'mca.gov.in',
  'cercind.gov.in',
  'nseindia.com',
  'bseindia.com',
  'irishstatutebook.ie',
  'centralbank.ie',
  'enterprise.gov.ie',
  'normattiva.it',
  'gazzettaufficiale.it',
  'consob.it',
  'fsa.go.jp',
  'jpx.co.jp',
  'env.go.jp',
  'meti.go.jp',
  'mhlw.go.jp',
  'ssb-j.jp',
  'cssf.lu',
  'legilux.public.lu',
  'bursamalaysia.com',
  'sc.com.my',
  'mof.gov.my',
  'wetten.overheid.nl',
  'officielebekendmakingen.nl',
  'afm.nl',
  'overheid.nl',
  'legislation.govt.nz',
  'xrb.govt.nz',
  'mbie.govt.nz',
  'sec.gov.ng',
  'frcnigeria.gov.ng',
  'cbn.gov.ng',
  'ngxgroup.com',
  'lovdata.no',
  'regjeringen.no',
  'finanstilsynet.no',
  'sec.gov.ph',
  'bsp.gov.ph',
  'officialgazette.gov.ph',
  'gpw.pl',
  'knf.gov.pl',
  'isap.sejm.gov.pl',
  'gov.pl',
  'dre.pt',
  'cmvm.pt',
  'cgov.pt',
  'legislatie.just.ro',
  'asfromania.ro',
  'sasb.ifrs.org',
  'ifrs.org',
  'globalreporting.org',
  'oecd.org',
  'tnfd.global',
  'fsb-tcfd.org',
  'sciencebasedtargets.org',
  'ghgprotocol.org',
  'sseinitiative.org',
  'sustainablerice.org',
  'cdp.net',
  'ifc.org',
  'ilo.org',
  'icmm.com',
  'mercosur.int',
  'sgx.com',
  'mas.gov.sg',
  'sso.agc.gov.sg',
  'gov.za',
  'jse.co.za',
  'justice.gov.za',
  'riksdagen.se',
  'regeringen.se',
  'bolagsverket.se',
  'admin.ch',
  'six-exchange-regulation.com',
  'twse.com.tw',
  'mops.twse.com.tw',
  'sec.or.th',
  'set.or.th',
  'ratchakitcha.soc.go.th',
  'resmigazete.gov.tr',
  'kgk.gov.tr',
  'spk.gov.tr',
  'sca.gov.ae',
  'uaelegislation.gov.ae',
  'dfm.ae',
  'adx.ae',
  'bopa.ad',
  'consellgeneral.ad',
  'govern.ad',
  'argentina.gob.ar',
  'cnv.gov.ar',
  'boletinoficial.gob.ar',
  'ris.bka.gv.at',
  'oesterreich.gv.at',
  'fma.gv.at',
  'e-qanun.az',
  'centralbank.az',
  'kenyalaw.org',
  'luse.co.zm',
  'slse.com',
  'legalaffairs.gov.bh',
  'sijilat.bh',
  'bahrainbourse.com',
  'bsec.gov.bd',
  'bangladesh-bank.org',
  'mof.gov.bd',
  'dsebd.org',
  'ejustice.just.fgov.be',
  'fsma.be',
  'fsc.bg',
  'secc.gov.kh',
  'cosumaf.org',
  'leychile.cl',
  'cmfchile.cl',
  'bcn.cl',
  'funcionpublica.gov.co',
  'minambiente.gov.co',
  'superfinanciera.gov.co',
  'urnadecristal.gov.co',
  'sugeval.fi.cr',
  'pgrweb.go.cr',
  'narodne-novine.nn.hr',
  'hanfa.hr',
  'cysec.gov.cy',
  'cylaw.org',
  'zakonyprolidi.cz',
  'cnb.cz',
  'simv.gob.do',
  'bvrd.com.do',
  'supercias.gob.ec',
  'ambiente.gob.ec',
  'fra.gov.eg',
  'capmas.gov.eg',
  'riigiteataja.ee',
  'fi.ee',
  'amf.gov.al',
  'cosob.org',
  'cma.or.ke',
  'kenyalaw.org',
  'adilet.zan.kz',
  'kase.kz',
  'cma.gov.kw',
  'likumi.lv',
  'bank.lv',
  'e-tar.lt',
  'lrs.lt',
  'mfsa.mt',
  'legislation.mt',
  'mra.mu',
  'bom.mu',
  'fscmauritius.org',
  'dof.gob.mx',
  'gob.mx',
  'legalinfo.mn',
  'mongolbank.mn',
  'frc.mn',
  'fsc.gov.et',
  'cmsa.go.tz',
  'slov-lex.sk',
  'sec.gov.lk',
  'secm.gov.mm',
  'supervalores.gob.pa',
  'cnbs.gob.hn',
  'zakon.rada.gov.ua',
  'sec.gov.rs',
  'www.bsl.gov.sl',
  'www.cma.rw',
  'www.sunaval.gob.ve',
  'vbpl.vn',
  'www.seczam.org.zm',
  'www.zse.co.zw',
  'www.qfcra.com',
  'www.fsc.go.kr',
  'www.uradni-list.si',
  'www.ammc.ma',
  'www.bcsm.sm',
  'www.cmf.tn',
  'www.sebon.gov.np',
  'www.bcu.gub.uy',
  'www.isa.gov.il',
  'www.jsc.gov.jo',
  'www.bse.co.bw',
  'www.rma.org.bt',
  'www.asfi.gob.bo',
  'www.secp.gov.pk',
  'www.cma.ug',
  'www.rbf.gov.fj',
  'www.ttsec.org.tt',
  'www.cma.org.sa',
  'www.gzk.rks-gov.net',
  'matsne.gov.ge',
  'www.fma-li.li',
  'www.jerseylaw.je',
  'www.jerseyfsc.org',
  'www.guernseyregistry.com',
  'www.iomfsa.im',
  'www.legislation.gov.im',
  'www.psoj.org',
  'www.jse.com.jm',
  'www.moj.gov.jm',
  'www.cma.gov.om',
]

const REGION_DEFAULT_URLS: Record<string, string> = {
  Albania: 'https://amf.gov.al/',
  Algeria: 'https://www.cosob.org/',
  Andorra: 'https://www.bopa.ad/',
  Argentina: 'https://www.argentina.gob.ar/cnv',
  Armenia: 'https://www.cba.am/en/sitepages/default.aspx',
  Australia: 'https://www.legislation.gov.au/',
  Austria: 'https://www.ris.bka.gv.at/',
  Azerbaijan: 'https://www.e-qanun.az/',
  Bahrain: 'https://www.legalaffairs.gov.bh/',
  Bangladesh: 'https://www.bsec.gov.bd/home',
  Barbados: 'https://www.fsc.gov.bb/',
  Belgium: 'https://www.ejustice.just.fgov.be/cgi/welcome.pl',
  Bhutan: 'https://www.rma.org.bt/',
  Bolivia: 'https://www.asfi.gob.bo/',
  'Bosnia and Herzegovina': 'https://www.secrs.gov.ba/',
  Botswana: 'https://www.bse.co.bw/',
  Brazil: 'https://www.gov.br/cvm/pt-br',
  Bulgaria: 'https://www.fsc.bg/en/',
  Cambodia: 'https://www.cambodia.gov.kh/',
  Cameroon: 'https://www.cosumaf.org/en/',
  Canada: 'https://laws-lois.justice.gc.ca/eng/',
  Chad: 'https://www.cosumaf.org/en/',
  CDP: 'https://www.cdp.net/en/disclose',
  Chile: 'https://www.leychile.cl/',
  China: 'https://www.csrc.gov.cn/csrc_en/index.shtml',
  Colombia: 'https://www.superfinanciera.gov.co/',
  'Costa Rica': 'https://www.sugeval.fi.cr/',
  Croatia: 'https://narodne-novine.nn.hr/',
  Cyprus: 'https://www.cysec.gov.cy/en-GB/home/',
  'Czech Republic': 'https://www.zakonyprolidi.cz/',
  Czechia: 'https://www.zakonyprolidi.cz/',
  Denmark: 'https://www.retsinformation.dk/',
  'Dominican Republic': 'https://simv.gob.do/',
  Ecuador: 'https://www.supercias.gob.ec/portalscvs/',
  Egypt: 'https://fra.gov.eg/en/',
  'El Salvador': 'https://www.bcr.gob.sv/',
  Estonia: 'https://www.riigiteataja.ee/en/',
  Eswatini: 'https://www.fsc.org.sz/',
  Ethiopia: 'https://fsc.gov.et/',
  EU: 'https://eur-lex.europa.eu/homepage.html',
  Fiji: 'https://www.rbf.gov.fj/',
  Finland: 'https://www.finlex.fi/en/',
  France: 'https://www.legifrance.gouv.fr/',
  Georgia: 'https://matsne.gov.ge/en',
  Germany: 'https://www.gesetze-im-internet.de/englisch.html',
  Ghana: 'https://sec.gov.gh/',
  GRI: 'https://www.globalreporting.org/standards/',
  ICMM: 'https://www.icmm.com/en-gb/our-principles',
  Greece: 'https://www.capitalmarket.gov.gr/en/',
  Guatemala: 'https://www.sib.gob.gt/web/sib',
  Guernsey: 'https://www.guernseyregistry.com/',
  Honduras: 'https://www.cnbs.gob.hn/',
  'Hong Kong': 'https://www.elegislation.gov.hk/',
  Hungary: 'https://www.mnb.hu/en',
  IFRS: 'https://www.ifrs.org/issued-standards/',
  IFC: 'https://www.ifc.org/en/work/our-impact/performance-standards',
  IIRC: 'https://www.ifrs.org/issued-standards/integrated-reporting/',
  Iceland: 'https://www.althingi.is/',
  India: 'https://www.sebi.gov.in/',
  Indonesia: 'https://ojk.go.id/en/Pages/default.aspx',
  Iran: 'https://en.seo.ir/',
  Iraq: 'https://www.isx-iq.net/isxportal/portal/homePage.html',
  Ireland: 'https://www.irishstatutebook.ie/',
  'Isle of Man': 'https://www.iomfsa.im/',
  Israel: 'https://www.isa.gov.il/sites/ISAEng/Pages/default.aspx',
  Italy: 'https://www.normattiva.it/',
  'Ivory Coast': 'https://www.crepmf.org/',
  Jamaica: 'https://www.psoj.org/',
  Japan: 'https://www.meti.go.jp/english/',
  Jersey: 'https://www.jerseylaw.je/',
  Jordan: 'https://www.jsc.gov.jo/Default/En',
  Kazakhstan: 'https://adilet.zan.kz/eng',
  Kenya: 'https://www.kenyalaw.org/',
  Kosovo: 'https://gzk.rks-gov.net/',
  Kuwait: 'https://cma.gov.kw/en/web/cma/home',
  Kyrgyzstan: 'https://cbd.minjust.gov.kg/',
  Laos: 'https://www.lsx.com.la/',
  Latvia: 'https://likumi.lv/',
  Lebanon: 'https://www.bdl.gov.lb/',
  Liechtenstein: 'https://www.fma-li.li/en/',
  Lithuania: 'https://www.e-tar.lt/portal/en/index',
  Luxembourg: 'https://legilux.public.lu/',
  Macedonia: 'https://www.sec.gov.mk/',
  Malawi: 'https://www.reservebank.mw/',
  Malaysia: 'https://www.bursamalaysia.com/',
  Malta: 'https://www.mfsa.mt/',
  Mauritius: 'https://www.fscmauritius.org/en',
  Mexico: 'https://www.dof.gob.mx/',
  Moldova: 'https://www.legis.md/',
  Monaco: 'https://journaldemonaco.gouv.mc/',
  Mongolia: 'https://legalinfo.mn/',
  Mercosur: 'https://www.mercosur.int/',
  Montenegro: 'https://www.scmn.me/en',
  Morocco: 'https://www.ammc.ma/en',
  Mozambique: 'https://www.bvm.co.mz/',
  Myanmar: 'https://www.secm.gov.mm/',
  Namibia: 'https://namfisa.com.na/',
  Nepal: 'https://www.sebon.gov.np/',
  Netherlands: 'https://wetten.overheid.nl/',
  'New Zealand': 'https://www.legislation.govt.nz/',
  Nigeria: 'https://sec.gov.ng/',
  Norway: 'https://lovdata.no/',
  OECD: 'https://www.oecd.org/investment/mne/',
  ILO: 'https://www.ilo.org/',
  Oman: 'https://www.cma.gov.om/',
  Pakistan: 'https://www.secp.gov.pk/',
  Panama: 'https://supervalores.gob.pa/',
  Peru: 'https://www.gob.pe/smv',
  Philippines: 'https://www.officialgazette.gov.ph/',
  Poland: 'https://www.gpw.pl/best-practice',
  Portugal: 'https://diariodarepublica.pt/dr/home',
  Qatar: 'https://www.qfcra.com/en-us/legislation/Pages/default.aspx',
  Romania: 'https://legislatie.just.ro/',
  Russia: 'http://publication.pravo.gov.ru/',
  Rwanda: 'https://www.cma.rw/',
  SASB: 'https://www.ifrs.org/issued-standards/sasb-standards/',
  SBTi: 'https://sciencebasedtargets.org/standards',
  SRP: 'https://www.sustainablerice.org/',
  SSE: 'https://sseinitiative.org/',
  'San Marino': 'https://www.bcsm.sm/en',
  'Saudi Arabia': 'https://cma.org.sa/en/Pages/default.aspx',
  Serbia: 'https://www.sec.gov.rs/index.php/en/',
  'Sierra Leone': 'https://www.slse.com/',
  Singapore: 'https://sso.agc.gov.sg/',
  Slovakia: 'https://www.slov-lex.sk/',
  Slovenia: 'https://www.uradni-list.si/',
  'South Africa': 'https://www.jse.co.za/',
  'South Korea': 'https://www.fsc.go.kr/eng/',
  Spain: 'https://www.boe.es/',
  'Sri Lanka': 'https://www.sec.gov.lk/',
  Suriname: 'https://gov.sr/',
  Sweden: 'https://www.riksdagen.se/en/',
  Switzerland: 'https://www.admin.ch/gov/en/start/documentation/media-releases.html',
  TCFD: 'https://www.fsb-tcfd.org/publications/',
  TNFD: 'https://tnfd.global/framework/',
  Taiwan: 'https://www.twse.com.tw/en/',
  Tanzania: 'https://www.cmsa.go.tz/',
  Thailand: 'https://ratchakitcha.soc.go.th/',
  'Trinidad and Tobago': 'https://www.ttsec.org.tt/',
  Tunisia: 'https://www.cmf.tn/',
  Turkey: 'https://www.resmigazete.gov.tr/',
  UAE: 'https://www.sca.gov.ae/en/home.aspx',
  UK: 'https://www.legislation.gov.uk/',
  UN: 'https://www.un.org/',
  USA: 'https://www.ecfr.gov/current',
  Uganda: 'https://www.cma.ug/',
  Ukraine: 'https://zakon.rada.gov.ua/laws/main/index',
  Uruguay: 'https://www.bcu.gub.uy/',
  Venezuela: 'https://www.sunaval.gob.ve/',
  Vietnam: 'https://vanban.chinhphu.vn/',
  Zambia: 'https://www.luse.co.zm/',
  Zimbabwe: 'https://www.zse.co.zw/',
}

function extractHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function normalizeText(value?: string | null) {
  return (value || '').toLowerCase()
}

function contains(text: string, ...needles: string[]) {
  return needles.some((needle) => text.includes(needle))
}

export function isTrustedOfficialPublisherUrl(url?: string | null) {
  const normalized = (url || '').trim()
  if (!normalized) return false

  const host = extractHost(normalized)
  if (!host) return false
  if (NON_OFFICIAL_HOST_SNIPPETS.some((snippet) => host.includes(snippet))) return false

  if (TRUSTED_OFFICIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return true
  }

  return (
    host.endsWith('.gov') ||
    /\.gov\.[a-z]{2}$/.test(host) ||
    host.includes('gouv.') ||
    host.includes('europa.eu') ||
    host.includes('legislation.') ||
    host.includes('officialgazette') ||
    host.includes('gazette') ||
    host.includes('justice.') ||
    host.includes('statutebook') ||
    host.includes('lovdata') ||
    host.includes('e-tar') ||
    host.includes('finlex') ||
    host.includes('legilux') ||
    host.includes('normattiva') ||
    host.includes('gazzettaufficiale') ||
    host.includes('boe.es') ||
    host.includes('dre.pt') ||
    host.includes('legifrance') ||
    host.includes('bundesanzeiger') ||
    host.includes('gesetze-im-internet') ||
    host.includes('ifrs.org') ||
    host.includes('globalreporting.org') ||
    host.includes('oecd.org') ||
    host.includes('sciencebasedtargets.org') ||
    host.includes('tnfd.global') ||
    host.includes('fsb-tcfd.org') ||
    host.includes('cdp.net')
  )
}

export function deriveOfficialIssuerSiteUrl(context: OfficialContext) {
  const title = normalizeText(`${context.formal_title || ''} ${context.title || ''} ${context.source_name || ''}`)
  const region = context.region || context.source_name || ''

  if (contains(title, 'sasb')) return 'https://www.ifrs.org/issued-standards/sasb-standards/'
  if (contains(title, 'gri')) return 'https://www.globalreporting.org/standards/'
  if (contains(title, 'ifrs s1', 'ifrs s2', 'issb', 'sustainability disclosure standards navigator')) {
    return 'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/'
  }
  if (contains(title, 'tnfd')) return 'https://tnfd.global/framework/'
  if (contains(title, 'tcfd')) return 'https://www.fsb-tcfd.org/publications/'
  if (contains(title, 'oecd')) return 'https://www.oecd.org/investment/mne/'
  if (contains(title, 'science based targets', 'sbti')) return 'https://sciencebasedtargets.org/standards'
  if (contains(title, 'ghg protocol')) return 'https://ghgprotocol.org/corporate-standard'
  if (contains(title, 'integrated reporting')) return 'https://www.ifrs.org/issued-standards/integrated-reporting/'
  if (contains(title, 'asean')) return 'https://asean.org/'

  if (region === 'EU') {
    if (contains(title, 'esma')) return 'https://www.esma.europa.eu/'
    return 'https://eur-lex.europa.eu/homepage.html'
  }

  if (region === 'UK') {
    if (contains(title, 'fca', 'sustainability disclosure requirements', 'sdr', 'investment labels')) return 'https://www.fca.org.uk/publications/policy-statements/ps23-16-sustainability-disclosure-requirements-sdr-investment-labels'
    if (contains(title, 'frc', 'uk srs', 'sustainability reporting standards')) return 'https://www.frc.org.uk/library/standards-codes-policy/corporate-reporting/'
    if (contains(title, 'bank of england', 'prudential')) return 'https://www.bankofengland.co.uk/climate-change'
    return 'https://www.legislation.gov.uk/'
  }

  if (region === 'Australia') {
    if (contains(title, 'aasb', 'asrs')) return 'https://www.aasb.gov.au/pronouncements/sustainability-reporting-standards/'
    if (contains(title, 'asx')) return 'https://www.asx.com.au/about/regulation/rules-guidance-notes-and-waivers.htm'
    if (contains(title, 'asic')) return 'https://asic.gov.au/regulatory-resources/'
    if (contains(title, 'clean energy', 'safeguard', 'emissions', 'carbon')) return 'https://cer.gov.au/schemes/safeguard-mechanism'
    return 'https://www.legislation.gov.au/'
  }

  if (region === 'USA') {
    if (contains(title, 'sec', 'securities and exchange', 'climate disclosure', 'cybersecurity', 'investment adviser')) return 'https://www.sec.gov/rules-regulations'
    if (contains(title, 'nasdaq')) return 'https://www.nasdaq.com/solutions/esg-reporting-guide'
    if (contains(title, 'nyse')) return 'https://www.nyse.com/sustainability'
    if (contains(title, 'epa', 'environmental protection', 'emissions', 'air', 'pollution')) return 'https://www.epa.gov/laws-regulations'
    if (contains(title, 'labor', 'occupational', 'worker', 'osha')) return 'https://www.dol.gov/general/aboutdol/majorlaws'
    if (contains(title, 'act', 'law')) return 'https://www.congress.gov/'
    return 'https://www.ecfr.gov/current'
  }

  if (region === 'Canada') {
    if (contains(title, 'osfi')) return 'https://www.osfi-bsif.gc.ca/en/guidance/guidance-library'
    if (contains(title, 'tsx', 'exchange', 'listed companies', 'securities')) return 'https://www.securities-administrators.ca/'
    return 'https://laws-lois.justice.gc.ca/eng/'
  }

  if (region === 'China') {
    if (contains(title, 'shanghai stock exchange', 'sse')) return 'https://english.sse.com.cn/'
    if (contains(title, 'shenzhen stock exchange', 'szse')) return 'https://www.szse.cn/English/'
    if (contains(title, 'ecology', 'environment')) return 'https://english.mee.gov.cn/'
    return 'https://www.csrc.gov.cn/csrc_en/index.shtml'
  }

  if (region === 'Hong Kong') {
    if (contains(title, 'hkex', 'listing rule', 'listing rules')) return 'https://www.hkex.com.hk/Listing/Rules-and-Guidance?sc_lang=en'
    if (contains(title, 'securities and futures commission', 'sfc')) return 'https://www.sfc.hk/en/Rules-and-standards'
    return 'https://www.elegislation.gov.hk/'
  }

  if (region === 'India') {
    if (contains(title, 'sebi')) return 'https://www.sebi.gov.in/legal.html'
    if (contains(title, 'companies act', 'mca')) return 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html'
    return 'https://egazette.nic.in/'
  }

  if (region === 'Japan') {
    if (contains(title, 'ssbj')) return 'https://www.ssb-j.jp/en/ssbj_standards.html'
    if (contains(title, 'jpx', 'tokyo stock exchange', 'corporate governance code')) return 'https://www.jpx.co.jp/english/regulation/listing.html'
    if (contains(title, 'human rights', 'supply chains')) return 'https://www.meti.go.jp/english/policy/economy/business_human_rights/index.html'
    if (contains(title, 'environment', 'climate')) return 'https://www.env.go.jp/en/'
    return 'https://www.fsa.go.jp/en/'
  }

  if (region === 'Germany') {
    if (contains(title, 'supply chain', 'due diligence')) return 'https://www.bafa.de/EN/Foreign_Trade/Corporate_Due_Diligence/corporate_due_diligence_node.html'
    if (contains(title, 'bafin')) return 'https://www.bafin.de/EN/Aufsicht/aufsicht_node_en.html'
    return 'https://www.gesetze-im-internet.de/englisch.html'
  }

  if (region === 'France') {
    if (contains(title, 'amf', 'financial markets authority')) return 'https://www.amf-france.org/en/regulation'
    return 'https://www.legifrance.gouv.fr/'
  }

  if (region === 'Italy') {
    if (contains(title, 'consob')) return 'https://www.consob.it/web/consob-and-its-activities/regulations'
    return 'https://www.normattiva.it/'
  }

  if (region === 'Brazil') {
    if (contains(title, 'cvm')) return 'https://www.gov.br/cvm/pt-br/assuntos/noticias'
    return 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14973.htm'
  }

  if (region === 'Ireland') {
    if (contains(title, 'central bank')) return 'https://www.centralbank.ie/regulation'
    return 'https://www.irishstatutebook.ie/'
  }

  if (region === 'Portugal') {
    if (contains(title, 'cmvm')) return 'https://www.cmvm.pt/en/Legislacao/CMVMRegulations/Pages/default.aspx'
    return 'https://diariodarepublica.pt/dr/home'
  }

  if (region === 'Belgium') {
    if (contains(title, 'fsma')) return 'https://www.fsma.be/en/regulation'
    return 'https://www.ejustice.just.fgov.be/cgi/welcome.pl'
  }

  if (region === 'Netherlands') {
    if (contains(title, 'afm')) return 'https://www.afm.nl/en/sector/registers/wetten-regels'
    return 'https://wetten.overheid.nl/'
  }

  if (region === 'Spain') {
    if (contains(title, 'cnmv')) return 'https://www.cnmv.es/portal/legislacion/legislacion.aspx'
    return 'https://www.boe.es/'
  }

  if (region === 'South Africa') {
    if (contains(title, 'jse')) return 'https://www.jse.co.za/our-business/sustainability'
    return 'https://www.gov.za/documents/acts'
  }

  if (region === 'Norway') {
    if (contains(title, 'prop.')) return 'https://www.regjeringen.no/en/dokumenter/'
    return 'https://lovdata.no/'
  }

  if (region === 'Singapore') {
    if (contains(title, 'sgx')) return 'https://www.sgx.com/regulation/rules'
    if (contains(title, 'mas')) return 'https://www.mas.gov.sg/regulation'
    return 'https://sso.agc.gov.sg/'
  }

  if (region === 'Malaysia') {
    if (contains(title, 'bursa')) return 'https://www.bursamalaysia.com/regulation'
    if (contains(title, 'securities commission')) return 'https://www.sc.com.my/regulation'
    return 'https://www.mof.gov.my/portal/en'
  }

  if (region === 'Philippines') {
    if (contains(title, 'bsp')) return 'https://www.bsp.gov.ph/SitePages/Issuances/Issuances.aspx'
    if (contains(title, 'sec')) return 'https://www.sec.gov.ph/issuances/'
    return 'https://www.officialgazette.gov.ph/'
  }

  if (region === 'Thailand') {
    if (contains(title, 'sec')) return 'https://www.sec.or.th/EN/Pages/LawandRegulations/LawandRegulations.aspx'
    if (contains(title, 'set', 'stock exchange')) return 'https://www.set.or.th/en/rules-regulations'
    return 'https://ratchakitcha.soc.go.th/'
  }

  if (region === 'Switzerland') {
    if (contains(title, 'six')) return 'https://www.six-exchange-regulation.com/en/home/publications/legal-and-regulatory-framework.html'
    return 'https://www.admin.ch/gov/en/start/documentation/media-releases.html'
  }

  if (region === 'Taiwan') {
    if (contains(title, 'mops')) return 'https://mops.twse.com.tw/mops/web/index'
    return 'https://www.twse.com.tw/en/'
  }

  return REGION_DEFAULT_URLS[region] || REGION_DEFAULT_URLS[context.source_name || ''] || null
}
