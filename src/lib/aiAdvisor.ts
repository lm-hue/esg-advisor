import { supabase } from './supabase'

export type AIAdvisorMode = 'chat' | 'region-comparison'

export interface AIAdvisorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIAdvisorSource {
  regulationId?: string
  title: string
  sourceName: string
  sourceUrl: string
}

export interface AIAdvisorCitation {
  label: string
  title: string
  sourceName: string
  sourceUrl: string
  documentUrl?: string
  archivedPublicUrl?: string
  versionLabel?: string
  documentType?: 'html' | 'pdf' | 'other'
}

export interface AIAdvisorExcerptTarget {
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

interface AIAdvisorRequest {
  mode: AIAdvisorMode
  prompt: string
  messages?: AIAdvisorMessage[]
  sources?: AIAdvisorSource[]
}

interface AIAdvisorResponse {
  content?: string
  citations?: AIAdvisorCitation[]
  excerptTargets?: AIAdvisorExcerptTarget[]
  error?: string
}

export async function invokeAIAdvisor(request: AIAdvisorRequest) {
  const { data, error } = await supabase.functions.invoke<AIAdvisorResponse>('ai-advisor', {
    body: request,
  })

  if (error) {
    const rawMessage = data?.error || error.message || 'AI advisor is currently unavailable.'

    if (rawMessage.includes('Failed to send a request to the Edge Function')) {
      throw new Error(
        'The AI advisor function is not reachable. Deploy the `ai-advisor` Supabase Edge Function and confirm your Supabase URL/anon key are correct.'
      )
    }

    throw new Error(rawMessage)
  }

  if (!data?.content) {
    throw new Error(data?.error || 'AI advisor is currently unavailable.')
  }

  return {
    content: data.content,
    citations: data.citations || [],
    excerptTargets: data.excerptTargets || [],
  }
}
