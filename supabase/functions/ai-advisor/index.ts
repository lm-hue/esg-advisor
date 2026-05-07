import { createClient } from 'npm:@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const MODEL = 'gpt-5.4'
const MAX_PROMPT_LENGTH = 4000
const MAX_MESSAGE_COUNT = 6
const MAX_MESSAGE_LENGTH = 2000
const MAX_SOURCE_COUNT = 8
const MAX_EXCERPTS = 12

type AdvisorRole = 'user' | 'assistant'
type AdvisorMode = 'chat' | 'region-comparison'

interface AdvisorMessage {
  role: AdvisorRole
  content: string
}

interface AdvisorSource {
  regulationId?: string
  title: string
  sourceName: string
  sourceUrl: string
}

interface AdvisorRequest {
  mode: AdvisorMode
  prompt: string
  messages?: AdvisorMessage[]
  sources?: AdvisorSource[]
}

interface Citation {
  label: string
  title: string
  sourceName: string
  sourceUrl: string
  documentUrl?: string
  archivedPublicUrl?: string
  versionLabel?: string
  documentType?: 'html' | 'pdf' | 'other'
}

interface ExcerptTarget {
  excerptLabel: string
  citationLabel: string
  title: string
  sourceName: string
  sourceUrl: string
  documentId: string
  chunkIndex: number
  documentUrl?: string
  archivedPublicUrl?: string
  versionLabel?: string
  documentType?: 'html' | 'pdf' | 'other'
}

interface ResearchChunk {
  label: string
  title: string
  sourceName: string
  sourceUrl: string
  documentId: string
  chunkIndex: number
  documentUrl?: string
  archivedPublicUrl?: string
  versionLabel?: string
  documentType?: 'html' | 'pdf' | 'other'
  text: string
  score: number
  excerptLabel?: string
}

interface StoredDocument {
  id: string
  regulation_id: string
  title: string
  source_name: string
  source_url: string
  document_url: string | null
  document_type: 'html' | 'pdf' | 'other'
  version_label: string
  archived_public_url: string | null
  fetch_status: string
  last_indexed_at: string | null
}

interface StoredChunk {
  document_id: string
  chunk_index: number
  content: string
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

function parseRequest(payload: unknown): AdvisorRequest | null {
  if (!payload || typeof payload !== 'object') return null

  const candidate = payload as Record<string, unknown>
  const mode = candidate.mode
  const prompt = candidate.prompt
  const messages = candidate.messages
  const sources = candidate.sources

  if (mode !== 'chat' && mode !== 'region-comparison') return null
  if (typeof prompt !== 'string' || !prompt.trim()) return null
  if (messages !== undefined && !Array.isArray(messages)) return null
  if (sources !== undefined && !Array.isArray(sources)) return null

  const normalizedMessages = Array.isArray(messages)
    ? messages
        .filter((message): message is Record<string, unknown> => !!message && typeof message === 'object')
        .map((message) => ({ role: message.role, content: message.content }))
    : []

  if (normalizedMessages.some((message) => (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string')) {
    return null
  }

  const normalizedSources = Array.isArray(sources)
    ? sources
        .filter((source): source is Record<string, unknown> => !!source && typeof source === 'object')
        .map((source) => ({
          regulationId: typeof source.regulationId === 'string' ? source.regulationId : undefined,
          title: source.title,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl,
        }))
    : []

  if (
    normalizedSources.some(
      (source) =>
        typeof source.title !== 'string' ||
        typeof source.sourceName !== 'string' ||
        typeof source.sourceUrl !== 'string'
    )
  ) {
    return null
  }

  return {
    mode,
    prompt: prompt.trim(),
    messages: normalizedMessages as AdvisorMessage[],
    sources: normalizedSources as AdvisorSource[],
  }
}

function enforceLimits(request: AdvisorRequest) {
  if (request.prompt.length > MAX_PROMPT_LENGTH) {
    return 'Prompt is too long. Please shorten your request.'
  }

  if ((request.messages || []).length > MAX_MESSAGE_COUNT) {
    return 'Conversation history is too long. Please start a new chat.'
  }

  if ((request.messages || []).some((message) => message.content.length > MAX_MESSAGE_LENGTH)) {
    return 'One of the recent messages is too long. Please shorten it and try again.'
  }

  if ((request.sources || []).length > MAX_SOURCE_COUNT) {
    return 'Too many source documents were selected. Please narrow the research scope.'
  }

  return null
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
        (token) => !['from', 'with', 'that', 'this', 'what', 'when', 'where', 'have', 'about', 'their'].includes(token)
      )
    )
  )
}

function scoreChunk(text: string, terms: string[]) {
  const haystack = text.toLowerCase()
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
}

function buildResearchPrompt(request: AdvisorRequest, chunks: ResearchChunk[]) {
  const history = (request.messages || [])
    .slice(-MAX_MESSAGE_COUNT)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')

  const sourcesBlock = chunks
    .map((chunk) => {
      const location = chunk.documentUrl ? `Document URL: ${chunk.documentUrl}` : `Source URL: ${chunk.sourceUrl}`
      return `[${chunk.excerptLabel || chunk.label}] ${chunk.title} | ${chunk.sourceName}\n${location}\nExcerpt: ${chunk.text}`
    })
    .join('\n\n')

  return [
    'You are an ESG regulation research assistant operating in strict source-grounded mode.',
    'Answer only from the supplied excerpts stored from official source materials.',
    'Do not use outside knowledge, training data, or unstated assumptions.',
    'If the excerpts do not support an answer, explicitly say that you cannot confirm it from the provided source materials.',
    'Every substantive claim must cite one or more excerpt labels like [S1.1] or [S2.3].',
    'Format the answer clearly.',
    'Use short sections with labels when helpful, such as Summary, Key Points, Practical Implications, and Gaps or Limits.',
    'Use bullets for multiple points instead of dense paragraphs.',
    'Keep paragraphs short and easy to scan.',
    request.mode === 'region-comparison'
      ? 'This is a comparison task. Compare only what is supported by the cited source materials.'
      : 'This is a regulation research task. Stay within the cited source materials.',
    history ? `Recent conversation:\n${history}` : '',
    `User question:\n${request.prompt}`,
    '',
    `Source excerpts:\n${sourcesBlock}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function extractOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as Array<Record<string, unknown>>)
      : []
    const text = content
      .filter((entry) => entry?.type === 'output_text' && typeof entry.text === 'string')
      .map((entry) => entry.text)
      .join('')

    if (text.trim()) return text.trim()
  }

  return ''
}

async function loadStoredResearch(
  supabase: ReturnType<typeof createClient>,
  sources: AdvisorSource[],
  request: AdvisorRequest
) {
  const terms = tokenize(`${request.prompt}\n${(request.messages || []).map((message) => message.content).join('\n')}`)
  const citations: Citation[] = []
  const chunks: ResearchChunk[] = []
  const missingSources: string[] = []

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index]
    let documentsQuery = supabase
      .from('regulation_source_documents')
      .select('id, regulation_id, title, source_name, source_url, document_url, document_type, version_label, archived_public_url, fetch_status, last_indexed_at')

    if (source.regulationId) {
      documentsQuery = documentsQuery.eq('regulation_id', source.regulationId)
    } else {
      documentsQuery = documentsQuery.eq('source_url', source.sourceUrl)
    }

    const { data: documents, error: documentsError } = await documentsQuery

    if (documentsError) {
      throw new Error(documentsError.message)
    }

    const allDocuments = (documents || []) as StoredDocument[]
    const successfulDocuments = allDocuments.filter((document) => document.fetch_status === 'indexed')
    if (successfulDocuments.length === 0) {
      missingSources.push(source.title)
      continue
    }

    const preferredLinkedDocument =
      allDocuments.find((document) => document.document_type === 'pdf' && (document.archived_public_url || document.document_url)) ||
      allDocuments.find((document) => document.document_type === 'html' && (document.archived_public_url || document.document_url)) ||
      allDocuments.find((document) => document.archived_public_url || document.document_url)

    const { data: storedChunks, error: chunksError } = await supabase
      .from('regulation_source_chunks')
      .select('document_id, chunk_index, content')
      .in('document_id', successfulDocuments.map((document) => document.id))

    if (chunksError) {
      throw new Error(chunksError.message)
    }

    const grouped = new Map<string, StoredChunk[]>()
    ;((storedChunks || []) as StoredChunk[]).forEach((chunk) => {
      const list = grouped.get(chunk.document_id) || []
      list.push(chunk)
      grouped.set(chunk.document_id, list)
    })

    const label = `S${index + 1}`
    citations.push({
      label,
      title: source.title,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      documentUrl: preferredLinkedDocument?.document_url || undefined,
      archivedPublicUrl: preferredLinkedDocument?.archived_public_url || undefined,
      versionLabel: preferredLinkedDocument?.version_label || successfulDocuments[0]?.version_label || undefined,
      documentType: preferredLinkedDocument?.document_type,
    })

    successfulDocuments.forEach((document) => {
      const documentChunks = (grouped.get(document.id) || [])
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map((chunk) => ({
          label,
          title: source.title,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl,
          documentId: document.id,
          chunkIndex: chunk.chunk_index,
          documentUrl: document.document_url || undefined,
          archivedPublicUrl: document.archived_public_url || undefined,
          versionLabel: document.version_label || undefined,
          documentType: document.document_type,
          text: chunk.content,
          score: scoreChunk(chunk.content, terms) + (document.document_type === 'pdf' ? 3 : document.document_url ? 1 : 0),
        }))

      chunks.push(...documentChunks)
    })
  }

  const selectedChunks = chunks
    .filter((chunk) => !!chunk.text)
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length)
    .slice(0, MAX_EXCERPTS)

  const countsByCitation = new Map<string, number>()
  const excerptTargets: ExcerptTarget[] = selectedChunks.map((chunk) => {
    const nextCount = (countsByCitation.get(chunk.label) || 0) + 1
    countsByCitation.set(chunk.label, nextCount)
    const excerptLabel = `${chunk.label}.${nextCount}`
    chunk.excerptLabel = excerptLabel

    return {
      excerptLabel,
      citationLabel: chunk.label,
      title: chunk.title,
      sourceName: chunk.sourceName,
      sourceUrl: chunk.sourceUrl,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      documentUrl: chunk.documentUrl,
      archivedPublicUrl: chunk.archivedPublicUrl,
      versionLabel: chunk.versionLabel,
      documentType: chunk.documentType,
    }
  })

  return {
    citations,
    excerptTargets,
    missingSources,
    chunks: selectedChunks,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  const openAIKey = Deno.env.get('OPENAI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!openAIKey) {
    return jsonResponse(500, { error: 'AI advisor is not configured yet.' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Research index is not configured in Supabase Edge Function secrets.' })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid request body.' })
  }

  const advisorRequest = parseRequest(payload)
  if (!advisorRequest) {
    return jsonResponse(400, { error: 'Invalid AI advisor request.' })
  }

  const limitError = enforceLimits(advisorRequest)
  if (limitError) {
    return jsonResponse(429, { error: limitError })
  }

  if (!advisorRequest.sources || advisorRequest.sources.length === 0) {
    return jsonResponse(400, {
      error: 'Research mode needs at least one linked regulation source before it can answer.',
    })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const storedResearch = await loadStoredResearch(supabase, advisorRequest.sources, advisorRequest)

    if (storedResearch.chunks.length === 0) {
      const detail = storedResearch.missingSources.length > 0
        ? ` Sources not indexed yet: ${storedResearch.missingSources.join('; ')}.`
        : ''
      return jsonResponse(200, {
        content: `I can only answer from indexed source materials, and I do not have cached excerpts for this request yet.${detail} Run the source indexing step for the regulation before asking research questions.`,
        citations: storedResearch.citations,
        excerptTargets: storedResearch.excerptTargets,
      })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: 'high' },
        input: buildResearchPrompt(advisorRequest, storedResearch.chunks),
      }),
    })

    if (!response.ok) {
      let upstreamMessage = ''
      try {
        const upstream = await response.json()
        if (typeof upstream?.error?.message === 'string') {
          upstreamMessage = upstream.error.message
        }
      } catch {
        upstreamMessage = ''
      }

      return jsonResponse(response.status === 429 ? 429 : 502, {
        error: response.status === 429
          ? 'AI advisor is busy right now. Please try again shortly.'
          : upstreamMessage || 'AI advisor is temporarily unavailable.',
      })
    }

    const data = await response.json()
    const content = extractOutputText(data)
    if (!content) {
      return jsonResponse(502, { error: 'AI advisor returned an empty response.' })
    }

    return jsonResponse(200, {
      content,
      citations: storedResearch.citations,
      excerptTargets: storedResearch.excerptTargets,
    })
  } catch (error) {
    return jsonResponse(502, {
      error: error instanceof Error && error.message ? error.message : 'AI advisor is temporarily unavailable.',
    })
  }
})
