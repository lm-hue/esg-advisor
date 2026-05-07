import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

const REGULATIONS_FILE = new URL('../src/lib/regulations.ts', import.meta.url)
const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30.zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw'

function getEnv(name) {
  return process.env[name] || ''
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
      throw new Error(`Could not read regulations table: ${error.message}`)
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
  const apiKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_ANON_KEY

  const source = await readFile(REGULATIONS_FILE, 'utf8')
  const records = parseSupplementalRegulations(extractSupplementalArray(source))
  const supplementalIds = records.map((record) => record.id)

  const supabase = createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const dbIds = await fetchAllRegulationIds(supabase)
  const dbIdSet = new Set(dbIds)
  const missingIds = supplementalIds.filter((id) => !dbIdSet.has(id))
  const presentCount = supplementalIds.length - missingIds.length

  console.log(`Supplemental regulations in code: ${supplementalIds.length}`)
  console.log(`Rows currently readable from Supabase regulations table: ${dbIds.length}`)
  console.log(`Supplemental IDs already present in Supabase: ${presentCount}`)
  console.log(`Supplemental IDs missing from Supabase: ${missingIds.length}`)

  if (missingIds.length > 0) {
    console.log('First missing IDs:')
    console.log(missingIds.slice(0, 25).join('\n'))
    process.exit(2)
  }

  console.log('All supplemental regulation IDs are present in Supabase.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
