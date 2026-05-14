import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { withAuthModal } from '../lib/authModal'
import VerifiedBadge from '../components/VerifiedBadge'
import { fetchAllRegulations } from '../lib/regulations'
import { getUserWatchlist, saveUserWatchlist } from '../lib/userSettings'
import { supabase } from '../lib/supabase'
import { Regulation } from '../types'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Globe,
  LayoutGrid,
  MessageSquare,
  Scale,
  Sparkles,
  Star,
  ThumbsUp,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  CATEGORY_BADGES,
  CATEGORY_DOTS,
  REGION_FLAGS,
  STATUS_BADGES,
  formatCategoryLabel,
  isRegulationCurrentlyEffective,
  isRegulationNotYetEffective,
  formatStatusLabel,
  getRegulationTypeKey,
  REGULATION_TYPE_BADGES,
  formatRegulationTypeLabel,
  normalizeCategoryKey,
} from '../lib/appTheme'

interface RegulationsPageProps {
  user: any
}

interface CommunityPost {
  id: string
  author_display_name?: string | null
  category_tag?: string | null
  content?: string | null
  created_at: string
  upvotes?: number | null
  reply_count?: number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ─── Compact regulation card (shared across sections) ────────────────────────

function RegCard({
  regulation,
  badge,
  onWatch,
  isWatched,
  showCountdown,
  user,
}: {
  regulation: Regulation
  badge?: React.ReactNode
  onWatch?: (id: string) => void
  isWatched?: boolean
  showCountdown?: boolean
  user: any
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const typeKey = getRegulationTypeKey(regulation)
  const categoryKey = normalizeCategoryKey(regulation.category)

  const handleOpen = () =>
    navigate(`/framework-library/${regulation.id}`, {
      state: { backLabel: 'Back to ESG Home' },
    })

  const handleWatch = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      navigate(withAuthModal(location.pathname, location.search))
      return
    }
    onWatch?.(regulation.id)
  }

  return (
    <div
      onClick={handleOpen}
      className="surface-card flex cursor-pointer flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] hover:shadow-sm"
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[typeKey] || 'bg-slate-100 text-slate-600'}`}>
          {formatRegulationTypeLabel(typeKey)}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[categoryKey] || 'bg-slate-100 text-slate-600'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[categoryKey] || 'bg-slate-400'}`} />
          {formatCategoryLabel(regulation.category)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
          {formatStatusLabel(regulation.status)}
        </span>
        {regulation.human_verified && (
          <VerifiedBadge />
        )}
        {badge}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold leading-snug text-[hsl(var(--foreground))]">
        {regulation.title}
      </p>
      {regulation.formal_title && (
        <p className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))]">
          {regulation.formal_title}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          <Globe size={11} />
          {REGION_FLAGS[regulation.region] ?? ''} {regulation.region}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {showCountdown && regulation.effective_date && daysUntil(regulation.effective_date) > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              in {daysUntil(regulation.effective_date)}d
            </span>
          )}
          {onWatch && (
            <button
              onClick={handleWatch}
              className={`rounded-full p-1.5 transition-colors ${
                isWatched
                  ? 'bg-amber-100 text-amber-600'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
              }`}
              aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star size={13} className={isWatched ? 'fill-current' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// ─── 2-col card grid ─────────────────────────────────────────────────────────

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegulationsPage({ user }: RegulationsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllRegulations()
        setRegulations(data)
      } catch (err) {
        console.error('Error fetching regulations:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    loadCommunityPosts()
    if (user) loadWatchlist()
  }, [user])

  const loadWatchlist = async () => {
    try {
      setWatchlist(await getUserWatchlist(user.id))
    } catch (err) {
      console.error('Error loading watchlist:', err)
    }
  }

  const loadCommunityPosts = async () => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, author_display_name, category_tag, content, created_at, upvotes, reply_count')
        .is('parent_post_id', null)
        .order('created_at', { ascending: false })
        .limit(6)
      if (data) {
        const scored = [...data].sort(
          (a, b) =>
            (b.reply_count || 0) * 2 +
            (b.upvotes || 0) * 1.5 -
            ((a.reply_count || 0) * 2 + (a.upvotes || 0) * 1.5)
        )
        setCommunityPosts(scored.slice(0, 3))
      }
    } catch (err) {
      console.error('Error loading community posts:', err)
    }
  }

  const toggleWatch = async (id: string) => {
    const prev = watchlist
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    setWatchlist(next)
    try {
      await saveUserWatchlist(user.id, next)
    } catch {
      setWatchlist(prev)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const uniqueRegions = [...new Set(regulations.map((r) => r.region).filter(Boolean))]

  const watchlistRegs = regulations.filter((r) => watchlist.includes(r.id)).slice(0, 5)

  const now = Date.now()
  const sortByDaysUntil = (a: Regulation, b: Regulation) => {
    const da = a.effective_date ? new Date(a.effective_date).getTime() : null
    const db = b.effective_date ? new Date(b.effective_date).getTime() : null
    const futureA = da !== null && da >= now ? da : Infinity
    const futureB = db !== null && db >= now ? db : Infinity
    if (futureA !== futureB) return futureA - futureB
    // Both past or missing — sort by date descending (most recent past first)
    return (db ?? -Infinity) - (da ?? -Infinity)
  }

  const comingIntoForce = regulations
    .filter((r) => !isRegulationCurrentlyEffective(r.status) && r.status !== 'repealed')
    .sort(sortByDaysUntil)

  const recentlyUpdated = regulations
    .filter(
      (r) =>
        r.updated_at &&
        r.created_at &&
        r.updated_at !== r.created_at &&
        daysAgo(r.updated_at) <= 30
    )
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 4)

  const newToLibrary = regulations
    .filter((r) => r.created_at && daysAgo(r.created_at) <= 60)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 4)

  // Regions that only appear in "new" regulations (≤60 days) but not in older ones
  const oldRegions = new Set(
    regulations.filter((r) => r.created_at && daysAgo(r.created_at) > 60).map((r) => r.region)
  )
  const newJurisdictions = [
    ...new Set(
      regulations
        .filter((r) => r.created_at && daysAgo(r.created_at) <= 60)
        .map((r) => r.region)
        .filter((region) => region && !oldRegions.has(region))
    ),
  ]

  // Radar preview for unauthenticated: all not yet in force
  const radarPreview = regulations
    .filter((r) => !isRegulationCurrentlyEffective(r.status) && r.status !== 'repealed')
    .sort(sortByDaysUntil)

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Unauthenticated view ──────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="page-shell space-y-8">
        {/* Hero */}
        <section className="surface-card overflow-hidden">
          <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(120deg,rgba(15,123,92,0.08)_0%,rgba(247,209,106,0.08)_100%)] px-6 py-8 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display mb-2 text-2xl font-semibold leading-tight text-[hsl(var(--foreground))]">
                  Navigate ESG regulations with confidence.
                </h1>
                <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {regulations.length}+ regulations, frameworks, and standards tracked across {uniqueRegions.length}+ jurisdictions — updated continuously.
                </p>
              </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/framework-library')}
                className="ui-button-primary"
              >
                Browse the library
                <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate(withAuthModal(location.pathname, location.search))}
                className="ui-button-secondary"
              >
                Sign in to personalise your own view
              </button>
            </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {[
            { label: 'Regulations & frameworks tracked', value: regulations.length, accent: 'bg-[hsl(var(--primary))]', href: '/framework-library' },
            { label: 'Jurisdictions', value: uniqueRegions.length, accent: 'bg-emerald-500', href: '/regulatory-map' },
            { label: 'Not yet in force', value: regulations.filter((r) => isRegulationNotYetEffective(r.status)).length, accent: 'bg-red-400' },
          ].map((s) => (
            <div
              key={s.label}
              onClick={s.href ? () => navigate(s.href!) : undefined}
              className={`ui-stat-card ${s.href ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
            >
              <span className={`mb-3 block h-1.5 w-10 rounded-full ${s.accent}`} />
              <p className="ui-stat-card-value">{s.value.toLocaleString()}</p>
              <p className="ui-stat-card-label mt-2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Regulatory radar */}
        {radarPreview.length > 0 && (
          <Section
            icon={<Timer size={13} />}
            title="Regulatory radar — coming into force soon"
            action={
              <button onClick={() => navigate('/framework-library')} className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80">
                See all →
              </button>
            }
          >
            <CardGrid>
              {radarPreview.map((r) => (
                <RegCard
                  key={r.id}
                  regulation={r}
                  showCountdown
                  user={null}
                  badge={
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {format(new Date(r.effective_date), 'MMM d, yyyy')}
                    </span>
                  }
                />
              ))}
            </CardGrid>
          </Section>
        )}

        {/* How it works */}
        <section className="surface-card p-6 md:p-8">
          <h2 className="mb-6 text-base font-semibold text-[hsl(var(--foreground))]">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '1',
                icon: <BookOpen size={18} />,
                title: 'Browse the library',
                desc: 'Explore 160+ ESG regulations, frameworks, and standards across all regions and themes — filtered to what matters to you.',
              },
              {
                step: '2',
                icon: <Star size={18} />,
                title: 'Track what matters',
                desc: 'Bookmark regulations to your watchlist and set up alerts so you never miss a status change or new development.',
              },
              {
                step: '3',
                icon: <Sparkles size={18} />,
                title: 'Ask the AI Advisor',
                desc: 'Get instant answers grounded in the actual regulation text — compare requirements, draft summaries, and identify gaps.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]">
                  {item.icon}
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                  <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sign-up CTA */}
        <section className="surface-card-muted rounded-2xl px-6 py-8 text-center">
          <p className="mb-1 text-base font-semibold text-[hsl(var(--foreground))]">Ready to stay ahead of ESG regulation?</p>
          <p className="mb-5 text-sm text-[hsl(var(--muted-foreground))]">
            Sign in to track your watchlist, receive alerts, compare regulations, and ask the AI Advisor.
          </p>
          <button
            onClick={() => navigate(withAuthModal(location.pathname, location.search))}
            className="ui-button-primary"
          >
            Get started — it's free
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    )
  }

  // ── Authenticated view ────────────────────────────────────────────────────

  const displayName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page-shell space-y-8">
      {/* Welcome bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">
            {greeting}, {displayName}.
          </h1>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
            Here's what's happening in ESG regulation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/framework-library')}
            className="ui-button-secondary !text-xs"
          >
            <LayoutGrid size={13} />
            Library
          </button>
          <button
            onClick={() => navigate('/advisor')}
            className="ui-button-primary !text-xs"
          >
            <Sparkles size={13} />
            Ask AI Advisor
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: 'Regulations tracked', value: regulations.length, accent: 'bg-[hsl(var(--primary))]' },
          { label: 'Your watchlist', value: watchlist.length, accent: 'bg-amber-500', onClick: () => navigate('/framework-library?wl=1') },
          { label: 'Not yet in force', value: comingIntoForce.length, accent: 'bg-orange-400' },
          { label: 'In force', value: regulations.filter((r) => isRegulationCurrentlyEffective(r.status)).length, accent: 'bg-red-400' },
        ].map((s) => (
          <div
            key={s.label}
            className={`ui-stat-card ${s.onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
            onClick={s.onClick}
          >
            <span className={`mb-3 block h-1.5 w-10 rounded-full ${s.accent}`} />
            <p className="ui-stat-card-value">{s.value.toLocaleString()}</p>
            <p className="ui-stat-card-label mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New jurisdictions spotlight */}
      {newJurisdictions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {newJurisdictions.map((region) => (
            <button
              key={region}
              onClick={() => navigate(`/framework-library?regions=${encodeURIComponent(region)}`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <TrendingUp size={12} />
              {REGION_FLAGS[region] ?? '🌍'} {region} — new jurisdiction in the library
            </button>
          ))}
        </div>
      )}

      {/* Watchlist */}
      {watchlistRegs.length > 0 && (
        <Section
          icon={<Star size={13} />}
          title="Your watchlist"
          action={
            <button
              onClick={() => navigate('/framework-library?wl=1')}
              className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80"
            >
              View all →
            </button>
          }
        >
          <CardGrid>
            {watchlistRegs.map((r) => (
              <RegCard
                key={r.id}
                regulation={r}
                onWatch={toggleWatch}
                isWatched={watchlist.includes(r.id)}
                user={user}
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* Coming into force soon */}
      {comingIntoForce.length > 0 && (
        <Section
          icon={<Timer size={13} />}
          title="Not yet in force"
          action={
            <button
              onClick={() => navigate('/framework-library')}
              className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80"
            >
              See all →
            </button>
          }
        >
          <CardGrid>
            {comingIntoForce.map((r) => (
              <RegCard
                key={r.id}
                regulation={r}
                showCountdown
                onWatch={toggleWatch}
                isWatched={watchlist.includes(r.id)}
                user={user}
                badge={
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                    {format(new Date(r.effective_date), 'MMM d, yyyy')}
                  </span>
                }
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* Recently integrated */}
      {recentlyUpdated.length > 0 && (
        <Section
          icon={<AlertCircle size={13} />}
          title="Recently integrated"
          action={
            <span className="text-xs text-[hsl(var(--muted-foreground))]">last 30 days</span>
          }
        >
          <CardGrid>
            {recentlyUpdated.map((r) => (
              <RegCard
                key={r.id}
                regulation={r}
                onWatch={toggleWatch}
                isWatched={watchlist.includes(r.id)}
                user={user}
                badge={
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    UPDATE
                  </span>
                }
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* New to the library */}
      {newToLibrary.length > 0 && (
        <Section
          icon={<Zap size={13} />}
          title="New to the library"
          action={
            <span className="text-xs text-[hsl(var(--muted-foreground))]">last 60 days</span>
          }
        >
          <CardGrid>
            {newToLibrary.map((r) => (
              <RegCard
                key={r.id}
                regulation={r}
                onWatch={toggleWatch}
                isWatched={watchlist.includes(r.id)}
                user={user}
                badge={
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    NEW
                  </span>
                }
              />
            ))}
          </CardGrid>
        </Section>
      )}

      {/* Community highlights */}
      {communityPosts.length > 0 && (
        <Section
          icon={<MessageSquare size={13} />}
          title="Community highlights"
          action={
            <button
              onClick={() => navigate('/community')}
              className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80"
            >
              Join the discussion →
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {communityPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => navigate('/community')}
                className="surface-card flex flex-col gap-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] hover:shadow-sm"
              >
                {post.category_tag && (
                  <span className={`w-max rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[post.category_tag] || 'bg-slate-100 text-slate-600'}`}>
                    {post.category_tag}
                  </span>
                )}
                <p className="line-clamp-3 text-xs leading-5 text-[hsl(var(--foreground))]">
                  {post.content}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {post.author_display_name || 'Anonymous'} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center gap-0.5"><ThumbsUp size={10} /> {post.upvotes || 0}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {post.reply_count || 0}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Quick actions */}
      <Section icon={<Zap size={13} />} title="Quick actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'AI Advisor', icon: <Sparkles size={18} />, path: '/advisor', desc: 'Ask questions, compare rules' },
            { label: 'Framework Library', icon: <BookOpen size={18} />, path: '/framework-library', desc: 'Browse all regulations' },
            { label: 'Compare regions', icon: <Scale size={18} />, path: '/compare', desc: 'Side-by-side analysis' },
            { label: 'Alerts', icon: <Bell size={18} />, path: '/alerts', desc: 'Manage your notifications' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="surface-card flex flex-col items-start gap-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] hover:shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]">
                {action.icon}
              </span>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{action.label}</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
