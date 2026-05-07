import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Send, Bot, User, Trash2, X, PanelRightOpen, Quote } from 'lucide-react'
import { AIAdvisorCitation, AIAdvisorExcerptTarget, AIAdvisorSource, invokeAIAdvisor } from '../lib/aiAdvisor'
import {
  fetchAllRegulations,
  fetchRegulationSourceChunk,
  fetchRegulationSourceDocumentById,
  RegulationRecord,
} from '../lib/regulations'
import { RegulationSourceChunk, RegulationSourceDocument } from '../types'
import { getStatusWeight, isRegulationCurrentlyEffective, normalizeStatus } from '../lib/appTheme'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  citations?: AIAdvisorCitation[]
  excerptTargets?: AIAdvisorExcerptTarget[]
}

interface AIAdvisorPageProps {
  user: any
}

interface CitationContextState {
  target: AIAdvisorExcerptTarget
  assistantContent: string
  document: RegulationSourceDocument | null
  chunk: RegulationSourceChunk | null
  loading: boolean
}

function buildExcerptHref(target: AIAdvisorExcerptTarget) {
  const params = new URLSearchParams({
    chunk: String(target.chunkIndex),
    excerpt: target.excerptLabel,
  })

  return `/sources/${target.documentId}?${params.toString()}#chunk-${target.chunkIndex}`
}

function getCitationExcerptTarget(citation: AIAdvisorCitation, excerptTargets: AIAdvisorExcerptTarget[] = []) {
  return excerptTargets.find((target) => target.citationLabel === citation.label) || null
}

function buildRelevantSnippet(text: string, referenceText: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const candidates = paragraphs.length > 0
    ? paragraphs
    : text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean)

  if (candidates.length === 0) return ''

  const terms = Array.from(
    new Set(
      (referenceText.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter(
        (term) => !['this', 'that', 'with', 'from', 'have', 'what', 'when', 'where', 'they', 'their'].includes(term)
      )
    )
  )

  const best = candidates
    .map((candidate) => {
      const normalized = candidate.toLowerCase()
      const score = terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0)
      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score || b.candidate.length - a.candidate.length)
    .slice(0, 2)
    .map(({ candidate }) => candidate)
    .join('\n\n')

  const snippet = best || candidates[0]
  return snippet.length > 700 ? `${snippet.slice(0, 700).trimEnd()}...` : snippet
}

function buildDocumentLink(document: RegulationSourceDocument | null, target: AIAdvisorExcerptTarget) {
  if (document?.document_type === 'pdf') {
    return document.archived_public_url || document.document_url || target.archivedPublicUrl || target.documentUrl || target.sourceUrl
  }

  return document?.document_url || target.documentUrl || target.sourceUrl
}

function renderInlineFormatting(
  text: string,
  excerptTargetsByLabel: Map<string, AIAdvisorExcerptTarget>,
  onExcerptSelect?: (target: AIAdvisorExcerptTarget) => void
) {
  const tokens = text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\)|\[(?:S\d+\.\d+)\])/g)
    .filter(Boolean)

  return tokens.map((token, index) => {
    const excerptMatch = token.match(/^\[(S\d+\.\d+)\]$/)
    if (excerptMatch) {
      const target = excerptTargetsByLabel.get(excerptMatch[1])
      if (target) {
        return (
          <button
            type="button"
            key={`${index}-${target.excerptLabel}`}
            onClick={() => onExcerptSelect?.(target)}
            className="font-semibold text-[hsl(var(--primary))] underline underline-offset-2"
          >
            [{target.excerptLabel}]
          </button>
        )
      }
    }

    const boldMatch = token.match(/^\*\*([^*]+)\*\*$/)
    if (boldMatch) {
      return <strong key={`${index}-${boldMatch[1]}`}>{boldMatch[1]}</strong>
    }

    const codeMatch = token.match(/^`([^`]+)`$/)
    if (codeMatch) {
      return (
        <code
          key={`${index}-${codeMatch[1]}`}
          className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 font-mono text-[0.92em]"
        >
          {codeMatch[1]}
        </code>
      )
    }

    const italicMatch = token.match(/^\*([^*]+)\*$/) || token.match(/^_([^_]+)_$/)
    if (italicMatch) {
      return <em key={`${index}-${italicMatch[1]}`}>{italicMatch[1]}</em>
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={`${index}-${linkMatch[2]}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[hsl(var(--primary))] underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return <span key={`${index}-${token.slice(0, 12)}`}>{token}</span>
  })
}

function renderStructuredMessage(
  content: string,
  excerptTargets: AIAdvisorExcerptTarget[] = [],
  onExcerptSelect?: (target: AIAdvisorExcerptTarget) => void
) {
  const excerptTargetsByLabel = new Map(excerptTargets.map((target) => [target.excerptLabel, target]))
  const codeFenceParts = content.split(/```/)

  return codeFenceParts.flatMap((part, partIndex) => {
    if (partIndex % 2 === 1) {
      const normalized = part.replace(/^\w+\n/, '').trim()
      return [
        <pre
          key={`code-${partIndex}-${normalized.slice(0, 20)}`}
          className="overflow-x-auto rounded-2xl bg-[hsl(var(--muted))] px-4 py-3 font-mono text-xs leading-6 text-[hsl(var(--foreground))]"
        >
          <code>{normalized}</code>
        </pre>,
      ]
    }

    return renderTextBlocks(part, partIndex, excerptTargetsByLabel, onExcerptSelect)
  })
}

function renderTextBlocks(
  content: string,
  offset: number,
  excerptTargetsByLabel: Map<string, AIAdvisorExcerptTarget>,
  onExcerptSelect?: (target: AIAdvisorExcerptTarget) => void
) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.map((block, index) => {
    const keyBase = `${offset}-${index}`
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const isList = lines.every((line) => /^([-*]|\d+\.)\s+/.test(line))
    const headingMatch = lines.length === 1 ? lines[0].match(/^(#{1,3})\s+(.+)$/) : null
    const blockQuote = lines.every((line) => /^>\s?/.test(line))
    const divider = lines.length === 1 && /^([-*_]){3,}$/.test(lines[0])

    if (headingMatch) {
      return (
        <p
          key={`${keyBase}-${headingMatch[2]}`}
          className={`whitespace-pre-wrap font-semibold text-[hsl(var(--foreground))] ${
            headingMatch[1].length === 1 ? 'text-base' : headingMatch[1].length === 2 ? 'text-sm' : 'text-sm uppercase tracking-[0.12em]'
          }`}
        >
          {renderInlineFormatting(headingMatch[2], excerptTargetsByLabel, onExcerptSelect)}
        </p>
      )
    }

    if (divider) {
      return <div key={`${keyBase}-divider`} className="border-t border-[hsl(var(--border))]" />
    }

    if (blockQuote) {
      return (
        <blockquote
          key={`${keyBase}-quote`}
          className="border-l-2 border-[hsl(var(--border))] pl-4 text-[hsl(var(--muted-foreground))]"
        >
          <div className="space-y-2">
            {lines.map((line, lineIndex) => (
              <p key={`${keyBase}-${lineIndex}`} className="whitespace-pre-wrap">
                {renderInlineFormatting(line.replace(/^>\s?/, ''), excerptTargetsByLabel, onExcerptSelect)}
              </p>
            ))}
          </div>
        </blockquote>
      )
    }

    if (isList) {
      return (
        <ul key={`${keyBase}-${block.slice(0, 20)}`} className="space-y-2">
          {lines.map((line, lineIndex) => (
            <li key={`${keyBase}-${lineIndex}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              <span>{renderInlineFormatting(line.replace(/^([-*]|\d+\.)\s+/, ''), excerptTargetsByLabel, onExcerptSelect)}</span>
            </li>
          ))}
        </ul>
      )
    }

    return (
      <p key={`${keyBase}-${block.slice(0, 20)}`} className="whitespace-pre-wrap">
        {renderInlineFormatting(block, excerptTargetsByLabel, onExcerptSelect)}
      </p>
    )
  })
}

function formatComparisonIntro(a: RegulationRecord, b: RegulationRecord) {
  const similarities: string[] = []
  const differences: string[] = []

  if (a.region && b.region && a.region === b.region) {
    similarities.push(`both apply in ${a.region}`)
  }

  if (a.category && b.category && a.category === b.category) {
    similarities.push(`both focus on ${a.category.toLowerCase()}`)
  }

  if (a.status && b.status && a.status === b.status) {
    similarities.push(`both currently have ${a.status.replace(/_/g, ' ')} status`)
  }

  if (a.region && b.region && a.region !== b.region) {
    differences.push(`they apply in different jurisdictions: ${a.region} versus ${b.region}`)
  }

  if (a.category && b.category && a.category !== b.category) {
    differences.push(`they cover different themes: ${a.category} versus ${b.category}`)
  }

  if (a.status && b.status && a.status !== b.status) {
    differences.push(`their statuses differ: ${a.status.replace(/_/g, ' ')} versus ${b.status.replace(/_/g, ' ')}`)
  }

  if (a.effective_date && b.effective_date && a.effective_date !== b.effective_date) {
    differences.push(`their effective dates differ: ${a.effective_date} versus ${b.effective_date}`)
  }

  return [
    `Here is a quick comparison of ${a.title} and ${b.title}.`,
    similarities.length ? `They share some common ground: ${similarities.join(', ')}.` : '',
    differences.length ? `Key differences include that ${differences.join(', ')}.` : '',
    'Research mode is on, so I will answer only from the official source materials tied to these regulations and cite what I use.',
  ]
    .filter(Boolean)
    .join(' ')
}

function getRegionThemeSummary(regulations: RegulationRecord[]) {
  const counts = regulations.reduce<Record<string, number>>((acc, regulation) => {
    const key = regulation.category || 'Other'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => `${category} (${count})`)
    .join(', ')
}

function getRegionTypeSummary(regulations: RegulationRecord[]) {
  const counts = regulations.reduce<Record<string, number>>((acc, regulation) => {
    const key = regulation.source_name || 'Other'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([source]) => source)
    .join(', ')
}

function formatRegionOverview(region: string, regulations: RegulationRecord[]) {
  const inForce = regulations.filter((regulation) => isRegulationCurrentlyEffective(regulation.status)).length
  const adopted = regulations.filter((regulation) => normalizeStatus(regulation.status) === 'adopted_not_yet_effective').length
  const draft = regulations.filter((regulation) => regulation.status === 'draft').length
  const notableTitles = regulations.slice(0, 3).map((regulation) => regulation.title).join('; ')
  const themes = getRegionThemeSummary(regulations)
  const sources = getRegionTypeSummary(regulations)

  return [
    `${region}: ${regulations.length} tracked regulations`,
    `${inForce} in force, ${adopted} adopted, ${draft} draft`,
    themes ? `main themes: ${themes}` : '',
    sources ? `notable sources/frameworks: ${sources}` : '',
    notableTitles ? `sample regulations: ${notableTitles}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

function buildRegionComparisonPrompt(regionA: string, regionB: string, regulationsA: RegulationRecord[], regulationsB: RegulationRecord[]) {
  return [
    `Compare the ESG regulatory landscape in ${regionA} and ${regionB}.`,
    'Use only the provided official source materials for the regulations selected for this comparison.',
    'Provide a concise side-by-side analysis with:',
    '1. Major similarities',
    '2. Important differences',
    '3. Relative regulatory maturity and what appears stricter or more developed',
    '4. Notable regulations or frameworks in each region',
    '5. Practical implications for a company operating in both regions',
    'If a point is not supported by the supplied sources, say that you cannot confirm it from the source materials.',
    '',
    formatRegionOverview(regionA, regulationsA),
    formatRegionOverview(regionB, regulationsB),
  ].join('\n')
}

function rankRegulationsForResearch(regulations: RegulationRecord[]) {
  return [...regulations].sort((a, b) => {
    const statusDelta = getStatusWeight(b.status) - getStatusWeight(a.status)
    if (statusDelta !== 0) return statusDelta

    const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0
    const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0
    return dateB - dateA
  })
}

function toResearchSources(regulations: RegulationRecord[], limit = 8): AIAdvisorSource[] {
  const unique = rankRegulationsForResearch(regulations).filter(
    (regulation, index, array) => !!regulation.official_source_url && array.findIndex((candidate) => candidate.id === regulation.id) === index
  )

  return unique.slice(0, limit).map((regulation) => ({
    regulationId: regulation.id,
    title: regulation.title,
    sourceName: regulation.source_name,
    sourceUrl: regulation.official_source_url || '',
  }))
}

export default function AIAdvisorPage({ user }: AIAdvisorPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const regulationId = searchParams.get('regulationId')
  const contextMessage = searchParams.get('context')
  const contextTitle = searchParams.get('title')
  const compareIdA = searchParams.get('compareIdA')
  const compareIdB = searchParams.get('compareIdB')
  const compareTitleA = searchParams.get('compareTitleA')
  const compareTitleB = searchParams.get('compareTitleB')
  const regionCompareA = searchParams.get('regionCompareA')
  const regionCompareB = searchParams.get('regionCompareB')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your ESG research advisor. I only answer from the official source materials linked to the selected regulation or comparison, and I cite the sources I use. Open me from a regulation or comparison, or ask with an exact regulation/framework name so I can find the right sources.",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [regulations, setRegulations] = useState<RegulationRecord[]>([])
  const [citationContext, setCitationContext] = useState<CitationContextState | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoRegionComparisonRef = useRef<string | null>(null)

  useEffect(() => {
    fetchAllRegulations().then((data) => setRegulations((data || []) as RegulationRecord[]))
  }, [])

  const findRegulation = (id: string | null) => {
    if (!id) return null
    return regulations.find((regulation) => regulation.id === id) || null
  }

  const getScopedResearchSources = (query: string) => {
    const explicitlyScoped = [findRegulation(regulationId), findRegulation(compareIdA), findRegulation(compareIdB)].filter(Boolean) as RegulationRecord[]
    if (explicitlyScoped.length > 0) {
      return toResearchSources(explicitlyScoped, 6)
    }

    if (regionCompareA && regionCompareB) {
      const regional = regulations.filter((regulation) => regulation.region === regionCompareA || regulation.region === regionCompareB)
      return toResearchSources(regional, 8)
    }

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const relevant = regulations.filter((regulation) =>
      regulation.title.toLowerCase().includes(normalizedQuery) ||
      regulation.region.toLowerCase().includes(normalizedQuery) ||
      regulation.category.toLowerCase().includes(normalizedQuery) ||
      regulation.source_name.toLowerCase().includes(normalizedQuery) ||
      (regulation.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery))
    )

    return toResearchSources(relevant, 5)
  }

  useEffect(() => {
    if (!compareIdA || !compareIdB || regulations.length === 0) return

    const regulationA = findRegulation(compareIdA)
    const regulationB = findRegulation(compareIdB)
    if (!regulationA || !regulationB) return

    setMessages((current) => {
      if (current.length > 1) return current
      return [
        {
          role: 'assistant',
          content: formatComparisonIntro(regulationA, regulationB),
          timestamp: Date.now(),
        },
      ]
    })
  }, [compareIdA, compareIdB, regulations])

  useEffect(() => {
    if (!regionCompareA || !regionCompareB || regulations.length === 0) return
    const comparisonKey = `${regionCompareA}::${regionCompareB}`
    if (autoRegionComparisonRef.current === comparisonKey) return

    const regulationsA = regulations.filter((regulation) => regulation.region === regionCompareA)
    const regulationsB = regulations.filter((regulation) => regulation.region === regionCompareB)
    autoRegionComparisonRef.current = comparisonKey
    setLoading(true)

    const prompt = buildRegionComparisonPrompt(regionCompareA, regionCompareB, regulationsA, regulationsB)
    invokeAIAdvisor({
      mode: 'region-comparison',
      prompt,
      sources: toResearchSources([...regulationsA, ...regulationsB], 8),
    })
      .then((reply) => {
        setMessages([
          {
            role: 'assistant',
            content: reply.content || `I compared ${regionCompareA} and ${regionCompareB}, but I could not generate the detailed analysis.`,
            timestamp: Date.now(),
            citations: reply.citations,
            excerptTargets: reply.excerptTargets,
          },
        ])
      })
      .catch((error) => {
        const message = error instanceof Error && error.message
          ? error.message
          : `AI advisor is temporarily unavailable, so I could not generate a side-by-side comparison of ${regionCompareA} and ${regionCompareB}.`

        setMessages([
          {
            role: 'assistant',
            content: message,
            timestamp: Date.now(),
          },
        ])
      })
      .finally(() => setLoading(false))
  }, [regionCompareA, regionCompareB, regulations])

  useEffect(() => {
    if (!contextMessage || regulationId || compareIdA || compareIdB || regionCompareA || regionCompareB) return

    setMessages((current) => {
      if (current.length > 1) return current
      return [
        {
          role: 'assistant',
          content: contextMessage,
          timestamp: Date.now(),
        },
      ]
    })
  }, [contextMessage, regulationId, compareIdA, compareIdB, regionCompareA, regionCompareB])

  useEffect(() => {
    if (!contextTitle || compareIdA || compareIdB || regionCompareA || regionCompareB || regulations.length === 0) return

    const selectedRegulation = findRegulation(regulationId)
    const title = selectedRegulation?.title || contextTitle
    const sourceLabel = selectedRegulation?.source_name ? ` using ${selectedRegulation.source_name} materials` : ''

    setMessages((current) => {
      if (current.length > 1) return current
      return [
        {
          role: 'assistant',
          content: `Let's research ${title}${sourceLabel}. Ask about obligations, deadlines, scope, or reporting implications and I'll answer only from the linked source materials.`,
          timestamp: Date.now(),
        },
      ]
    })
  }, [contextTitle, regulationId, compareIdA, compareIdB, regionCompareA, regionCompareB, regulations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeSnippet = useMemo(() => {
    if (!citationContext?.chunk) return ''
    return buildRelevantSnippet(citationContext.chunk.content, citationContext.assistantContent)
  }, [citationContext])

  const openCitationContext = async (target: AIAdvisorExcerptTarget, assistantContent: string) => {
    setCitationContext({
      target,
      assistantContent,
      document: null,
      chunk: null,
      loading: true,
    })

    const [document, chunk] = await Promise.all([
      fetchRegulationSourceDocumentById(target.documentId),
      fetchRegulationSourceChunk(target.documentId, target.chunkIndex),
    ])

    setCitationContext({
      target,
      assistantContent,
      document,
      chunk,
      loading: false,
    })
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map((message) => ({ role: message.role, content: message.content }))
      const sources = getScopedResearchSources(input)

      if (sources.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Research mode needs at least one regulation source. Open AI from a regulation or comparison, or include the exact regulation/framework name in your question.',
            timestamp: Date.now(),
          },
        ])
        setLoading(false)
        return
      }

      const reply = await invokeAIAdvisor({
        mode: 'chat',
        prompt: input,
        messages: history,
        sources,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply.content,
          timestamp: Date.now(),
          citations: reply.citations,
          excerptTargets: reply.excerptTargets,
        },
      ])
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'AI advisor is temporarily unavailable. Please try again in a moment.'

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: message,
          timestamp: Date.now(),
        },
      ])
    }

    setLoading(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 xl:flex-row">
      <div className="surface-card flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Conversation</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {user ? 'Research mode is on and grounded in linked source materials.' : 'Research mode is on and grounded in linked source materials.'}
            </p>
            {(regionCompareA && regionCompareB) || (compareTitleA && compareTitleB) || contextMessage || contextTitle ? (
              <div className="mt-3">
                {regionCompareA && regionCompareB ? (
                  <button
                    onClick={() => setSearchParams({})}
                    className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]"
                  >
                    Comparing regions {regionCompareA} vs {regionCompareB}
                    <X size={12} />
                  </button>
                ) : compareTitleA && compareTitleB ? (
                  <button
                    onClick={() => setSearchParams({})}
                    className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]"
                  >
                    Comparing {compareTitleA} vs {compareTitleB}
                    <X size={12} />
                  </button>
                ) : contextMessage ? (
                  <button
                    onClick={() => setSearchParams({})}
                    className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]"
                  >
                    Assessment follow-up
                    <X size={12} />
                  </button>
                ) : contextTitle ? (
                  <button
                    onClick={() => setSearchParams({})}
                    className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]"
                  >
                    {contextTitle}
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: 'Chat cleared. Ask a research question and I will answer only from the linked source materials.',
                  timestamp: Date.now(),
                },
              ])
            }
            className="ui-button-ghost"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[hsl(var(--background))/0.6] px-4 py-5 md:px-5">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  message.role === 'assistant'
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-[hsl(var(--foreground))] text-white'
                }`}
              >
                {message.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>

              <div className="max-w-[82%] space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                    message.role === 'assistant'
                      ? 'border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))]'
                      : 'bg-[hsl(var(--primary))] text-white'
                    }`}
                >
                  <div className="space-y-4">
                    {renderStructuredMessage(
                      message.content,
                      message.excerptTargets,
                      (target) => void openCitationContext(target, message.content)
                    )}
                  </div>
                </div>

                {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <p className="font-medium uppercase tracking-[0.16em]">Research Sources</p>
                    <div className="mt-2 space-y-2">
                      {message.citations.map((citation) => {
                        const excerptTarget = getCitationExcerptTarget(citation, message.excerptTargets)

                        if (excerptTarget) {
                          return (
                            <button
                              type="button"
                              key={`${message.timestamp}-${citation.label}-${citation.sourceUrl}`}
                              onClick={() => void openCitationContext(excerptTarget, message.content)}
                              className="flex w-full items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-left text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.4)]"
                            >
                              <span>
                                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                                  {citation.label}{citation.versionLabel ? ` · ${citation.versionLabel}` : ''}
                                </span>
                                <span className="mt-1 block text-sm font-medium">{citation.title}</span>
                                <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                                  {citation.sourceName}
                                  {citation.documentType === 'pdf' ? ' · PDF document' : citation.documentType === 'html' ? ' · Web document' : ''}
                                </span>
                              </span>
                              <PanelRightOpen size={14} className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                            </button>
                          )
                        }

                        return (
                          <a
                            key={`${message.timestamp}-${citation.label}-${citation.sourceUrl}`}
                            href={citation.archivedPublicUrl || citation.documentUrl || citation.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-left text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.4)]"
                          >
                            <span>
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                                {citation.label}{citation.versionLabel ? ` · ${citation.versionLabel}` : ''}
                              </span>
                              <span className="mt-1 block text-sm font-medium">{citation.title}</span>
                              <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                                {citation.sourceName}
                                {citation.documentType === 'pdf' ? ' · PDF document' : citation.documentType === 'html' ? ' · Web document' : ''}
                              </span>
                            </span>
                            <ExternalLink size={14} className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-white px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                Researching the linked sources...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[hsl(var(--border))] bg-white px-4 py-4 md:px-5">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && sendMessage()}
              placeholder={
                regionCompareA && regionCompareB
                  ? `Ask follow-up questions about ${regionCompareA} vs ${regionCompareB} from the linked sources...`
                  : compareTitleA && compareTitleB
                    ? `Ask to compare ${compareTitleA} and ${compareTitleB} from their source documents...`
                    : contextMessage
                      ? 'Ask how this policy gap appears in the linked source materials...'
                      : contextTitle
                        ? `Ask about ${contextTitle} from its source materials...`
                        : 'Ask a research question about the selected regulation sources...'
              }
              className="ui-input"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="ui-button-primary shrink-0 px-4">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      <aside className="surface-card h-fit w-full shrink-0 overflow-hidden xl:sticky xl:top-6 xl:w-[380px]">
        <div className="border-b border-[hsl(var(--border))] px-5 py-4">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Citation Context</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Click a citation or source card to preview the relevant indexed passage here.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!citationContext ? (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.2] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]">
              The right-side context window will stay focused on the specific excerpt behind the selected citation.
            </div>
          ) : citationContext.loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading cited excerpt...</p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                  {citationContext.target.excerptLabel}
                  {citationContext.document?.version_label ? ` · ${citationContext.document.version_label}` : ''}
                </p>
                <h2 className="mt-2 text-base font-semibold text-[hsl(var(--foreground))]">
                  {citationContext.document?.title || citationContext.target.title}
                </h2>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {citationContext.document?.source_name || citationContext.target.sourceName}
                  {citationContext.document?.document_type === 'pdf' ? ' · PDF document' : citationContext.document?.document_type === 'html' ? ' · Web Document' : ''}
                </p>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.24] px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
                  <Quote size={13} />
                  Relevant Passage
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[hsl(var(--foreground))]">
                  {activeSnippet || 'No excerpt preview is available for this citation yet.'}
                </p>
                {citationContext.chunk?.content && activeSnippet && activeSnippet !== citationContext.chunk.content ? (
                  <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                    Showing the most relevant portion of the indexed chunk, not the full stored text.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to={buildExcerptHref(citationContext.target)} className="ui-button-ghost inline-flex items-center gap-2">
                  Open Full Source
                </Link>
                <a
                  href={buildDocumentLink(citationContext.document, citationContext.target)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-button-ghost inline-flex items-center gap-2"
                >
                  {citationContext.document?.document_type === 'pdf' ? 'Open PDF' : 'Open Link'}
                  <ExternalLink size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
