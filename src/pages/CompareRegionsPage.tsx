import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, ArrowUpRight, BarChart3, ChevronDown, Globe2, Scale, Sparkles, X } from 'lucide-react'
import { fetchAllRegulations, fetchRegulationById } from '../lib/regulations'
import { Regulation } from '../types'
import { CATEGORY_BADGES, CATEGORY_DOTS, STATUS_BADGES, TOPIC_BADGES, formatCategoryLabel, formatDateWithPrecision, formatRegulationTypeLabel, formatStatusLabel, formatTopicLabel, getRegulationTypeKey, isRegulationCurrentlyEffective, normalizeCategoryKey } from '../lib/appTheme'
import { REGION_EMOJIS, formatGeographyOptionLabel, getGeographyOption } from '../lib/geography'

function getRegulationDate(regulation: Regulation) {
  return regulation.effective_date || regulation.updated_at || regulation.created_at
}

function getSourceActionLabel(kind?: Regulation['source_link_kind'] | null) {
  switch (kind) {
    case 'official':
      return 'View Official Source'
    case 'archived_pdf':
      return 'Open Archived PDF'
    case 'reference_pdf':
      return 'Open Source PDF'
    case 'reference_page':
      return 'Open Source Page'
    default:
      return 'Open Source'
  }
}

function getThemeCounts(regulations: Regulation[]) {
  return regulations.reduce<Record<string, number>>((acc, regulation) => {
    const key = normalizeCategoryKey(regulation.category) || 'Other'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function getPreviewInsights(regionA: string, regionB: string, regsA: Regulation[], regsB: Regulation[]) {
  if (!regionA || !regionB) return []

  const inForceA = regsA.filter((regulation) => isRegulationCurrentlyEffective(regulation.status)).length
  const inForceB = regsB.filter((regulation) => isRegulationCurrentlyEffective(regulation.status)).length
  const themesA = getThemeCounts(regsA)
  const themesB = getThemeCounts(regsB)
  const overlap = Object.keys(themesA).filter((theme) => themesB[theme])
  const leadingThemeA = Object.entries(themesA).sort((a, b) => b[1] - a[1])[0]?.[0]
  const leadingThemeB = Object.entries(themesB).sort((a, b) => b[1] - a[1])[0]?.[0]

  return [
    regsA.length === regsB.length
      ? `${regionA} and ${regionB} currently track the same number of regulations in this workspace.`
      : `${regsA.length > regsB.length ? regionA : regionB} currently has the broader tracked regulatory footprint in this workspace.`,
    inForceA === inForceB
      ? `${regionA} and ${regionB} show the same number of regulations already in force.`
      : `${inForceA > inForceB ? regionA : regionB} currently has more regulations already in force.`,
    overlap.length > 0
      ? `The strongest shared themes are ${overlap.slice(0, 3).map((theme) => theme.toLowerCase()).join(', ')}.`
      : `${regionA} and ${regionB} currently show little category overlap in the tracked dataset.`,
    leadingThemeA && leadingThemeB && leadingThemeA !== leadingThemeB
      ? `${regionA} leans more toward ${leadingThemeA.toLowerCase()}, while ${regionB} leans more toward ${leadingThemeB.toLowerCase()}.`
      : '',
  ].filter(Boolean)
}

function ComparisonBar({
  value,
  maxValue,
  tone,
}: {
  value: number
  maxValue: number
  tone: string
}) {
  const width = maxValue > 0 ? `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%` : '0%'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-end text-[11px]">
        <span className="font-semibold text-[hsl(var(--foreground))]">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  )
}

export default function CompareRegionsPage() {
  const navigate = useNavigate()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [regionA, setRegionA] = useState('')
  const [regionB, setRegionB] = useState('')
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [drawerRegulation, setDrawerRegulation] = useState<Regulation | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const openDrawer = async (id: string) => {
    setDrawerLoading(true)
    setDrawerRegulation(null)
    const data = await fetchRegulationById(id)
    setDrawerRegulation(data)
    setDrawerLoading(false)
  }

  const closeDrawer = () => {
    setDrawerRegulation(null)
    setDrawerLoading(false)
  }

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

  const uniqueRegions = useMemo(
    () => [...new Set(regulations.map((regulation) => regulation.region).filter(Boolean))].sort(),
    [regulations]
  )

  useEffect(() => {
    if (uniqueRegions.length === 0) return

    const preferredA = uniqueRegions.includes('EU') ? 'EU' : uniqueRegions[0]
    const preferredB = uniqueRegions.includes('USA')
      ? 'USA'
      : uniqueRegions.find((region) => region !== preferredA) || uniqueRegions[1] || ''

    setRegionA((current) => current || preferredA)
    setRegionB((current) => current || preferredB)
  }, [uniqueRegions])

  const regulationsA = useMemo(
    () => regulations.filter((regulation) => regulation.region === regionA),
    [regulations, regionA]
  )

  const regulationsB = useMemo(
    () => regulations.filter((regulation) => regulation.region === regionB),
    [regulations, regionB]
  )

  const themeCountsA = useMemo(() => getThemeCounts(regulationsA), [regulationsA])
  const themeCountsB = useMemo(() => getThemeCounts(regulationsB), [regulationsB])

  const overlappingThemes = useMemo(
    () =>
      Object.keys(themeCountsA)
        .filter((theme) => themeCountsB[theme])
        .sort((a, b) => themeCountsA[b] + themeCountsB[b] - (themeCountsA[a] + themeCountsB[a])),
    [themeCountsA, themeCountsB]
  )

  const uniqueThemesA = useMemo(
    () => Object.keys(themeCountsA).filter((theme) => !themeCountsB[theme]),
    [themeCountsA, themeCountsB]
  )

  const uniqueThemesB = useMemo(
    () => Object.keys(themeCountsB).filter((theme) => !themeCountsA[theme]),
    [themeCountsA, themeCountsB]
  )

  const topThemes = useMemo(() => {
    const merged = new Set([...Object.keys(themeCountsA), ...Object.keys(themeCountsB)])
    return [...merged]
      .sort((a, b) => (themeCountsA[b] || 0) + (themeCountsB[b] || 0) - ((themeCountsA[a] || 0) + (themeCountsB[a] || 0)))
      .slice(0, 5)
  }, [themeCountsA, themeCountsB])

  const maxThemeValue = Math.max(
    ...topThemes.map((theme) => themeCountsA[theme] || 0),
    ...topThemes.map((theme) => themeCountsB[theme] || 0),
    1
  )

  const previewInsights = useMemo(
    () => getPreviewInsights(regionA, regionB, regulationsA, regulationsB),
    [regionA, regionB, regulationsA, regulationsB]
  )

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading comparison workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="surface-card overflow-hidden">
        <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(120deg,rgba(15,123,92,0.08)_0%,rgba(247,209,106,0.08)_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                <Scale size={12} />
                Compare Regions
              </div>
              <h2 className="font-display text-3xl font-semibold text-[hsl(var(--foreground))]">
                Compare two regulatory landscapes before asking AI to interpret them.
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
              <select value={regionA} onChange={(event) => setRegionA(event.target.value)} className="ui-input min-w-[160px]">
                <option value="">Region A</option>
                {uniqueRegions.map((region) => (
                  <option key={`compare-a-${region}`} value={region}>
                    {formatGeographyOptionLabel(region)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setRegionA(regionB)
                  setRegionB(regionA)
                }}
                className="ui-button-ghost !px-3"
                aria-label="Swap regions"
              >
                <ArrowRightLeft size={16} />
              </button>

              <select value={regionB} onChange={(event) => setRegionB(event.target.value)} className="ui-input min-w-[160px]">
                <option value="">Region B</option>
                {uniqueRegions.map((region) => (
                  <option key={`compare-b-${region}`} value={region}>
                    {formatGeographyOptionLabel(region)}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  navigate(
                    `/advisor?regionCompareA=${encodeURIComponent(regionA)}&regionCompareB=${encodeURIComponent(regionB)}`
                  )
                }
                disabled={!regionA || !regionB || regionA === regionB}
                className="ui-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={16} />
                AI analysis
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={() => setHowItWorksOpen((prev) => !prev)}
            className="flex w-full items-center justify-between bg-[hsl(var(--primary)/0.06)] px-5 py-3 text-left md:px-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              How comparison between regions works
            </span>
            <ChevronDown
              size={14}
              className={`text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${howItWorksOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {howItWorksOpen && (
            <div className="grid gap-4 px-5 pb-5 md:grid-cols-3 md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">What You Can Compare</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))/0.82]">
                  Regulation volume, in-force mix, dominant ESG themes, and representative examples from each region.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">What AI Will Explain</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))/0.82]">
                  Overlap, differences, relative maturity, stricter areas, and practical implications for companies operating in both markets.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Suggested Follow-Ups</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))/0.82]">
                  Ask where reporting expectations diverge, which region looks more advanced, or what a multinational team should prioritize first.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card self-start p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-[hsl(var(--primary))]" />
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Visual Comparison</h3>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Theme Distribution</h4>
            <div className="mt-4">
              <div className="mb-3 hidden gap-3 border-b border-[hsl(var(--border))/0.7] pb-2 md:grid md:grid-cols-[160px_1fr_1fr] md:items-end">
                <div />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--foreground))]">
                    {getGeographyOption(regionA)?.emoji && <span>{getGeographyOption(regionA)?.emoji}</span>}
                    {regionA || 'Region A'}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{regulationsA.length} total</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--foreground))]">
                    {getGeographyOption(regionB)?.emoji && <span>{getGeographyOption(regionB)?.emoji}</span>}
                    {regionB || 'Region B'}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{regulationsB.length} total</p>
                </div>
              </div>

              <div className="space-y-4">
                {topThemes.map((theme) => (
                  <div key={theme} className="grid gap-3 md:grid-cols-[160px_1fr_1fr] md:items-center">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formatCategoryLabel(theme)}</p>
                    <ComparisonBar value={themeCountsA[theme] || 0} maxValue={maxThemeValue} tone="bg-[hsl(var(--primary))]" />
                    <ComparisonBar value={themeCountsB[theme] || 0} maxValue={maxThemeValue} tone="bg-amber-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card self-start p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 size={16} className="text-[hsl(var(--primary))]" />
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Preview Insights</h3>
          </div>
          <div className="space-y-1">
            {previewInsights.map((insight) => (
              <div key={insight} className="rounded-xl bg-[hsl(var(--background))/0.65] px-3 py-2 text-[13px] leading-5 text-[hsl(var(--foreground))/0.82]">
                {insight}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width Overlap & Differences */}
      <div className="mt-4 surface-card overflow-hidden p-5 md:p-6">
        <h3 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Overlap &amp; Differences</h3>

        {/* Shared themes — full width */}
        <div className="mb-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Shared themes</p>
          <div className="flex flex-wrap gap-1.5">
            {overlappingThemes.length > 0 ? (
              overlappingThemes.slice(0, 6).map((theme) => {
                const label = formatCategoryLabel(theme)
                const badgeClass = CATEGORY_BADGES[label] ?? 'bg-slate-100 text-slate-700'
                const isActive = selectedTheme === theme
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(isActive ? null : theme)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${badgeClass} ${isActive ? 'ring-2 ring-offset-1 ring-[hsl(var(--foreground)/0.3)]' : 'hover:opacity-80'}`}
                  >
                    {label}
                  </button>
                )
              })
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No clear shared theme cluster in the current dataset.</p>
            )}
          </div>
        </div>

        {/* Region-specific themes */}
        {uniqueThemesA.length === 0 && uniqueThemesB.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            There are no distinct themes for {regionA || 'Region A'} only or {regionB || 'Region B'} only.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: regionA || 'Region A', themes: uniqueThemesA },
              { label: regionB || 'Region B', themes: uniqueThemesB },
            ].map(({ label, themes }) => (
              <div key={label} className="rounded-xl border border-[hsl(var(--border))] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                  {label} only
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {themes.length > 0 ? themes.slice(0, 5).map((theme) => {
                    const themeLabel = formatCategoryLabel(theme)
                    const badgeClass = CATEGORY_BADGES[themeLabel] ?? 'bg-slate-100 text-slate-700'
                    const isActive = selectedTheme === theme
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setSelectedTheme(isActive ? null : theme)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${badgeClass} ${isActive ? 'ring-2 ring-offset-1 ring-[hsl(var(--foreground)/0.3)]' : 'hover:opacity-80'}`}
                      >
                        {themeLabel}
                      </button>
                    )
                  }) : (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">No distinct themes surfaced.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active filter pill — bottom left */}
        {selectedTheme && (
          <div className="mt-4 flex">
            <button
              type="button"
              onClick={() => setSelectedTheme(null)}
              className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
            >
              Filtering: {formatCategoryLabel(selectedTheme)} · <span className="font-bold">✕ Clear</span>
            </button>
          </div>
        )}
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {[
          { region: regionA, regulations: regulationsA, accent: 'bg-[hsl(var(--primary))]' },
          { region: regionB, regulations: regulationsB, accent: 'bg-amber-500' },
        ].map((panel) => {
          const geoOption = panel.region ? getGeographyOption(panel.region) : null
          const filtered = selectedTheme
            ? panel.regulations.filter((r) => normalizeCategoryKey(r.category) === selectedTheme)
            : panel.regulations
          return (
            <div key={panel.region || panel.accent} className="surface-card flex flex-col p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    Regulations &amp; Frameworks ·{' '}
                    <span className="normal-case">
                      {filtered.length}{selectedTheme ? ` of ${panel.regulations.length}` : ' total'}
                    </span>
                  </p>
                  <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    {geoOption?.emoji && <span>{geoOption.emoji}</span>}
                    {panel.region || 'Select a region'}
                  </h3>
                </div>
                <span className={`h-2.5 w-10 rounded-full ${panel.accent}`} />
              </div>

              <div className="overflow-y-auto pr-1" style={{ maxHeight: '420px' }}>
                <div className="space-y-3">
                  {filtered.length > 0 ? filtered.map((regulation) => (
                    <button
                      key={regulation.id}
                      type="button"
                      onClick={() => openDrawer(regulation.id)}
                      className="w-full border-b border-[hsl(var(--border))] pb-3 text-left last:border-b-0 last:pb-0 hover:bg-[hsl(var(--muted)/0.4)] -mx-1 px-1 rounded-lg transition-colors"
                    >
                      <p className="text-sm font-semibold leading-6 text-[hsl(var(--foreground))]">{regulation.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <span>{formatCategoryLabel(regulation.category)}</span>
                        <span>&bull;</span>
                        <span>{formatStatusLabel(regulation.status)}</span>
                        <span>&bull;</span>
                        <span>{formatDateWithPrecision(getRegulationDate(regulation), regulation.date_precision)}</span>
                      </div>
                    </button>
                  )) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No regulations match this theme.</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="mt-6 surface-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">AI Analysis</p>
            <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">Send both regions into the AI Advisor for a deeper match and differences analysis.</h3>
            <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              The AI comparison is best for questions like: which region appears stricter, where reporting expectations diverge, which rules are already enforceable, and what a company should prioritize if it operates across both markets.
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                `/advisor?regionCompareA=${encodeURIComponent(regionA)}&regionCompareB=${encodeURIComponent(regionB)}`
              )
            }
            disabled={!regionA || !regionB || regionA === regionB}
            className="ui-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={16} />
            Generate AI-powered comparison
          </button>
        </div>
      </section>

      {/* Regulation detail modal */}
      {(drawerLoading || drawerRegulation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={closeDrawer} />

          {/* Modal */}
          <div className="surface-card relative z-10 flex w-full max-w-2xl flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '85vh' }}>
            {drawerLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
              </div>
            ) : drawerRegulation ? (
              <>
                {/* Close button */}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="absolute right-4 top-4 z-10 rounded-full p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                {/* Scrollable content */}
                <div className="overflow-y-auto p-6 sm:p-8">
                  {/* Badges */}
                  <div className="mb-3 flex flex-wrap gap-1.5 pr-8">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGES[drawerRegulation.status] || 'bg-slate-100 text-slate-600'}`}>
                      {formatStatusLabel(drawerRegulation.status)}
                    </span>
                    <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      {formatRegulationTypeLabel(getRegulationTypeKey(drawerRegulation))}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(drawerRegulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(drawerRegulation.category)] || 'bg-slate-400'}`} />
                      {formatCategoryLabel(drawerRegulation.category)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      {REGION_EMOJIS[drawerRegulation.region] || '🌍'} {drawerRegulation.region}
                    </span>
                    {drawerRegulation.topics?.map((topic) => (
                      <span key={topic} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TOPIC_BADGES[topic] || 'bg-slate-100 text-slate-600'}`}>
                        {formatTopicLabel(topic)}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2 className="font-display text-2xl font-semibold leading-snug text-[hsl(var(--foreground))]">
                    {drawerRegulation.title}
                  </h2>
                  {drawerRegulation.formal_title && (
                    <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium">Official name:</span> {drawerRegulation.formal_title}
                    </p>
                  )}

                  {/* Meta grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Effective Date', value: formatDateWithPrecision(drawerRegulation.effective_date, drawerRegulation.date_precision) },
                      { label: 'Status', value: formatStatusLabel(drawerRegulation.status) },
                      { label: 'Region', value: drawerRegulation.region },
                      { label: 'Source', value: drawerRegulation.source_name || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-[hsl(var(--muted)/0.5)] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-[hsl(var(--foreground))]">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {(drawerRegulation.full_description || drawerRegulation.description) && (
                    <div className="mt-6">
                      <h3 className="mb-2 text-sm font-semibold text-[hsl(var(--foreground))]">Overview</h3>
                      <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                        {drawerRegulation.full_description || drawerRegulation.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {drawerRegulation.tags && drawerRegulation.tags.length > 0 && (
                    <div className="mt-5">
                      <h3 className="mb-2 text-sm font-semibold text-[hsl(var(--foreground))]">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {drawerRegulation.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-[hsl(var(--border))] pt-5">
                    {drawerRegulation.official_source_url && (
                      <a
                        href={drawerRegulation.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ui-button-ghost"
                      >
                        <ArrowUpRight size={14} />
                        {getSourceActionLabel(drawerRegulation.source_link_kind)}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/regulations/${drawerRegulation.id}`)}
                      className="ui-button-primary"
                    >
                      Open Full Detail Page
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
