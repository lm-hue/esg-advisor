import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const execFileAsync = promisify(execFile)
const ARCHIVE_BUCKET = 'regulation-source-archives'
const PDFJS_STANDARD_FONTS = new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href

function getArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

function getArgs(name) {
  const values = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1])
    }
  }
  return values
}

function required(name) {
  const value = getArg(name)
  if (!value) {
    throw new Error(`Missing required argument: ${name}`)
  }
  return value
}

function sanitizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
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

function discoverDocumentLinks(html, baseUrl) {
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  const base = new URL(baseUrl)

  return matches
    .map((match) => {
      try {
        return new URL(match[1], base).toString()
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .filter((url, index, array) => array.indexOf(url) === index)
    .filter((url) => url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('/pdf.ashx'))
    .slice(0, 3)
}

function unique(values) {
  return values.filter((value, index, array) => value && array.indexOf(value) === index)
}

async function removeStaleDocuments(supabase, { regulationId, versionLabel, allowedDocumentUrls }) {
  const { data: existingDocuments, error } = await supabase
    .from('regulation_source_documents')
    .select('id, document_url')
    .eq('regulation_id', regulationId)
    .eq('version_label', versionLabel)

  if (error) {
    throw new Error(error.message)
  }

  const staleIds = (existingDocuments || [])
    .filter((document) => !allowedDocumentUrls.has(document.document_url || '__source_entry__'))
    .map((document) => document.id)

  if (staleIds.length === 0) return

  const { error: deleteError } = await supabase
    .from('regulation_source_documents')
    .delete()
    .in('id', staleIds)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}

function chunkText(text, maxLength = 1400) {
  const normalized = sanitizeWhitespace(text)
  if (!normalized) return []

  const chunks = []
  let start = 0
  while (start < normalized.length) {
    chunks.push(normalized.slice(start, start + maxLength))
    start += maxLength
  }
  return chunks
}

async function curlText(url) {
  const { stdout } = await execFileAsync('curl', ['-L', '--fail', '--compressed', '-A', 'Mozilla/5.0', url], {
    maxBuffer: 20 * 1024 * 1024,
  })
  return stdout
}

async function extractPdfText(url) {
  try {
    const bytes = new Uint8Array(await downloadBinary(url))
    const task = pdfjsLib.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      standardFontDataUrl: PDFJS_STANDARD_FONTS,
      verbosity: 0,
    })
    const pdf = await task.promise
    const pages = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item) => item.str || '').join(' ')
      pages.push(sanitizeWhitespace(text))
    }

    return sanitizeWhitespace(pages.join(' '))
  } catch {
    return ''
  }
}

async function downloadBinary(url) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'esg-ai-binary-'))
  const filePath = path.join(tempDir, 'download.bin')

  try {
    await execFileAsync('curl', ['-L', '--fail', '-A', 'Mozilla/5.0', '-o', filePath, url], {
      maxBuffer: 20 * 1024 * 1024,
    })
    return await readFile(filePath)
  } catch {
    return Buffer.alloc(0)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function buildArchivePath({ regulationId, versionLabel, kind, extension, contentHash }) {
  const safeVersion = versionLabel.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const suffix = contentHash ? `-${contentHash.slice(0, 12)}` : ''
  return `${regulationId}/${safeVersion}/${kind}${suffix}.${extension}`
}

async function uploadArchivedCopy(supabase, { storagePath, data, contentType }) {
  const { error } = await supabase.storage.from(ARCHIVE_BUCKET).upload(storagePath, data, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(error.message)
  }

  const { data: publicUrlData } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath)
  return publicUrlData.publicUrl
}

async function archiveAndIndexDocument(supabase, document) {
  await upsertDocumentAndChunks(supabase, document)
}

async function findExistingDocument(supabase, { regulationId, sourceUrl, documentUrl }) {
  let query = supabase
    .from('regulation_source_documents')
    .select('id, archived_public_url')
    .eq('regulation_id', regulationId)
    .eq('source_url', sourceUrl)

  query = documentUrl ? query.eq('document_url', documentUrl) : query.is('document_url', null)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

async function upsertDocumentAndChunks(supabase, document) {
  const payload = {
    regulation_id: document.regulationId,
    title: document.title,
    source_name: document.sourceName,
    source_url: document.sourceUrl,
    document_url: document.documentUrl || null,
    document_type: document.documentType,
    version_label: document.versionLabel,
    archived_storage_path: document.archivedStoragePath || null,
    archived_public_url: document.archivedPublicUrl || null,
    archived_mime_type: document.archivedMimeType || null,
    content_sha256: document.contentSha256 || null,
    fetch_status: document.fetchStatus,
    error_message: document.errorMessage || null,
    extracted_text: document.extractedText || null,
    last_indexed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let existingQuery = supabase
    .from('regulation_source_documents')
    .select('id')
    .eq('regulation_id', document.regulationId)
    .eq('source_url', document.sourceUrl)

  existingQuery = document.documentUrl
    ? existingQuery.eq('document_url', document.documentUrl)
    : existingQuery.is('document_url', null)

  const { data: existingDocument, error: existingError } = await existingQuery.maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  let savedDocument

  if (existingDocument?.id) {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .update(payload)
      .eq('id', existingDocument.id)
      .select('id')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    savedDocument = data
  } else {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    savedDocument = data
  }

  await supabase.from('regulation_source_chunks').delete().eq('document_id', savedDocument.id)

  const chunks = chunkText(document.extractedText || '')
  if (chunks.length === 0) {
    return
  }

  const { error: chunkError } = await supabase.from('regulation_source_chunks').insert(
    chunks.map((content, index) => ({
      document_id: savedDocument.id,
      regulation_id: document.regulationId,
      chunk_index: index,
      content,
    }))
  )

  if (chunkError) {
    throw new Error(chunkError.message)
  }
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running this script.')
  }

  const regulationId = required('--regulation-id')
  const title = required('--title')
  const sourceName = required('--source-name')
  const sourceUrl = required('--source-url')
  const versionLabel = getArg('--version-label') || 'current'
  const explicitHtmlUrls = unique(getArgs('--html-url'))
  const explicitPdfUrls = unique(getArgs('--pdf-url'))

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const sourceHtml = await curlText(sourceUrl)
  const pageText = stripHtml(sourceHtml)
  const sourceHtmlHash = createHash('sha256').update(sourceHtml).digest('hex')
  const discoveredPdfUrls = discoverDocumentLinks(sourceHtml, sourceUrl)
  const htmlUrls = explicitHtmlUrls.length > 0 ? explicitHtmlUrls : []
  const pdfUrls = explicitPdfUrls.length > 0 ? explicitPdfUrls : discoveredPdfUrls

  await removeStaleDocuments(supabase, {
    regulationId,
    versionLabel,
    allowedDocumentUrls: new Set(['__source_entry__', ...htmlUrls, ...pdfUrls]),
  })
  const htmlArchivePath = buildArchivePath({
    regulationId,
    versionLabel,
    kind: 'source-entry',
    extension: 'html',
    contentHash: sourceHtmlHash,
  })
  const htmlArchivedPublicUrl = await uploadArchivedCopy(supabase, {
    storagePath: htmlArchivePath,
    data: Buffer.from(sourceHtml, 'utf8'),
    contentType: 'text/html; charset=utf-8',
  })

  await archiveAndIndexDocument(supabase, {
    regulationId,
    title,
    sourceName,
    sourceUrl,
    documentType: 'other',
    versionLabel,
    archivedStoragePath: htmlArchivePath,
    archivedPublicUrl: htmlArchivedPublicUrl,
    archivedMimeType: 'text/html; charset=utf-8',
    contentSha256: sourceHtmlHash,
    fetchStatus: pageText ? 'indexed' : 'failed',
    errorMessage: pageText ? null : 'No extractable text found on source page.',
    extractedText: pageText,
  })

  for (const [index, htmlUrl] of htmlUrls.entries()) {
    const officialHtml = await curlText(htmlUrl)
    const officialHtmlText = stripHtml(officialHtml)
    const officialHtmlHash = createHash('sha256').update(officialHtml).digest('hex')
    const officialHtmlArchivePath = buildArchivePath({
      regulationId,
      versionLabel,
      kind: `official-html-${index + 1}`,
      extension: 'html',
      contentHash: officialHtmlHash,
    })
    const officialHtmlArchivedPublicUrl = await uploadArchivedCopy(supabase, {
      storagePath: officialHtmlArchivePath,
      data: Buffer.from(officialHtml, 'utf8'),
      contentType: 'text/html; charset=utf-8',
    })

    await archiveAndIndexDocument(supabase, {
      regulationId,
      title,
      sourceName,
      sourceUrl,
      documentUrl: htmlUrl,
      documentType: 'html',
      versionLabel,
      archivedStoragePath: officialHtmlArchivePath,
      archivedPublicUrl: officialHtmlArchivedPublicUrl,
      archivedMimeType: 'text/html; charset=utf-8',
      contentSha256: officialHtmlHash,
      fetchStatus: officialHtmlText ? 'indexed' : 'failed',
      errorMessage: officialHtmlText ? null : 'No extractable text found on HTML document URL.',
      extractedText: officialHtmlText,
    })
  }

  for (const [index, documentUrl] of pdfUrls.entries()) {
    const existingDocument = await findExistingDocument(supabase, {
      regulationId,
      sourceUrl,
      documentUrl,
    })
    const preferredPdfUrl = existingDocument?.archived_public_url || documentUrl
    const extractedText = await extractPdfText(preferredPdfUrl)
    const binary = await downloadBinary(preferredPdfUrl)
    const binaryHash = createHash('sha256').update(binary).digest('hex')
    const extension = documentUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'bin'
    const pdfArchivePath = buildArchivePath({
      regulationId,
      versionLabel,
      kind: `document-${index + 1}`,
      extension,
      contentHash: binaryHash,
    })
    const pdfArchivedPublicUrl = await uploadArchivedCopy(supabase, {
      storagePath: pdfArchivePath,
      data: binary,
      contentType: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    })
    await archiveAndIndexDocument(supabase, {
      regulationId,
      title,
      sourceName,
      sourceUrl,
      documentUrl,
      documentType: extension === 'pdf' ? 'pdf' : 'other',
      versionLabel,
      archivedStoragePath: pdfArchivePath,
      archivedPublicUrl: pdfArchivedPublicUrl,
      archivedMimeType: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      contentSha256: binaryHash,
      fetchStatus: extractedText ? 'indexed' : 'failed',
      errorMessage: extractedText ? null : 'Unable to extract text from document URL.',
      extractedText,
    })
  }

  const reportPath = path.join(process.cwd(), 'supabase', '.temp', `${regulationId}-research-index.json`)
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        regulationId,
        title,
        sourceName,
        sourceUrl,
        versionLabel,
        htmlUrls,
        pdfUrls,
        archivedSourceEntry: htmlArchivedPublicUrl,
      },
      null,
      2
    )
  )

  console.log(`Indexed research sources for ${regulationId}`)
  console.log(`Report written to ${reportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
