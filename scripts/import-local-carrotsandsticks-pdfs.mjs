import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const DEFAULT_PDF_DIR = '/Users/lucas/Claude_Code/esg-advisor/international_policies/pdfs'
const ARCHIVE_BUCKET = 'regulation-source-archives'
const VERSION_LABEL = 'archived-local-pdf'
const CARROTS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const PDFJS_STANDARD_FONTS = new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href
const RESUMABLE_UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024

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

function formatError(error) {
  if (!error) return 'Unknown error'

  const messages = []
  let current = error
  let depth = 0

  while (current && depth < 4) {
    if (current.message && !messages.includes(current.message)) {
      messages.push(current.message)
    }
    current = current.cause
    depth += 1
  }

  const leaf = error.cause || error
  const diagnostics = [leaf.code, leaf.errno, leaf.syscall, leaf.hostname].filter(Boolean)
  return diagnostics.length > 0
    ? `${messages.join(' <- ')} (${diagnostics.join(' | ')})`
    : messages.join(' <- ')
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
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

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      continue
    }

    if (codeUnit === 0x0000) {
      continue
    }

    const isAllowedControl = codeUnit === 0x0009 || codeUnit === 0x000a || codeUnit === 0x000d
    if (codeUnit < 0x0020 && !isAllowedControl) {
      continue
    }

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
    // Keep the original string if normalization fails on malformed input.
  }

  sanitized = stripInvalidUnicode(sanitized)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')

  return collapseWhitespace ? sanitizeWhitespace(sanitized) : sanitized.trim()
}

function sanitizePayload(value) {
  if (typeof value === 'string') {
    return sanitizeDbText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizePayload(nestedValue)])
    )
  }

  return value
}

function resolveOfficialSourceUrl(regulation) {
  const candidate = (regulation.official_source_url || '').trim()
  if (!candidate) return null
  const normalized = candidate.toLowerCase()
  if (normalized.includes('carrotsandsticks.org')) return null
  if (normalized.includes('/storage/v1/object/public/regulation-source-archives/')) return null
  return candidate
}

function resolvePrimarySourceLinkKind(officialSourceUrl) {
  return officialSourceUrl ? 'official' : 'archived_pdf'
}

function toBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function buildTusMetadata(metadata) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key} ${toBase64(String(value))}`)
    .join(',')
}

function getStorageOrigin(supabaseUrl) {
  const url = new URL(supabaseUrl)
  if (!url.hostname.endsWith('.supabase.co')) {
    throw new Error(`Unsupported Supabase hostname for resumable upload: ${url.hostname}`)
  }
  url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co')
  return url.origin
}

async function uploadViaTus(supabaseUrl, serviceRoleKey, storagePath, bytes, contentType) {
  const endpoint = `${getStorageOrigin(supabaseUrl)}/storage/v1/upload/resumable`
  const metadata = buildTusMetadata({
    bucketName: ARCHIVE_BUCKET,
    objectName: storagePath,
    contentType,
    cacheControl: '3600',
  })

  const createResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'x-upsert': 'true',
      'tus-resumable': '1.0.0',
      'upload-length': String(bytes.length),
      'upload-metadata': metadata,
      'content-length': '0',
    },
  })

  if (!createResponse.ok) {
    const details = await createResponse.text().catch(() => '')
    throw new Error(
      `resumable upload creation failed: ${createResponse.status} ${createResponse.statusText}${details ? ` - ${details}` : ''}`
    )
  }

  const location = createResponse.headers.get('location')
  if (!location) {
    throw new Error('resumable upload creation failed: missing upload location header')
  }

  const uploadUrl = new URL(location, endpoint).toString()
  let offset = Number(createResponse.headers.get('upload-offset') || '0')

  while (offset < bytes.length) {
    const nextOffset = Math.min(offset + RESUMABLE_UPLOAD_CHUNK_SIZE, bytes.length)
    const chunkBytes = bytes.subarray(offset, nextOffset)

    const patchResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'x-upsert': 'true',
        'tus-resumable': '1.0.0',
        'upload-offset': String(offset),
        'content-type': 'application/offset+octet-stream',
        'content-length': String(chunkBytes.length),
      },
      body: chunkBytes,
    })

    if (!patchResponse.ok) {
      const details = await patchResponse.text().catch(() => '')
      throw new Error(
        `resumable upload patch failed at offset ${offset}: ${patchResponse.status} ${patchResponse.statusText}${details ? ` - ${details}` : ''}`
      )
    }

    const responseOffset = Number(patchResponse.headers.get('upload-offset'))
    offset = Number.isFinite(responseOffset) ? responseOffset : nextOffset
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

function parsePolicyId(fileName) {
  const match = fileName.match(/^(\d+_\d+)/)
  return match ? match[1] : null
}

function buildRegulationId(policyId) {
  return uuidv5Compat(`carrotsandsticks.org/policy/${policyId}`, CARROTS_NAMESPACE)
}

function buildCarrotsSourceUrl(policyId) {
  return `https://www.carrotsandsticks.org/policies/${policyId}`
}

function uuidToBytes(uuid) {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex')
}

function bytesToUuid(bytes) {
  const hex = Buffer.from(bytes).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function uuidv5Compat(value, namespace) {
  const hash = createHash('sha1')
    .update(uuidToBytes(namespace))
    .update(value, 'utf8')
    .digest()

  const bytes = Uint8Array.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return bytesToUuid(bytes)
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

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      pages.push(textContent.items.map((item) => item.str || '').join(' '))
    }

    return sanitizeDbText(pages.join(' '), { collapseWhitespace: true })
  } catch {
    return ''
  }
}

async function fetchRegulationsByIds(supabase, ids, supabaseUrl) {
  const records = new Map()
  const regulationFetchChunkSize = Number(getArg('--regulation-chunk-size') || '100') || 100

  for (const idChunk of chunk(ids, regulationFetchChunkSize)) {
    let response
    try {
      response = await supabase
        .from('regulations')
        .select('id, title, source_name, source_url, official_source_url, policy_page_url')
        .in('id', idChunk)
    } catch (error) {
      throw new Error(`Failed to fetch regulations from ${supabaseUrl}: ${formatError(error)}`)
    }

    const { data, error } = response

    let rows = data || []
    if (error?.message?.includes('official_source_url') || error?.message?.includes('policy_page_url')) {
      const fallbackResponse = await supabase
        .from('regulations')
        .select('id, title, source_name, source_url')
        .in('id', idChunk)

      if (fallbackResponse.error) {
        throw new Error(`Failed to fetch regulations: ${fallbackResponse.error.message}`)
      }

      rows = fallbackResponse.data || []
    } else if (error) {
      throw new Error(`Failed to fetch regulations: ${error.message}`)
    }

    for (const row of rows) {
      records.set(row.id, row)
    }
  }

  return records
}

async function upsertSourceDocument(supabase, payload) {
  const sanitizedPayload = sanitizePayload(payload)
  const { data: existing, error: findError } = await supabase
    .from('regulation_source_documents')
    .select('id')
    .eq('regulation_id', sanitizedPayload.regulation_id)
    .eq('source_url', sanitizedPayload.source_url)
    .eq('version_label', sanitizedPayload.version_label)
    .maybeSingle()

  if (findError) {
    throw new Error(`Failed to find source document: ${findError.message}`)
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .update(sanitizedPayload)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to update source document: ${error.message}`)
    }

    return data.id
  }

  const { data, error } = await supabase
    .from('regulation_source_documents')
    .insert(sanitizedPayload)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to insert source document: ${error.message}`)
  }

  return data.id
}

async function replaceChunks(supabase, documentId, regulationId, extractedText) {
  const { error: deleteError } = await supabase
    .from('regulation_source_chunks')
    .delete()
    .eq('document_id', documentId)

  if (deleteError) {
    throw new Error(`Failed to clear source chunks: ${deleteError.message}`)
  }

  const chunkRows = chunkText(extractedText).map((content, chunkIndex) => ({
    document_id: documentId,
    regulation_id: regulationId,
    chunk_index: chunkIndex,
    content: sanitizeDbText(content, { collapseWhitespace: true }),
  }))

  if (chunkRows.length === 0) return 0

  for (const rowsChunk of chunk(chunkRows, 200)) {
    const { error } = await supabase.from('regulation_source_chunks').insert(rowsChunk)
    if (error) {
      throw new Error(`Failed to insert source chunks: ${error.message}`)
    }
  }

  return chunkRows.length
}

function printUsage() {
  console.log(`Usage:
  node scripts/import-local-carrotsandsticks-pdfs.mjs [--pdf-dir PATH] [--limit N] [--dry-run]

Required env:
  SUPABASE_SERVICE_ROLE_KEY

Optional env:
  SUPABASE_URL or VITE_SUPABASE_URL`)
}

async function main() {
  if (hasFlag('--help')) {
    printUsage()
    return
  }

  const pdfDir = path.resolve(getArg('--pdf-dir') || DEFAULT_PDF_DIR)
  const dryRun = hasFlag('--dry-run')
  const limit = Number(getArg('--limit') || '0') || 0
  const requestedPolicyIds = new Set(getArgValues('--policy-id'))
  const requestedFiles = new Set(getArgValues('--file-name'))
  const supabaseUrl = getArg('--supabase-url') || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Using Supabase URL: ${supabaseUrl}`)

  const entries = await readdir(pdfDir, { withFileTypes: true })
  const pdfEntries = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => {
      const policyId = parsePolicyId(entry.name)
      return policyId
        ? {
            fileName: entry.name,
            filePath: path.join(pdfDir, entry.name),
            policyId,
            regulationId: buildRegulationId(policyId),
            carrotsSourceUrl: buildCarrotsSourceUrl(policyId),
          }
        : null
    })
    .filter(Boolean)
    .filter((entry) => {
      if (requestedPolicyIds.size === 0 && requestedFiles.size === 0) return true
      return requestedPolicyIds.has(entry.policyId) || requestedFiles.has(entry.fileName)
    })

  const selectedEntries = limit > 0 ? pdfEntries.slice(0, limit) : pdfEntries
  const regulationMap = await fetchRegulationsByIds(
    supabase,
    selectedEntries.map((entry) => entry.regulationId),
    supabaseUrl
  )

  const results = {
    totalFiles: selectedEntries.length,
    matchedRegulations: 0,
    uploaded: 0,
    skippedMissingRegulation: 0,
    failed: 0,
  }

  for (const entry of selectedEntries) {
    const regulation = regulationMap.get(entry.regulationId)
    if (!regulation) {
      results.skippedMissingRegulation += 1
      console.log(`skip ${entry.fileName}: no regulation found for ${entry.policyId}`)
      continue
    }

    results.matchedRegulations += 1

    if (dryRun) {
      console.log(`dry-run ${entry.fileName} -> ${regulation.title}`)
      continue
    }

    try {
      const bytes = await readFile(entry.filePath)
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      const storagePath = `${regulation.id}/${VERSION_LABEL}/${entry.policyId}-${sha256.slice(0, 12)}.pdf`

      if (bytes.length > RESUMABLE_UPLOAD_CHUNK_SIZE) {
        await uploadViaTus(supabaseUrl, serviceRoleKey, storagePath, bytes, 'application/pdf')
      } else {
        const { error: uploadError } = await supabase.storage.from(ARCHIVE_BUCKET).upload(storagePath, bytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

        if (uploadError) {
          throw new Error(`storage upload failed: ${uploadError.message}`)
        }
      }

      const { data: publicUrlData } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl
      const extractedText = await extractPdfText(bytes)
      const now = new Date().toISOString()
      const officialSourceUrl = resolveOfficialSourceUrl(regulation)
      const sourceLinkKind = resolvePrimarySourceLinkKind(officialSourceUrl)

      const documentId = await upsertSourceDocument(supabase, {
        regulation_id: regulation.id,
        title: regulation.title,
        source_name: regulation.source_name || 'Carrots & Sticks archived PDF',
        source_url: entry.carrotsSourceUrl,
        official_source_url: officialSourceUrl,
        policy_page_url: regulation.policy_page_url || null,
        source_link_kind: sourceLinkKind,
        document_url: publicUrl,
        document_type: 'pdf',
        version_label: VERSION_LABEL,
        archived_storage_path: storagePath,
        archived_public_url: publicUrl,
        archived_mime_type: 'application/pdf',
        content_sha256: sha256,
        fetch_status: extractedText ? 'indexed' : 'failed',
        error_message: extractedText ? null : 'Could not extract text from local PDF',
        extracted_text: extractedText || null,
        last_indexed_at: now,
        updated_at: now,
      })

      await replaceChunks(supabase, documentId, regulation.id, extractedText)
      results.uploaded += 1
      console.log(`uploaded ${entry.fileName} -> ${regulation.title}`)
    } catch (error) {
      results.failed += 1
      console.log(`failed ${entry.fileName}: ${formatError(error)}`)
    }
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((error) => {
  console.error(formatError(error))
  process.exit(1)
})
