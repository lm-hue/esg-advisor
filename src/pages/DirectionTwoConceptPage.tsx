import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutGrid,
  Rows3,
  Scale,
  Search,
  Sparkles,
  Star,
  Table2,
  X,
} from 'lucide-react'
import BookmarkHint from '../components/BookmarkHint'
import VerifiedBadge from '../components/VerifiedBadge'
import { withAuthModal } from '../lib/authModal'
import { fetchAllRegulations } from '../lib/regulations'
import { getUserWatchlist, saveUserWatchlist } from '../lib/userSettings'
import { Regulation } from '../types'
import {
  CATEGORY_BADGES,
  CATEGORY_DOTS,
  REGULATION_TYPE_BADGES,
  REGULATION_TYPE_OPTIONS,
  STATUS_BADGES,
  TOPIC_BADGES,
  TOPIC_OPTIONS,
  formatCategoryLabel,
  formatDateWithPrecision,
  formatRegulationTypeLabel,
  formatStatusLabel,
  formatTopicLabel,
  getRegulationTypeDefinition,
  getRegulationTypeKey,
  getStatusDefinition,
  getTopicDefinition,
  normalizeStatus,
  normalizeCategoryKey,
} from '../lib/appTheme'
import InlineInfoTooltip from '../components/InlineInfoTooltip'
import { formatGeographyOptionLabel, REGION_EMOJIS } from '../lib/geography'

interface DirectionTwoConceptPageProps {
  user: any
}

type UnifiedView = 'cards' | 'table' | 'timeline'

interface UnifiedFilters {
  categories: string[]
  types: string[]
  topics: string[]
  statuses: string[]
  regions: string[]
}

const EMPTY_FILTERS: UnifiedFilters = {
  categories: [],
  types: [],
  topics: [],
  statuses: [],
  regions: [],
}

function getRegulationDate(regulation: Regulation) {
  return regulation.effective_date || regulation.updated_at || regulation.created_at
}

function getRegulationSummary(regulation: Regulation) {
  return regulation.description || regulation.full_description || 'No summary available.'
}

function getMonthKey(regulation: Regulation) {
  const date = getRegulationDate(regulation)
  return date ? format(new Date(date), 'MMMM yyyy') : 'Unknown'
}

function buildChildrenByUmbrella(regulations: Regulation[]) {
  const regIds = new Set(regulations.map((regulation) => regulation.id))
  const childrenByUmbrella = new Map<string, Regulation[]>()

  regulations.forEach((regulation) => {
    if (regulation.umbrella_id && regIds.has(regulation.umbrella_id)) {
      const list = childrenByUmbrella.get(regulation.umbrella_id) ?? []
      list.push(regulation)
      childrenByUmbrella.set(regulation.umbrella_id, list)
    }
  })

  return childrenByUmbrella
}

function buildTopLevelFamilies(regulations: Regulation[]) {
  const regIds = new Set(regulations.map((regulation) => regulation.id))
  return regulations.filter((regulation) => !(regulation.umbrella_id && regIds.has(regulation.umbrella_id)))
}

function searchMatches(regulation: Regulation, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    regulation.title?.toLowerCase().includes(q) ||
    regulation.description?.toLowerCase().includes(q) ||
    regulation.full_description?.toLowerCase().includes(q) ||
    regulation.region?.toLowerCase().includes(q) ||
    regulation.category?.toLowerCase().includes(q) ||
    regulation.source_name?.toLowerCase().includes(q) ||
    formatRegulationTypeLabel(getRegulationTypeKey(regulation)).toLowerCase().includes(q) ||
    regulation.topics?.some((topic) => formatTopicLabel(topic).toLowerCase().includes(q)) ||
    regulation.tags?.some((tag) => tag.toLowerCase().includes(q))
  )
}

function FilterOptionList({
  label,
  options,
  selected,
  onToggle,
  getDefinition,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  getDefinition?: (value: string) => string
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="space-y-1">
        {options.map((option) => {
          const active = selected.includes(option.value)
          const definition = getDefinition?.(option.value) || ''
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
              <span className="flex min-w-0 items-center gap-1.5">
                <span>{option.label}</span>
                {definition ? <InlineInfoTooltip text={definition} /> : null}
              </span>
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
  searchable = false,
  getDefinition,
}: {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
  searchable?: boolean
  getDefinition?: (value: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setQuery(''); return }
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0)

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, searchable])

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)

  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`

  const visibleOptions = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

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
          {searchable && (
            <div className="border-b border-[hsl(var(--border))] px-2 py-2">
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full rounded-md border border-[hsl(var(--border))] bg-white py-1.5 pl-7 pr-2.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.4)]"
                />
              </div>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto p-1.5">
            {visibleOptions.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-[hsl(var(--muted-foreground))]">No matches</p>
            ) : (
              <FilterOptionList
                label={label}
                options={visibleOptions}
                selected={selected}
                onToggle={onToggle}
                getDefinition={getDefinition}
              />
            )}
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

function CompareModal({
  regulations,
  onClose,
}: {
  regulations: Regulation[]
  onClose: () => void
}) {
  if (regulations.length !== 2) return null

  const [a, b] = regulations
  const compareRows = [
    { label: 'Region', a: a.region, b: b.region },
    { label: 'Theme', a: formatCategoryLabel(a.category), b: formatCategoryLabel(b.category) },
    { label: 'Type', a: formatRegulationTypeLabel(getRegulationTypeKey(a)), b: formatRegulationTypeLabel(getRegulationTypeKey(b)) },
    { label: 'Topics', a: a.topics?.map((topic) => formatTopicLabel(topic)).join(', ') || 'None set', b: b.topics?.map((topic) => formatTopicLabel(topic)).join(', ') || 'None set' },
    { label: 'Status', a: formatStatusLabel(a.status), b: formatStatusLabel(b.status) },
    {
      label: 'Effective date',
      a: formatDateWithPrecision(getRegulationDate(a), a.date_precision),
      b: formatDateWithPrecision(getRegulationDate(b), b.date_precision),
    },
    { label: 'Summary', a: getRegulationSummary(a), b: getRegulationSummary(b) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8">
      <div className="surface-card w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Compare Selected Regulations</h2>
          <button onClick={onClose} className="ui-button-ghost !p-2">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-[140px_1fr_1fr] border-b border-[hsl(var(--border))] md:grid-cols-[160px_1fr_1fr]">
          <div className="p-3" />
          {[a, b].map((regulation) => (
            <div key={regulation.id} className="bg-[hsl(var(--muted))/0.45] p-3">
              <p className="text-sm font-semibold leading-snug text-[hsl(var(--foreground))]">{regulation.title}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label} className="border-b border-[hsl(var(--border))] last:border-0">
                  <td className="w-[140px] bg-[hsl(var(--muted))/0.28] p-3 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] md:w-[160px]">
                    {row.label}
                  </td>
                  <td className={`p-3 align-top text-sm text-[hsl(var(--foreground))] ${row.label === 'Summary' ? 'leading-6' : ''}`}>{row.a}</td>
                  <td className={`p-3 align-top text-sm text-[hsl(var(--foreground))] ${row.label === 'Summary' ? 'leading-6' : ''}`}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: UnifiedView
  onChange: (view: UnifiedView) => void
}) {
  const items = [
    { id: 'cards' as const, label: 'Cards', icon: LayoutGrid, tooltip: 'Browse regulations as cards.' },
    { id: 'table' as const, label: 'Table', icon: Table2, tooltip: 'Compare regulations side by side in a table.' },
    { id: 'timeline' as const, label: 'Timeline', icon: Rows3, tooltip: 'Follow regulatory change over time and surface updates quickly.' },
  ]

  return (
    <div className="inline-flex gap-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-1">
      {items.map((item) => {
        const Icon = item.icon
        const active = item.id === view
        return (
          <div key={item.id} className="group/tooltip relative">
            <button
              type="button"
              onClick={() => onChange(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'bg-white text-[hsl(var(--primary))] shadow-sm ring-1 ring-[hsl(var(--border))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-white/60 hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
            <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[16rem] -translate-x-1/2 -translate-y-1 opacity-0 transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100">
              <span className="absolute bottom-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px] border-l border-t" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
              <div className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium shadow-lg" style={{ borderColor: 'hsl(var(--border))', background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)', color: 'hsl(var(--foreground))' }}>
                {item.tooltip}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CardsView({
  regulations,
  watchlist,
  user,
  selectedToCompare,
  onToggleWatch,
  onToggleCompare,
  onOpenDetail,
}: {
  regulations: Regulation[]
  watchlist: string[]
  user: any
  selectedToCompare: Regulation[]
  onToggleWatch: (id: string) => void
  onToggleCompare: (regulation: Regulation) => void
  onOpenDetail: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {regulations.map((regulation) => {
        const isWatched = watchlist.includes(regulation.id)
        const selectedForCompare = selectedToCompare.some((item) => item.id === regulation.id)

        return (
          <div
            key={regulation.id}
            onClick={() => onOpenDetail(regulation.id)}
            className={`surface-card flex h-full cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] ${
              selectedForCompare ? 'ring-2 ring-[hsl(var(--primary))]' : ''
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span
                    title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
                  </span>
                  <span className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-none ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(regulation.category)] || 'bg-slate-400'}`} />
                    {formatCategoryLabel(regulation.category)}
                  </span>
                  {regulation.topics?.slice(0, 2).map((topic) => (
                    <span
                      key={`${regulation.id}-${topic}`}
                      title={getTopicDefinition(topic)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TOPIC_BADGES[topic] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {formatTopicLabel(topic)}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => onOpenDetail(regulation.id)}
                  className="text-left text-base font-semibold leading-snug text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  {regulation.title}
                </button>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span
                  title={getStatusDefinition(regulation.status)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}
                >
                  {formatStatusLabel(regulation.status)}
                </span>
                <button
                  onClick={() => onToggleCompare(regulation)}
                  disabled={selectedToCompare.length >= 2 && !selectedForCompare}
                  className={`rounded-full p-2 transition-colors ${
                    selectedForCompare
                      ? 'bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]'
                  } disabled:opacity-30`}
                >
                  {selectedForCompare ? <Check size={16} /> : <Scale size={16} />}
                </button>

                <BookmarkHint showHint={!user}>
                  <button
                    onClick={() => onToggleWatch(regulation.id)}
                    className={`rounded-full p-2 transition-colors ${
                      isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                    }`}
                  >
                    <Star size={16} className={isWatched ? 'fill-current' : ''} />
                  </button>
                </BookmarkHint>
              </div>
            </div>

            <div className="mb-3 inline-flex w-max items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
              <span>{REGION_EMOJIS[regulation.region] || '🌍'}</span>
              {regulation.region}
            </div>

            <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              {getRegulationSummary(regulation)}
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Effective {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
              </span>
              <button
                onClick={() => onOpenDetail(regulation.id)}
                className="text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary)/0.8)]"
              >
                View details →
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GroupedCardsView({
  allFiltered,
  topLevelRegulations,
  watchlist,
  user,
  selectedToCompare,
  expandedFamilies,
  onToggleFamily,
  onToggleWatch,
  onToggleCompare,
  onOpenDetail,
}: {
  allFiltered: Regulation[]
  topLevelRegulations: Regulation[]
  watchlist: string[]
  user: any
  selectedToCompare: Regulation[]
  expandedFamilies: Set<string>
  onToggleFamily: (id: string) => void
  onToggleWatch: (id: string) => void
  onToggleCompare: (regulation: Regulation) => void
  onOpenDetail: (id: string) => void
}) {
  const childrenByUmbrella = useMemo(() => buildChildrenByUmbrella(allFiltered), [allFiltered])

  const renderCard = (regulation: Regulation, indented = false, familyButton?: React.ReactNode) => {
    const isWatched = watchlist.includes(regulation.id)
    const selectedForCompare = selectedToCompare.some((item) => item.id === regulation.id)

    // Child (indented) cards: compact row layout, muted background, no description
    if (indented) {
      return (
        <div
          key={regulation.id}
          onClick={() => onOpenDetail(regulation.id)}
          className={`ml-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/0.2)] border-l-[3px] border-l-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.04)] px-4 py-3 transition-all hover:border-[hsl(var(--primary)/0.35)] hover:border-l-[hsl(var(--primary)/0.65)] hover:bg-[hsl(var(--primary)/0.07)] ${
            selectedForCompare ? 'ring-2 ring-[hsl(var(--primary))]' : ''
          }`}
        >
          <GitBranch size={13} className="shrink-0 text-[hsl(var(--primary)/0.55)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
              {regulation.title}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {regulation.version_label && (
                <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--primary))]">
                  {regulation.version_label}
                </span>
              )}
              {regulation.human_verified && (
                <VerifiedBadge />
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
                {formatStatusLabel(regulation.status)}
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {REGION_EMOJIS[regulation.region] || '🌍'} {regulation.region}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <BookmarkHint showHint={!user}>
              <button
                onClick={() => onToggleWatch(regulation.id)}
                className={`rounded-full p-1.5 transition-colors ${
                  isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                }`}
              >
                <Star size={13} className={isWatched ? 'fill-current' : ''} />
              </button>
            </BookmarkHint>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(regulation.id) }}
              className="text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:opacity-70"
            >
              View →
            </button>
          </div>
        </div>
      )
    }

    // Parent (top-level) card: full layout
    return (
      <div
        key={regulation.id}
        onClick={() => onOpenDetail(regulation.id)}
        className={`surface-card flex h-full cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)] ${
          selectedForCompare ? 'ring-2 ring-[hsl(var(--primary))]' : ''
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span
                title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}
              >
                {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
              </span>
              <span className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-none ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(regulation.category)] || 'bg-slate-400'}`} />
                {formatCategoryLabel(regulation.category)}
              </span>
              {regulation.version_label && (
                <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--primary))]">
                  {regulation.version_label}
                </span>
              )}
              {regulation.human_verified && (
                <VerifiedBadge />
              )}
            </div>
            <button
              onClick={() => onOpenDetail(regulation.id)}
              className="text-left text-base font-semibold leading-snug text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
            >
              {regulation.title}
            </button>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span
              title={getStatusDefinition(regulation.status)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}
            >
              {formatStatusLabel(regulation.status)}
            </span>
            <button
              onClick={() => onToggleCompare(regulation)}
              disabled={selectedToCompare.length >= 2 && !selectedForCompare}
              className={`rounded-full p-2 transition-colors ${
                selectedForCompare
                  ? 'bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]'
              } disabled:opacity-30`}
            >
              {selectedForCompare ? <Check size={16} /> : <Scale size={16} />}
            </button>
            <BookmarkHint showHint={!user}>
              <button
                onClick={() => onToggleWatch(regulation.id)}
                className={`rounded-full p-2 transition-colors ${
                  isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                }`}
              >
                <Star size={16} className={isWatched ? 'fill-current' : ''} />
              </button>
            </BookmarkHint>
          </div>
        </div>
        <div className="mb-3 inline-flex w-max items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          <span>{REGION_EMOJIS[regulation.region] || '🌍'}</span>
          {regulation.region}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {getRegulationSummary(regulation)}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Effective {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
            </span>
            {familyButton}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(regulation.id) }}
            className="text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary)/0.8)]"
          >
            View details →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {topLevelRegulations.map((regulation) => {
        const children = childrenByUmbrella.get(regulation.id) ?? []
        if (children.length === 0) {
          return renderCard(regulation)
        }
        const isExpanded = expandedFamilies.has(regulation.id)
        const familyBtn = (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFamily(regulation.id) }}
            className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))]"
          >
            <GitBranch size={10} />
            {children.length} in family
            <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )
        return (
          <div key={regulation.id} className="space-y-2">
            {renderCard(regulation, false, familyBtn)}
            {isExpanded && (
              <div className="flex flex-col gap-3">
                {children.map((child) => renderCard(child, true))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TableView({
  regulations,
  allFiltered,
  watchlist,
  user,
  selectedToCompare,
  expandedFamilies,
  onToggleFamily,
  onToggleWatch,
  onToggleCompare,
  onOpenDetail,
}: {
  regulations: Regulation[]
  allFiltered: Regulation[]
  watchlist: string[]
  user: any
  selectedToCompare: Regulation[]
  expandedFamilies: Set<string>
  onToggleFamily: (id: string) => void
  onToggleWatch: (id: string) => void
  onToggleCompare: (regulation: Regulation) => void
  onOpenDetail: (id: string) => void
}) {
  const childrenByUmbrella = useMemo(() => buildChildrenByUmbrella(allFiltered), [allFiltered])

  const renderRow = (regulation: Regulation, isChild = false): React.ReactNode => {
    const isWatched = watchlist.includes(regulation.id)
    const selectedForCompare = selectedToCompare.some((item) => item.id === regulation.id)
    const children = childrenByUmbrella.get(regulation.id) ?? []
    const isExpanded = expandedFamilies.has(regulation.id)

    return (
      <>
        <tr
          key={regulation.id}
          onClick={() => onOpenDetail(regulation.id)}
          className={`cursor-pointer border-t border-[hsl(var(--border))] align-top hover:bg-[hsl(var(--muted)/0.35)] ${isChild ? 'bg-[hsl(var(--primary)/0.05)]' : ''}`}
        >
          <td className={`px-4 py-4 ${isChild ? 'border-l-2 border-l-[hsl(var(--primary)/0.45)]' : ''}`}>
            <div className={`flex items-start gap-2 ${isChild ? 'pl-4' : ''}`}>
              {isChild && <GitBranch size={12} className="mt-1 shrink-0 text-[hsl(var(--primary)/0.5)]" />}
              <div>
                <button
                  onClick={() => onOpenDetail(regulation.id)}
                  className="text-left text-sm font-semibold leading-6 text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
                >
                  {regulation.title}
                </button>
                {!isChild && (
                  <p className="mt-1 max-w-md text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                    {getRegulationSummary(regulation)}
                  </p>
                )}
                {!isChild && children.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFamily(regulation.id) }}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))]"
                  >
                    <GitBranch size={10} />
                    {children.length} in family
                    <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <span
              title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}
            >
              {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
            </span>
          </td>
          <td className="px-4 py-4">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(regulation.category)] || 'bg-slate-400'}`} />
              {formatCategoryLabel(regulation.category)}
            </span>
          </td>
          <td className="px-4 py-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
              <span>{REGION_EMOJIS[regulation.region] || '🌍'}</span>
              {regulation.region}
            </span>
          </td>
          <td className="px-4 py-4">
            <span
              title={getStatusDefinition(regulation.status)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}
            >
              {formatStatusLabel(regulation.status)}
            </span>
          </td>
          <td className="px-4 py-4 text-xs text-[hsl(var(--foreground))]">
            {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
          </td>
          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleCompare(regulation)}
                disabled={selectedToCompare.length >= 2 && !selectedForCompare}
                className={`rounded-full p-2 transition-colors ${
                  selectedForCompare
                    ? 'bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]'
                } disabled:opacity-30`}
              >
                {selectedForCompare ? <Check size={15} /> : <Scale size={15} />}
              </button>
              <BookmarkHint showHint={!user}>
                <button
                  onClick={() => onToggleWatch(regulation.id)}
                  className={`rounded-full p-2 transition-colors ${
                    isWatched ? 'bg-amber-100 text-amber-600' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-amber-600'
                  }`}
                >
                  <Star size={15} className={isWatched ? 'fill-current' : ''} />
                </button>
              </BookmarkHint>
              <button
                onClick={() => onOpenDetail(regulation.id)}
                className="ml-1 text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary)/0.8)]"
              >
                View details →
              </button>
            </div>
          </td>
        </tr>
        {!isChild && isExpanded && children.map((child) => renderRow(child, true))}
      </>
    )
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="bg-[hsl(var(--muted))/0.35]">
            <tr className="text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Regulation</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Type</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Theme</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Region</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Status</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Date</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {regulations.map((regulation) => renderRow(regulation))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TimelineView({
  regulations,
  allFiltered,
  watchlist,
  user,
  selectedToCompare,
  expandedFamilies,
  onToggleFamily,
  onToggleWatch,
  onToggleCompare,
  onOpenDetail,
}: {
  regulations: Regulation[]
  allFiltered: Regulation[]
  watchlist: string[]
  user: any
  selectedToCompare: Regulation[]
  expandedFamilies: Set<string>
  onToggleFamily: (id: string) => void
  onToggleWatch: (id: string) => void
  onToggleCompare: (regulation: Regulation) => void
  onOpenDetail: (id: string) => void
}) {
  const navigate = useNavigate()
  const childrenByUmbrella = useMemo(() => buildChildrenByUmbrella(allFiltered), [allFiltered])

  const grouped = regulations.reduce<Record<string, Regulation[]>>((acc, regulation) => {
    const month = getMonthKey(regulation)
    acc[month] ||= []
    acc[month].push(regulation)
    return acc
  }, {})

  const renderTimelineCard = (regulation: Regulation, isChild = false): React.ReactNode => {
    const selected = selectedToCompare.find((item) => item.id === regulation.id)
    const children = childrenByUmbrella.get(regulation.id) ?? []
    const isExpanded = expandedFamilies.has(regulation.id)

    return (
      <div key={regulation.id} className={`group relative flex gap-4 ${isChild ? 'ml-8' : ''}`}>
        <div className="relative z-10 mt-2">
          <div className={`flex items-center justify-center rounded-full border-2 bg-white transition-colors ${isChild ? 'h-[17px] w-[17px] border-[hsl(var(--primary)/0.3)] group-hover:border-[hsl(var(--primary)/0.6)]' : 'h-[23px] w-[23px] border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))]'}`}>
            {isChild
              ? <GitBranch size={9} className="text-[hsl(var(--primary)/0.5)]" />
              : <div className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))/0.3] transition-colors group-hover:bg-[hsl(var(--primary))]" />
            }
          </div>
        </div>

        <div onClick={() => onOpenDetail(regulation.id)} className={`surface-card flex-1 cursor-pointer p-4 transition-all group-hover:shadow-sm ${selected ? 'ring-2 ring-[hsl(var(--primary))]' : ''} ${isChild ? 'border border-[hsl(var(--primary)/0.2)] border-l-2 border-l-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.04)] group-hover:border-l-[hsl(var(--primary)/0.7)]' : 'group-hover:border-[hsl(var(--primary))/0.2]'}`}>
          {isChild && getRegulationDate(regulation) && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--primary)/0.8)]">
                Effective {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
              </span>
            </div>
          )}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}
              >
                {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                {formatCategoryLabel(regulation.category)}
              </span>
              {regulation.topics?.slice(0, 2).map((topic) => (
                <span
                  key={`${regulation.id}-${topic}`}
                  title={getTopicDefinition(topic)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TOPIC_BADGES[topic] || 'bg-slate-100 text-slate-600'}`}
                >
                  {formatTopicLabel(topic)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                <span>{REGION_EMOJIS[regulation.region] || '🌍'}</span>
                {regulation.region}
              </span>
              <span
                title={getStatusDefinition(regulation.status)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}
              >
                {formatStatusLabel(regulation.status)}
              </span>
              {regulation.updated_at && regulation.created_at && regulation.updated_at !== regulation.created_at && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                  UPDATE
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onToggleCompare(regulation)}
                disabled={selectedToCompare.length >= 2 && !selected}
                className={`rounded-lg p-1.5 transition-colors ${
                  selected
                    ? 'text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))/0.45] hover:text-[hsl(var(--primary))/0.7]'
                } disabled:opacity-30`}
              >
                {selected ? <Check size={16} /> : <Scale size={16} />}
              </button>
              <BookmarkHint showHint={!user}>
                <button
                  onClick={() => onToggleWatch(regulation.id)}
                  className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-amber-500"
                >
                  <Star size={15} className={watchlist.includes(regulation.id) ? 'fill-amber-500 text-amber-500' : ''} />
                </button>
              </BookmarkHint>
            </div>
          </div>

          <button
            onClick={() => onOpenDetail(regulation.id)}
            className="mb-0.5 text-left text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]"
          >
            {regulation.title}
          </button>

          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            {getRegulationSummary(regulation)}
          </p>

          {regulation.tags && regulation.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {regulation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {!isChild && children.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFamily(regulation.id) }}
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))]"
                >
                  <GitBranch size={10} />
                  {children.length} in family
                  <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
              <button
                onClick={() => navigate(`/advisor?regulationId=${regulation.id}&title=${encodeURIComponent(regulation.title)}`)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                Ask AI
                <Sparkles size={12} />
              </button>
              <button
                onClick={() => onOpenDetail(regulation.id)}
                className="text-[11px] font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary)/0.8)]"
              >
                View details →
              </button>
            </div>

            {!isChild && (
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <div className="sticky top-0 z-10 mb-3 bg-[hsl(var(--background))/0.95] py-2 backdrop-blur-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{month}</h3>
          </div>

          <div className="relative space-y-3">
            <div className="absolute bottom-2 left-[11px] top-2 w-px bg-[hsl(var(--border))]" />
            {items.map((regulation) => {
              const children = childrenByUmbrella.get(regulation.id) ?? []
              const isExpanded = expandedFamilies.has(regulation.id)
              return (
                <div key={regulation.id} className="space-y-2">
                  {renderTimelineCard(regulation)}
                  {isExpanded && children.map((child) => renderTimelineCard(child, true))}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

function PaginationControls({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center gap-3">
      {/* Page size selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">Per page</span>
        <div className="flex gap-1">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSizeChange(size)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                pageSize === size
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted-foreground))/0.15] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Prev / page indicator / Next */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-[56px] text-center text-xs font-medium text-[hsl(var(--foreground))]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {total === 0 ? 'No results' : (
          <>
            <span className="font-semibold text-[hsl(var(--foreground))]">{from}–{to}</span>
            {' '}of{' '}
            <span className="font-semibold text-[hsl(var(--foreground))]">{total.toLocaleString()}</span>
          </>
        )}
      </p>
      <PaginationControls
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}


const SCROLL_SESSION_KEY = 'framework-library-scroll'

function parseArrayParam(value: string | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}

export default function DirectionTwoConceptPage({ user }: DirectionTwoConceptPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialise state from URL params so back-navigation restores everything
  const [view, setViewState] = useState<UnifiedView>(() => {
    const v = searchParams.get('v')
    return v === 'timeline' || v === 'table' ? v : 'cards'
  })
  const [searchQuery, setSearchQueryState] = useState(() => searchParams.get('q') || '')
  const [filters, setFiltersState] = useState<UnifiedFilters>(() => ({
    types: parseArrayParam(searchParams.get('types')),
    categories: parseArrayParam(searchParams.get('categories')),
    topics: parseArrayParam(searchParams.get('topics')),
    regions: parseArrayParam(searchParams.get('regions')),
    statuses: parseArrayParam(searchParams.get('statuses')).map((status) => normalizeStatus(status)),
  }))
  const [showWatchlistOnly, setShowWatchlistOnlyState] = useState(() => searchParams.get('wl') === '1')
  const [showFamiliesOnly, setShowFamiliesOnlyState] = useState(() => searchParams.get('fam') === '1')

  const [watchlist, setWatchlist] = useState<string[]>([])
  const [selectedToCompare, setSelectedToCompare] = useState<Regulation[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [groupByFamily, setGroupByFamily] = useState(() => searchParams.get('gbf') !== '0')
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => {
    const ef = searchParams.get('ef')
    return ef ? new Set(ef.split(',').filter(Boolean)) : new Set()
  })
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10)))
  const [pageSize, setPageSizeState] = useState<number>(() => {
    const ps = parseInt(searchParams.get('ps') || '50', 10)
    return PAGE_SIZE_OPTIONS.includes(ps as any) ? ps : 50
  })

  // Sync all UI state back to URL (replace so it doesn't pollute history)
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        view === 'cards' ? next.delete('v') : next.set('v', view)
        searchQuery ? next.set('q', searchQuery) : next.delete('q')
        filters.types.length ? next.set('types', filters.types.join(',')) : next.delete('types')
        filters.categories.length ? next.set('categories', filters.categories.join(',')) : next.delete('categories')
        filters.topics.length ? next.set('topics', filters.topics.join(',')) : next.delete('topics')
        filters.regions.length ? next.set('regions', filters.regions.join(',')) : next.delete('regions')
        filters.statuses.length ? next.set('statuses', filters.statuses.join(',')) : next.delete('statuses')
        showWatchlistOnly ? next.set('wl', '1') : next.delete('wl')
        showFamiliesOnly ? next.set('fam', '1') : next.delete('fam')
        groupByFamily ? next.delete('gbf') : next.set('gbf', '0')
        const efIds = [...expandedFamilies].join(',')
        efIds ? next.set('ef', efIds) : next.delete('ef')
        page > 1 ? next.set('page', String(page)) : next.delete('page')
        pageSize !== 50 ? next.set('ps', String(pageSize)) : next.delete('ps')
        return next
      },
      { replace: true }
    )
  }, [view, searchQuery, filters, showWatchlistOnly, showFamiliesOnly, groupByFamily, expandedFamilies, page, pageSize])

  // Restore scroll position after data loads (set by openDetail before navigating away)
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem(SCROLL_SESSION_KEY)
      if (saved) {
        sessionStorage.removeItem(SCROLL_SESSION_KEY)
        const el = document.getElementById('main-scroll')
        if (el) {
          requestAnimationFrame(() => { el.scrollTop = parseInt(saved, 10) })
        }
      }
    }
  }, [loading])

  // Wrapped setters that update both React state and URL
  const setView = (v: UnifiedView) => setViewState(v)
  const setSearchQuery = (q: string) => setSearchQueryState(q)
  const setFilters = (f: UnifiedFilters) => setFiltersState(f)
  const setShowWatchlistOnly = (fn: boolean | ((prev: boolean) => boolean)) => setShowWatchlistOnlyState(fn)
  const setShowFamiliesOnly = (v: boolean) => setShowFamiliesOnlyState(v)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllRegulations()
        const sorted = [...data].sort(
          (a, b) => new Date(getRegulationDate(b)).getTime() - new Date(getRegulationDate(a)).getTime()
        )
        setRegulations(sorted)
      } catch (error) {
        console.error('Error fetching regulations:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!user) return

    const loadWatchlist = async () => {
      try {
        setWatchlist(await getUserWatchlist(user.id))
      } catch (error) {
        console.error('Error fetching watchlist:', error)
      }
    }

    loadWatchlist()
  }, [user])

  const uniqueRegions = useMemo(
    () => [...new Set(regulations.map((regulation) => regulation.region).filter(Boolean))].sort(),
    [regulations]
  )

  const uniqueCategories = useMemo(
    () => [...new Set(regulations.map((regulation) => normalizeCategoryKey(regulation.category)).filter(Boolean))].sort(),
    [regulations]
  )

  const uniqueTypes = useMemo(
    () =>
      REGULATION_TYPE_OPTIONS.filter((option) =>
        regulations.some((regulation) => getRegulationTypeKey(regulation) === option.value)
      ),
    [regulations]
  )

  const uniqueTopics = useMemo(
    () =>
      TOPIC_OPTIONS.filter((option) =>
        regulations.some((regulation) => regulation.topics?.includes(option.value))
      ),
    [regulations]
  )

  const uniqueStatuses = useMemo(
    () =>
      [...new Set(regulations.map((regulation) => normalizeStatus(regulation.status)))]
        .sort((a, b) => formatStatusLabel(a).localeCompare(formatStatusLabel(b)))
        .map((status) => ({ value: status, label: formatStatusLabel(status) })),
    [regulations]
  )

  // Set of IDs that belong to a family (parents + children)
  const familyIds = useMemo(() => {
    const parentIds = new Set(regulations.map((r) => r.umbrella_id).filter(Boolean) as string[])
    return new Set(
      regulations
        .filter((r) => r.umbrella_id || parentIds.has(r.id))
        .map((r) => r.id)
    )
  }, [regulations])

  const filtered = useMemo(() => {
    return regulations.filter((regulation) => {
      const matchesSearch = searchMatches(regulation, searchQuery)
      const matchesType =
        filters.types.length === 0 || filters.types.includes(getRegulationTypeKey(regulation))
      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(normalizeCategoryKey(regulation.category))
      const matchesTopic =
        filters.topics.length === 0 || filters.topics.some((topic) => regulation.topics?.includes(topic as any))
      const matchesStatus =
        filters.statuses.length === 0 || filters.statuses.includes(regulation.status)
      const matchesRegion =
        filters.regions.length === 0 || filters.regions.includes(regulation.region)
      const matchesWatchlist = !showWatchlistOnly || watchlist.includes(regulation.id)
      const matchesFamily = !showFamiliesOnly || familyIds.has(regulation.id)

      return matchesSearch && matchesType && matchesCategory && matchesTopic && matchesStatus && matchesRegion && matchesWatchlist && matchesFamily
    })
  }, [filters, regulations, searchQuery, showWatchlistOnly, showFamiliesOnly, watchlist, familyIds])

  const topLevelFamilies = useMemo(() => buildTopLevelFamilies(filtered), [filtered])

  const paginated = useMemo(
    () => groupByFamily
      ? topLevelFamilies.slice((page - 1) * pageSize, page * pageSize)
      : filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, topLevelFamilies, groupByFamily, page, pageSize]
  )

  const displayTotal = groupByFamily ? topLevelFamilies.length : filtered.length

  // Reset to page 1 whenever the filtered set changes
  useEffect(() => { setPage(1) }, [filters, searchQuery, showWatchlistOnly, showFamiliesOnly, view, groupByFamily])

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setPage(1)
  }

  const handlePageChange = (next: number) => {
    setPage(next)
    const el = document.getElementById('main-scroll')
    if (el) el.scrollTop = 0
  }

  const activeFilterCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0)
  const hasSearchOrFilters = Boolean(searchQuery) || activeFilterCount > 0 || showWatchlistOnly || showFamiliesOnly

  const toggleFilter = (key: keyof UnifiedFilters, value: string) => {
    const current = filters[key]
    setFilters({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    })
  }

  const toggleWatch = async (id: string) => {
    if (!user) {
      navigate(withAuthModal(location.pathname, location.search))
      return
    }

    const previousWatchlist = watchlist
    const nextWatchlist = previousWatchlist.includes(id)
      ? watchlist.filter((item) => item !== id)
      : [...watchlist, id]

    setWatchlist(nextWatchlist)

    try {
      await saveUserWatchlist(user.id, nextWatchlist)
    } catch (error) {
      setWatchlist(previousWatchlist)
      console.error('Error updating watchlist:', error)
    }
  }

  const toggleCompare = (regulation: Regulation) => {
    setSelectedToCompare((current) => {
      const exists = current.find((item) => item.id === regulation.id)
      if (exists) return current.filter((item) => item.id !== regulation.id)
      return [...current, regulation].slice(-2)
    })
  }

  const openDetail = (id: string) => {
    const el = document.getElementById('main-scroll')
    if (el) sessionStorage.setItem(SCROLL_SESSION_KEY, String(el.scrollTop))
    navigate(`/framework-library/${id}`, {
      state: {
        backLabel: 'Back to Regulations & Frameworks Library',
        backTo: `${location.pathname}${location.search}`,
      },
    })
  }

  const resetAll = () => {
    setFilters(EMPTY_FILTERS)
    setSearchQuery('')
    setShowWatchlistOnly(false)
    setShowFamiliesOnly(false)
  }

  const toggleFamily = (id: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="page-shell-narrow md:max-w-4xl">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading unified regulations workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-narrow md:max-w-4xl space-y-3">
      <section className="surface-card overflow-visible">
        <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(120deg,rgba(15,123,92,0.08)_0%,rgba(247,209,106,0.08)_100%)] px-5 py-3 md:px-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Switch between views to explore the data.</p>
            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle view={view} onChange={setView} />
              <div className="group/tooltip relative">
                <button
                  onClick={() => { setGroupByFamily((v) => !v); setExpandedFamilies(new Set()) }}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-all ${
                    groupByFamily
                      ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-white/60 hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <GitBranch size={13} />
                  {groupByFamily ? 'Grouped by family' : 'Group by family'}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[15rem] -translate-x-1/2 -translate-y-1 opacity-0 transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100">
                  <span className="absolute bottom-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px] border-l border-t" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <div className="rounded-xl border px-3 py-2 text-[11px] font-medium shadow-lg" style={{ borderColor: 'hsl(var(--border))', background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)', color: 'hsl(var(--foreground))' }}>
                    Nest related regulations under their parent — click a parent to expand its family members
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 md:px-6">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search regulations, themes, regions, sources, or tags..."
              className="ui-input pl-10 pr-8 !py-2 !text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowWatchlistOnly((value) => !value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              showWatchlistOnly
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Star size={14} className={showWatchlistOnly ? 'fill-current' : ''} />
            Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
          </button>
          <div className="group/tooltip relative">
            <button
              onClick={() => setShowFamiliesOnly(!showFamiliesOnly)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                showFamiliesOnly
                  ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]'
                  : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <GitBranch size={14} />
              Families
            </button>
            <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[13rem] -translate-x-1/2 -translate-y-1 opacity-0 transition-all duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100">
              <span className="absolute bottom-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px] border-l border-t" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
              <div className="rounded-xl border px-3 py-2 text-[11px] font-medium shadow-lg" style={{ borderColor: 'hsl(var(--border))', background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)', color: 'hsl(var(--foreground))' }}>
                Show only regulations that belong to a family group
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {/* Row 1: filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <CompactMultiSelect
            label="Type"
            allLabel="All types"
            options={uniqueTypes}
            selected={filters.types}
            onToggle={(value) => toggleFilter('types', value)}
            onClear={() => setFilters({ ...filters, types: [] })}
            getDefinition={getRegulationTypeDefinition}
          />
          <CompactMultiSelect
            label="Theme"
            allLabel="All themes"
            options={uniqueCategories.map((category) => ({ value: category, label: category }))}
            selected={filters.categories}
            onToggle={(value) => toggleFilter('categories', value)}
            onClear={() => setFilters({ ...filters, categories: [] })}
          />
          <CompactMultiSelect
            label="Topic"
            allLabel="All topics"
            options={uniqueTopics}
            selected={filters.topics}
            onToggle={(value) => toggleFilter('topics', value)}
            onClear={() => setFilters({ ...filters, topics: [] })}
            getDefinition={getTopicDefinition}
          />
          <CompactMultiSelect
            label="Region"
            allLabel="All regions"
            options={uniqueRegions.map((region) => ({ value: region, label: formatGeographyOptionLabel(region) }))}
            selected={filters.regions}
            onToggle={(value) => toggleFilter('regions', value)}
            onClear={() => setFilters({ ...filters, regions: [] })}
            searchable
          />
          <CompactMultiSelect
            label="Status"
            allLabel="All statuses"
            options={uniqueStatuses}
            selected={filters.statuses}
            onToggle={(value) => toggleFilter('statuses', value)}
            onClear={() => setFilters({ ...filters, statuses: [] })}
            getDefinition={getStatusDefinition}
          />
        </div>

        {/* Row 2: result count (left) + clear + pagination (right) */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length.toLocaleString()}</span>
            {groupByFamily && (
              <> {filtered.length !== 1 ? 'policies' : 'policy'} across<span className="font-semibold text-[hsl(var(--foreground))]">{topLevelFamilies.length.toLocaleString()}</span> famil{topLevelFamilies.length === 1 ? 'y' : 'ies'}</>
            )}
            {!groupByFamily && (
              <>
                {filtered.length !== regulations.length && (
                  <> of <span className="font-semibold text-[hsl(var(--foreground))]">{regulations.length.toLocaleString()}</span></>
                )}
                {' '}result{filtered.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            {hasSearchOrFilters && (
              <button onClick={resetAll} className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]">
                Clear all
              </button>
            )}
            <PaginationControls
              total={displayTotal}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.types.map((type) => (
            <ActiveFilterChip key={`type-${type}`} label={formatRegulationTypeLabel(type)} onRemove={() => toggleFilter('types', type)} />
          ))}
          {filters.categories.map((category) => (
            <ActiveFilterChip key={`category-${category}`} label={formatCategoryLabel(category)} onRemove={() => toggleFilter('categories', category)} />
          ))}
          {filters.topics.map((topic) => (
            <ActiveFilterChip key={`topic-${topic}`} label={formatTopicLabel(topic)} onRemove={() => toggleFilter('topics', topic)} />
          ))}
          {filters.regions.map((region) => (
            <ActiveFilterChip key={`region-${region}`} label={formatGeographyOptionLabel(region)} onRemove={() => toggleFilter('regions', region)} />
          ))}
          {filters.statuses.map((status) => (
            <ActiveFilterChip key={`status-${status}`} label={formatStatusLabel(status)} onRemove={() => toggleFilter('statuses', status)} />
          ))}
          {showWatchlistOnly && <ActiveFilterChip label="Watchlist" onRemove={() => setShowWatchlistOnly(false)} />}
          {showFamiliesOnly && <ActiveFilterChip label="Families only" onRemove={() => setShowFamiliesOnly(false)} />}
        </div>

      </section>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            <BookOpen size={24} />
          </div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No regulations match this view</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Try broadening the filters or search query. All three views use the same filtered result set.
          </p>
        </div>
      ) : view === 'cards' && groupByFamily ? (
        <>
          <GroupedCardsView
            allFiltered={filtered}
            topLevelRegulations={topLevelFamilies.slice((page - 1) * pageSize, page * pageSize)}
            watchlist={watchlist}
            user={user}
            selectedToCompare={selectedToCompare}
            expandedFamilies={expandedFamilies}
            onToggleFamily={toggleFamily}
            onToggleWatch={toggleWatch}
            onToggleCompare={toggleCompare}
            onOpenDetail={openDetail}
          />
          <Pagination total={displayTotal} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
        </>
      ) : view === 'cards' ? (
        <>
          <CardsView
            regulations={paginated}
            watchlist={watchlist}
            user={user}
            selectedToCompare={selectedToCompare}
            onToggleWatch={toggleWatch}
            onToggleCompare={toggleCompare}
            onOpenDetail={openDetail}
          />
          <Pagination total={displayTotal} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
        </>
      ) : view === 'table' ? (
        <>
          <TableView
            regulations={paginated}
            allFiltered={filtered}
            watchlist={watchlist}
            user={user}
            selectedToCompare={selectedToCompare}
            expandedFamilies={expandedFamilies}
            onToggleFamily={toggleFamily}
            onToggleWatch={toggleWatch}
            onToggleCompare={toggleCompare}
            onOpenDetail={openDetail}
          />
          <Pagination total={displayTotal} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
        </>
      ) : (
        <>
          <TimelineView
            regulations={paginated}
            allFiltered={filtered}
            watchlist={watchlist}
            user={user}
            selectedToCompare={selectedToCompare}
            expandedFamilies={expandedFamilies}
            onToggleFamily={toggleFamily}
            onToggleWatch={toggleWatch}
            onToggleCompare={toggleCompare}
            onOpenDetail={openDetail}
          />
          <Pagination total={displayTotal} page={page} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={setPageSize} />
        </>
      )}

      {selectedToCompare.length > 0 && (
        <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-[hsl(var(--foreground))] px-5 py-3 text-white shadow-2xl md:bottom-6">
          <span className="text-sm font-medium">
            {selectedToCompare.length === 2 ? '2 regulations selected' : '1 selected — pick one more'}
          </span>
          {selectedToCompare.length === 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="rounded-xl bg-[hsl(var(--primary))] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--primary))/0.9]"
            >
              Compare →
            </button>
          )}
          <button
            onClick={() => setSelectedToCompare([])}
            className="text-xs text-white/70 transition-colors hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      <CompareModal regulations={showCompare ? selectedToCompare : []} onClose={() => setShowCompare(false)} />
    </div>
  )
}
