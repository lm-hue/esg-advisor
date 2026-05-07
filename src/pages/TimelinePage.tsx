import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Search,
  X,
  Star,
  Download,
  Sparkles,
  Scale,
  Plus,
  Check,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { withAuthModal } from '../lib/authModal'
import BookmarkHint from '../components/BookmarkHint'
import { fetchAllRegulations } from '../lib/regulations'
import { getUserWatchlist, saveUserWatchlist } from '../lib/userSettings'
import { Regulation } from '../types'
import {
  CATEGORY_BADGES,
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
  normalizeCategoryKey,
  normalizeStatus,
} from '../lib/appTheme'
import { formatGeographyOptionLabel } from '../lib/geography'
import InlineInfoTooltip from '../components/InlineInfoTooltip'

interface TimelinePageProps {
  user: any
}

interface TimelineFilters {
  categories: string[]
  types: string[]
  topics: string[]
  statuses: string[]
  regions: string[]
}

const EMPTY_FILTERS: TimelineFilters = {
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

function getSourceLabel(regulation: Regulation) {
  return regulation.source_name || 'Source unavailable'
}

function getMonthKey(regulation: Regulation) {
  const date = getRegulationDate(regulation)
  return date ? format(new Date(date), 'MMMM yyyy') : 'Unknown'
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
    formatRegulationTypeLabel(getRegulationTypeKey(regulation)).toLowerCase().includes(q) ||
    regulation.topics?.some((topic) => formatTopicLabel(topic).toLowerCase().includes(q)) ||
    regulation.tags?.some((tag) => tag.toLowerCase().includes(q))
  )
}

function compareText(a: string | undefined, b: string | undefined) {
  if (!a && !b) return 'No data available'
  if (a && b && a === b) return 'Aligned'
  if (!a || !b) return 'Partial overlap'
  return 'Different'
}

function downloadRegulationPdf(regulation: Regulation) {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return

  const content = `
    <html>
      <head>
        <title>${regulation.title}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #1f2d27; line-height: 1.6; }
          h1 { font-family: Georgia, serif; font-size: 28px; margin-bottom: 12px; }
          .meta { margin-bottom: 24px; color: #56645e; font-size: 14px; }
          .tag { display: inline-block; margin: 0 8px 8px 0; padding: 4px 10px; border-radius: 999px; background: #eef4ef; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${regulation.title}</h1>
        <div class="meta">
          <div>Category: ${regulation.category}</div>
          <div>Type: ${formatRegulationTypeLabel(getRegulationTypeKey(regulation))}</div>
          <div>Region: ${regulation.region}</div>
          <div>Status: ${formatStatusLabel(regulation.status)}</div>
          <div>Effective: ${formatDateWithPrecision(regulation.effective_date, regulation.date_precision)}</div>
          <div>Source: ${getSourceLabel(regulation)}</div>
        </div>
        <p>${getRegulationSummary(regulation)}</p>
        ${regulation.tags?.length ? `<div>${regulation.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
      </body>
    </html>
  `

  win.document.open()
  win.document.write(content)
  win.document.close()
  win.focus()
  win.print()
}

function SearchSuggestions({
  regulations,
  value,
  onChange,
  onSelectSuggestion,
}: {
  regulations: Regulation[]
  value: string
  onChange: (value: string) => void
  onSelectSuggestion: (regulation: Regulation) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => onChange(draft), 250)
    return () => window.clearTimeout(timeout)
  }, [draft, onChange])

  useEffect(() => {
    if (value === '') setDraft('')
  }, [value])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (
        !inputRef.current?.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const suggestions = useMemo(() => {
    if (draft.trim().length < 2) return []
    return regulations
      .filter((regulation) => searchMatches(regulation, draft))
      .slice(0, 8)
  }, [draft, regulations])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by title, description, region, or theme..."
          className="ui-input pl-10 pr-10"
        />
        {draft && (
          <button
            onClick={() => {
              setDraft('')
              onChange('')
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div ref={panelRef} className="surface-card absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden">
          {suggestions.map((regulation) => (
            <button
              key={regulation.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setIsOpen(false)
                onSelectSuggestion(regulation)
              }}
              className="flex w-full items-start gap-3 border-b border-[hsl(var(--border))/0.55] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[hsl(var(--muted))/0.7]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[hsl(var(--foreground))]">{regulation.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${REGULATION_TYPE_BADGES[getRegulationTypeKey(regulation)] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                    {formatCategoryLabel(regulation.category)}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{regulation.region}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
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
  getDefinition,
}: {
  label: string
  allLabel: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
  getDefinition?: (value: string) => string
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
              getDefinition={getDefinition}
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
    <button
      type="button"
      onClick={onRemove}
      className="ui-active-filter-chip"
    >
      <span>{label}</span>
      <X size={12} />
    </button>
  )
}

function DesktopFiltersPanel({
  filters,
  onFiltersChange,
  uniqueRegions,
  uniqueCategories,
  uniqueTopics,
  uniqueTypes,
  uniqueStatuses,
  totalCount,
  filteredCount,
}: {
  filters: TimelineFilters
  onFiltersChange: (filters: TimelineFilters) => void
  uniqueRegions: string[]
  uniqueCategories: string[]
  uniqueTopics: { value: string; label: string }[]
  uniqueTypes: { value: string; label: string }[]
  uniqueStatuses: { value: string; label: string }[]
  totalCount: number
  filteredCount: number
}) {
  const activeCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0)

  const toggleFilter = (key: keyof TimelineFilters, value: string) => {
    const current = filters[key]
    onFiltersChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    })
  }

  return (
    <div className="hidden md:block">
      <div className="flex flex-wrap items-center gap-2">
        <CompactMultiSelect
          label="Type"
          allLabel="All types"
          options={uniqueTypes}
          selected={filters.types}
          onToggle={(value) => toggleFilter('types', value)}
          onClear={() => onFiltersChange({ ...filters, types: [] })}
          getDefinition={getRegulationTypeDefinition}
        />
        <CompactMultiSelect
          label="Theme"
          allLabel="All themes"
          options={uniqueCategories.map((category) => ({ value: category, label: category }))}
          selected={filters.categories}
          onToggle={(value) => toggleFilter('categories', value)}
          onClear={() => onFiltersChange({ ...filters, categories: [] })}
        />
        <CompactMultiSelect
          label="Topic"
          allLabel="All topics"
          options={uniqueTopics}
          selected={filters.topics}
          onToggle={(value) => toggleFilter('topics', value)}
          onClear={() => onFiltersChange({ ...filters, topics: [] })}
          getDefinition={getTopicDefinition}
        />
        <CompactMultiSelect
          label="Region"
          allLabel="All regions"
          options={uniqueRegions.map((region) => ({ value: region, label: formatGeographyOptionLabel(region) }))}
          selected={filters.regions}
          onToggle={(value) => toggleFilter('regions', value)}
          onClear={() => onFiltersChange({ ...filters, regions: [] })}
        />
        <CompactMultiSelect
          label="Status"
          allLabel="All statuses"
          options={uniqueStatuses}
          selected={filters.statuses}
          onToggle={(value) => toggleFilter('statuses', value)}
          onClear={() => onFiltersChange({ ...filters, statuses: [] })}
          getDefinition={getStatusDefinition}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {activeCount > 0 && (
          <>
          {filters.types.map((type) => (
            <ActiveFilterChip
              key={`type-${type}`}
              label={formatRegulationTypeLabel(type)}
              onRemove={() => toggleFilter('types', type)}
            />
          ))}
          {filters.categories.map((category) => (
            <ActiveFilterChip
              key={`category-${category}`}
              label={formatCategoryLabel(category)}
              onRemove={() => toggleFilter('categories', category)}
            />
          ))}
          {filters.topics.map((topic) => (
            <ActiveFilterChip
              key={`topic-${topic}`}
              label={formatTopicLabel(topic)}
              onRemove={() => toggleFilter('topics', topic)}
            />
          ))}
          {filters.regions.map((region) => (
            <ActiveFilterChip
              key={`region-${region}`}
              label={formatGeographyOptionLabel(region)}
              onRemove={() => toggleFilter('regions', region)}
            />
          ))}
          {filters.statuses.map((status) => (
            <ActiveFilterChip
              key={`status-${status}`}
              label={formatStatusLabel(status)}
              onRemove={() => toggleFilter('statuses', status)}
            />
          ))}
          </>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs">
          <p className="text-[hsl(var(--muted-foreground))]">
            Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filteredCount}</span> of{' '}
            <span className="font-semibold text-[hsl(var(--foreground))]">{totalCount}</span>
          </p>
          {activeCount > 0 && (
            <button
              onClick={() => onFiltersChange(EMPTY_FILTERS)}
              className="font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MobileFiltersDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  uniqueRegions,
  uniqueCategories,
  uniqueTopics,
  uniqueTypes,
  uniqueStatuses,
}: {
  open: boolean
  onClose: () => void
  filters: TimelineFilters
  onFiltersChange: (filters: TimelineFilters) => void
  uniqueRegions: string[]
  uniqueCategories: string[]
  uniqueTopics: { value: string; label: string }[]
  uniqueTypes: { value: string; label: string }[]
  uniqueStatuses: { value: string; label: string }[]
}) {
  if (!open) return null

  const toggleFilter = (key: keyof TimelineFilters, value: string) => {
    const current = filters[key]
    onFiltersChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    })
  }

  const activeCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-[hsl(var(--border))] bg-white px-5 pb-8 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Filters</h3>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button onClick={() => onFiltersChange(EMPTY_FILTERS)} className="text-xs font-medium text-[hsl(var(--primary))]">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="text-[hsl(var(--muted-foreground))]">
              <X size={18} />
            </button>
          </div>
        </div>

        <FilterOptionList
          label="Type"
          options={uniqueTypes}
          selected={filters.types}
          onToggle={(value) => toggleFilter('types', value)}
          getDefinition={getRegulationTypeDefinition}
        />
        <FilterOptionList
          label="Theme"
          options={uniqueCategories.map((category) => ({ value: category, label: category }))}
          selected={filters.categories}
          onToggle={(value) => toggleFilter('categories', value)}
        />
        <FilterOptionList
          label="Topic"
          options={uniqueTopics}
          selected={filters.topics}
          onToggle={(value) => toggleFilter('topics', value)}
          getDefinition={getTopicDefinition}
        />
        <FilterOptionList
          label="Region"
          options={uniqueRegions.map((region) => ({ value: region, label: formatGeographyOptionLabel(region) }))}
          selected={filters.regions}
          onToggle={(value) => toggleFilter('regions', value)}
        />
        <FilterOptionList
          label="Status"
          options={uniqueStatuses}
          selected={filters.statuses}
          onToggle={(value) => toggleFilter('statuses', value)}
          getDefinition={getStatusDefinition}
        />

        <button onClick={onClose} className="ui-button-primary mt-2 w-full">
          Apply Filters
        </button>
      </div>
    </div>
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

  const navigate = useNavigate()
  const [a, b] = regulations
  const compareRows = [
    { label: 'Title', a: a.title, b: b.title },
    { label: 'Region', a: a.region, b: b.region },
    {
      label: 'Theme',
      a: formatCategoryLabel(a.category),
      b: formatCategoryLabel(b.category),
    },
    {
      label: 'Topics',
      a: a.topics?.map((topic) => formatTopicLabel(topic)).join(', ') || 'None set',
      b: b.topics?.map((topic) => formatTopicLabel(topic)).join(', ') || 'None set',
    },
    { label: 'Status', a: formatStatusLabel(a.status), b: formatStatusLabel(b.status) },
    {
      label: 'Effective date',
      a: formatDateWithPrecision(a.effective_date, a.date_precision),
      b: formatDateWithPrecision(b.effective_date, b.date_precision),
    },
    {
      label: 'Summary',
      a: getRegulationSummary(a),
      b: getRegulationSummary(b),
    },
    { label: 'Source', a: getSourceLabel(a), b: getSourceLabel(b) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8">
      <div className="surface-card w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Side-by-Side Comparison</h2>
            <button
              onClick={() => {
                onClose()
                navigate(
                  `/advisor?compareIdA=${encodeURIComponent(a.id)}&compareIdB=${encodeURIComponent(b.id)}&compareTitleA=${encodeURIComponent(a.title)}&compareTitleB=${encodeURIComponent(b.title)}`
                )
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--primary))/0.35] hover:bg-[hsl(var(--primary))/0.05]"
            >
              View in AI Advisor
              <Sparkles size={12} />
            </button>
          </div>
          <button onClick={onClose} className="ui-button-ghost !p-2">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-[140px_1fr_1fr] border-b border-[hsl(var(--border))] md:grid-cols-[160px_1fr_1fr]">
          <div className="p-3" />
          {[a, b].map((regulation) => (
            <div key={regulation.id} className="bg-[hsl(var(--muted))/0.45] p-3">
              <p className="mb-1 text-sm font-semibold leading-snug text-[hsl(var(--foreground))]">
                {regulation.title}
              </p>
              <button
                onClick={() => {
                  onClose()
                  navigate(`/advisor?regulationId=${regulation.id}&title=${encodeURIComponent(regulation.title)}`)
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80"
              >
                View in AI Advisor
                <Sparkles size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <tbody>
              {compareRows.map((row) => {
                const differs = compareText(row.a, row.b) !== 'Aligned'

                return (
                  <tr key={row.label} className="border-b border-[hsl(var(--border))] last:border-0">
                    <td className="w-[140px] bg-[hsl(var(--muted))/0.28] p-3 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] md:w-[160px]">
                      {row.label}
                    </td>
                    <td
                      className={`p-3 align-top text-sm text-[hsl(var(--foreground))] ${
                        differs ? 'bg-amber-50/80' : ''
                      } ${row.label === 'Summary' ? 'leading-6' : ''}`}
                    >
                      {row.a || <span className="italic text-[hsl(var(--muted-foreground))/0.6]">—</span>}
                    </td>
                    <td
                      className={`p-3 align-top text-sm text-[hsl(var(--foreground))] ${
                        differs ? 'bg-amber-50/80' : ''
                      } ${row.label === 'Summary' ? 'leading-6' : ''}`}
                    >
                      {row.b || <span className="italic text-[hsl(var(--muted-foreground))/0.6]">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-[hsl(var(--border))] p-4">
          <button onClick={onClose} className="ui-button-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TimelineList({
  regulations,
  watchlist,
  canUseBookmarks,
  onToggleWatch,
  compareSelected,
  onToggleCompare,
  compareDisabled,
  onAskAdvisor,
}: {
  regulations: Regulation[]
  watchlist: string[]
  canUseBookmarks: boolean
  onToggleWatch: (id: string) => void
  compareSelected: Regulation[]
  onToggleCompare: (regulation: Regulation) => void
  compareDisabled: boolean
  onAskAdvisor: (regulation: Regulation) => void
}) {
  const grouped = regulations.reduce<Record<string, Regulation[]>>((acc, regulation) => {
    const month = getMonthKey(regulation)
    acc[month] ||= []
    acc[month].push(regulation)
    return acc
  }, {})

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
              const selected = compareSelected.find((item) => item.id === regulation.id)
              return (
                <div key={regulation.id} className="group relative flex gap-4">
                  <div className="relative z-10 mt-2">
                    <div className="flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-[hsl(var(--border))] bg-white transition-colors group-hover:border-[hsl(var(--primary))]">
                      <div className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))/0.3] transition-colors group-hover:bg-[hsl(var(--primary))]" />
                    </div>
                  </div>

                  <div className={`surface-card flex-1 p-4 transition-all group-hover:border-[hsl(var(--primary))/0.2] group-hover:shadow-sm ${selected ? 'ring-2 ring-[hsl(var(--primary))]' : ''}`}>
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
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
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

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onToggleCompare(regulation)}
                          disabled={compareDisabled && !selected}
                          title="Compare"
                          className={`rounded-lg p-1.5 transition-colors ${
                            selected
                              ? 'text-[hsl(var(--primary))]'
                              : 'text-[hsl(var(--muted-foreground))/0.45] hover:text-[hsl(var(--primary))/0.7]'
                          } disabled:opacity-30`}
                        >
                          {selected ? <Check size={16} /> : <Scale size={16} />}
                        </button>

                        <BookmarkHint showHint={!canUseBookmarks}>
                          <button
                            onClick={() => onToggleWatch(regulation.id)}
                            className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-amber-500"
                          >
                            <Star size={15} className={watchlist.includes(regulation.id) ? 'fill-amber-500 text-amber-500' : ''} />
                          </button>
                        </BookmarkHint>
                      </div>
                    </div>

                    <h4 className="mb-0.5 text-sm font-semibold text-[hsl(var(--foreground))]">
                      {regulation.title}
                    </h4>

                    <div className="mb-1 flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium">{getSourceLabel(regulation)}</span>
                      {regulation.official_source_url && (
                        <a
                          href={regulation.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-[hsl(var(--primary))]"
                        >
                          <Plus size={12} className="rotate-45" />
                        </a>
                      )}
                    </div>

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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => downloadRegulationPdf(regulation)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                        >
                          <Download size={12} />
                          PDF
                        </button>
                        <button
                          onClick={() => onAskAdvisor(regulation)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
                        >
                          Ask AI
                          <Sparkles size={12} />
                        </button>
                      </div>

                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TimelinePage({ user }: TimelinePageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TimelineFilters>(EMPTY_FILTERS)
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [selectedToCompare, setSelectedToCompare] = useState<Regulation[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRegulations()
    if (user) fetchWatchlist()
  }, [user])

  const fetchRegulations = async () => {
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

  const fetchWatchlist = async () => {
    try {
      setWatchlist(await getUserWatchlist(user.id))
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  }

  const uniqueRegions = useMemo(
    () => [...new Set(regulations.map((regulation) => regulation.region).filter(Boolean))].sort(),
    [regulations]
  )

  const uniqueCategories = useMemo(
    () =>
      [...new Set(regulations.map((regulation) => normalizeCategoryKey(regulation.category)).filter(Boolean))].sort(),
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

      return matchesSearch && matchesType && matchesCategory && matchesTopic && matchesStatus && matchesRegion && matchesWatchlist
    })
  }, [filters, regulations, searchQuery, showWatchlistOnly, watchlist])

  const activeFilterCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0)
  const hasSearchOrFilters = Boolean(searchQuery) || activeFilterCount > 0

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

  const askAdvisor = (regulation: Regulation) => {
    navigate(`/advisor?regulationId=${regulation.id}&title=${encodeURIComponent(regulation.title)}`)
  }

  const selectSuggestion = (regulation: Regulation) => {
    setSearchQuery(regulation.title)
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading regulation history...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-narrow md:max-w-4xl">
      <div className="mb-4">
        <SearchSuggestions
          regulations={regulations}
          value={searchQuery}
          onChange={setSearchQuery}
          onSelectSuggestion={selectSuggestion}
        />
      </div>

      <div className="mb-4 hidden md:block">
        <DesktopFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          uniqueRegions={uniqueRegions}
          uniqueCategories={uniqueCategories}
          uniqueTopics={uniqueTopics}
          uniqueTypes={uniqueTypes}
          uniqueStatuses={uniqueStatuses}
          totalCount={regulations.length}
          filteredCount={filtered.length}
        />
      </div>

      <div className="mb-4 space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWatchlistOnly((value) => !value)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              showWatchlistOnly
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Star size={14} className={showWatchlistOnly ? 'fill-current' : ''} />
            Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
          </button>

          <button
            onClick={() => setShowMobileFilters(true)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilterCount > 0
                ? 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]'
                : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>
      </div>

      <div className="mb-4 hidden items-center gap-2 md:flex">
        <button
          onClick={() => setShowWatchlistOnly((value) => !value)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            showWatchlistOnly
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.4] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Star size={14} className={showWatchlistOnly ? 'fill-current' : ''} />
          Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
          {filters.types.map((type) => (
            <ActiveFilterChip
              key={`mobile-type-${type}`}
              label={formatRegulationTypeLabel(type)}
              onRemove={() =>
                setFilters((current) => ({
                  ...current,
                  types: current.types.filter((item) => item !== type),
                }))
              }
            />
          ))}
          {filters.categories.map((category) => (
            <ActiveFilterChip
              key={`mobile-category-${category}`}
              label={formatCategoryLabel(category)}
              onRemove={() =>
                setFilters((current) => ({
                  ...current,
                  categories: current.categories.filter((item) => item !== category),
                }))
              }
            />
          ))}
          {filters.topics.map((topic) => (
            <ActiveFilterChip
              key={`mobile-topic-${topic}`}
              label={formatTopicLabel(topic)}
              onRemove={() =>
                setFilters((current) => ({
                  ...current,
                  topics: current.topics.filter((item) => item !== topic),
                }))
              }
            />
          ))}
          {filters.regions.map((region) => (
              <ActiveFilterChip
                key={`mobile-region-${region}`}
                label={formatGeographyOptionLabel(region)}
                onRemove={() =>
                  setFilters((current) => ({
                    ...current,
                  regions: current.regions.filter((item) => item !== region),
                }))
              }
            />
          ))}
          {filters.statuses.map((status) => (
            <ActiveFilterChip
              key={`mobile-status-${status}`}
              label={formatStatusLabel(status)}
              onRemove={() =>
                setFilters((current) => ({
                  ...current,
                  statuses: current.statuses.filter((item) => item !== status),
                }))
              }
            />
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 text-xs md:hidden">
        <p className="text-[hsl(var(--muted-foreground))]">
          Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length}</span> of{' '}
          <span className="font-semibold text-[hsl(var(--foreground))]">{regulations.length}</span>
        </p>
        {hasSearchOrFilters && (
          <button
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              setSearchQuery('')
            }}
            className="font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
          >
            Clear all
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <TimelineList
          regulations={filtered}
          watchlist={watchlist}
          canUseBookmarks={Boolean(user)}
          onToggleWatch={toggleWatch}
          compareSelected={selectedToCompare}
          onToggleCompare={toggleCompare}
          compareDisabled={selectedToCompare.length >= 2}
          onAskAdvisor={askAdvisor}
        />
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No regulations match your filters</p>
          {hasSearchOrFilters && (
            <button
              onClick={() => {
                setFilters(EMPTY_FILTERS)
                setSearchQuery('')
              }}
              className="mt-2 text-xs font-medium text-[hsl(var(--primary))]"
            >
              Clear all filters
            </button>
          )}
        </div>
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
        <MobileFiltersDrawer
          open={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          filters={filters}
          onFiltersChange={setFilters}
          uniqueRegions={uniqueRegions}
          uniqueCategories={uniqueCategories}
          uniqueTopics={uniqueTopics}
          uniqueTypes={uniqueTypes}
          uniqueStatuses={uniqueStatuses}
        />
    </div>
  )
}
