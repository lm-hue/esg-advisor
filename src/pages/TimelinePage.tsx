import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { supabase } from '../lib/supabase'
import { ESG_CATEGORIES, Regulation } from '../types'
import { CATEGORY_BADGES, STATUS_BADGES, formatStatusLabel } from '../lib/appTheme'

interface TimelinePageProps {
  user: any
}

interface TimelineFilters {
  categories: string[]
  statuses: string[]
  regions: string[]
}

const EMPTY_FILTERS: TimelineFilters = {
  categories: [],
  statuses: [],
  regions: [],
}

const STATUS_OPTIONS = ['in_force', 'draft', 'adopted', 'amended', 'repealed']

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
          <div>Region: ${regulation.region}</div>
          <div>Status: ${formatStatusLabel(regulation.status)}</div>
          <div>Effective: ${regulation.effective_date ? format(new Date(regulation.effective_date), 'MMMM d, yyyy') : 'Unknown'}</div>
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
          placeholder="Search by title, description, region, category..."
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
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[regulation.category] || 'bg-slate-100 text-slate-600'}`}>
                    {regulation.category}
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
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="space-y-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value)
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.55] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  active
                    ? 'border-[hsl(var(--primary))/0.22] bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] bg-white text-transparent'
                }`}
              >
                <Check size={11} />
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
          <div className="max-h-72 overflow-y-auto p-2">
            <FilterOptionList
              label={label}
              options={options}
              selected={selected}
              onToggle={onToggle}
            />
          </div>
          {selected.length > 0 && (
            <div className="border-t border-[hsl(var(--border))] px-3 py-2">
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
  totalCount,
  filteredCount,
}: {
  filters: TimelineFilters
  onFiltersChange: (filters: TimelineFilters) => void
  uniqueRegions: string[]
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
          label="Category"
          allLabel="All categories"
          options={ESG_CATEGORIES.map((category) => ({ value: category, label: category }))}
          selected={filters.categories}
          onToggle={(value) => toggleFilter('categories', value)}
          onClear={() => onFiltersChange({ ...filters, categories: [] })}
        />
        <CompactMultiSelect
          label="Region"
          allLabel="All regions"
          options={uniqueRegions.map((region) => ({ value: region, label: region }))}
          selected={filters.regions}
          onToggle={(value) => toggleFilter('regions', value)}
          onClear={() => onFiltersChange({ ...filters, regions: [] })}
        />
        <CompactMultiSelect
          label="Status"
          allLabel="All statuses"
          options={STATUS_OPTIONS.map((status) => ({ value: status, label: formatStatusLabel(status) }))}
          selected={filters.statuses}
          onToggle={(value) => toggleFilter('statuses', value)}
          onClear={() => onFiltersChange({ ...filters, statuses: [] })}
        />

        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filteredCount}</span> of{' '}
            <span className="font-semibold text-[hsl(var(--foreground))]">{totalCount}</span>
          </p>
          {activeCount > 0 && (
            <button
              onClick={() => onFiltersChange(EMPTY_FILTERS)}
              className="text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--primary))/0.8]"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {filters.categories.map((category) => (
            <ActiveFilterChip
              key={`category-${category}`}
              label={category}
              onRemove={() => toggleFilter('categories', category)}
            />
          ))}
          {filters.regions.map((region) => (
            <ActiveFilterChip
              key={`region-${region}`}
              label={region}
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
        </div>
      )}
    </div>
  )
}

function MobileFiltersDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  uniqueRegions,
}: {
  open: boolean
  onClose: () => void
  filters: TimelineFilters
  onFiltersChange: (filters: TimelineFilters) => void
  uniqueRegions: string[]
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
          label="Category"
          options={ESG_CATEGORIES.map((category) => ({ value: category, label: category }))}
          selected={filters.categories}
          onToggle={(value) => toggleFilter('categories', value)}
        />
        <FilterOptionList
          label="Region"
          options={uniqueRegions.map((region) => ({ value: region, label: region }))}
          selected={filters.regions}
          onToggle={(value) => toggleFilter('regions', value)}
        />
        <FilterOptionList
          label="Status"
          options={STATUS_OPTIONS.map((status) => ({ value: status, label: formatStatusLabel(status) }))}
          selected={filters.statuses}
          onToggle={(value) => toggleFilter('statuses', value)}
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

  const [a, b] = regulations

  const rows = [
    { label: 'Category', a: a.category, b: b.category },
    { label: 'Region', a: a.region, b: b.region },
    { label: 'Status', a: formatStatusLabel(a.status), b: formatStatusLabel(b.status) },
    {
      label: 'Effective Date',
      a: a.effective_date ? format(new Date(a.effective_date), 'MMM d, yyyy') : 'Unknown',
      b: b.effective_date ? format(new Date(b.effective_date), 'MMM d, yyyy') : 'Unknown',
    },
    { label: 'Source', a: getSourceLabel(a), b: getSourceLabel(b) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card w-full max-w-5xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">Compare Regulations</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Side-by-side comparison of the selected regulations.</p>
          </div>
          <button onClick={onClose} className="ui-button-ghost !p-2">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {[a, b].map((regulation) => (
            <div key={regulation.id} className="surface-card-muted p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[regulation.category] || 'bg-slate-100 text-slate-600'}`}>
                  {regulation.category}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
                  {formatStatusLabel(regulation.status)}
                </span>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-[hsl(var(--foreground))]">{regulation.title}</h4>
              <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">{getRegulationSummary(regulation)}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))]">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              <div className="border-r border-[hsl(var(--border))] px-4 py-3">Dimension</div>
              <div className="border-r border-[hsl(var(--border))] px-4 py-3">{a.title}</div>
              <div className="border-r border-[hsl(var(--border))] px-4 py-3">{b.title}</div>
              <div className="px-4 py-3 text-center">Status</div>
            </div>

            {rows.map((row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_1fr_1fr_auto] text-sm ${index > 0 ? 'border-t border-[hsl(var(--border))]' : ''}`}
              >
                <div className="border-r border-[hsl(var(--border))] px-4 py-3 font-medium text-[hsl(var(--foreground))]">{row.label}</div>
                <div className="border-r border-[hsl(var(--border))] px-4 py-3 text-[hsl(var(--foreground))]">{row.a}</div>
                <div className="border-r border-[hsl(var(--border))] px-4 py-3 text-[hsl(var(--foreground))]">{row.b}</div>
                <div className="flex items-center justify-center px-4 py-3 text-xs font-semibold text-[hsl(var(--primary))]">
                  {compareText(row.a, row.b)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineList({
  regulations,
  watchlist,
  onToggleWatch,
  compareSelected,
  onToggleCompare,
  compareDisabled,
  onAskAdvisor,
}: {
  regulations: Regulation[]
  watchlist: string[]
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGES[regulation.category] || 'bg-slate-100 text-slate-600'}`}>
                          {regulation.category}
                        </span>
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                          {regulation.region}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}>
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

                        <button
                          onClick={() => onToggleWatch(regulation.id)}
                          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-amber-500"
                          title="Watch"
                        >
                          <Star size={15} className={watchlist.includes(regulation.id) ? 'fill-amber-500 text-amber-500' : ''} />
                        </button>
                      </div>
                    </div>

                    <h4 className="mb-0.5 text-sm font-semibold text-[hsl(var(--foreground))]">
                      {regulation.title}
                    </h4>

                    <div className="mb-1 flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium">{getSourceLabel(regulation)}</span>
                      {regulation.source_url && (
                        <a
                          href={regulation.source_url}
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
                        {getRegulationDate(regulation)
                          ? format(new Date(getRegulationDate(regulation)), 'MMM d, yyyy')
                          : 'Unknown'}
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
      const { data } = await supabase.from('regulations').select('*').order('effective_date', { ascending: false })
      const sorted = [...(data || [])].sort(
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
      const { data } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()
      setWatchlist(data?.watched_regulation_ids || [])
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  }

  const uniqueRegions = useMemo(
    () => [...new Set(regulations.map((regulation) => regulation.region).filter(Boolean))].sort(),
    [regulations]
  )

  const filtered = useMemo(() => {
    return regulations.filter((regulation) => {
      const matchesSearch = searchMatches(regulation, searchQuery)
      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(regulation.category)
      const matchesStatus =
        filters.statuses.length === 0 || filters.statuses.includes(regulation.status)
      const matchesRegion =
        filters.regions.length === 0 || filters.regions.includes(regulation.region)
      const matchesWatchlist = !showWatchlistOnly || watchlist.includes(regulation.id)

      return matchesSearch && matchesCategory && matchesStatus && matchesRegion && matchesWatchlist
    })
  }, [filters, regulations, searchQuery, showWatchlistOnly, watchlist])

  const activeFilterCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0)
  const hasSearchOrFilters = Boolean(searchQuery) || activeFilterCount > 0

  const toggleWatch = async (id: string) => {
    if (!user) {
      navigate('/auth')
      return
    }

    const nextWatchlist = watchlist.includes(id)
      ? watchlist.filter((item) => item !== id)
      : [...watchlist, id]

    setWatchlist(nextWatchlist)

    try {
      await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: nextWatchlist })
        .eq('user_id', user.id)
    } catch (error) {
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

          {hasSearchOrFilters && (
            <button
              onClick={() => {
                setFilters(EMPTY_FILTERS)
                setSearchQuery('')
              }}
              className="ml-auto text-xs font-medium text-[hsl(var(--primary))]"
            >
              Clear all
            </button>
          )}
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Showing <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length}</span> of{' '}
          <span className="font-semibold text-[hsl(var(--foreground))]">{regulations.length}</span> regulations
        </p>
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
          {filters.categories.map((category) => (
            <ActiveFilterChip
              key={`mobile-category-${category}`}
              label={category}
              onRemove={() =>
                setFilters((current) => ({
                  ...current,
                  categories: current.categories.filter((item) => item !== category),
                }))
              }
            />
          ))}
          {filters.regions.map((region) => (
            <ActiveFilterChip
              key={`mobile-region-${region}`}
              label={region}
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

      {filtered.length > 0 ? (
        <TimelineList
          regulations={filtered}
          watchlist={watchlist}
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
      />
    </div>
  )
}
