import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Regulation, ESG_CATEGORIES, REGIONS } from '../types'
import { Star, Globe, ChevronDown, BookOpen, X } from 'lucide-react'
import { CATEGORY_BADGES, CATEGORY_DOTS, STATUS_BADGES, formatStatusLabel } from '../lib/appTheme'

interface RegulationsPageProps {
  user: any
}

export default function RegulationsPage({ user }: RegulationsPageProps) {
  const navigate = useNavigate()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [filtered, setFiltered] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)

  useEffect(() => {
    fetchRegulations()
    if (user) fetchUserSettings()
  }, [user])

  useEffect(() => {
    filterRegulations()
  }, [regulations, selectedCategory, selectedRegion, selectedStatus, showWatchlistOnly, watchlist])

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedRegion ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (showWatchlistOnly ? 1 : 0)

  const fetchRegulations = async () => {
    try {
      const { data } = await supabase.from('regulations').select('*').order('effective_date', { ascending: false })
      const sorted = [...(data || [])].sort((a, b) => {
        const aDate = new Date(a.effective_date || a.updated_at || a.created_at || 0).getTime()
        const bDate = new Date(b.effective_date || b.updated_at || b.created_at || 0).getTime()
        return bDate - aDate
      })
      setRegulations(sorted)
    } catch (error) {
      console.error('Error fetching regulations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()
      setWatchlist(data?.watched_regulation_ids || [])
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const resetFilters = () => {
    setSelectedCategory('All')
    setSelectedRegion('')
    setSelectedStatus('')
    setShowWatchlistOnly(false)
  }

  const filterRegulations = () => {
    let result = [...regulations]
    if (showWatchlistOnly) result = result.filter((regulation) => watchlist.includes(regulation.id))
    if (selectedCategory !== 'All') result = result.filter((regulation) => regulation.category === selectedCategory)
    if (selectedRegion) result = result.filter((regulation) => regulation.region === selectedRegion)
    if (selectedStatus) result = result.filter((regulation) => regulation.status === selectedStatus)
    setFiltered(result)
  }

  const toggleWatch = async (regulationId: string) => {
    if (!user) return navigate('/auth')
    const newWatchlist = watchlist.includes(regulationId)
      ? watchlist.filter((id) => id !== regulationId)
      : [...watchlist, regulationId]

    setWatchlist(newWatchlist)

    try {
      await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: newWatchlist })
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading regulatory data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="metric-pill">
          <span>📋</span>
          <span className="font-bold text-[hsl(var(--primary))]">{regulations.length}</span>
          regulations total
        </div>
        <div className="metric-pill">
          <span>⭐</span>
          <span className="font-bold text-[hsl(var(--primary))]">{watchlist.length}</span>
          on watchlist
        </div>
        <div className="metric-pill">
          <span>🔎</span>
          <span className="font-bold text-[hsl(var(--primary))]">{filtered.length}</span>
          in current view
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[11rem] flex-1 sm:flex-none">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="ui-select-compact appearance-none pr-9"
            >
              <option value="All">All Categories</option>
              {ESG_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>

          <div className="relative min-w-[10rem] flex-1 sm:flex-none">
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
              className="ui-select-compact appearance-none pr-9"
            >
              <option value="">All Regions</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>

          <div className="relative min-w-[10rem] flex-1 sm:flex-none">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="ui-select-compact appearance-none pr-9"
            >
              <option value="">All Statuses</option>
              {['in_force', 'draft', 'adopted', 'amended', 'repealed'].map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          </div>

          <button
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              showWatchlistOnly
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Star size={14} className={showWatchlistOnly ? 'fill-current' : ''} />
            Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length}</span> of{' '}
              <span className="font-semibold text-[hsl(var(--foreground))]">{regulations.length}</span>
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="ui-active-filter-chip"
              >
                <span>{selectedCategory}</span>
                <X size={12} />
              </button>
            )}
            {selectedRegion && (
              <button
                type="button"
                onClick={() => setSelectedRegion('')}
                className="ui-active-filter-chip"
              >
                <span>{selectedRegion}</span>
                <X size={12} />
              </button>
            )}
            {selectedStatus && (
              <button
                type="button"
                onClick={() => setSelectedStatus('')}
                className="ui-active-filter-chip"
              >
                <span>{formatStatusLabel(selectedStatus)}</span>
                <X size={12} />
              </button>
            )}
            {showWatchlistOnly && (
              <button
                type="button"
                onClick={() => setShowWatchlistOnly(false)}
                className="ui-active-filter-chip"
              >
                <span>Watchlist</span>
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            <BookOpen size={24} />
          </div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No regulations match these filters</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Try broadening the category, region, or status selections to bring more results back into view.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((regulation) => {
            const isWatched = watchlist.includes(regulation.id)
            return (
              <div
                key={regulation.id}
                className="surface-card flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[regulation.category] || 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[regulation.category] || 'bg-slate-400'}`} />
                        {regulation.category}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
                        {formatStatusLabel(regulation.status)}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/regulations/${regulation.id}`)}
                      className="text-left text-base font-semibold leading-snug text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                    >
                      {regulation.title}
                    </button>
                  </div>

                  <button
                    onClick={() => toggleWatch(regulation.id)}
                    className={`rounded-full p-2 transition-colors ${
                      isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                    }`}
                    aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    <Star size={16} className={isWatched ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="mb-3 inline-flex w-max items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                  <Globe size={12} />
                  {regulation.region}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {regulation.description || regulation.full_description}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Effective {new Date(regulation.effective_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => navigate(`/regulations/${regulation.id}`)}
                    className="text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary)/0.8)]"
                  >
                    View details →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
