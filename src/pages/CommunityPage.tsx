import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ThumbsUp, MessageSquare, Plus, X } from 'lucide-react'
import { ESG_CATEGORIES } from '../types/index'
import { CATEGORY_BADGES } from '../lib/appTheme'

interface CommunityPageProps {
  user: any
}

export default function CommunityPage({ user }: CommunityPageProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)

  const tabs = ['all', 'general', ...ESG_CATEGORIES.map((category) => category.toLowerCase())]

  useEffect(() => {
    fetchPosts()
  }, [activeTab])

  const fetchPosts = async () => {
    setLoading(true)

    let query = supabase
      .from('community_posts')
      .select('*')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (activeTab !== 'all') {
      query = query.eq('category_tag', activeTab)
    }

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
    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, upvotes: current + 1 } : post)))
  }

  return (
    <div className="page-shell-narrow">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="metric-pill">
          <span>💬</span>
          <span className="font-bold text-[hsl(var(--primary))]">{posts.length}</span>
          discussions in view
        </div>

        <button onClick={() => setShowNew(true)} className="ui-button-primary">
          <Plus size={16} />
          New Post
        </button>
      </div>

      <div className="surface-card mb-6 p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ui-filter-pill ${activeTab === tab ? 'ui-filter-pill-active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface-card w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">New Discussion</h2>
              <button onClick={() => setShowNew(false)} className="ui-button-ghost !p-2">
                <X size={18} />
              </button>
            </div>

            <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="ui-select mb-3">
              {tabs.filter((tab) => tab !== 'all').map((tab) => (
                <option key={tab} value={tab}>
                  {tab}
                </option>
              ))}
            </select>

            <textarea
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
              placeholder="Share a question, insight, or implementation update..."
              maxLength={500}
              rows={5}
              className="ui-textarea mb-2 resize-none"
            />
            <p className="mb-4 text-xs text-[hsl(var(--muted-foreground))]">{newContent.length}/500</p>

            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="ui-button-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={submitPost}
                disabled={submitting || !newContent.trim()}
                className="ui-button-primary flex-1 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="surface-card px-6 py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">Loading discussions...</div>
      ) : posts.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No posts yet</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Be the first to start a discussion in this topic area.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="surface-card p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{post.author_display_name}</span>
                    {post.author_role && (
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">· {post.author_role}</span>
                    )}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      · {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${CATEGORY_BADGES[post.category_tag?.charAt(0).toUpperCase() + post.category_tag?.slice(1)] || 'bg-slate-100 text-slate-600'}`}>
                  {post.category_tag}
                </span>
              </div>

              <p className="mb-4 text-sm leading-7 text-[hsl(var(--foreground))]">{post.content}</p>

              {post.ai_draft_answer && (
                <div className="mb-4 rounded-xl border border-[hsl(var(--primary)/0.18)] bg-[hsl(var(--primary)/0.06)] p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--primary))]">AI Draft Answer</p>
                  <p className="text-sm leading-7 text-[hsl(var(--foreground))]">{post.ai_draft_answer}</p>
                </div>
              )}

              <button
                onClick={() => upvote(post.id, post.upvotes)}
                className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"
              >
                <ThumbsUp size={14} />
                {post.upvotes || 0} upvotes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
