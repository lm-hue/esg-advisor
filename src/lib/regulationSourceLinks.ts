import { Regulation, RegulationSourceDocument } from '../types'

const ARCHIVED_SOURCE_PREFIX = 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/'

function isCarrotsSourceUrl(url?: string | null) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

export function isArchivedSourceUrl(url?: string | null) {
  return (url || '').trim().toLowerCase().startsWith(ARCHIVED_SOURCE_PREFIX.toLowerCase())
}

export function sanitizeRegulationSourceUrl(url?: string | null) {
  const normalized = (url || '').trim()
  if (!normalized) return ''
  if (isCarrotsSourceUrl(normalized)) return ''
  return normalized
}

export function looksLikePdfUrl(url?: string | null) {
  const normalized = (url || '').trim().toLowerCase()
  return normalized.includes('/api/download-pdf') || normalized.endsWith('.pdf')
}

function collectUniqueUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const candidate of urls.map((url) => sanitizeRegulationSourceUrl(url))) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    unique.push(candidate)
  }

  return unique
}

export function getRegulationSourceLinks(
  regulation: Regulation,
  sourceDocuments: RegulationSourceDocument[] = [],
) {
  const officialCandidates = collectUniqueUrls([
    regulation.official_source_url,
    ...sourceDocuments.map((document) => document.official_source_url),
  ]).filter((url) => !isArchivedSourceUrl(url))

  const policyCandidates = collectUniqueUrls([
    regulation.policy_page_url,
    regulation.source_url,
    ...sourceDocuments.map((document) => document.policy_page_url),
    ...sourceDocuments.map((document) => document.source_url),
  ]).filter((url) => !isArchivedSourceUrl(url) && !looksLikePdfUrl(url))

  const officialWebsiteUrl = officialCandidates.find((url) => !looksLikePdfUrl(url)) || ''
  const officialSourcePdfUrl = officialCandidates.find((url) => looksLikePdfUrl(url)) || ''
  const policyPageUrl = policyCandidates.find((url) => url !== officialWebsiteUrl) || ''
  const primaryExternalUrl = policyPageUrl || officialWebsiteUrl || officialSourcePdfUrl || ''

  return {
    officialWebsiteUrl,
    officialSourcePdfUrl,
    policyPageUrl,
    primaryExternalUrl,
  }
}

export function getSourceDocumentDisplayHref(document: RegulationSourceDocument) {
  if (document.document_type === 'pdf') return sanitizeRegulationSourceUrl(document.archived_public_url)
  return sanitizeRegulationSourceUrl(document.document_url || document.official_source_url)
}

export function getSupabasePdfDocument(documents: RegulationSourceDocument[]) {
  return documents.find((document) => document.document_type === 'pdf' && !!sanitizeRegulationSourceUrl(document.archived_public_url))
}
