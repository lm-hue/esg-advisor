import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  FilterX,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  ThumbsUp,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { withAuthModal } from '../lib/authModal'
import { CATEGORY_BADGES, formatCategoryLabel, normalizeCategoryKey } from '../lib/appTheme'
import { ESG_CATEGORIES } from '../types/index'

interface CommunityPageProps {
  user: any
}

interface CommunityPostRecord {
  id: string
  author_display_name?: string | null
  author_role?: string | null
  category_tag?: string | null
  content?: string | null
  created_at: string
  ai_draft_answer?: string | null
  upvotes?: number | null
  reply_count?: number | null
}

const ALL_FILTER = 'all'
const GENERAL_FILTER = 'general'
const LONG_POST_PREVIEW = 280

const quickStarts = [
  {
    label: 'Ask a question',
    category: GENERAL_FILTER,
    draft: 'What is the cleanest way to interpret this requirement across business units?\n\nContext:\nDecision needed:\nCurrent blocker:',
  },
  {
    label: 'Share implementation',
    category: 'governance',
    draft: 'We are rolling out this ESG requirement across teams.\n\nWhat worked:\nWhat slowed us down:\nWhat others should avoid:',
  },
  {
    label: 'Flag a change',
    category: 'climate',
    draft: 'Regulatory update to watch:\n\nWhat changed:\nWho is affected:\nQuestions we still need to answer:',
  },
]

function formatPostDate(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true })
  } catch {
    return ''
  }
}

function getAuthorInitials(name?: string | null) {
  if (!name) return 'ES'
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || '').join('') || 'ES'
}

function getPriorityScore(post: CommunityPostRecord) {
  const ageHours = Math.max(1, (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60))
  const recencyBoost = Math.max(0, 36 - ageHours) / 6
  return (post.reply_count || 0) * 2 + (post.upvotes || 0) * 1.5 + recencyBoost
}

function getThreadState(post: CommunityPostRecord) {
  if ((post.reply_count || 0) === 0) return 'Needs answer'
  if ((post.reply_count || 0) >= 3 || (post.upvotes || 0) >= 4) return 'Active'
  return 'Open'
}

export default function CommunityPage({ user }: CommunityPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [posts, setPosts] = useState<CommunityPostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(ALL_FILTER)
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes'>('recent')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState(GENERAL_FILTER)
  const [submitting, setSubmitting] = useState(false)
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({})
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({})
  const [replies, setReplies] = useState<Record<string, CommunityPostRecord[]>>({})

  const tabs = [ALL_FILTER, GENERAL_FILTER, ...ESG_CATEGORIES.map((category) => category.toLowerCase())]

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(80)

    setPosts(data || [])
    setLoading(false)
  }

  const openComposer = (draft?: string, category?: string) => {
    if (!user) {
      navigate(withAuthModal(location.pathname, location.search))
      return
    }

    if (draft) setNewContent(draft)
    if (category) setNewCategory(category)
    setShowNew(true)
  }

  const submitPost = async () => {
    if (!newContent.trim() || !user) return

    setSubmitting(true)
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

    await supabase.from('community_posts').insert({
      author_id: user.id,
      author_display_name: profile?.full_name || user.email.split('@')[0],
      content: newContent.trim(),
      category_tag: newCategory,
    })

    setNewContent('')
    setNewCategory(GENERAL_FILTER)
    setShowNew(false)
    setSubmitting(false)
    fetchPosts()
  }

  const upvote = async (id: string, current: number) => {
    if (!user) {
      navigate(withAuthModal(location.pathname, location.search))
      return
    }

    await supabase.from('community_posts').update({ upvotes: current + 1 }).eq('id', id)
    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, upvotes: current + 1 } : post)))
  }

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const nextPosts = posts.filter((post) => {
      const postCategory = (post.category_tag || GENERAL_FILTER).toLowerCase()
      const categoryMatch = activeTab === ALL_FILTER || postCategory === activeTab
      const content = `${post.content || ''} ${post.author_display_name || ''} ${post.author_role || ''}`.toLowerCase()
      const searchMatch = !normalizedSearch || content.includes(normalizedSearch)
      return categoryMatch && searchMatch
    })

    nextPosts.sort((left, right) => {
      if (sortBy === 'upvotes') {
        return (right.upvotes || 0) - (left.upvotes || 0) || +new Date(right.created_at) - +new Date(left.created_at)
      }

      return +new Date(right.created_at) - +new Date(left.created_at)
    })

    return nextPosts
  }, [activeTab, posts, searchTerm, sortBy])

  const categoryCounts = useMemo(() => {
    return posts.reduce<Record<string, number>>((acc, post) => {
      const key = (post.category_tag || GENERAL_FILTER).toLowerCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [posts])

  const stats = useMemo(() => {
    const aiDrafts = posts.filter((post) => Boolean(post.ai_draft_answer)).length
    const replySignals = posts.reduce((total, post) => total + (post.reply_count || 0), 0)
    const recentCount = posts.filter((post) => Date.now() - new Date(post.created_at).getTime() < 1000 * 60 * 60 * 24 * 7).length
    const unanswered = posts.filter((post) => (post.reply_count || 0) === 0).length
    return { aiDrafts, replySignals, recentCount, unanswered }
  }, [posts])

  const priorityPosts = useMemo(() => {
    return [...filteredPosts]
      .sort((left, right) => getPriorityScore(right) - getPriorityScore(left))
      .slice(0, 3)
  }, [filteredPosts])

  const activeLabel = activeTab === ALL_FILTER ? 'All topics' : activeTab
  const hasActiveFilters = activeTab !== ALL_FILTER || sortBy !== 'recent' || Boolean(searchTerm.trim())
  const clearFilters = () => {
    setActiveTab(ALL_FILTER)
    setSortBy('recent')
    setSearchTerm('')
  }
  const focusTopic = (category?: string | null) => {
    setActiveTab((category || GENERAL_FILTER).toLowerCase())
    setSortBy('recent')
    setSearchTerm('')
  }
  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }))
  }

  const toggleReplies = async (postId: string) => {
    const isOpen = showReplies[postId]
    setShowReplies((prev) => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !replies[postId]) {
      const { data } = await supabase
        .from('community_posts')
        .select('*')
        .eq('parent_post_id', postId)
        .order('created_at', { ascending: true })
      setReplies((prev) => ({ ...prev, [postId]: data || [] }))
    }
  }

  return (
    <div className="page-shell-narrow md:max-w-5xl">
      <section className="guide-hero mb-6 md:mb-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="guide-kicker mb-4">
              <Users size={14} />
              ESG Community
            </div>
            <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))] md:text-5xl">
              One place to ask, answer, and unblock ESG interpretation work.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))] md:text-base">
              Built for corporate ESG teams who need fast context, reusable implementation notes, and less back-and-forth before a decision.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => openComposer()} className="ui-button-primary">
                <Plus size={16} />
                Start a discussion
              </button>
              <button onClick={() => openComposer(quickStarts[0].draft, quickStarts[0].category)} className="ui-button-secondary">
                Use a guided template
                <ArrowRight size={15} />
              </button>
              {!user && (
                <button
                  onClick={() => navigate(withAuthModal(location.pathname, location.search))}
                  className="ui-button-secondary"
                >
                  Join to post
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="guide-stat">
              <span className="guide-stat-label">Threads in workspace</span>
              <span className="guide-stat-value">{posts.length}</span>
            </div>
            <div className="guide-stat">
              <span className="guide-stat-label">New this week</span>
              <span className="guide-stat-value">{stats.recentCount}</span>
            </div>
            <div className="guide-stat">
              <span className="guide-stat-label">AI-assisted answers</span>
              <span className="guide-stat-value">{stats.aiDrafts}</span>
            </div>
            <div className="guide-stat">
              <span className="guide-stat-label">Still waiting</span>
              <span className="guide-stat-value">{stats.unanswered}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="ui-section-title">Quick starts</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Start with a structure that helps another ESG lead answer in one read.
              </p>
            </div>
            <Sparkles size={18} className="text-[hsl(var(--primary))]" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {quickStarts.map((item) => (
              <button
                key={item.label}
                onClick={() => openComposer(item.draft, item.category)}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4 text-left transition-all hover:border-[hsl(var(--primary)/0.3)] hover:bg-white"
              >
                <span className="block text-sm font-semibold text-[hsl(var(--foreground))]">{item.label}</span>
                <span className="mt-2 block text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {item.label === 'Ask a question' && 'Frame the rule, the decision, and the blocker.'}
                  {item.label === 'Share implementation' && 'Capture rollout lessons teams can reuse.'}
                  {item.label === 'Flag a change' && 'Summarize the update and who needs to react.'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-section-title">Priority queue</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                The strongest discussion signals in the current view.
              </p>
            </div>
            <CircleAlert size={18} className="mt-0.5 text-[hsl(var(--primary))]" />
          </div>

          <div className="mt-4 space-y-3">
            {priorityPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]">
                No visible threads yet. Open a discussion to seed the workspace.
              </div>
            ) : (
              priorityPosts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => focusTopic(post.category_tag)}
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4 text-left transition-colors hover:border-[hsl(var(--primary)/0.28)] hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                      Queue {index + 1}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatPostDate(post.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[hsl(var(--foreground))]">
                    {post.content || 'Untitled discussion'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="metric-pill !px-2.5 !py-1 !text-xs">{getThreadState(post)}</span>
                    <span>{post.reply_count || 0} replies</span>
                    <span>{post.upvotes || 0} upvotes</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="surface-card mb-6 p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="ui-section-title">Browse discussions</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {filteredPosts.length} visible in {activeLabel}.
              {sortBy === 'upvotes' ? ' Ranked by strongest endorsement.' : ' Ranked by newest activity.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="metric-pill !text-xs">{stats.replySignals} replies tracked</span>
            <span className="metric-pill !text-xs">{stats.unanswered} waiting for input</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_11rem_auto]">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by question, topic, author, or implementation note"
              className="ui-input pl-11"
            />
          </label>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'recent' | 'upvotes')} className="ui-select">
            <option value="recent">Newest first</option>
            <option value="upvotes">Most upvoted</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilterX size={15} />
            Reset view
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ui-filter-pill ${activeTab === tab ? 'ui-filter-pill-active' : ''}`}
            >
              <span className="capitalize">{tab === ALL_FILTER ? 'All topics' : tab}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {tab === ALL_FILTER ? posts.length : categoryCounts[tab] || 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface-card w-full max-w-2xl p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">Start a discussion</h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Keep it concrete: name the rule, the decision, and what kind of input you need.
                </p>
              </div>
              <button onClick={() => setShowNew(false)} className="ui-button-ghost !p-2">
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
              <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="ui-select">
                {tabs.filter((tab) => tab !== ALL_FILTER).map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
              </select>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                Best posts usually include the regulation, the business decision at stake, and what has already been tried.
              </div>
            </div>

            <textarea
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
              placeholder="Share the issue clearly enough that another ESG lead can answer in one pass."
              maxLength={700}
              rows={8}
              className="ui-textarea mb-2 resize-none"
            />
            <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Keep it specific and operational.</span>
              <span>{newContent.length}/700</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="ui-button-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={submitPost}
                disabled={submitting || !newContent.trim()}
                className="ui-button-primary flex-1 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Publish discussion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="surface-card px-6 py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading the community workspace...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            {posts.length === 0 ? 'No discussions yet' : 'No discussions match these filters'}
          </p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            {posts.length === 0
              ? 'Start the first thread so your team has a place to compare interpretations and rollout decisions.'
              : 'Clear the search or switch topics to widen the view.'}
          </p>
          <button onClick={() => openComposer()} className="ui-button-primary mt-5">
            <Plus size={16} />
            Start a discussion
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const normalizedCategory = normalizeCategoryKey(post.category_tag) || 'General'
            const badgeClass = CATEGORY_BADGES[normalizedCategory] || 'bg-slate-100 text-slate-600'
            const excerpt = post.content || ''
            const hasAiDraft = Boolean(post.ai_draft_answer)
            const isExpanded = Boolean(expandedPosts[post.id])
            const isLongPost = excerpt.length > LONG_POST_PREVIEW
            const visibleExcerpt = isExpanded || !isLongPost ? excerpt : `${excerpt.slice(0, LONG_POST_PREVIEW).trimEnd()}...`
            const threadState = getThreadState(post)

            return (
              <article
                key={post.id}
                className="surface-card p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] md:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-sm font-semibold text-[hsl(var(--primary))]">
                      {getAuthorInitials(post.author_display_name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {post.author_display_name || 'ESG contributor'}
                        </span>
                        {post.author_role && (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">{post.author_role}</span>
                        )}
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatPostDate(post.created_at)}</span>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-[hsl(var(--foreground))]">{visibleExcerpt}</p>
                      {isLongPost && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(post.id)}
                          className="mt-2 text-sm font-medium text-[hsl(var(--primary))] transition-opacity hover:opacity-80"
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-[14rem] lg:justify-end">
                    <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      {threadState}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${badgeClass}`}>
                      {formatCategoryLabel(post.category_tag) || 'General'}
                    </span>
                    {hasAiDraft && (
                      <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--primary))]">
                        AI assist
                      </span>
                    )}
                  </div>
                </div>

                {hasAiDraft && (
                  <div className="mt-4 rounded-2xl border border-[hsl(var(--primary)/0.18)] bg-[hsl(var(--primary)/0.06)] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--primary))]">AI draft answer</p>
                    <p className="text-sm leading-7 text-[hsl(var(--foreground))]">{post.ai_draft_answer}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4">
                  <div className="flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <button
                      onClick={() => toggleReplies(post.id)}
                      className="metric-pill !text-xs transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
                    >
                      {post.reply_count || 0} {(post.reply_count || 0) === 1 ? 'reply' : 'replies'}
                      {(post.reply_count || 0) > 0 && (
                        <span className="ml-1">{showReplies[post.id] ? '▲' : '▼'}</span>
                      )}
                    </button>
                    <span className="metric-pill !text-xs capitalize">{formatCategoryLabel(post.category_tag) || 'General'}</span>
                  </div>

                  <button
                    onClick={() => upvote(post.id, post.upvotes || 0)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]"
                  >
                    <ThumbsUp size={14} />
                    {post.upvotes || 0} upvotes
                  </button>
                </div>

                {showReplies[post.id] && (
                  <div className="mt-4 space-y-3 border-t border-[hsl(var(--border))] pt-4">
                    {!replies[post.id] ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading replies…</p>
                    ) : replies[post.id].length === 0 ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">No replies yet.</p>
                    ) : (
                      replies[post.id].map((reply) => (
                        <div
                          key={reply.id}
                          className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                            {getAuthorInitials(reply.author_display_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                                {reply.author_display_name || 'ESG contributor'}
                              </span>
                              {reply.author_role && (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">{reply.author_role}</span>
                              )}
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatPostDate(reply.created_at)}</span>
                            </div>
                            <p className="mt-1.5 text-sm leading-6 text-[hsl(var(--foreground))]">{reply.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
