#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const execFile = promisify(execFileCallback)

const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30.zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw'
const ARCHIVE_BUCKET = 'regulation-source-archives'
const VERSION_LABEL = 'official-source-pdf'
const PDFJS_STANDARD_FONTS = new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href
const CURL_TIMEOUT_SECONDS = '30'
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
const REPORT_PATH = '/tmp/official-pdf-import-report.json'

function getArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function getArgValues(name) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1])
    }
  }
  return values
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function chunk(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function sanitizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripInvalidUnicode(value) {
  let result = ''

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1)
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        result += value[index] + value[index + 1]
        index += 1
      }
      continue
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) continue
    if (codeUnit === 0x0000) continue

    const isAllowedControl = codeUnit === 0x0009 || codeUnit === 0x000a || codeUnit === 0x000d
    if (codeUnit < 0x0020 && !isAllowedControl) continue

    result += value[index]
  }

  return result
}

function sanitizeDbText(value, { collapseWhitespace = false } = {}) {
  if (typeof value !== 'string') return value

  let sanitized = value
  try {
    sanitized = sanitized.normalize('NFKC')
  } catch {
    // ignore malformed normalization failures
  }

  sanitized = stripInvalidUnicode(sanitized)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')

  return collapseWhitespace ? sanitizeWhitespace(sanitized) : sanitized.trim()
}

function sanitizePayload(value) {
  if (typeof value === 'string') return sanitizeDbText(value)
  if (Array.isArray(value)) return value.map((item) => sanitizePayload(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, sanitizePayload(nestedValue)]))
  }
  return value
}

function isCarrotsUrl(url) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

function isSupabaseArchiveUrl(url) {
  return (url || '').trim().toLowerCase().includes('/storage/v1/object/public/regulation-source-archives/')
}

function isTrustedDbUrl(url) {
  const normalized = (url || '').trim()
  return !!normalized && !isCarrotsUrl(normalized) && !isSupabaseArchiveUrl(normalized)
}

function isOfficialPublisherHost(url) {
  const host = extractHost(url)
  if (!host) return false
  if (/icdst\.org$/.test(host)) return false

  return (
    /(^|\.)gov(\.|$)/.test(host) ||
    /(^|\.)gouv\./.test(host) ||
    /(^|\.)europa\.eu$/.test(host) ||
    /(^|\.)eur-lex\.europa\.eu$/.test(host) ||
    /(^|\.)legislation\./.test(host) ||
    /(^|\.)sec\.gov$/.test(host) ||
    /(^|\.)ifrs\.org$/.test(host) ||
    /(^|\.)sasb\.ifrs\.org$/.test(host) ||
    /(^|\.)globalreporting\.org$/.test(host) ||
    /(^|\.)sciencebasedtargets\.org$/.test(host) ||
    /(^|\.)lovdata\.no$/.test(host) ||
    /(^|\.)parl\.ca$/.test(host) ||
    /(^|\.)cmfchile\.cl$/.test(host) ||
    /(^|\.)ssb-j\.jp$/.test(host) ||
    /(^|\.)fsc\.gov\.tw$/.test(host) ||
    /(^|\.)gpw\.pl$/.test(host) ||
    /(^|\.)psoj\.org$/.test(host) ||
    /(^|\.)asean-csr-network\.org$/.test(host) ||
    /(^|\.)jrc\.ec\.europa\.eu$/.test(host) ||
    /(^|\.)publications\.jrc\.ec\.europa\.eu$/.test(host)
  )
}

function looksLikePdfUrl(url) {
  const normalized = (url || '').trim().toLowerCase()
  return (
    normalized.endsWith('.pdf') ||
    normalized.includes('.pdf?') ||
    normalized.includes('/pdf') ||
    normalized.includes('pdf.ashx') ||
    normalized.includes('/document/download')
  )
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

function getKeywordProfile(regulation) {
  const title = regulation.formal_title || regulation.title
  return {
    title,
    normalizedTitle: normalizeText(title),
    tokens: unique([...tokenize(title).slice(0, 18), ...tokenize(regulation.region).slice(0, 4), ...tokenize(regulation.source_name).slice(0, 4)]),
    identifiers: extractIdentifiers(title),
  }
}

function extractHost(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function getRootDomain(host) {
  const parts = host.split('.').filter(Boolean)
  if (parts.length <= 2) return host

  const specialSuffixes = [
    'co.uk', 'gov.uk', 'org.uk', 'ac.uk',
    'com.au', 'gov.au', 'edu.au',
    'gov.br', 'com.br',
    'gov.cn', 'gov.in', 'gov.ph', 'gov.za', 'co.za',
    'gov.hk',
  ]

  const lastTwo = parts.slice(-2).join('.')
  const lastThree = parts.slice(-3).join('.')

  if (specialSuffixes.includes(lastTwo)) return parts.slice(-3).join('.')
  if (specialSuffixes.includes(lastThree)) return parts.slice(-4).join('.')
  return lastTwo
}

function sameRootDomain(leftUrl, rightUrl) {
  const leftHost = extractHost(leftUrl)
  const rightHost = extractHost(rightUrl)
  if (!leftHost || !rightHost) return false
  return getRootDomain(leftHost) === getRootDomain(rightHost)
}

async function runCurl(args, { encoding = 'utf8', maxBuffer = 32 * 1024 * 1024 } = {}) {
  const result = await execFile('curl', ['-L', '--fail', '--compressed', '--http1.1', '--retry', '2', '--retry-delay', '1', '--max-time', CURL_TIMEOUT_SECONDS, '-A', 'Mozilla/5.0', ...args], {
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

function stripHtml(html) {
  return sanitizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  )
}

function discoverPdfLinks(html, baseUrl) {
  const base = new URL(baseUrl)
  const matches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]

  return unique(
    matches
      .map((match) => {
        try {
          return {
            url: new URL(match[1], base).toString(),
            anchorText: stripHtml(match[2] || ''),
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .filter((entry) => looksLikePdfUrl(entry.url))
  )
}

function scoreTokenOverlap(keywords, text) {
  const bodyTokens = new Set(tokenize(text))
  const matched = keywords.tokens.filter((token) => bodyTokens.has(token))
  return keywords.tokens.length ? matched.length / keywords.tokens.length : 0
}

function scoreIdentifiers(keywords, haystack) {
  const normalized = normalizeText(haystack)
  const matched = keywords.identifiers.filter((identifier) => normalized.includes(identifier))
  return {
    score: matched.length ? Math.min(1, matched.length / Math.max(1, keywords.identifiers.length)) : 0,
    matched,
  }
}

async function downloadBinary(url) {
  return runCurl(['--range', `0-${MAX_DOWNLOAD_BYTES}`, url], { encoding: 'buffer', maxBuffer: MAX_DOWNLOAD_BYTES * 2 })
}

async function extractPdfText(bytes) {
  try {
    const task = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      useWorkerFetch: false,
      isEvalSupported: false,
      standardFontDataUrl: PDFJS_STANDARD_FONTS,
      verbosity: 0,
    })
    const pdf = await task.promise
    const pages = []

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 3); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      pages.push(textContent.items.map((item) => item.str || '').join(' '))
    }

    return sanitizeDbText(pages.join(' '), { collapseWhitespace: true })
  } catch {
    return ''
  }
}

async function validateDirectPdf(url, regulation) {
  const keywords = getKeywordProfile(regulation)
  const bytes = await downloadBinary(url)
  const text = await extractPdfText(bytes)
  const overlap = scoreTokenOverlap(keywords, text)
  const identifierMatch = scoreIdentifiers(keywords, `${url} ${text}`)
  const exactTitleMatch = keywords.normalizedTitle && normalizeText(text).includes(keywords.normalizedTitle)
  const score = 60 + overlap * 20 + identifierMatch.score * 20 + (exactTitleMatch ? 20 : 0)
  const officialHost = isOfficialPublisherHost(url)

  return {
    accepted:
      (score >= 70 && (exactTitleMatch || identifierMatch.score >= 0.2 || overlap >= 0.18)) ||
      (officialHost && score >= 60),
    score,
    bytes,
    extractedText: text,
    evidence: {
      officialHost,
      exactTitleMatch,
      overlap,
      identifierScore: identifierMatch.score,
      matchedIdentifiers: identifierMatch.matched,
    },
  }
}

async function findPdfFromPolicyPage(pageUrl, regulation) {
  const html = await runCurl([pageUrl])
  const pageText = stripHtml(html)
  const pageKeywords = getKeywordProfile(regulation)
  const links = discoverPdfLinks(html, pageUrl)

  const candidates = []
  for (const link of links) {
    if (!sameRootDomain(pageUrl, link.url)) continue

    const anchorText = link.anchorText || ''
    const urlAndAnchor = `${link.url} ${anchorText}`
    const overlap = scoreTokenOverlap(pageKeywords, urlAndAnchor)
    const identifierMatch = scoreIdentifiers(pageKeywords, urlAndAnchor)
    let score = 40
    if (extractHost(link.url) === extractHost(pageUrl)) score += 15
    if (sameRootDomain(link.url, pageUrl)) score += 10
    if (/pdf|download|document|annex|standard|guidance|proposal|regulation/i.test(urlAndAnchor)) score += 10
    if (links.length === 1) score += 10
    score += overlap * 20
    score += identifierMatch.score * 20

    candidates.push({
      pageUrl,
      pdfUrl: link.url,
      anchorText,
      score,
      pageOverlap: scoreTokenOverlap(pageKeywords, pageText),
      pageIdentifierScore: scoreIdentifiers(pageKeywords, `${pageUrl} ${pageText}`).score,
      identifierScore: identifierMatch.score,
      overlap,
    })
  }

  candidates.sort((left, right) => right.score - left.score)
  const top = candidates[0]
  if (!top) return null

  const validation = await validateDirectPdf(top.pdfUrl, regulation)
  const combinedScore = top.score + Math.max(0, validation.score - 60)
  const accepted =
    validation.accepted &&
    combinedScore >= 85 &&
    (top.identifierScore >= 0.2 || top.overlap >= 0.15 || links.length === 1)

  return {
    accepted,
    pdfUrl: top.pdfUrl,
    pageUrl,
    anchorText: top.anchorText,
    score: combinedScore,
    bytes: validation.bytes,
    extractedText: validation.extractedText,
    evidence: {
      ...validation.evidence,
      pageOverlap: top.pageOverlap,
      pageIdentifierScore: top.pageIdentifierScore,
      anchorOverlap: top.overlap,
      anchorIdentifierScore: top.identifierScore,
      discoveredPdfCount: links.length,
    },
  }
}

function chunkText(text, maxLength = 1400) {
  const normalized = sanitizeDbText(text, { collapseWhitespace: true })
  if (!normalized) return []

  const chunks = []
  let start = 0
  while (start < normalized.length) {
    chunks.push(normalized.slice(start, start + maxLength))
    start += maxLength
  }
  return chunks
}

async function upsertSourceDocument(supabase, payload) {
  const sanitizedPayload = sanitizePayload(payload)
  const { data: existing, error: findError } = await supabase
    .from('regulation_source_documents')
    .select('id')
    .eq('regulation_id', sanitizedPayload.regulation_id)
    .eq('source_url', sanitizedPayload.source_url)
    .eq('document_url', sanitizedPayload.document_url)
    .eq('version_label', sanitizedPayload.version_label)
    .maybeSingle()

  if (findError) throw new Error(`Failed to find source document: ${findError.message}`)

  if (existing?.id) {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .update(sanitizedPayload)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw new Error(`Failed to update source document: ${error.message}`)
    return data.id
  }

  const { data, error } = await supabase
    .from('regulation_source_documents')
    .insert(sanitizedPayload)
    .select('id')
    .single()
  if (error) throw new Error(`Failed to insert source document: ${error.message}`)
  return data.id
}

async function replaceChunks(supabase, documentId, regulationId, extractedText) {
  const { error: deleteError } = await supabase
    .from('regulation_source_chunks')
    .delete()
    .eq('document_id', documentId)
  if (deleteError) throw new Error(`Failed to clear source chunks: ${deleteError.message}`)

  const chunkRows = chunkText(extractedText).map((content, chunkIndex) => ({
    document_id: documentId,
    regulation_id: regulationId,
    chunk_index: chunkIndex,
    content: sanitizeDbText(content, { collapseWhitespace: true }),
  }))

  if (chunkRows.length === 0) return 0

  for (const rowsChunk of chunk(chunkRows, 200)) {
    const { error } = await supabase.from('regulation_source_chunks').insert(rowsChunk)
    if (error) throw new Error(`Failed to insert source chunks: ${error.message}`)
  }

  return chunkRows.length
}

async function uploadArchivedCopy(supabase, { storagePath, data, contentType }) {
  const { error } = await supabase.storage.from(ARCHIVE_BUCKET).upload(storagePath, data, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`storage upload failed: ${error.message}`)

  const { data: publicUrlData } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath)
  return publicUrlData.publicUrl
}

function buildArchivePath({ regulationId, contentHash }) {
  return `${regulationId}/${VERSION_LABEL}/official-${contentHash.slice(0, 12)}.pdf`
}

function sortEligibleRegulations(regulations) {
  const score = (regulation) => {
    const directOfficialPdf = isTrustedDbUrl(regulation.official_source_url) && looksLikePdfUrl(regulation.official_source_url)
    const directPolicyPdf = isTrustedDbUrl(regulation.policy_page_url) && looksLikePdfUrl(regulation.policy_page_url)
    const hasPolicyPage = isTrustedDbUrl(regulation.policy_page_url)
    const hasOfficialPage = isTrustedDbUrl(regulation.official_source_url)

    if (directOfficialPdf || directPolicyPdf) return 0
    if (hasPolicyPage) return 1
    if (hasOfficialPage) return 2
    return 3
  }

  return [...regulations].sort((left, right) => {
    const leftScore = score(left)
    const rightScore = score(right)
    if (leftScore !== rightScore) return leftScore - rightScore
    return String(left.title || '').localeCompare(String(right.title || ''))
  })
}

async function main() {
  const dryRun = hasFlag('--dry-run')
  const limit = Number(getArg('--limit') || '0') || 0
  const requestedRegulationIds = new Set(getArgValues('--regulation-id'))
  const supabaseUrl = getArg('--supabase-url') || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!dryRun && !serviceRoleKey) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY to upload official PDFs, or use --dry-run.')
  }

  const readClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const writeClient = !dryRun
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null

  const [regulations, sourceDocuments] = await Promise.all([
    fetchJsonPages(supabaseUrl, supabaseAnonKey, 'regulations', 'id,title,formal_title,region,source_name,official_source_url,policy_page_url'),
    fetchJsonPages(supabaseUrl, supabaseAnonKey, 'regulation_source_documents', 'regulation_id,document_type,document_url,archived_public_url'),
  ])

  const pdfRegIds = new Set(sourceDocuments.filter((document) => document.document_type === 'pdf').map((document) => String(document.regulation_id)))
  const eligible = sortEligibleRegulations(regulations
    .filter((regulation) => !pdfRegIds.has(String(regulation.id)))
    .filter((regulation) => isTrustedDbUrl(regulation.official_source_url) || isTrustedDbUrl(regulation.policy_page_url))
    .filter((regulation) => requestedRegulationIds.size === 0 || requestedRegulationIds.has(String(regulation.id))))

  const selected = limit > 0 ? eligible.slice(0, limit) : eligible

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    total_regulations: regulations.length,
    existing_pdf_regulations: pdfRegIds.size,
    eligible_missing_pdf_regulations: eligible.length,
    processed: selected.length,
    imported: 0,
    accepted: [],
    unresolved: [],
    failed: [],
  }

  for (const regulation of selected) {
    try {
      const sourceCandidates = unique([
        isTrustedDbUrl(regulation.policy_page_url) ? regulation.policy_page_url : null,
        isTrustedDbUrl(regulation.official_source_url) ? regulation.official_source_url : null,
      ])

      let winner = null

      for (const sourceCandidate of sourceCandidates) {
        if (looksLikePdfUrl(sourceCandidate)) {
          const directValidation = await validateDirectPdf(sourceCandidate, regulation)
          if (directValidation.accepted) {
            winner = {
              sourceUrl: regulation.policy_page_url || regulation.official_source_url || sourceCandidate,
              documentUrl: sourceCandidate,
              validation: directValidation,
              recoveryType: 'direct-official-pdf',
            }
            break
          }
          continue
        }

        const pageValidation = await findPdfFromPolicyPage(sourceCandidate, regulation)
        if (pageValidation?.accepted) {
          winner = {
            sourceUrl: sourceCandidate,
            documentUrl: pageValidation.pdfUrl,
            validation: pageValidation,
            recoveryType: 'policy-page-discovered-pdf',
          }
          break
        }
      }

      if (!winner) {
        report.unresolved.push({
          regulation_id: regulation.id,
          title: regulation.title,
          official_source_url: regulation.official_source_url,
          policy_page_url: regulation.policy_page_url,
        })
        continue
      }

      report.accepted.push({
        regulation_id: regulation.id,
        title: regulation.title,
        source_url: winner.sourceUrl,
        document_url: winner.documentUrl,
        recovery_type: winner.recoveryType,
        evidence: winner.validation.evidence,
      })

      if (dryRun) continue

      const bytes = winner.validation.bytes
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      const storagePath = buildArchivePath({ regulationId: regulation.id, contentHash: sha256 })
      const publicUrl = await uploadArchivedCopy(writeClient, {
        storagePath,
        data: bytes,
        contentType: 'application/pdf',
      })

      const now = new Date().toISOString()
      const documentId = await upsertSourceDocument(writeClient, {
        regulation_id: regulation.id,
        title: regulation.title,
        source_name: regulation.source_name || 'Official source PDF',
        source_url: winner.sourceUrl,
        official_source_url: regulation.official_source_url || null,
        policy_page_url: regulation.policy_page_url || null,
        source_link_kind: 'official',
        document_url: winner.documentUrl,
        document_type: 'pdf',
        version_label: VERSION_LABEL,
        archived_storage_path: storagePath,
        archived_public_url: publicUrl,
        archived_mime_type: 'application/pdf',
        content_sha256: sha256,
        fetch_status: winner.validation.extractedText ? 'indexed' : 'failed',
        error_message: winner.validation.extractedText ? null : 'Unable to extract text from official PDF.',
        extracted_text: winner.validation.extractedText || null,
        last_indexed_at: now,
        updated_at: now,
      })

      await replaceChunks(writeClient, documentId, regulation.id, winner.validation.extractedText)
      report.imported += 1
    } catch (error) {
      report.failed.push({
        regulation_id: regulation.id,
        title: regulation.title,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({
    report_path: REPORT_PATH,
    eligible_missing_pdf_regulations: report.eligible_missing_pdf_regulations,
    processed: report.processed,
    accepted: report.accepted.length,
    imported: report.imported,
    unresolved: report.unresolved.length,
    failed: report.failed.length,
    dry_run: dryRun,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
