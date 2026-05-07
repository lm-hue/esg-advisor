import { readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const DEFAULT_PDF_DIR = '/Users/lucas/Claude_Code/esg-advisor/international_policies/pdfs'
const CARROTS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const VERSION_LABEL = 'archived-local-pdf'

function getArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] || null
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

function parsePolicyId(fileName) {
  const match = fileName.match(/^(\d+_\d+)/)
  return match ? match[1] : null
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

function buildRegulationId(policyId) {
  return uuidv5Compat(`carrotsandsticks.org/policy/${policyId}`, CARROTS_NAMESPACE)
}

function buildCarrotsSourceUrl(policyId) {
  return `https://www.carrotsandsticks.org/policies/${policyId}`
}

async function fetchRegulationsByIds(supabase, ids) {
  const regulations = new Map()

  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await supabase
      .from('regulations')
      .select('id, title')
      .in('id', idChunk)

    if (error) {
      throw new Error(`Failed to fetch regulations: ${error.message}`)
    }

    for (const row of data || []) {
      regulations.set(row.id, row)
    }
  }

  return regulations
}

async function fetchArchivedDocumentKeys(supabase) {
  const keys = new Set()

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .select('regulation_id, source_url')
      .eq('version_label', VERSION_LABEL)
      .range(from, from + 999)

    if (error) {
      throw new Error(`Failed to fetch source documents: ${error.message}`)
    }

    if (!data || data.length === 0) break

    for (const row of data) {
      keys.add(`${row.regulation_id}|${row.source_url}`)
    }

    if (data.length < 1000) break
  }

  return keys
}

async function main() {
  const pdfDir = getArg('--pdf-dir') || DEFAULT_PDF_DIR
  const supabaseUrl = getArg('--supabase-url') || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const files = readdirSync(pdfDir)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .map((fileName) => ({
      fileName,
      policyId: parsePolicyId(fileName),
    }))
    .filter((entry) => entry.policyId)
    .map((entry) => ({
      ...entry,
      regulationId: buildRegulationId(entry.policyId),
      carrotsSourceUrl: buildCarrotsSourceUrl(entry.policyId),
    }))

  const regulations = await fetchRegulationsByIds(
    supabase,
    files.map((file) => file.regulationId)
  )
  const archivedKeys = await fetchArchivedDocumentKeys(supabase)

  const skipped = []
  const missing = []

  for (const file of files) {
    const regulation = regulations.get(file.regulationId)
    if (!regulation) {
      skipped.push(file)
      continue
    }

    if (!archivedKeys.has(`${file.regulationId}|${file.carrotsSourceUrl}`)) {
      missing.push({
        ...file,
        title: regulation.title,
      })
    }
  }

  console.log(JSON.stringify({
    totalFiles: files.length,
    skippedCount: skipped.length,
    missingCount: missing.length,
    skipped,
    missing,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
