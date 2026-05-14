#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { MANUAL_POLICY_PAGE_URLS } from './find-policy-page-urls.mjs'

const REPO_ROOT = '/Users/lucas/Documents/GitHub/esg-advisor'
const DEFAULT_SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'

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

function deriveSiteRoot(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

function chunk(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
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

  const regulationIds = Object.keys(MANUAL_POLICY_PAGE_URLS)
  const existingRegulations = []

  for (const ids of chunk(regulationIds, 150)) {
    const { data, error } = await supabase
      .from('regulations')
      .select('id,title,official_source_url,policy_page_url')
      .in('id', ids)

    if (error) throw error
    existingRegulations.push(...(data || []))
  }

  const existingById = new Map(existingRegulations.map((row) => [String(row.id), row]))
  const updates = []

  for (const regulationId of regulationIds) {
    const existing = existingById.get(regulationId)
    if (!existing) continue

    const policyPageUrl = MANUAL_POLICY_PAGE_URLS[regulationId]
    const officialSourceUrl = deriveSiteRoot(policyPageUrl)
    const regulationNeedsPolicy = !existing.policy_page_url
    const regulationNeedsOfficial = !existing.official_source_url || existing.official_source_url === existing.policy_page_url

    if (!regulationNeedsPolicy && !regulationNeedsOfficial) continue

    updates.push({
      regulationId,
      title: existing.title,
      policyPageUrl,
      officialSourceUrl,
      regulationNeedsPolicy,
      regulationNeedsOfficial,
    })
  }

  if (!dryRun) {
    for (const update of updates) {
      const regulationPatch = {}
      if (update.regulationNeedsPolicy) regulationPatch.policy_page_url = update.policyPageUrl
      if (update.regulationNeedsOfficial) regulationPatch.official_source_url = update.officialSourceUrl

      if (Object.keys(regulationPatch).length > 0) {
        const { error } = await supabase
          .from('regulations')
          .update(regulationPatch)
          .eq('id', update.regulationId)
        if (error) throw error
      }

      const documentPatch = {}
      if (update.regulationNeedsPolicy) documentPatch.policy_page_url = update.policyPageUrl
      if (update.regulationNeedsOfficial) documentPatch.official_source_url = update.officialSourceUrl

      if (Object.keys(documentPatch).length > 0) {
        const { error } = await supabase
          .from('regulation_source_documents')
          .update(documentPatch)
          .eq('regulation_id', update.regulationId)
        if (error) throw error
      }
    }
  }

  console.log(JSON.stringify({
    dry_run: dryRun,
    manual_entries: regulationIds.length,
    live_regulations_found: existingRegulations.length,
    pending_updates: updates.length,
    sample: updates.slice(0, 20),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
