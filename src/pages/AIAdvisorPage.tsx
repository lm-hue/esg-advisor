import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Send, Bot, User, Trash2 } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: number }
interface AIAdvisorPageProps { user: any }

const SYSTEM_CONTEXT = `You are an expert ESG compliance advisor. You help corporate sustainability 
professionals understand regulations, deadlines, and compliance requirements. Be concise, accurate, 
and cite specific regulations when relevant. Focus on actionable guidance.`

export default function AIAdvisorPage({ user }: AIAdvisorPageProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your ESG AI Advisor. Ask me anything about sustainability regulations, compliance deadlines, or ESG reporting requirements.', timestamp: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [regulations, setRegulations] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('regulations').select('title, summary, region, category, status, effective_date').then(({ data }) => setRegulations(data || []))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const buildContext = (query: string) => {
    const q = query.toLowerCase()
    const relevant = regulations.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    ).slice(0, 5)
    if (!relevant.length) return ''
    return '\n\nRelevant regulations from the database:\n' +
      relevant.map(r => `- ${r.title} (${r.region}, ${r.category}, ${r.status}${r.effective_date ? ', effective ' + r.effective_date : ''}): ${r.summary}`).join('\n')
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const context = buildContext(input)
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_CONTEXT + context },
            ...history,
            { role: 'user', content: input }
          ],
          max_tokens: 600
        })
      })
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response. Please check your OpenAI API key in .env.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI unavailable. Add VITE_OPENAI_API_KEY to your .env file to enable the AI advisor.', timestamp: Date.now() }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Advisor</h1>
          <p className="text-slate-500 text-sm">Ask anything about ESG compliance</p>
        </div>
        <button onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you?', timestamp: Date.now() }])}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {msg.role === 'assistant' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-slate-100 text-slate-700' : 'bg-blue-600 text-white'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"><Bot size={16} className="text-white" /></div>
            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl text-sm text-slate-400">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about CSRD, SFDR, scope 3 emissions…"
          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors">
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
