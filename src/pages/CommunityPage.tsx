import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ThumbsUp, MessageSquare, Plus, X } from 'lucide-react'
import { ESG_CATEGORIES } from '../types/index'

const CAT_COLORS: Record<string, string> = {
  climate: 'bg-blue-100 text-blue-700', circularity: 'bg-green-100 text-green-700',
  nature: 'bg-teal-100 text-teal-700', social: 'bg-orange-100 text-orange-700',
  governance: 'bg-purple-100 text-purple-700', general: 'bg-slate-100 text-slate-600',
}

interface CommunityPageProps { user: any }

export default function CommunityPage({ user }: CommunityPageProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [showNew, setShowNew] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)

  const tabs = ['general', ...ESG_CATEGORIES.map(c => c.toLowerCase())]

  useEffect(() => { fetchPosts() }, [activeTab])

  const fetchPosts = async () => {
    setLoading(true)
    let query = supabase.from('community_posts')
      .select('*').is('parent_post_id', null).order('created_at', { ascending: false }).limit(50)
    if (activeTab !== 'all') query = query.eq('category_tag', activeTab)
    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  const submitPost = async () => {
    if (!newContent.trim() || !user) return
    setSubmitting(true)
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    await supabase.from('community_posts').insert({
      author_id: user.id,
      author_display_name: profile?.full_name || user.email.split('@')[0],
      content: newContent.trim(),
      category_tag: newCategory,
    })
    setNewContent('')
    setShowNew(false)
    setSubmitting(false)
    fetchPosts()
  }

  const upvote = async (id: string, current: number) => {
    await supabase.from('community_posts').update({ upvotes: current + 1 }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: current + 1 } : p))
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community Forum</h1>
          <p className="text-slate-500 text-sm mt-1">Discuss ESG regulations with peers</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* New post modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Post</h2>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {tabs.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="Share a question, insight, or update… (max 500 chars)"
              maxLength={500} rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1" />
            <p className="text-xs text-slate-400 mb-4">{newContent.length}/500</p>
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
              <button onClick={submitPost} disabled={submitting || !newContent.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <MessageSquare size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No posts yet</p>
          <p className="text-sm text-slate-400 mt-1">Be the first to start a discussion</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-medium text-slate-800">{post.author_display_name}</span>
                  {post.author_role && <span className="text-slate-400 text-sm ml-2">· {post.author_role}</span>}
                  <span className="text-slate-400 text-xs ml-2">· {new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[post.category_tag] || CAT_COLORS.general}`}>
                  {post.category_tag}
                </span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-3">{post.content}</p>
              {post.ai_draft_answer && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-blue-600 mb-1">🤖 AI Draft Answer</p>
                  <p className="text-sm text-blue-800">{post.ai_draft_answer}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <button onClick={() => upvote(post.id, post.upvotes)}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <ThumbsUp size={14} /> {post.upvotes || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
