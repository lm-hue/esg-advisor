#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const execFile = promisify(execFileCallback)

const REPO_ROOT = '/Users/lucas/Documents/GitHub/esg-advisor'
const TMP_ROOT = '/tmp'
const DEFAULT_PDF_DIR = '/Users/lucas/Claude_Code/esg-advisor/international_policies/pdfs'
const OUTPUT_JSON = path.join(TMP_ROOT, 'official-source-url-recovery.json')
const OUTPUT_TS = path.join(REPO_ROOT, 'src/lib/validatedOfficialSourceUrlOverrides.ts')
const ARCHIVED_SOURCE_PREFIX = 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/'
const PDFJS_STANDARD_FONTS = new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href
const CURL_TIMEOUT_SECONDS = '25'
const MAX_BODY_BYTES = 900_000
const SEARCH_RESULT_LIMIT = 5

const TRUSTED_ARCHIVE_HOST_SNIPPETS = [
  'eur-lex.europa.eu',
  'legislation.gov.uk',
  'legislation.gov.au',
  'legislation.govt.nz',
  'elegislation.gov.hk',
  'laws-lois.justice.gc.ca',
  'canada.ca',
  'retsinformation.dk',
  'lovdata.no',
  'e-tar.lt',
  'legislatie.just.ro',
  'finlex.fi',
  'legilux.public.lu',
  'legifrance.gouv.fr',
  'ejustice.just.fgov.be',
  'dre.pt',
  'boe.es',
  'normattiva.it',
  'gazzettaufficiale.it',
  'gesetze-im-internet.de',
  'bundesanzeiger.de',
  'bopa.ad',
  'officialgazette.gov.ph',
  'sso.agc.gov.sg',
  'legalinfo.mn',
  'e-qanun.az',
  'ifrs.org',
  'sasb.ifrs.org',
  'globalreporting.org',
  'oecd.org',
  'sciencebasedtargets.org',
  'tnfd.global',
  'fsb-tcfd.org',
  'cdp.net',
]

const BAD_SOURCE_DOMAINS = [
  'carrotsandsticks.org',
  'supabase.co',
  'w3.org',
  'adobe.com',
  'purl.org',
  'wikipedia.org',
  'wikidata.org',
  'doi.org',
  'github.com',
  'gitlab.com',
  'researchgate.net',
  'semanticscholar.org',
  'kpmg.',
  'pwc.',
  'deloitte.',
  'ey.com',
  'cliffordchance.com',
  'aoshearman.com',
  'climate-laws.org',
  'europeansources.info',
  'marketac.eu',
  'training.itcilo.org',
  'ecgi.global',
  'law-firm',
]

const GLOBAL_ORG_DOMAINS = {
  ASEAN: ['asean.org'],
  CDP: ['cdp.net'],
  CDSB: ['ifrs.org', 'cdsb.net'],
  EU: ['eur-lex.europa.eu', 'commission.europa.eu', 'europarl.europa.eu', 'esma.europa.eu'],
  GRI: ['globalreporting.org'],
  ICMM: ['icmm.com'],
  IFC: ['ifc.org'],
  IFRS: ['ifrs.org', 'sasb.ifrs.org'],
  IIRC: ['integratedreporting.org', 'ifrs.org'],
  ILO: ['ilo.org'],
  OECD: ['oecd.org'],
  SASB: ['sasb.ifrs.org', 'ifrs.org'],
  SBTi: ['sciencebasedtargets.org'],
  SSE: ['sseinitiative.org'],
  TCFD: ['fsb-tcfd.org', 'fsb.org'],
  TNFD: ['tnfd.global'],
  UN: ['un.org', 'sdgs.un.org'],
}

const REGION_DOMAIN_GUESSES = {
  Andorra: ['bopa.ad', 'consellgeneral.ad', 'govern.ad'],
  Argentina: ['argentina.gob.ar', 'cnv.gov.ar', 'boletinoficial.gob.ar'],
  Australia: ['legislation.gov.au', 'asx.com.au', 'aasb.gov.au', 'asic.gov.au', 'cleanenergyregulator.gov.au', 'treasury.gov.au', 'environment.gov.au'],
  Austria: ['ris.bka.gv.at', 'oesterreich.gv.at', 'fma.gv.at'],
  Azerbaijan: ['e-qanun.az', 'centralbank.az'],
  Bahrain: ['legalaffairs.gov.bh', 'sijilat.bh', 'bahrainbourse.com'],
  Bangladesh: ['bsec.gov.bd', 'bangladesh-bank.org', 'mof.gov.bd', 'dsebd.org'],
  Belgium: ['ejustice.just.fgov.be', 'fsma.be'],
  Brazil: ['gov.br', 'planalto.gov.br', 'cvm.gov.br', 'b3.com.br'],
  Bulgaria: ['lex.bg', 'fsc.bg'],
  Canada: ['laws-lois.justice.gc.ca', 'canada.ca', 'osfi-bsif.gc.ca', 'asc.ca', 'bcsc.bc.ca'],
  Chile: ['leychile.cl', 'cmfchile.cl', 'bcn.cl'],
  China: ['gov.cn', 'csrc.gov.cn', 'mee.gov.cn', 'mof.gov.cn', 'szse.cn', 'sse.com.cn'],
  Colombia: ['funcionpublica.gov.co', 'minambiente.gov.co', 'superfinanciera.gov.co', 'urnadecristal.gov.co'],
  Denmark: ['retsinformation.dk', 'nasdaqomxnordic.com', 'erhvervsstyrelsen.dk'],
  EU: ['eur-lex.europa.eu', 'commission.europa.eu', 'europarl.europa.eu', 'esma.europa.eu'],
  Finland: ['finlex.fi', 'eduskunta.fi'],
  France: ['legifrance.gouv.fr', 'amf-france.org', 'ecologie.gouv.fr', 'economie.gouv.fr'],
  Germany: ['gesetze-im-internet.de', 'bundesanzeiger.de', 'bafin.de', 'bafa.de', 'bmuv.de'],
  'Hong Kong': ['hkex.com.hk', 'elegislation.gov.hk', 'sfc.hk'],
  India: ['sebi.gov.in', 'egazette.nic.in', 'mca.gov.in', 'cercind.gov.in', 'nseindia.com', 'bseindia.com'],
  Indonesia: ['ojk.go.id', 'idx.co.id', 'jdih.setkab.go.id', 'peraturan.bpk.go.id'],
  Ireland: ['irishstatutebook.ie', 'centralbank.ie', 'enterprise.gov.ie'],
  Italy: ['normattiva.it', 'gazzettaufficiale.it', 'consob.it'],
  Japan: ['fsa.go.jp', 'jpx.co.jp', 'env.go.jp', 'ssb-j.jp'],
  Luxembourg: ['cssf.lu', 'legilux.public.lu'],
  Malaysia: ['bursamalaysia.com', 'sc.com.my', 'mof.gov.my'],
  Mexico: ['gob.mx', 'dof.gob.mx', 'cnbv.gob.mx', 'cnbv.gob.mx', 'cnbv.gob.mx'],
  Mongolia: ['legalinfo.mn', 'mongolbank.mn', 'frc.mn'],
  Netherlands: ['officielebekendmakingen.nl', 'afm.nl', 'overheid.nl'],
  'New Zealand': ['legislation.govt.nz', 'xrb.govt.nz', 'mbie.govt.nz'],
  Nigeria: ['sec.gov.ng', 'laws.gov.ng', 'frcnigeria.gov.ng'],
  Norway: ['lovdata.no', 'regjeringen.no', 'finanstilsynet.no'],
  Philippines: ['sec.gov.ph', 'bsp.gov.ph', 'officialgazette.gov.ph'],
  Portugal: ['dre.pt', 'cmvm.pt', 'cgov.pt'],
  Romania: ['legislatie.just.ro', 'asfromania.ro'],
  SASB: ['sasb.ifrs.org', 'ifrs.org'],
  Singapore: ['sgx.com', 'mas.gov.sg', 'sso.agc.gov.sg'],
  'South Africa': ['gov.za', 'jse.co.za', 'justice.gov.za'],
  Spain: ['boe.es', 'cnmv.es', 'miteco.gob.es'],
  Sweden: ['riksdagen.se', 'regeringen.se', 'bolagsverket.se'],
  Switzerland: ['admin.ch', 'six-exchange-regulation.com'],
  Thailand: ['sec.or.th', 'set.or.th', 'ratchakitcha.soc.go.th'],
  Turkey: ['resmigazete.gov.tr', 'kgk.gov.tr', 'spk.gov.tr'],
  UAE: ['sca.gov.ae', 'uaelegislation.gov.ae', 'dfm.ae', 'adx.ae'],
  UK: ['legislation.gov.uk', 'gov.uk', 'fca.org.uk', 'frc.org.uk', 'bankofengland.co.uk'],
  USA: ['sec.gov', 'congress.gov', 'govinfo.gov', 'ecfr.gov', 'epa.gov', 'dol.gov', 'federalregister.gov'],
}

const TITLE_DOMAIN_HINTS = [
  { match: /\bGRI\b/i, domains: GLOBAL_ORG_DOMAINS.GRI },
  { match: /\bIFRS\b|\bISSB\b/i, domains: GLOBAL_ORG_DOMAINS.IFRS },
  { match: /\bSASB\b/i, domains: GLOBAL_ORG_DOMAINS.SASB },
  { match: /\bOECD\b/i, domains: GLOBAL_ORG_DOMAINS.OECD },
  { match: /\bTNFD\b/i, domains: GLOBAL_ORG_DOMAINS.TNFD },
  { match: /\bTCFD\b/i, domains: GLOBAL_ORG_DOMAINS.TCFD },
  { match: /\bCDP\b/i, domains: GLOBAL_ORG_DOMAINS.CDP },
  { match: /\bILO\b/i, domains: GLOBAL_ORG_DOMAINS.ILO },
  { match: /\bIFC\b/i, domains: GLOBAL_ORG_DOMAINS.IFC },
  { match: /\bICMM\b/i, domains: GLOBAL_ORG_DOMAINS.ICMM },
  { match: /\bASEAN\b/i, domains: GLOBAL_ORG_DOMAINS.ASEAN },
  { match: /\bEuropean Commission\b|\bEuropean Union\b|\bEU\b|\bDirective\b|\bRegulation \(EU\)\b/i, domains: GLOBAL_ORG_DOMAINS.EU },
  { match: /\bESMA\b/i, domains: ['esma.europa.eu'] },
  { match: /\bEUDR\b/i, domains: ['eur-lex.europa.eu', 'environment.ec.europa.eu'] },
  { match: /\bCSRD\b|\bESRS\b/i, domains: ['eur-lex.europa.eu', 'commission.europa.eu', 'efrag.org'] },
  { match: /\bSFDR\b|\bTaxonomy\b/i, domains: ['eur-lex.europa.eu', 'finance.ec.europa.eu'] },
  { match: /\bHKEX\b/i, domains: ['hkex.com.hk'] },
  { match: /\bSEBI\b/i, domains: ['sebi.gov.in'] },
  { match: /\bBursa Malaysia\b/i, domains: ['bursamalaysia.com'] },
  { match: /\bJSE\b/i, domains: ['jse.co.za'] },
  { match: /\bBangko Sentral ng Pilipinas\b|\bBSP\b/i, domains: ['bsp.gov.ph'] },
  { match: /\bCMVM\b/i, domains: ['cmvm.pt'] },
  { match: /\bFCA\b/i, domains: ['fca.org.uk'] },
  { match: /\bFRC\b/i, domains: ['frc.org.uk'] },
  { match: /\bCSSF\b/i, domains: ['cssf.lu'] },
]

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'under', 'over', 'about', 'this', 'that', 'these', 'those',
  'law', 'laws', 'act', 'code', 'rules', 'rule', 'guideline', 'guidelines', 'guide', 'framework', 'policy',
  'regulation', 'regulations', 'directive', 'order', 'decree', 'standard', 'standards', 'reporting', 'report',
  'sustainability', 'sustainable', 'corporate', 'business', 'companies', 'company', 'public', 'private',
  'disclosure', 'financial', 'social', 'environmental', 'climate', 'general', 'national', 'international',
  'requirements', 'requirement', 'recommendation', 'recommendations', 'regarding', 'amending', 'amendments',
  'entities', 'entity', 'listed', 'market', 'markets',
])

function getArg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] || null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function normalizeText(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token))
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function parseEnvFile(text) {
  return Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=')
        return [key, rest.join('=')]
      })
  )
}

async function loadEnv() {
  const envText = await readFile(path.join(REPO_ROOT, '.env.local'), 'utf8')
  return parseEnvFile(envText)
}

async function runCurl(args, { encoding = 'utf8', maxBuffer = 24 * 1024 * 1024 } = {}) {
  const result = await execFile('curl', ['-L', '-s', '--compressed', '--max-time', CURL_TIMEOUT_SECONDS, ...args], {
    encoding,
    maxBuffer,
  })
  return result.stdout
}

async function fetchJsonPages(baseUrl, anonKey, table, select) {
  const rows = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=id.asc&limit=${pageSize}&offset=${offset}`
    const response = await runCurl([
      url,
      '-H',
      `apikey: ${anonKey}`,
      '-H',
      `Authorization: Bearer ${anonKey}`,
    ])
    const pageRows = JSON.parse(response)
    rows.push(...pageRows)
    if (pageRows.length < pageSize) break
    offset += pageSize
  }

  return rows
}

function isArchivedSourceUrl(url) {
  return (url || '').trim().toLowerCase().startsWith(ARCHIVED_SOURCE_PREFIX.toLowerCase())
}

function isCarrotsSourceUrl(url) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

function looksLikeExternalSourceUrl(url) {
  const normalized = (url || '').trim().toLowerCase()
  return Boolean(normalized) && !isArchivedSourceUrl(normalized) && !isCarrotsSourceUrl(normalized)
}

function looksLikePdfUrl(url) {
  const normalized = (url || '').trim().toLowerCase()
  return normalized.endsWith('.pdf') || normalized.includes('/pdf') || normalized.includes('pdflink') || normalized.includes('/document/')
}

function extractIdentifiers(text) {
  const raw = text || ''
  const patterns = [
    /\b(?:celex[:\s])?[0-9]{4}[a-z]?[0-9]{3,5}\b/gi,
    /\b(?:law|act|decree|order|regulation|directive|circular|ordinance|rule|rules|guideline|guidelines|resolution|recommendation|standard|standards)\s+(?:no\.?\s*)?[a-z0-9./()-]{2,40}\b/gi,
    /\b[0-9]{4}[/-][0-9]{1,5}\b/g,
    /\b[0-9]{1,4}[/-][0-9]{4}\b/g,
    /\b(?:ifrs|esrs|gri|sasb|tcfd|tnfd|csrd|sfdr|cbam|eudr)\s*[a-z0-9-]{0,12}\b/gi,
  ]

  const identifiers = []
  for (const pattern of patterns) {
    for (const match of raw.match(pattern) || []) {
      identifiers.push(normalizeText(match))
    }
  }
  return unique(identifiers)
}

function getRegulationKeywords(regulation) {
  const title = regulation.formal_title || regulation.title
  const titleTokens = tokenize(title)
  const regionTokens = tokenize(regulation.region)
  const sourceTokens = tokenize(regulation.source_name)
  return {
    title,
    normalizedTitle: normalizeText(title),
    tokens: unique([...titleTokens.slice(0, 18), ...regionTokens.slice(0, 4), ...sourceTokens.slice(0, 4)]),
    identifiers: extractIdentifiers(title),
  }
}

function scoreTokenOverlap(regulationKeywords, bodyText) {
  const bodyTokens = new Set(tokenize(bodyText))
  const matched = regulationKeywords.tokens.filter((token) => bodyTokens.has(token))
  return regulationKeywords.tokens.length ? matched.length / regulationKeywords.tokens.length : 0
}

function scoreIdentifiers(regulationKeywords, haystack) {
  const normalized = normalizeText(haystack)
  const matched = regulationKeywords.identifiers.filter((identifier) => normalized.includes(identifier))
  return {
    score: matched.length ? Math.min(1, matched.length / Math.max(1, regulationKeywords.identifiers.length)) : 0,
    matched,
  }
}

function extractHost(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function hostMatchesGuessedDomains(host, guessedDomains) {
  return guessedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function extractSearchResults(rssXml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let itemMatch
  while ((itemMatch = itemRegex.exec(rssXml))) {
    const block = itemMatch[1]
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '')
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '')
    if (link) items.push({ title, link })
  }
  return items
}

function formatTsObject(entries) {
  const lines = [
    '// Generated by scripts/find-official-source-urls.mjs',
    '// High-confidence validated official source URLs recovered from live regulation data, archived PDFs, and issuer-domain search.',
    '',
    'export const VALIDATED_OFFICIAL_SOURCE_URL_OVERRIDES: Record<string, string> = {',
  ]

  for (const [regulationId, value] of entries) {
    lines.push(`  '${regulationId}': '${value.url.replace(/'/g, "\\'")}',`)
  }

  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

function guessDomains(regulation) {
  const guesses = new Set()
  const title = `${regulation.title} ${regulation.formal_title || ''} ${regulation.source_name || ''}`

  if (REGION_DOMAIN_GUESSES[regulation.region]) {
    REGION_DOMAIN_GUESSES[regulation.region].forEach((domain) => guesses.add(domain))
  }

  for (const hint of TITLE_DOMAIN_HINTS) {
    if (hint.match.test(title)) {
      hint.domains.forEach((domain) => guesses.add(domain))
    }
  }

  return [...guesses]
}

function scoreDomain(host, regulation, guessedDomains) {
  if (!host) return -100
  if (BAD_SOURCE_DOMAINS.some((domain) => host.includes(domain))) return -100
  if (host.includes('carrotsandsticks.org') || host.includes('supabase.co')) return -100

  let score = 0
  const matchesGuess = hostMatchesGuessedDomains(host, guessedDomains)

  if (guessedDomains.length > 0) {
    if (matchesGuess) score += 75
  } else if (/gov|gouv|legislation|legis|parliament|justice|senate|congress|minister|ministry|commission|officialgazette|gazette|statutebook|lovdata|e-tar|e-qanun|finlex|legilux|riksdagen|regjeringen|eur-lex|europa|esma|ifrs|oecd|globalreporting|tnfd|sciencebasedtargets|integratedreporting|ilo|ifc|icmm/.test(host)) {
    score += 35
  }

  if (/gov|gouv|legislation|legis|parliament|justice|senate|congress|minister|ministry|commission|officialgazette|gazette|statutebook|lovdata|e-tar|e-qanun|finlex|legilux|riksdagen|regjeringen|eur-lex|europa|esma|ifrs|oecd|globalreporting|tnfd|sciencebasedtargets|integratedreporting|ilo|ifc|icmm/.test(host)) score += 15
  if (/exchange|stock|bourse|börse|borsa|nasdaq|hkex|jse|bursa|sgx|sec|cmvm|cssf|bafin|fca|frc|xrb|asx|ojk|bsp/.test(host)) score += 10
  if (host.endsWith('.gov') || /\.gov\.[a-z]{2}$/.test(host)) score += 10
  if (/\.(eu|int|gov|gob|gc\.ca|govt\.nz|gov\.uk)$/.test(host)) score += 10
  if (regulation.region === 'EU' && (host.includes('europa.eu') || host.includes('eur-lex.europa.eu'))) score += 10

  return score
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function extractPdfTextFromBytes(bytes) {
  try {
    const doc = await pdfjsLib.getDocument({
      data: bytes,
      standardFontDataUrl: PDFJS_STANDARD_FONTS,
      verbosity: 0,
    }).promise
    let text = ''
    for (let pageIndex = 1; pageIndex <= Math.min(doc.numPages, 3); pageIndex += 1) {
      const page = await doc.getPage(pageIndex)
      const content = await page.getTextContent()
      text += `${content.items.map((item) => item.str).join(' ')}\n`
    }
    return text.trim()
  } catch {
    return ''
  }
}

async function fetchValidationPayload(url) {
  const headers = await runCurl(['-I', url])
  const finalUrl = (headers.match(/^location:\s*(.+)$/gim)?.slice(-1)?.[0]?.replace(/^location:\s*/i, '').trim()) || url
  const contentType = (headers.match(/^content-type:\s*(.+)$/gim)?.slice(-1)?.[0]?.replace(/^content-type:\s*/i, '').trim()) || ''
  const body = await runCurl(['--range', `0-${MAX_BODY_BYTES}`, url], { encoding: 'buffer', maxBuffer: MAX_BODY_BYTES * 2 })
  return { headers, finalUrl, contentType, body }
}

async function validateCandidate(url, regulation, guessedDomains) {
  if (!url || !url.startsWith('http')) return null
  const host = extractHost(url)
  const domainScore = scoreDomain(host, regulation, guessedDomains)
  if (domainScore < 0) return null

  let payload
  try {
    payload = await fetchValidationPayload(url)
  } catch {
    return null
  }

  const finalUrl = payload.finalUrl
  const finalHost = extractHost(finalUrl)
  const finalDomainScore = scoreDomain(finalHost, regulation, guessedDomains)
  if (finalDomainScore < 0) return null

  const keywords = getRegulationKeywords(regulation)
  const headerContentType = payload.contentType.toLowerCase()
  const treatAsPdf = headerContentType.includes('pdf') || looksLikePdfUrl(finalUrl)
  const evidenceText = treatAsPdf
    ? await extractPdfTextFromBytes(new Uint8Array(payload.body))
    : stripHtml(payload.body.toString('utf8'))

  const overlapScore = scoreTokenOverlap(keywords, evidenceText)
  const identifierMatch = scoreIdentifiers(keywords, `${finalUrl} ${evidenceText}`)
  const exactTitleMatch = keywords.normalizedTitle && normalizeText(evidenceText).includes(keywords.normalizedTitle)

  let score = finalDomainScore
  score += overlapScore * 50
  score += identifierMatch.score * 40
  if (exactTitleMatch) score += 30

  return {
    url,
    finalUrl,
    host: finalHost,
    contentType: headerContentType,
    overlapScore,
    identifierScore: identifierMatch.score,
    matchedIdentifiers: identifierMatch.matched,
    exactTitleMatch,
    score,
  }
}

function buildSearchQueries(regulation, guessedDomains) {
  const baseTitle = (regulation.formal_title || regulation.title || '').replace(/\s+/g, ' ').trim()
  const titleQuery = baseTitle.length > 160 ? regulation.title : baseTitle
  const queries = []

  for (const domain of guessedDomains.slice(0, 3)) {
    queries.push(`site:${domain} "${titleQuery}"`)
  }

  queries.push(`"${titleQuery}" ${regulation.region}`)
  if (regulation.title && regulation.formal_title && regulation.formal_title !== regulation.title) {
    queries.push(`"${regulation.title}" ${regulation.region}`)
  }

  queries.push(`${regulation.title} ${regulation.region} official`)
  return unique(queries).slice(0, 5)
}

async function searchCandidates(regulation, guessedDomains) {
  const urls = new Set()
  for (const query of buildSearchQueries(regulation, guessedDomains)) {
    let rss
    try {
      rss = await runCurl([`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`])
    } catch {
      continue
    }
    for (const item of extractSearchResults(rss).slice(0, SEARCH_RESULT_LIMIT)) {
      const candidateUrl = item.link?.trim()
      if (!candidateUrl || !candidateUrl.startsWith('http')) continue
      urls.add(candidateUrl)
    }
  }
  return [...urls]
}

function extractPolicyPrefixFromArchivedUrl(url) {
  const match = (url || '').match(/\/([^/]+?)-[0-9a-f]{10,}\.pdf$/i)
  return match?.[1] || null
}

async function buildPdfCandidateIndex(docs) {
  const pdfDir = getArg('--pdf-dir') || DEFAULT_PDF_DIR
  const fileNames = await readdir(pdfDir)
  const localPdfByPrefix = new Map(
    fileNames
      .map((name) => [name.match(/^(\d+_\d+)/)?.[1], path.join(pdfDir, name)])
      .filter(([prefix]) => prefix)
  )

  const candidatesByRegulationId = new Map()

  for (const document of docs) {
    const prefix = extractPolicyPrefixFromArchivedUrl(document.archived_public_url || document.document_url)
    if (!prefix) continue
    const localPath = localPdfByPrefix.get(prefix)
    if (!localPath) continue

    let bytes
    try {
      bytes = await readFile(localPath)
    } catch {
      continue
    }

    const urls = new Set()
    try {
      const pdfDoc = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        standardFontDataUrl: PDFJS_STANDARD_FONTS,
        verbosity: 0,
      }).promise

      for (let pageIndex = 1; pageIndex <= Math.min(pdfDoc.numPages, 6); pageIndex += 1) {
        const page = await pdfDoc.getPage(pageIndex)
        const annotations = await page.getAnnotations()
        for (const annotation of annotations) {
          const url = (annotation.url || annotation.unsafeUrl || '').trim()
          if (url.startsWith('http')) urls.add(url)
        }

        const content = await page.getTextContent()
        const text = content.items.map((item) => item.str).join(' ')
        for (const match of text.match(/(?:https?:\/\/|www\.)[^\s)>,;"]+/gi) || []) {
          const normalized = match.startsWith('http') ? match : `https://${match}`
          urls.add(normalized.replace(/[),.;]+$/, ''))
        }
      }
    } catch {
      // Fall back to raw byte scanning below.
    }

    const rawMatches = bytes.toString('latin1').match(/https?:\/\/[^\s<>{}"\\]+/g) || []
    for (const match of rawMatches) {
      urls.add(match.replace(/[),.;]+$/, ''))
    }

    const filteredUrls = unique(
      [...urls].filter((url) => {
        const lower = url.toLowerCase()
        return url.startsWith('http') && !BAD_SOURCE_DOMAINS.some((domain) => lower.includes(domain))
      })
    )

    if (filteredUrls.length) {
      candidatesByRegulationId.set(document.regulation_id, filteredUrls)
    }
  }

  return candidatesByRegulationId
}

async function loadCurrentOverrideCandidates() {
  const manualText = await readFile(path.join(REPO_ROOT, 'src/lib/manualSourceLinkFallbacks.ts'), 'utf8')
  const manualMatches = [...manualText.matchAll(/'([0-9a-f-]{36})': \{ url: '([^']+)', kind: '([^']+)' \}/g)]
  const manual = Object.fromEntries(manualMatches.map(([, regulationId, url, kind]) => [regulationId, { url, kind }]))

  const overrideText = await readFile(path.join(REPO_ROOT, 'src/lib/officialSourceUrlOverrides.ts'), 'utf8')
  const overrideMatches = [...overrideText.matchAll(/'([0-9a-f-]{36})': '([^']+)'/g)]
  const overrides = Object.fromEntries(overrideMatches.map(([, regulationId, url]) => [regulationId, url]))

  return { manual, overrides }
}

async function main() {
  const env = await loadEnv()
  const baseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const limit = Number(getArg('--limit') || '0')
  const writeTs = hasFlag('--write-ts')
  const enableSearch = hasFlag('--search')

  const [regulations, documents, currentOverrideCandidates] = await Promise.all([
    fetchJsonPages(baseUrl, anonKey, 'regulations', 'id,title,formal_title,region,source_name,source_url,tags'),
    fetchJsonPages(baseUrl, anonKey, 'regulation_source_documents', 'regulation_id,document_type,document_url,source_url,archived_public_url'),
    loadCurrentOverrideCandidates(),
  ])

  const recoverable = regulations.filter((regulation) => {
    if (looksLikeExternalSourceUrl(regulation.source_url)) return false
    if (currentOverrideCandidates.overrides[regulation.id]) return false
    if (currentOverrideCandidates.manual[regulation.id]?.kind === 'official') return false
    return true
  })

  const targetRegulations = limit > 0 ? recoverable.slice(0, limit) : recoverable
  const targetRegulationIds = new Set(targetRegulations.map((regulation) => regulation.id))
  const targetDocuments = documents.filter((document) => targetRegulationIds.has(document.regulation_id))
  const pdfCandidateIndex = await buildPdfCandidateIndex(targetDocuments)
  const accepted = []
  const unresolved = []

  for (const regulation of targetRegulations) {
    const guessedDomains = guessDomains(regulation)
    const candidates = new Set()

    const currentSource = regulation.source_url?.trim()
    if (looksLikeExternalSourceUrl(currentSource)) candidates.add(currentSource)

    const manualCandidate = currentOverrideCandidates.manual[regulation.id]?.url
    if (manualCandidate && looksLikeExternalSourceUrl(manualCandidate)) candidates.add(manualCandidate)

    const overrideCandidate = currentOverrideCandidates.overrides[regulation.id]
    if (overrideCandidate && looksLikeExternalSourceUrl(overrideCandidate)) candidates.add(overrideCandidate)

    for (const candidate of pdfCandidateIndex.get(regulation.id) || []) {
      if (scoreDomain(extractHost(candidate), regulation, guessedDomains) >= 0) {
        candidates.add(candidate)
      }
    }

    const candidateList = [...candidates].slice(0, 8)
    const validated = []
    for (const candidate of candidateList) {
      const result = await validateCandidate(candidate, regulation, guessedDomains)
      if (result) validated.push({ ...result, source: 'archive_or_existing' })
    }

    if (enableSearch && (!validated.length || Math.max(...validated.map((result) => result.score)) < 75)) {
      const searchUrls = await searchCandidates(regulation, guessedDomains)
      for (const candidate of searchUrls) {
        if (candidates.has(candidate)) continue
        const result = await validateCandidate(candidate, regulation, guessedDomains)
        if (result) validated.push({ ...result, source: 'search' })
      }
    }

    validated.sort((left, right) => right.score - left.score)
    const winner = validated[0]
    const winnerMatchesGuessedDomain = winner ? hostMatchesGuessedDomains(winner.host, guessedDomains) : false
    const winnerTrustedArchiveHost = winner ? TRUSTED_ARCHIVE_HOST_SNIPPETS.some((snippet) => winner.host.includes(snippet)) : false
    const passesStandardEvidence = winner && winner.score >= 75 && (winner.exactTitleMatch || winner.identifierScore >= 0.3 || winner.overlapScore >= 0.22)
    const passesTrustedArchiveEvidence =
      winner &&
      winner.source === 'archive_or_existing' &&
      winnerTrustedArchiveHost &&
      winner.score >= 75
    const passesGuessedArchiveEvidence =
      winner &&
      winner.source === 'archive_or_existing' &&
      winnerMatchesGuessedDomain &&
      (winner.exactTitleMatch || winner.identifierScore >= 0.3 || winner.overlapScore >= 0.35)

    if (passesStandardEvidence || passesTrustedArchiveEvidence || passesGuessedArchiveEvidence) {
      accepted.push({
        regulation_id: regulation.id,
        title: regulation.title,
        region: regulation.region,
        source_name: regulation.source_name,
        url: winner.finalUrl || winner.url,
        host: winner.host,
        score: winner.score,
        overlap_score: winner.overlapScore,
        identifier_score: winner.identifierScore,
        exact_title_match: winner.exactTitleMatch,
        matched_identifiers: winner.matchedIdentifiers,
        recovery_source: winner.source,
      })
    } else {
      unresolved.push({
        regulation_id: regulation.id,
        title: regulation.title,
        region: regulation.region,
        source_name: regulation.source_name,
        guessed_domains: guessedDomains,
        top_candidates: validated.slice(0, 5),
      })
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    total_regulations: regulations.length,
    recoverable_missing: recoverable.length,
    processed: targetRegulations.length,
    accepted_count: accepted.length,
    unresolved_count: unresolved.length,
    accepted,
    unresolved,
  }

  await writeFile(OUTPUT_JSON, JSON.stringify(payload, null, 2))

  if (writeTs) {
    const sortedEntries = accepted
      .map((entry) => [entry.regulation_id, { url: entry.url }])
      .sort((left, right) => left[0].localeCompare(right[0]))
    await writeFile(OUTPUT_TS, formatTsObject(sortedEntries))
  }

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_ts: writeTs ? OUTPUT_TS : null,
    search_enabled: enableSearch,
    recoverable_missing: recoverable.length,
    processed: targetRegulations.length,
    accepted_count: accepted.length,
    unresolved_count: unresolved.length,
    sample_accepted: accepted.slice(0, 10),
    sample_unresolved: unresolved.slice(0, 5),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
