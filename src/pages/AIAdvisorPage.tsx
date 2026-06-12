import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchAllRegulations } from '../lib/regulations'
import { Send, Bot, User, Trash2, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIAdvisorPageProps {
  user: any
}

const SYSTEM_CONTEXT = `You are an expert ESG compliance advisor. You help corporate sustainability 
professionals understand regulations, deadlines, and compliance requirements. Be concise, accurate, 
and cite specific regulations when relevant. Focus on actionable guidance.`

export default function AIAdvisorPage({ user }: AIAdvisorPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const contextTitle = searchParams.get('title')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your ESG AI Advisor. Ask me anything about sustainability regulations, compliance deadlines, or ESG reporting requirements.",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [regulations, setRegulations] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const openAiApiKey = (import.meta.env.VITE_OPENAI_API_KEY || '').trim()

  useEffect(() => {
    fetchAllRegulations().then((data) => setRegulations(data || []))
  }, [])

  useEffect(() => {
    if (!contextTitle) return

    setMessages((current) => {
      if (current.length > 1) return current
      return [
        {
          role: 'assistant',
          content: `Let's discuss ${contextTitle}. Ask about obligations, deadlines, scope, or reporting implications.`,
          timestamp: Date.now(),
        },
      ]
    })
  }, [contextTitle])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = (query: string) => {
    const normalizedQuery = query.toLowerCase()
    const relevant = regulations.filter((regulation) =>
      regulation.title.toLowerCase().includes(normalizedQuery) ||
      (regulation.summary || regulation.description || '').toLowerCase().includes(normalizedQuery) ||
      regulation.region.toLowerCase().includes(normalizedQuery) ||
      regulation.category.toLowerCase().includes(normalizedQuery)
    ).slice(0, 5)

    if (!relevant.length) return ''

    return '\n\nRelevant regulations from the database:\n' +
      relevant.map((regulation) =>
        `- ${regulation.title} (${regulation.region}, ${regulation.category}, ${regulation.status}${regulation.effective_date ? ', effective ' + regulation.effective_date : ''}): ${regulation.summary || regulation.description || 'No summary available.'}`
      ).join('\n')
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      if (!openAiApiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'AI unavailable. `VITE_OPENAI_API_KEY` is missing from your local environment, so the advisor cannot reach OpenAI yet.',
            timestamp: Date.now(),
          },
        ])
        return
      }

      const context = buildContext(input)
      const history = messages.slice(-6).map((message) => ({ role: message.role, content: message.content }))

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_CONTEXT + context },
            ...history,
            { role: 'user', content: input },
          ],
          max_tokens: 600,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        const apiMessage = data?.error?.message || `OpenAI request failed with status ${response.status}.`
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `AI unavailable. ${apiMessage}`,
            timestamp: Date.now(),
          },
        ])
        return
      }

      const reply =
        data.choices?.[0]?.message?.content ||
        'Sorry, I could not generate a response from OpenAI.'

      setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'AI unavailable. The browser request to OpenAI failed before a response came back.',
          timestamp: Date.now(),
        },
      ])
    }

    setLoading(false)
  }

  return (
    <div className="page-shell-narrow">
      <div className="surface-card flex min-h-[70vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Conversation</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {user ? 'Signed in and ready for regulation-specific guidance.' : 'You can browse here before signing in.'}
            </p>
            {contextTitle && (
              <div className="mt-3">
                <button
                  onClick={() => setSearchParams({})}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]"
                >
                  {contextTitle}
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you?', timestamp: Date.now() }])}
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

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                  message.role === 'assistant'
                    ? 'border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))]'
                    : 'bg-[hsl(var(--primary))] text-white'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-white px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                Thinking...
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
              placeholder={contextTitle ? `Ask about ${contextTitle}...` : 'Ask about CSRD, SFDR, scope 3 emissions...'}
              className="ui-input"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="ui-button-primary shrink-0 px-4">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
