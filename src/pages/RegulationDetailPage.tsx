import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Regulation } from '../types'
import { ArrowLeft, ExternalLink, Star, Globe } from 'lucide-react'
import { CATEGORY_BADGES, CATEGORY_DOTS, STATUS_BADGES, formatStatusLabel } from '../lib/appTheme'

interface RegulationDetailPageProps {
  user: any
}

export default function RegulationDetailPage({ user }: RegulationDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [regulation, setRegulation] = useState<Regulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWatched, setIsWatched] = useState(false)

  useEffect(() => {
    fetchRegulation()
    if (user) checkWatchlist()
  }, [id, user])

  const fetchRegulation = async () => {
    if (!id) return

    try {
      const { data } = await supabase.from('regulations').select('*').eq('id', id).single()
      setRegulation(data)
    } catch (error) {
      console.error('Error fetching regulation:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkWatchlist = async () => {
    if (!id || !user) return

    try {
      const { data } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()
      setIsWatched(data?.watched_regulation_ids?.includes(id) || false)
    } catch (error) {
      console.error('Error checking watchlist:', error)
    }
  }

  const toggleWatch = async () => {
    if (!user) return navigate('/auth')
    if (!id) return

    try {
      const { data: current } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()

      const currentWatchlist = current?.watched_regulation_ids || []
      const nextWatchlist = isWatched
        ? currentWatchlist.filter((regulationId: string) => regulationId !== id)
        : [...currentWatchlist, id]

      await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: nextWatchlist })
        .eq('user_id', user.id)

      setIsWatched(!isWatched)
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="page-shell-narrow">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading regulation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!regulation) {
    return (
      <div className="page-shell-narrow">
        <button onClick={() => navigate('/regulations')} className="ui-button-ghost mb-4 !px-0">
          <ArrowLeft size={16} />
          Back to Regulations
        </button>
        <div className="surface-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Regulation not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-narrow">
      <button onClick={() => navigate('/regulations')} className="ui-button-ghost mb-4 !px-0">
        <ArrowLeft size={16} />
        Back to Regulations
      </button>

      <div className="surface-card p-6 md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_BADGES[regulation.category] || 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[regulation.category] || 'bg-slate-400'}`} />
                {regulation.category}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
                {formatStatusLabel(regulation.status)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                <Globe size={12} />
                {regulation.region}
              </span>
            </div>

            <h2 className="font-display text-3xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              {regulation.title}
            </h2>
          </div>

          <button
            onClick={toggleWatch}
            className={`rounded-full p-3 transition-colors ${
              isWatched ? 'bg-amber-100 text-amber-600' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-amber-600'
            }`}
            aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star size={18} className={isWatched ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Effective Date</p>
            <p className="text-base font-semibold text-[hsl(var(--foreground))]">
              {new Date(regulation.effective_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Source</p>
            <p className="text-base font-semibold text-[hsl(var(--foreground))]">{regulation.source_name}</p>
          </div>

          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Current Status</p>
            <p className="text-base font-semibold capitalize text-[hsl(var(--foreground))]">
              {formatStatusLabel(regulation.status)}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-base font-semibold text-[hsl(var(--foreground))]">Overview</h3>
          <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            {regulation.full_description || regulation.description}
          </p>
        </div>

        {regulation.tags && regulation.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-semibold text-[hsl(var(--foreground))]">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {regulation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {regulation.source_url && (
            <a
              href={regulation.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button-secondary"
            >
              <ExternalLink size={16} />
              View Official Source
            </a>
          )}

          <button onClick={toggleWatch} className="ui-button-primary">
            <Star size={16} className={isWatched ? 'fill-current' : ''} />
            {isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
