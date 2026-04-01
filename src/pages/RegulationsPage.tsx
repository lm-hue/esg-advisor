import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { withAuthModal } from '../lib/authModal'
import BookmarkHint from '../components/BookmarkHint'
import { fetchAllRegulations } from '../lib/regulations'
import { getUserWatchlist, saveUserWatchlist } from '../lib/userSettings'
import { Regulation } from '../types'
import { Star, Globe, ChevronDown, BookOpen, X, Check } from 'lucide-react'
import {
  CATEGORY_BADGES,
  CATEGORY_DOTS,
  REGULATION_TYPE_BADGES,
  REGULATION_TYPE_OPTIONS,
  STATUS_BADGES,
  formatCategoryLabel,
  formatRegulationTypeLabel,
  formatStatusLabel,
  getRegulationTypeKey,
  normalizeCategoryKey,
} from '../lib/appTheme'

interface RegulationsPageProps {
  user: any
}

const STATUS_OPTIONS = ['in_force', 'draft', 'adopted', 'amended', 'repealed']

function FilterOptionList({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="space-y-1">
        {options.map((option) => {
          const active = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.55] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                  active
                    ? 'border-[hsl(var(--primary))/0.22] bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] bg-white text-transparent'
                }`}
              >
                <Check size={10} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompactMultiSelect({
  label,
  allLabel,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)

  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`ui-filter-trigger ${selected.length > 0 || open ? 'ui-filter-trigger-active' : ''}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium">{summary}</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[hsl(var(--muted-foreground))] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="ui-filter-menu">
          <div className="max-h-80 overflow-y-auto p-1.5">
            <FilterOptionList
              label={label}
              options={options}
              selected={selected}
              onToggle={onToggle}
            />
          </div>
          {selected.length > 0 && (
            <div className="border-t border-[hsl(var(--border))] px-2.5 py-1.5">
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <button type="button" onClick={onRemove} className="ui-active-filter-chip">
      <span>{label}</span>
      <X size={12} />
    </button>
  )
}

export default function RegulationsPage({ user }: RegulationsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [filtered, setFiltered] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)

  useEffect(() => {
    fetchRegulations()
    if (user) fetchUserSettings()
  }, [user])

  useEffect(() => {
    filterRegulations()
  }, [regulations, selectedCategories, selectedTypes, selectedRegions, selectedStatuses, showWatchlistOnly, watchlist])

  const activeFilterCount =
    selectedCategories.length +
    selectedTypes.length +
    selectedRegions.length +
    selectedStatuses.length +
    (showWatchlistOnly ? 1 : 0)

  const uniqueCategories = [...new Set(regulations.map((regulation) => normalizeCategoryKey(regulation.category)).filter(Boolean))].sort()
  const uniqueRegions = [...new Set(regulations.map((regulation) => regulation.region).filter(Boolean))].sort()
  const availableTypes = REGULATION_TYPE_OPTIONS.filter((option) =>
    regulations.some((regulation) => getRegulationTypeKey(regulation) === option.value)
  )
  const statCards = [
    {
      label: 'Regulations tracked',
      value: regulations.length,
      accent: 'bg-[hsl(var(--primary))]',
    },
    {
      label: 'Recent updates',
      value: regulations.filter((regulation) => regulation.updated_at && regulation.created_at && regulation.updated_at !== regulation.created_at).length,
      accent: 'bg-amber-500',
    },
    {
      label: 'Jurisdictions',
      value: uniqueRegions.length,
      accent: 'bg-emerald-500',
    },
    {
      label: 'In force',
      value: regulations.filter((regulation) => regulation.status === 'in_force').length,
      accent: 'bg-[hsl(var(--foreground))/0.75]',
    },
  ]

  const fetchRegulations = async () => {
    try {
      const data = await fetchAllRegulations()
      const sorted = [...data].sort((a, b) => {
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
      setWatchlist(await getUserWatchlist(user.id))
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setSelectedTypes([])
    setSelectedRegions([])
    setSelectedStatuses([])
    setShowWatchlistOnly(false)
  }

  const filterRegulations = () => {
    let result = [...regulations]
    if (showWatchlistOnly) result = result.filter((regulation) => watchlist.includes(regulation.id))
    if (selectedCategories.length > 0) {
      result = result.filter((regulation) => selectedCategories.includes(normalizeCategoryKey(regulation.category)))
    }
    if (selectedTypes.length > 0) {
      result = result.filter((regulation) => selectedTypes.includes(getRegulationTypeKey(regulation)))
    }
    if (selectedRegions.length > 0) {
      result = result.filter((regulation) => selectedRegions.includes(regulation.region))
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((regulation) => selectedStatuses.includes(regulation.status))
    }
    setFiltered(result)
  }

  const toggleWatch = async (regulationId: string) => {
    if (!user) return navigate(withAuthModal(location.pathname, location.search))
    const previousWatchlist = watchlist
    const newWatchlist = previousWatchlist.includes(regulationId)
      ? watchlist.filter((id) => id !== regulationId)
      : [...watchlist, regulationId]

    setWatchlist(newWatchlist)

    try {
      await saveUserWatchlist(user.id, newWatchlist)
    } catch (error) {
      setWatchlist(previousWatchlist)
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
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="ui-stat-card">
            <span className={`mb-3 block h-1.5 w-10 rounded-full ${stat.accent}`} />
            <p className="ui-stat-card-value">{stat.value.toLocaleString('en-US')}</p>
            <p className="ui-stat-card-label mt-2">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <CompactMultiSelect
            label="Type"
            allLabel="All types"
            options={availableTypes}
            selected={selectedTypes}
            onToggle={(value) =>
              setSelectedTypes((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value]
              )
            }
            onClear={() => setSelectedTypes([])}
          />

          <CompactMultiSelect
            label="Theme"
            allLabel="All themes"
            options={uniqueCategories.map((category) => ({ value: category, label: category }))}
            selected={selectedCategories}
            onToggle={(value) =>
              setSelectedCategories((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value]
              )
            }
            onClear={() => setSelectedCategories([])}
          />

          <CompactMultiSelect
            label="Region"
            allLabel="All regions"
            options={uniqueRegions.map((region) => ({ value: region, label: region }))}
            selected={selectedRegions}
            onToggle={(value) =>
              setSelectedRegions((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value]
              )
            }
            onClear={() => setSelectedRegions([])}
          />

          <CompactMultiSelect
            label="Status"
            allLabel="All statuses"
            options={STATUS_OPTIONS.map((status) => ({ value: status, label: formatStatusLabel(status) }))}
            selected={selectedStatuses}
            onToggle={(value) =>
              setSelectedStatuses((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value]
              )
            }
            onClear={() => setSelectedStatuses([])}
          />

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
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {selectedTypes.map((type) => (
            <ActiveFilterChip
              key={`type-${type}`}
              label={formatRegulationTypeLabel(type)}
              onRemove={() =>
                setSelectedTypes((current) => current.filter((item) => item !== type))
              }
            />
          ))}
          {selectedCategories.map((category) => (
            <ActiveFilterChip
              key={`category-${category}`}
              label={formatCategoryLabel(category)}
              onRemove={() =>
                setSelectedCategories((current) => current.filter((item) => item !== category))
              }
            />
          ))}
          {selectedRegions.map((region) => (
            <ActiveFilterChip
              key={`region-${region}`}
              label={region}
              onRemove={() =>
                setSelectedRegions((current) => current.filter((item) => item !== region))
              }
            />
          ))}
          {selectedStatuses.map((status) => (
            <ActiveFilterChip
              key={`status-${status}`}
              label={formatStatusLabel(status)}
              onRemove={() =>
                setSelectedStatuses((current) => current.filter((item) => item !== status))
              }
            />
          ))}
          {showWatchlistOnly && (
            <ActiveFilterChip
              label="Watchlist"
              onRemove={() => setShowWatchlistOnly(false)}
            />
          )}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs">
          <p className="text-[hsl(var(--muted-foreground))]">
            Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length}</span> of{' '}
            <span className="font-semibold text-[hsl(var(--foreground))]">{regulations.length}</span>
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            <BookOpen size={24} />
          </div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No regulations match these filters</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Try broadening the type, theme, region, or status selections to bring more results back into view.
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
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}>
                        {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(regulation.category)] || 'bg-slate-400'}`} />
                        {formatCategoryLabel(regulation.category)}
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

                  <BookmarkHint showHint={!user}>
                    <button
                      onClick={() => toggleWatch(regulation.id)}
                      className={`rounded-full p-2 transition-colors ${
                        isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                      }`}
                      aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <Star size={16} className={isWatched ? 'fill-current' : ''} />
                    </button>
                  </BookmarkHint>
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
