#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const REPO_ROOT = '/Users/lucas/Documents/GitHub/esg-advisor'
const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const REPORT_PATH = '/tmp/merge-exact-pdf-duplicates-report.json'

const EXACT_PDF_DUPLICATE_PAIRS = [
  {
    leftId: '1c3de4b4-47ba-5e87-8199-3590e7abac95',
    rightId: '8c7574b4-b9d3-5feb-ad61-4af449b46004',
    preferredKeeperId: '1c3de4b4-47ba-5e87-8199-3590e7abac95',
    reason: 'Keeps the richer tag/topic set for the Belgium record.',
  },
  {
    leftId: '1fc0d52d-09f2-538f-8611-41c95d80e6ec',
    rightId: 'b764d172-70c6-57a9-b079-c1466981d1d1',
    preferredKeeperId: '1fc0d52d-09f2-538f-8611-41c95d80e6ec',
    reason: 'Keeps the longer formal title and much fuller ESG reporting description.',
  },
  {
    leftId: '2c30b7c1-a45a-552b-b69c-e0e8e3557d37',
    rightId: 'e8a42b8b-c47e-5230-a364-95427732b3b3',
    preferredKeeperId: '2c30b7c1-a45a-552b-b69c-e0e8e3557d37',
    reason: 'Keeps the more specific non-financial reporting description and richer topical coverage.',
  },
  {
    leftId: '6122a579-975d-5c2d-99ac-da0f9b4ea5b5',
    rightId: 'e7ec6991-591c-5d2a-b657-33e39a9dd1f3',
    preferredKeeperId: 'e7ec6991-591c-5d2a-b657-33e39a9dd1f3',
    reason: 'Keeps the fuller revised-version summary while field-level merge preserves the more specific formal title.',
  },
  {
    leftId: '78d2110d-36ed-5945-b3dc-6a397fcf09d4',
    rightId: '86d05ebc-63e1-58fa-aa9b-1e8c13f1c69f',
    preferredKeeperId: '78d2110d-36ed-5945-b3dc-6a397fcf09d4',
    reason: 'Keeps the more internally consistent governance guideline record.',
  },
  {
    leftId: '79fad15b-cb81-5cd6-882d-1bbde8fc7f6c',
    rightId: 'a580f7e1-5103-522f-b5b1-9fb4f5a491c4',
    preferredKeeperId: '79fad15b-cb81-5cd6-882d-1bbde8fc7f6c',
    reason: 'Keeps the title variant that already includes the 2022 qualifier.',
  },
  {
    leftId: 'd54d3d8b-91af-546b-96fd-eecd249b7ebb',
    rightId: 'f223ca8b-8bb8-5e28-af9c-e0491ffdeb93',
    preferredKeeperId: 'd54d3d8b-91af-546b-96fd-eecd249b7ebb',
    reason: 'Tie on completeness; keep the lower-id canonical SASB record and merge any non-empty fields.',
    lockKeeperFields: ['formal_title'],
  },
  {
    leftId: 'cb5905ee-ed56-512b-b2d6-f666477dac6f',
    rightId: 'ed7c72d2-adf7-512d-ac1f-c9cddd34ec08',
    preferredKeeperId: 'ed7c72d2-adf7-512d-ac1f-c9cddd34ec08',
    reason: 'Keeps the substantially richer governance summary while field-level merge preserves the more specific formal title.',
  },
]

const URL_FIELDS = new Set(['source_url', 'official_source_url', 'policy_page_url'])
const LONG_TEXT_FIELDS = new Set(['summary', 'description', 'full_description'])
const SHORT_TEXT_FIELDS = new Set(['title', 'formal_title', 'source_name', 'version_label'])
const DATE_FIELDS = new Set(['effective_date', 'published_date', 'adopted_date'])
const DIRECT_FIELDS = [
  'title',
  'formal_title',
  'summary',
  'description',
  'full_description',
  'region',
  'category',
  'status',
  'effective_date',
  'source_name',
  'source_url',
  'official_source_url',
  'policy_page_url',
  'source_link_kind',
  'published_date',
  'adopted_date',
  'date_precision',
  'regulation_type',
  'link_status',
  'source_health',
  'jurisdiction_type',
  'jurisdiction_value',
  'umbrella_id',
  'umbrella_relation',
  'version_label',
]

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

function hasFlag(name) {
  return process.argv.includes(name)
}

function chunk(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function isBlank(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function isSupabaseArchiveUrl(url) {
  return typeof url === 'string' && url.includes('/storage/v1/object/public/regulation-source-archives/')
}

function textLength(value) {
  return typeof value === 'string' ? value.trim().length : 0
}

function chooseTextValue(primary, secondary, { longerWins = false } = {}) {
  if (isBlank(primary)) return secondary
  if (isBlank(secondary)) return primary
  if (!longerWins) return primary
  return textLength(secondary) > textLength(primary) ? secondary : primary
}

function chooseUrlValue(primary, secondary) {
  if (isBlank(primary)) return secondary
  if (isBlank(secondary)) return primary

  const primaryTrusted = !isSupabaseArchiveUrl(primary)
  const secondaryTrusted = !isSupabaseArchiveUrl(secondary)

  if (secondaryTrusted && !primaryTrusted) return secondary
  if (primaryTrusted && !secondaryTrusted) return primary
  return primary
}

function chooseDateValue(primary, secondary) {
  if (isBlank(primary)) return secondary
  if (isBlank(secondary)) return primary
  return primary
}

function uniqueArray(values) {
  const seen = new Set()
  const result = []
  for (const value of values.flat().filter(Boolean)) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}

function scoreRegulation(regulation) {
  let score = 0
  if (!regulation) return score

  score += textLength(regulation.formal_title)
  score += Math.min(textLength(regulation.summary), 200)
  score += Math.min(textLength(regulation.description), 300)
  score += Math.min(textLength(regulation.full_description), 500)
  score += (regulation.tags || []).length * 12
  score += (regulation.topics || []).length * 14

  if (!isBlank(regulation.policy_page_url)) score += 120
  if (!isBlank(regulation.official_source_url) && !isSupabaseArchiveUrl(regulation.official_source_url)) score += 90
  if (!isBlank(regulation.source_url) && !isSupabaseArchiveUrl(regulation.source_url)) score += 40
  if (!isBlank(regulation.effective_date)) score += 20
  if (!isBlank(regulation.published_date)) score += 20
  if (!isBlank(regulation.adopted_date)) score += 20

  return score
}

function buildMergedRegulation(keeper, loser) {
  const merged = { ...keeper }

  for (const field of DIRECT_FIELDS) {
    if (URL_FIELDS.has(field)) {
      merged[field] = chooseUrlValue(keeper[field], loser[field])
      continue
    }

    if (LONG_TEXT_FIELDS.has(field)) {
      merged[field] = chooseTextValue(keeper[field], loser[field], { longerWins: true })
      continue
    }

    if (SHORT_TEXT_FIELDS.has(field)) {
      merged[field] = chooseTextValue(keeper[field], loser[field], { longerWins: true })
      continue
    }

    if (DATE_FIELDS.has(field)) {
      merged[field] = chooseDateValue(keeper[field], loser[field])
      continue
    }

    if (isBlank(merged[field]) && !isBlank(loser[field])) {
      merged[field] = loser[field]
    }
  }

  merged.tags = uniqueArray([keeper.tags || [], loser.tags || []])
  merged.topics = uniqueArray([keeper.topics || [], loser.topics || []])
  merged.updated_at = keeper.updated_at
  return merged
}

function documentSignature(document) {
  if (document.document_type === 'pdf' && !isBlank(document.content_sha256)) {
    return `pdf|${document.content_sha256}`
  }

  return [
    document.document_type || '',
    document.content_sha256 || '',
    document.document_url || '',
    document.archived_public_url || '',
    document.source_url || '',
    document.version_label || '',
  ].join('|')
}

function summarizeRecord(record) {
  return {
    id: record.id,
    title: record.title,
    formal_title: record.formal_title,
    region: record.region,
    category: record.category,
    status: record.status,
    effective_date: record.effective_date,
    source_url: record.source_url,
    official_source_url: record.official_source_url,
    policy_page_url: record.policy_page_url,
    source_link_kind: record.source_link_kind,
    tags: record.tags || [],
    topics: record.topics || [],
    score: scoreRegulation(record),
  }
}

async function fetchByIds(supabase, table, columns, ids, column = 'id') {
  const rows = []
  for (const batch of chunk(ids, 150)) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(column, batch)

    if (error) throw error
    rows.push(...(data || []))
  }
  return rows
}

async function remapWatchlists(supabase, loserId, keeperId, dryRun) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('id,user_id,watched_regulation_ids')

  if (error) throw error

  const affected = []
  for (const row of data || []) {
    const watchedIds = Array.isArray(row.watched_regulation_ids) ? row.watched_regulation_ids.map(String) : []
    if (!watchedIds.includes(loserId)) continue

    const remapped = []
    const seen = new Set()
    for (const regulationId of watchedIds.map((value) => (value === loserId ? keeperId : value))) {
      if (seen.has(regulationId)) continue
      seen.add(regulationId)
      remapped.push(regulationId)
    }

    affected.push({
      id: row.id,
      user_id: row.user_id,
      before: watchedIds,
      after: remapped,
    })

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: remapped })
        .eq('id', row.id)

      if (updateError) throw updateError
    }
  }

  return affected
}

async function maybeDeleteStorageObject(supabase, document, dryRun) {
  if (!document.archived_storage_path) return { attempted: false, deleted: false }

  if (dryRun) {
    return { attempted: true, deleted: false, archived_storage_path: document.archived_storage_path }
  }

  const { error } = await supabase
    .storage
    .from('regulation-source-archives')
    .remove([document.archived_storage_path])

  if (error) {
    return {
      attempted: true,
      deleted: false,
      archived_storage_path: document.archived_storage_path,
      error: error.message,
    }
  }

  return { attempted: true, deleted: true, archived_storage_path: document.archived_storage_path }
}

async function mergePair(supabase, pair, context) {
  const { regulationsById, documentsByRegulationId, dryRun } = context
  const left = regulationsById.get(pair.leftId)
  const right = regulationsById.get(pair.rightId)

  if (!left || !right) {
    throw new Error(`Missing regulation row for pair ${pair.leftId} / ${pair.rightId}`)
  }

  const keeper = pair.preferredKeeperId === left.id ? left : right
  const loser = pair.preferredKeeperId === left.id ? right : left

  const mergedRegulation = buildMergedRegulation(keeper, loser)
  for (const field of pair.lockKeeperFields || []) {
    mergedRegulation[field] = keeper[field]
  }
  const keeperDocs = [...(documentsByRegulationId.get(keeper.id) || [])]
  const loserDocs = [...(documentsByRegulationId.get(loser.id) || [])]

  const keeperSignatures = new Set(keeperDocs.map(documentSignature))
  const docsToDelete = []
  const docsToMove = []

  for (const document of loserDocs) {
    const signature = documentSignature(document)
    if (keeperSignatures.has(signature)) {
      docsToDelete.push(document)
      continue
    }
    docsToMove.push(document)
  }

  const watchlistChanges = await remapWatchlists(supabase, loser.id, keeper.id, dryRun)

  if (!dryRun) {
    const regulationPatch = {}
    for (const field of DIRECT_FIELDS) {
      if (field in mergedRegulation) regulationPatch[field] = mergedRegulation[field]
    }
    regulationPatch.tags = mergedRegulation.tags || []
    regulationPatch.topics = mergedRegulation.topics || []

    const { error: updateKeeperError } = await supabase
      .from('regulations')
      .update(regulationPatch)
      .eq('id', keeper.id)

    if (updateKeeperError) throw updateKeeperError

    for (const document of docsToMove) {
      const { error: moveDocError } = await supabase
        .from('regulation_source_documents')
        .update({ regulation_id: keeper.id })
        .eq('id', document.id)

      if (moveDocError) throw moveDocError

      const { error: moveChunkError } = await supabase
        .from('regulation_source_chunks')
        .update({ regulation_id: keeper.id })
        .eq('document_id', document.id)

      if (moveChunkError) throw moveChunkError
    }

    const deletedStorage = []
    for (const document of docsToDelete) {
      deletedStorage.push(await maybeDeleteStorageObject(supabase, document, dryRun))

      const { error: deleteDocError } = await supabase
        .from('regulation_source_documents')
        .delete()
        .eq('id', document.id)

      if (deleteDocError) throw deleteDocError
    }

    const { error: deleteOrphanChunksError } = await supabase
      .from('regulation_source_chunks')
      .delete()
      .eq('regulation_id', loser.id)

    if (deleteOrphanChunksError) throw deleteOrphanChunksError

    const { error: deleteLoserError } = await supabase
      .from('regulations')
      .delete()
      .eq('id', loser.id)

    if (deleteLoserError) throw deleteLoserError

    return {
      keeper: summarizeRecord(keeper),
      loser: summarizeRecord(loser),
      mergedRegulation: summarizeRecord(mergedRegulation),
      reason: pair.reason,
      movedDocuments: docsToMove.map((document) => ({ id: document.id, type: document.document_type, version_label: document.version_label })),
      deletedDuplicateDocuments: docsToDelete.map((document) => ({ id: document.id, type: document.document_type, version_label: document.version_label })),
      deletedStorage,
      watchlistChanges,
    }
  }

  return {
    keeper: summarizeRecord(keeper),
    loser: summarizeRecord(loser),
    mergedRegulation: summarizeRecord(mergedRegulation),
    reason: pair.reason,
    movedDocuments: docsToMove.map((document) => ({ id: document.id, type: document.document_type, version_label: document.version_label })),
    deletedDuplicateDocuments: docsToDelete.map((document) => ({ id: document.id, type: document.document_type, version_label: document.version_label, archived_storage_path: document.archived_storage_path || null })),
    watchlistChanges,
  }
}

async function main() {
  const env = await loadEnv()
  const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dryRun = hasFlag('--dry-run')

  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const allIds = [...new Set(EXACT_PDF_DUPLICATE_PAIRS.flatMap((pair) => [pair.leftId, pair.rightId]))]
  const regulations = await fetchByIds(
    supabase,
    'regulations',
    'id,title,formal_title,summary,description,full_description,region,category,status,effective_date,source_name,source_url,official_source_url,policy_page_url,source_link_kind,tags,created_at,updated_at,jurisdiction_type,jurisdiction_value,published_date,adopted_date,date_precision,regulation_type,topics,link_status,source_health,umbrella_id,umbrella_relation,version_label',
    allIds
  )
  const documents = await fetchByIds(
    supabase,
    'regulation_source_documents',
    'id,regulation_id,source_name,source_url,official_source_url,policy_page_url,document_url,document_type,version_label,archived_storage_path,archived_public_url,content_sha256,fetch_status,updated_at',
    allIds,
    'regulation_id'
  )

  const regulationsById = new Map(regulations.map((regulation) => [String(regulation.id), regulation]))
  const documentsByRegulationId = new Map()
  for (const document of documents) {
    const regulationId = String(document.regulation_id)
    const list = documentsByRegulationId.get(regulationId) || []
    list.push(document)
    documentsByRegulationId.set(regulationId, list)
  }

  const results = []
  for (const pair of EXACT_PDF_DUPLICATE_PAIRS) {
    results.push(await mergePair(supabase, pair, { regulationsById, documentsByRegulationId, dryRun }))
  }

  const report = {
    dry_run: dryRun,
    pair_count: EXACT_PDF_DUPLICATE_PAIRS.length,
    merged_pairs: results,
    generated_at: new Date().toISOString(),
  }

  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
