import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

const REGULATIONS_FILE = new URL('../src/lib/regulations.ts', import.meta.url)
const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const UPSERT_COLUMNS = [
  'id',
  'title',
  'description',
  'full_description',
  'category',
  'region',
  'jurisdiction_type',
  'jurisdiction_value',
  'status',
  'effective_date',
  'published_date',
  'adopted_date',
  'date_precision',
  'regulation_type',
  'source_name',
  'source_url',
  'official_source_url',
  'policy_page_url',
  'topics',
  'link_status',
  'source_health',
  'tags',
  'created_at',
  'updated_at',
  'umbrella_id',
  'umbrella_relation',
  'version_label',
]

function getEnv(name) {
  return process.env[name] || ''
}

function requiredEnv(name) {
  const value = getEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function extractSupplementalArray(source) {
  const startMarker = 'const SUPPLEMENTAL_REGULATIONS: RegulationRecord[] = ['
  const endMarker = '\n]\n\nfunction getRegulationDateValue'

  const startIndex = source.indexOf(startMarker)
  if (startIndex === -1) {
    throw new Error('Could not locate SUPPLEMENTAL_REGULATIONS in src/lib/regulations.ts')
  }

  const arrayStart = source.indexOf('[', startIndex)
  const endIndex = source.indexOf(endMarker, arrayStart)
  if (endIndex === -1) {
    throw new Error('Could not locate end of SUPPLEMENTAL_REGULATIONS array')
  }

  return source.slice(arrayStart, endIndex + 1)
}

function parseSupplementalRegulations(arrayLiteral) {
  const wrappedSource = `const supplemental = ${arrayLiteral}; export default supplemental;`
  const transpiled = ts.transpileModule(wrappedSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText

  const module = { exports: {} }
  const evaluator = new Function('module', 'exports', transpiled)
  evaluator(module, module.exports)
  return module.exports.default
}

function normalizeRecord(record) {
  const sourceUrl = record.source_url || ''
  const officialSourceUrl = record.official_source_url || null
  const policyPageUrl = record.policy_page_url || null
  const normalizedStatus =
    record.status === 'in_force'
      ? 'effective'
      : record.status === 'adopted'
        ? 'adopted_not_yet_effective'
        : record.status === 'amended'
          ? 'amended_effective'
          : record.status || 'effective'
  const regulationType = record.regulation_type
    || (/proposal|proposed|draft|consultation|bill/i.test(record.title || '') ? 'proposal_or_draft'
      : /stock exchange|listing requirement|listing rule|exchange rule|hkex|sgx|jse|sebi|fca|sec/i.test(record.title || '') ? 'market_rule'
      : /\bstandard\b|\bstandards\b|iso |esrs|ifrs s1|ifrs s2|sasb|gri/i.test(record.title || '') ? 'standard'
      : /guidance|guide|playbook|faq|manual/i.test(record.title || '') ? 'guidance'
      : /roadmap|action plan|strategy|programme|program/i.test(record.title || '') ? 'policy_plan'
      : /framework|protocol|principles/i.test(record.title || '') ? 'framework'
      : 'law_or_regulation')
  const topics = Array.isArray(record.topics) && record.topics.length > 0
    ? record.topics
    : Array.from(new Set([
        /report|disclosure|materiality|assurance|esrs|issb|ifrs|gri/i.test(`${record.title || ''} ${record.description || ''} ${(record.tags || []).join(' ')}`) ? 'reporting' : null,
        /taxonomy/i.test(`${record.title || ''} ${record.description || ''}`) ? 'taxonomy' : null,
        /governance|board|anti-corruption|bribery|ethics|conduct/i.test(`${record.title || ''} ${record.description || ''}`) ? 'governance' : null,
        /human rights|labou?r|worker|forced labour|indigenous|harassment|diversity|equality/i.test(`${record.title || ''} ${record.description || ''}`) ? 'human_rights' : null,
        /supply chain|due diligence|supplier|mineral|procurement|traceability/i.test(`${record.title || ''} ${record.description || ''}`) ? 'supply_chain' : null,
        /biodiversity|deforestation|ecosystem|forest|nature-related/i.test(`${record.title || ''} ${record.description || ''}`) ? 'biodiversity' : null,
        /\bwater\b|wastewater|marine|ocean/i.test(`${record.title || ''} ${record.description || ''}`) ? 'water' : null,
        /pollution|emission|air quality|chemical|contaminant|plastic/i.test(`${record.title || ''} ${record.description || ''}`) ? 'pollution' : null,
        /\bwaste\b|recycling|circular|battery stewardship|packaging/i.test(`${record.title || ''} ${record.description || ''}`) ? 'waste' : null,
        /energy|electricity|renewable|efficiency|fuel/i.test(`${record.title || ''} ${record.description || ''}`) ? 'energy' : null,
        /climate|greenhouse gas|ghg|net zero|carbon|tcfd|transition plan/i.test(`${record.title || ''} ${record.description || ''}`) ? 'climate' : null,
        /finance|financial|investor|bank|fund|securities|listing/i.test(`${record.title || ''} ${record.description || ''}`) ? 'finance' : null,
      ].filter(Boolean)))
  const jurisdictionType = record.region === 'Global'
    ? 'global'
    : ['EU'].includes(record.region)
      ? 'supranational_region'
      : ['ASEAN', 'Mercosur', 'OECD', 'UN', 'CDP', 'GRI', 'IFRS', 'IIRC', 'ILO', 'IFC', 'ICMM', 'SASB', 'SBTi', 'TCFD', 'TNFD', 'SRP', 'CDSB'].includes(record.region)
        ? 'standards_body'
        : record.region === 'SSE'
          ? 'exchange_or_regulator'
          : 'country'
  const linkStatus = !sourceUrl
    ? 'missing'
    : sourceUrl.includes('/regulation-source-archives/')
      ? 'archived_pdf'
      : sourceUrl.toLowerCase().includes('carrotsandsticks.org')
        ? 'broken'
        : sourceUrl.toLowerCase().includes('.pdf')
          ? 'working_pdf'
          : 'working_website'
  const sourceHealth = linkStatus === 'archived_pdf'
    ? 'archived'
    : linkStatus === 'broken'
      ? 'broken'
      : linkStatus === 'missing'
        ? 'missing'
        : 'healthy'

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    full_description: record.full_description,
    category: record.category,
    region: record.region,
    jurisdiction_type: record.jurisdiction_type ?? jurisdictionType,
    jurisdiction_value: record.jurisdiction_value ?? record.region,
    status: normalizedStatus,
    effective_date: record.effective_date,
    published_date: record.published_date ?? null,
    adopted_date: record.adopted_date ?? null,
    date_precision: record.date_precision ?? (sourceUrl.toLowerCase().includes('carrotsandsticks.org') && record.effective_date?.endsWith('-01-01') ? 'year' : 'day'),
    regulation_type: regulationType,
    source_name: record.source_name,
    source_url: record.source_url,
    official_source_url: officialSourceUrl,
    policy_page_url: policyPageUrl,
    topics,
    link_status: record.link_status ?? linkStatus,
    source_health: record.source_health ?? sourceHealth,
    tags: Array.isArray(record.tags) ? record.tags : [],
    created_at: record.created_at,
    updated_at: record.updated_at,
    umbrella_id: record.umbrella_id ?? null,
    umbrella_relation: record.umbrella_relation ?? null,
    version_label: record.version_label ?? null,
  }
}

function chunk(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

async function fetchAllRegulationIds(supabase) {
  const ids = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('regulations')
      .select('id')
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      throw new Error(`Verification read failed: ${error.message}`)
    }

    const rows = data || []
    ids.push(...rows.map((row) => row.id))

    if (rows.length < pageSize) break
    from += pageSize
  }

  return ids
}

async function main() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || DEFAULT_SUPABASE_URL
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const source = await readFile(REGULATIONS_FILE, 'utf8')
  const arrayLiteral = extractSupplementalArray(source)
  const records = parseSupplementalRegulations(arrayLiteral).map(normalizeRecord)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const batches = chunk(records, 50)

  for (const [index, batch] of batches.entries()) {
    const { error } = await supabase
      .from('regulations')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      throw new Error(`Upsert failed for batch ${index + 1}/${batches.length}: ${error.message}`)
    }
  }

  const syncedIds = new Set(records.map((record) => record.id))
  const dbIds = await fetchAllRegulationIds(supabase)
  const missingIds = records
    .map((record) => record.id)
    .filter((id) => !dbIds.includes(id))

  console.log(`Synced ${records.length} supplemental regulations to Supabase in ${batches.length} batches.`)
  console.log(`Columns synced: ${UPSERT_COLUMNS.join(', ')}`)
  console.log(`DB now has ${dbIds.length} total regulation rows.`)

  if (missingIds.length > 0) {
    console.log(`Missing supplemental IDs after sync: ${missingIds.length}`)
    console.log(missingIds.slice(0, 20).join('\n'))
    process.exit(2)
  }

  console.log(`Verified all ${syncedIds.size} supplemental regulation IDs are present in Supabase.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
