#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

const REPO_ROOT = '/Users/lucas/Documents/GitHub/esg-advisor'
const TMP_ROOT = '/tmp'
const OUTPUT_JSON = path.join(TMP_ROOT, 'policy-page-url-recovery.json')
const OUTPUT_SQL = path.join(TMP_ROOT, 'policy-page-url-recovery.sql')
const DEFAULT_CURL_TIMEOUT_SECONDS = '10'
const MAX_BODY_BYTES = 900_000
const DEFAULT_SEARCH_RESULT_LIMIT = 3

const BAD_SOURCE_DOMAINS = [
  'carrotsandsticks.org',
  'supabase.co',
  'w3.org',
  'adobe.com',
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
  'ecgi.global',
  'law-firm',
]

const REGION_DOMAIN_GUESSES = {
  EU: ['europa.eu', 'eur-lex.europa.eu', 'environment.ec.europa.eu', 'finance.ec.europa.eu', 'commission.europa.eu'],
  UK: ['gov.uk', 'legislation.gov.uk', 'fca.org.uk', 'frc.org.uk'],
  USA: ['sec.gov', 'ecfr.gov', 'epa.gov', 'dol.gov', 'govinfo.gov'],
  Australia: ['legislation.gov.au', 'asx.com.au', 'asic.gov.au', 'aasb.gov.au'],
  Canada: ['laws-lois.justice.gc.ca', 'canada.ca'],
  Jamaica: ['psoj.org', 'jse.com.jm'],
  Germany: ['gesetze-im-internet.de', 'bafin.de', 'bafa.de', 'bundesanzeiger.de'],
  France: ['legifrance.gouv.fr', 'amf-france.org', 'ecologie.gouv.fr'],
  Spain: ['boe.es', 'cnmv.es', 'miteco.gob.es'],
  Italy: ['normattiva.it', 'gazzettaufficiale.it', 'consob.it'],
  Japan: ['fsa.go.jp', 'meti.go.jp', 'env.go.jp', 'jpx.co.jp', 'ssb-j.jp'],
  Poland: ['gpw.pl', 'corp-gov.gpw.pl'],
  'Hong Kong': ['elegislation.gov.hk', 'hkex.com.hk', 'sfc.hk'],
  Singapore: ['sso.agc.gov.sg', 'mas.gov.sg', 'sgx.com'],
  Norway: ['regjeringen.no', 'lovdata.no', 'finanstilsynet.no'],
  Global: ['ifrs.org', 'globalreporting.org', 'oecd.org', 'sciencebasedtargets.org', 'tnfd.global', 'ilo.org'],
}

const TITLE_DOMAIN_HINTS = [
  { match: /\bESRS\b|\bCSRD\b/i, domains: ['eur-lex.europa.eu', 'commission.europa.eu', 'finance.ec.europa.eu'] },
  { match: /\bGreen Claims\b/i, domains: ['environment.ec.europa.eu', 'commission.europa.eu', 'europarl.europa.eu'] },
  { match: /\bEUDR\b|\bDeforestation\b/i, domains: ['environment.ec.europa.eu', 'eur-lex.europa.eu'] },
  { match: /\bSFDR\b|\bTaxonomy\b/i, domains: ['finance.ec.europa.eu', 'eur-lex.europa.eu'] },
  { match: /\bIFRS\b|\bISSB\b/i, domains: ['ifrs.org'] },
  { match: /\bSASB\b/i, domains: ['sasb.ifrs.org', 'ifrs.org'] },
  { match: /\bGRI\b/i, domains: ['globalreporting.org'] },
  { match: /\bOECD\b/i, domains: ['oecd.org'] },
  { match: /\bTNFD\b/i, domains: ['tnfd.global'] },
  { match: /\bTCFD\b/i, domains: ['fsb-tcfd.org', 'fsb.org'] },
  { match: /\bSBTi\b/i, domains: ['sciencebasedtargets.org'] },
  { match: /\bFCA\b/i, domains: ['fca.org.uk'] },
  { match: /\bSEBI\b/i, domains: ['sebi.gov.in'] },
  { match: /\bGPW\b|\bWSE\b/i, domains: ['gpw.pl', 'corp-gov.gpw.pl'] },
  { match: /\bPSOJ\b|Private Sector Organisation of Jamaica/i, domains: ['psoj.org'] },
]

const MANUAL_POLICY_PAGE_URLS = {
  '000e34f0-756f-54c9-8e07-083687b1afa1': 'https://www.meti.go.jp/english/press/2022/0913_001.html',
  '0018d0c0-4c26-518d-8b65-29b6e763e7cc': 'https://www.psoj.org/corporate-gov/',
  '0023d4b6-d3da-5e01-8b3e-1c9d0c27f6ad': 'https://www.gpw.pl/best-practice2021',
  '0038ed47-37c6-53f5-ac37-43daf2dabc83': 'https://sasb.ifrs.org/standards/renewable-resources-alternative-energy-industry-briefs/',
  '00490b37-3fac-5dd0-82cd-32817c7f8f62': 'https://laws-lois.justice.gc.ca/eng/regulations/SOR-90-97/',
  '00e16235-f0f5-58af-aed1-0019d823c430': 'https://brdr.hkma.gov.hk/eng/doc-ldg/docId/20230530-1-EN',
  '00e49101-aef5-5b72-b12c-45b5fbf7fb74': 'https://e-seimas.lrs.lt/portal/legalActEditions/lt/TAD/d4f29e12338d11efb121d2fe3a0eff27',
  '00fa6d8f-497b-5924-8565-31f824249e1b': 'https://www.globalreporting.org/standards/standards-development/review-of-the-universal-standards/',
  '01f6df13-31e9-5354-997b-f084d5495825': 'https://sasb.ifrs.org/standards/materiality-finder/find/?industry%5B0%5D=FN-IN',
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'under', 'over', 'about', 'this', 'that',
  'law', 'laws', 'act', 'code', 'rules', 'rule', 'guideline', 'guidelines', 'guide',
  'framework', 'policy', 'regulation', 'regulations', 'directive', 'order', 'decree',
  'standard', 'standards', 'reporting', 'report', 'sustainability', 'sustainable',
  'corporate', 'business', 'companies', 'company', 'public', 'private', 'disclosure',
  'financial', 'social', 'environmental', 'climate', 'general', 'national',
  'international', 'requirements', 'requirement', 'recommendation', 'recommendations',
  'amending', 'entities', 'entity', 'listed', 'market', 'markets',
])

function getArg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] || null
}

function hasFlag(name) {
  return process.argv.includes(name)
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
  const curlTimeoutSeconds = getArg('--timeout-sec') || DEFAULT_CURL_TIMEOUT_SECONDS
  const result = await execFile('curl', ['-L', '-s', '--compressed', '--max-time', curlTimeoutSeconds, ...args], {
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
    for (const match of raw.match(pattern) || []) identifiers.push(normalizeText(match))
  }
  return unique(identifiers)
}

function getRegulationKeywords(regulation) {
  const title = regulation.formal_title || regulation.title
  return {
    title,
    normalizedTitle: normalizeText(title),
    tokens: unique([...tokenize(title).slice(0, 18), ...tokenize(regulation.region).slice(0, 4), ...tokenize(regulation.source_name).slice(0, 4)]),
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

function extractHost(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isArchivedSourceUrl(url) {
  return (url || '').trim().toLowerCase().includes('/storage/v1/object/public/regulation-source-archives/')
}

function isCarrotsSourceUrl(url) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

function looksLikePdfUrl(url) {
  const normalized = (url || '').trim().toLowerCase()
  return normalized.endsWith('.pdf') || normalized.includes('/pdf') || normalized.includes('pdflink') || normalized.includes('/document/') || normalized.includes('/api/download-pdf')
}

function looksLikeExternalPageUrl(url) {
  const normalized = (url || '').trim().toLowerCase()
  return Boolean(normalized)
    && !isArchivedSourceUrl(normalized)
    && !isCarrotsSourceUrl(normalized)
    && !looksLikePdfUrl(normalized)
}

function hostMatchesGuessedDomains(host, guessedDomains) {
  return guessedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

function scoreDomain(host, guessedDomains) {
  if (!host) return -100
  if (BAD_SOURCE_DOMAINS.some((domain) => host.includes(domain))) return -100

  let score = 0
  if (guessedDomains.length > 0) {
    if (hostMatchesGuessedDomains(host, guessedDomains)) score += 80
  } else if (/gov|gouv|legislation|legis|parliament|justice|minister|ministry|commission|officialgazette|gazette|statutebook|lovdata|finlex|legilux|riksdagen|regjeringen|eur-lex|europa|esma|ifrs|oecd|globalreporting|tnfd|sciencebasedtargets|integratedreporting|ilo|ifc|icmm/.test(host)) {
    score += 35
  }

  if (/gov|gouv|legislation|legis|parliament|justice|minister|ministry|commission|officialgazette|gazette|statutebook|lovdata|finlex|legilux|riksdagen|regjeringen|eur-lex|europa|esma|ifrs|oecd|globalreporting|tnfd|sciencebasedtargets|integratedreporting|ilo|ifc|icmm/.test(host)) score += 20
  if (/exchange|stock|bourse|borsa|nasdaq|hkex|jse|bursa|sgx|sec|cmvm|cssf|bafin|fca|frc|xrb|ojk|bsp/.test(host)) score += 10
  return score
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

function guessDomains(regulation, documents) {
  const guesses = new Set()
  const title = `${regulation.title} ${regulation.formal_title || ''} ${regulation.source_name || ''}`

  for (const candidate of [regulation.official_source_url, regulation.source_url]) {
    if (looksLikeExternalPageUrl(candidate) || ((candidate || '').trim() && !looksLikePdfUrl(candidate) && !isCarrotsSourceUrl(candidate) && !isArchivedSourceUrl(candidate))) {
      const host = extractHost(candidate)
      if (host) guesses.add(host)
    }
  }

  for (const document of documents) {
    for (const candidate of [document.official_source_url, document.policy_page_url, document.source_url, document.document_url]) {
      if (looksLikeExternalPageUrl(candidate)) {
        const host = extractHost(candidate)
        if (host) guesses.add(host)
      }
    }
  }

  for (const domain of REGION_DOMAIN_GUESSES[regulation.region] || []) guesses.add(domain)
  for (const hint of TITLE_DOMAIN_HINTS) {
    if (hint.match.test(title)) {
      hint.domains.forEach((domain) => guesses.add(domain))
    }
  }

  return [...guesses]
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

async function fetchValidationPayload(url) {
  const headers = await runCurl(['-I', url])
  const finalUrl = (headers.match(/^location:\s*(.+)$/gim)?.slice(-1)?.[0]?.replace(/^location:\s*/i, '').trim()) || url
  const contentType = (headers.match(/^content-type:\s*(.+)$/gim)?.slice(-1)?.[0]?.replace(/^content-type:\s*/i, '').trim()) || ''
  const body = await runCurl(['--range', `0-${MAX_BODY_BYTES}`, url], { encoding: 'buffer', maxBuffer: MAX_BODY_BYTES * 2 })
  return { finalUrl, contentType, body }
}

async function validateCandidate(url, regulation, guessedDomains) {
  if (!url || !url.startsWith('http')) return null
  if (looksLikePdfUrl(url)) return null
  const host = extractHost(url)
  const domainScore = scoreDomain(host, guessedDomains)
  if (domainScore < 0) return null

  let payload
  try {
    payload = await fetchValidationPayload(url)
  } catch {
    return null
  }

  const finalUrl = payload.finalUrl
  if (looksLikePdfUrl(finalUrl)) return null
  const finalHost = extractHost(finalUrl)
  const finalDomainScore = scoreDomain(finalHost, guessedDomains)
  if (finalDomainScore < 0) return null

  const evidenceText = stripHtml(payload.body.toString('utf8'))
  const keywords = getRegulationKeywords(regulation)
  const overlapScore = scoreTokenOverlap(keywords, evidenceText)
  const identifierMatch = scoreIdentifiers(keywords, `${finalUrl} ${evidenceText}`)
  const exactTitleMatch = keywords.normalizedTitle && normalizeText(evidenceText).includes(keywords.normalizedTitle)
  const pathDepth = (() => {
    try {
      return new URL(finalUrl).pathname.split('/').filter(Boolean).length
    } catch {
      return 0
    }
  })()

  let score = finalDomainScore
  score += overlapScore * 50
  score += identifierMatch.score * 40
  if (exactTitleMatch) score += 30
  if (pathDepth > 1) score += 8
  if (pathDepth === 0) score -= 20

  return {
    url,
    finalUrl,
    host: finalHost,
    contentType: payload.contentType.toLowerCase(),
    overlapScore,
    identifierScore: identifierMatch.score,
    matchedIdentifiers: identifierMatch.matched,
    exactTitleMatch,
    score,
    pathDepth,
  }
}

async function searchCandidates(regulation, guessedDomains) {
  const urls = new Set()
  const searchResultLimit = Number(getArg('--search-result-limit') || DEFAULT_SEARCH_RESULT_LIMIT)
  for (const query of buildSearchQueries(regulation, guessedDomains)) {
    let rss
    try {
      rss = await runCurl([`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`])
    } catch {
      continue
    }
    for (const item of extractSearchResults(rss).slice(0, searchResultLimit)) {
      const candidateUrl = item.link?.trim()
      if (!candidateUrl || !candidateUrl.startsWith('http')) continue
      urls.add(candidateUrl)
    }
  }
  return [...urls]
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function deriveSiteRoot(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

function formatSql(accepted) {
  const lines = [
    '-- Generated by scripts/find-policy-page-urls.mjs',
    '-- Backfills researched official policy page URLs for regulations that still have policy_page_url blank.',
    '',
  ]

  for (const entry of accepted) {
    lines.push(`update public.regulations set policy_page_url = ${sqlString(entry.url)} where id::text = ${sqlString(entry.regulation_id)} and coalesce(policy_page_url, '') = '';`)
    lines.push(`update public.regulation_source_documents set policy_page_url = ${sqlString(entry.url)} where regulation_id::text = ${sqlString(entry.regulation_id)} and coalesce(policy_page_url, '') = '';`)
    if (entry.official_site_url) {
      lines.push(`update public.regulations set official_source_url = ${sqlString(entry.official_site_url)} where id::text = ${sqlString(entry.regulation_id)} and (coalesce(official_source_url, '') = '' or official_source_url = policy_page_url);`)
      lines.push(`update public.regulation_source_documents set official_source_url = ${sqlString(entry.official_site_url)} where regulation_id::text = ${sqlString(entry.regulation_id)} and (coalesce(official_source_url, '') = '' or official_source_url = policy_page_url);`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const env = await loadEnv()
  const baseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const limit = Number(getArg('--limit') || '0')
  const enableSearch = hasFlag('--search')

  const [regulations, documents] = await Promise.all([
    fetchJsonPages(baseUrl, anonKey, 'regulations', 'id,title,formal_title,region,source_name,source_url,official_source_url,policy_page_url,tags'),
    fetchJsonPages(baseUrl, anonKey, 'regulation_source_documents', 'regulation_id,document_type,document_url,source_url,official_source_url,policy_page_url,archived_public_url'),
  ])

  const documentsByRegulation = new Map()
  for (const document of documents) {
    const list = documentsByRegulation.get(document.regulation_id) || []
    list.push(document)
    documentsByRegulation.set(document.regulation_id, list)
  }

  const recoverable = regulations.filter((regulation) => !regulation.policy_page_url)
  const targetRegulations = limit > 0 ? recoverable.slice(0, limit) : recoverable
  const accepted = []
  const unresolved = []

  for (const regulation of targetRegulations) {
    const regulationDocuments = documentsByRegulation.get(regulation.id) || []
    const manualPolicyPageUrl = MANUAL_POLICY_PAGE_URLS[regulation.id]
    if (manualPolicyPageUrl) {
      accepted.push({
        regulation_id: regulation.id,
        title: regulation.title,
        region: regulation.region,
        source_name: regulation.source_name,
        url: manualPolicyPageUrl,
        host: extractHost(manualPolicyPageUrl),
        score: 100,
        overlap_score: 1,
        identifier_score: 1,
        exact_title_match: true,
        matched_identifiers: [],
        recovery_source: 'manual',
        official_site_url: deriveSiteRoot(manualPolicyPageUrl),
      })
      continue
    }

    const guessedDomains = guessDomains(regulation, regulationDocuments)
    const candidates = new Set()

    for (const candidate of [regulation.source_url, regulation.official_source_url]) {
      if (looksLikeExternalPageUrl(candidate)) candidates.add(candidate)
    }

    for (const document of regulationDocuments) {
      for (const candidate of [document.policy_page_url, document.document_url, document.source_url, document.official_source_url]) {
        if (looksLikeExternalPageUrl(candidate)) candidates.add(candidate)
      }
    }

    const validated = []
    for (const candidate of [...candidates].slice(0, 4)) {
      const result = await validateCandidate(candidate, regulation, guessedDomains)
      if (result) validated.push({ ...result, source: 'existing' })
    }

    if (enableSearch && (!validated.length || Math.max(...validated.map((result) => result.score)) < 78)) {
      const searchUrls = await searchCandidates(regulation, guessedDomains)
      for (const candidate of searchUrls) {
        if (candidates.has(candidate)) continue
        const result = await validateCandidate(candidate, regulation, guessedDomains)
        if (result) validated.push({ ...result, source: 'search' })
      }
    }

    validated.sort((left, right) => right.score - left.score)
    const winner = validated[0]
    const passes =
      winner &&
      winner.score >= 82 &&
      winner.pathDepth > 1 &&
      (winner.exactTitleMatch || winner.identifierScore >= 0.3 || winner.overlapScore >= 0.35)

    if (passes) {
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
        official_site_url: deriveSiteRoot(winner.finalUrl || winner.url),
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
  await writeFile(OUTPUT_SQL, formatSql(accepted))

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_sql: OUTPUT_SQL,
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
