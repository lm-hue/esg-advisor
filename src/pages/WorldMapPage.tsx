import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { openExternalInNewTabOnly } from '../lib/openExternal'
import { fetchAllRegulations } from '../lib/regulations'
import { getRegulationSourceLinks } from '../lib/regulationSourceLinks'
import { Regulation } from '../types'
import { formatCategoryLabel, formatDateWithPrecision, formatStatusLabel, isRegulationCurrentlyEffective } from '../lib/appTheme'
import { REGION_COUNTRY_IDS, REGION_EMOJIS } from '../lib/geography'

type RegionTone = 'red' | 'amber' | 'grey'

interface RegionStats {
  region: string
  color: RegionTone
  regs: Regulation[]
}

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const LEGEND = [
  { color: '#16a34a', label: 'Mandatory / In force' },
  { color: '#d97706', label: 'Proposed / Draft' },
  { color: '#d1d5db', label: 'No mapped data' },
]

function getRegionTone(regulations: Regulation[]): RegionTone {
  if (regulations.some((regulation) => isRegulationCurrentlyEffective(regulation.status))) {
    return 'red'
  }

  if (regulations.length > 0) {
    return 'amber'
  }

  return 'grey'
}

function toneClass(color: RegionTone) {
  if (color === 'red') return 'bg-green-600'
  if (color === 'amber') return 'bg-amber-600'
  return 'bg-slate-300'
}

function RegionDrawer({
  regionData,
  onClose,
}: {
  regionData: RegionStats | null
  onClose: () => void
}) {
  if (!regionData) return null

  const emoji = REGION_EMOJIS[regionData.region] || '🌐'

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="flex-1 bg-black/30" onClick={onClose} aria-label="Close region details" />
      <div className="flex h-full w-full max-w-md flex-col border-l border-[hsl(var(--border))] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{emoji}</span>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{regionData.region}</h2>
            </div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {regionData.regs.length} regulation{regionData.regs.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <button onClick={onClose} className="ui-button-ghost !p-2">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {regionData.regs.length === 0 ? (
            <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No regulations found for this region.
            </p>
          ) : (
            regionData.regs.map((regulation) => {
              const { primaryExternalUrl } = getRegulationSourceLinks(regulation)

              return (
                <div key={regulation.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.6] p-4">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                    {formatCategoryLabel(regulation.category)}
                  </span>
                  <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                    {formatStatusLabel(regulation.status)}
                  </span>
                </div>

                <h3 className="mb-1 text-sm font-semibold leading-snug text-[hsl(var(--foreground))]">
                  {regulation.title}
                </h3>
                <p className="mb-2 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {regulation.description || regulation.full_description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    Effective: {formatDateWithPrecision(regulation.effective_date, regulation.date_precision)}
                  </span>
                  {primaryExternalUrl && (
                    <button
                      type="button"
                      onClick={() => openExternalInNewTabOnly(primaryExternalUrl)}
                      className="text-[10px] font-medium text-[hsl(var(--primary))] transition-colors hover:opacity-80"
                    >
                      View details
                    </button>
                  )}
                </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function MobileRegionList({
  regionStats,
  onSelectRegion,
}: {
  regionStats: RegionStats[]
  onSelectRegion: (stats: RegionStats) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {regionStats.map((stats) => (
        <div key={stats.region} className="surface-card overflow-hidden">
          <button
            onClick={() => setExpanded((current) => (current === stats.region ? null : stats.region))}
            className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-[hsl(var(--muted))/0.35]"
          >
            <div className={`h-2.5 w-2.5 rounded-full ${toneClass(stats.color)}`} />
            <span className="text-lg">{REGION_EMOJIS[stats.region] || '🌐'}</span>
            <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">{stats.region}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {stats.regs.length} reg{stats.regs.length !== 1 ? 's' : ''}
            </span>
            {expanded === stats.region ? (
              <ChevronUp size={16} className="text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" />
            )}
          </button>

          {expanded === stats.region && (
            <div className="border-t border-[hsl(var(--border))] px-4 pb-3 pt-2">
              <div className="space-y-1.5">
                {stats.regs.slice(0, 5).map((regulation) => (
                  <div key={regulation.id} className="border-b border-[hsl(var(--border))/0.55] py-1 text-xs text-[hsl(var(--muted-foreground))] last:border-0">
                    <span className="font-medium text-[hsl(var(--foreground))]">{regulation.title}</span>
                    {regulation.status && <span className="ml-1.5 opacity-70">({formatStatusLabel(regulation.status)})</span>}
                  </div>
                ))}
                <button
                  onClick={() => onSelectRegion(stats)}
                  className="mt-1 text-xs font-medium text-[hsl(var(--primary))]"
                >
                  View full details →
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function WorldMapPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [selectedRegion, setSelectedRegion] = useState<RegionStats | null>(null)
  const [showGlobalFrameworks, setShowGlobalFrameworks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hoveredRegion, setHoveredRegion] = useState<{ name: string; count: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllRegulations()
        setRegulations(data || [])
      } catch (error) {
        console.error('Error fetching world map data:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const globalFrameworks = useMemo(
    () => regulations.filter((regulation) => regulation.region === 'Global'),
    [regulations]
  )

  const mappedRegions = useMemo(() => {
    const map = new Map<string, Regulation[]>()
    for (const regulation of regulations) {
      if (!regulation.region || regulation.region === 'Global') continue
      map.set(regulation.region, [...(map.get(regulation.region) || []), regulation])
    }

    return [...map.entries()]
      .map(([region, regs]) => ({ region, regs, color: getRegionTone(regs) as RegionTone }))
      .sort((a, b) => {
        const order = { red: 0, amber: 1, grey: 2 }
        return order[a.color] - order[b.color]
      })
  }, [regulations])

  const regionsCovered = mappedRegions.length
  const countryColorMap = useMemo(() => {
    const map = new Map<string, { color: RegionTone; regs: Regulation[]; regions: Set<string> }>()

    for (const stats of mappedRegions) {
      const countryIds = REGION_COUNTRY_IDS[stats.region]
      if (!countryIds) continue

      for (const countryId of countryIds) {
        const existing = map.get(countryId)
        if (existing) {
          existing.regs.push(...stats.regs)
          existing.regions.add(stats.region)
          if (existing.color !== 'red' && stats.color === 'red') existing.color = 'red'
          if (existing.color === 'grey' && stats.color === 'amber') existing.color = 'amber'
        } else {
          map.set(countryId, {
            color: stats.color,
            regs: [...stats.regs],
            regions: new Set([stats.region]),
          })
        }
      }
    }

    return map
  }, [mappedRegions])

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading regulatory world map…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="metric-pill">
          <span>🌍</span>
          <span className="font-bold text-[hsl(var(--primary))]">{regionsCovered}</span>
          <span>regions covered</span>
        </div>
        <div className="metric-pill">
          <span>📋</span>
          <span className="font-bold text-[hsl(var(--primary))]">{regulations.length}</span>
          <span>regulations total</span>
        </div>
        <div className="metric-pill">
          <span>🌐</span>
          <span className="font-bold text-[hsl(var(--primary))]">{globalFrameworks.length}</span>
          <span>global frameworks</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="surface-card overflow-hidden p-4 md:w-[80%] md:max-w-[80%] md:p-5">
          <div
            className="relative hidden h-[400px] overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_30%_20%,rgba(15,123,92,0.10),transparent_28%),radial-gradient(circle_at_75%_35%,rgba(247,209,106,0.12),transparent_24%),linear-gradient(180deg,rgba(247,250,248,1)_0%,rgba(237,242,238,1)_100%)] px-3 pb-2 pt-10 md:block"
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect()
              setTooltipPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              })
            }}
          >
            <div className="absolute left-4 top-4 z-[1] rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] shadow-sm">
              Interactive coverage map
            </div>

            <div className="relative z-0 h-full w-full -translate-x-[15%] -translate-y-[10%]">
              <ComposableMap
                projectionConfig={{ scale: 216, center: [8, 18] }}
                style={{ width: '100%', height: '100%', display: 'block' }}
                className="h-full w-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <ZoomableGroup zoom={1} center={[0, 20]}>
                <Geographies geography={WORLD_ATLAS_URL}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geography: any) => {
                      const countryId = String(geography.id).padStart(3, '0')
                      const mappedCountry = countryColorMap.get(countryId)
                      const fill =
                        mappedCountry?.color === 'red'
                          ? '#16a34a'
                          : mappedCountry?.color === 'amber'
                            ? '#d97706'
                            : '#e5e7eb'

                      return (
                        <Geography
                          key={geography.rsmKey}
                          geography={geography}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth={0.45}
                          style={{
                            default: {
                              outline: 'none',
                              cursor: mappedCountry ? 'pointer' : 'default',
                            },
                            hover: {
                              fill: mappedCountry ? '#166534' : '#dfe4e1',
                              outline: 'none',
                              cursor: mappedCountry ? 'pointer' : 'default',
                            },
                            pressed: {
                              fill: '#166534',
                              outline: 'none',
                            },
                          }}
                          onMouseEnter={() => {
                            if (!mappedCountry) return
                            setHoveredRegion({
                              name: [...mappedCountry.regions].join(', '),
                              count: mappedCountry.regs.length,
                            })
                          }}
                          onMouseLeave={() => setHoveredRegion(null)}
                          onClick={() => {
                            if (!mappedCountry) return
                            const regionName = [...mappedCountry.regions][0]
                            const match = mappedRegions.find((stats) => stats.region === regionName)
                            if (match) setSelectedRegion(match)
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {hoveredRegion && (
              <div
                className="pointer-events-none absolute z-10 min-w-[11rem] rounded-2xl border border-[hsl(var(--primary))/0.18] bg-[linear-gradient(180deg,hsl(var(--card))/0.92_0%,hsl(var(--background))/0.86_100%)] px-3 py-2 shadow-[0_16px_40px_hsl(var(--foreground)/0.14)] backdrop-blur-sm"
                style={{
                  left: Math.min(tooltipPosition.x + 18, 720),
                  top: Math.max(tooltipPosition.y - 18, 20),
                }}
              >
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{hoveredRegion.name}</p>
                <p className="text-[11px] font-medium text-[hsl(var(--primary))/0.88]">
                  {hoveredRegion.count} regulation{hoveredRegion.count !== 1 ? 's' : ''} tracked
                </p>
              </div>
            )}

            {countryColorMap.size === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                <p className="max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  No mapped regions are available yet for the current dataset. Use the region list below to browse tracked regulations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 md:hidden">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          Regions by regulatory status
        </p>
        <MobileRegionList regionStats={mappedRegions} onSelectRegion={setSelectedRegion} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {globalFrameworks.length > 0 && (
        <div className="surface-card overflow-hidden">
          <button
            onClick={() => setShowGlobalFrameworks((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))/0.35]"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <span>🌍</span>
              <span>Global frameworks (ISSB, GHG Protocol, TNFD, etc.) — apply worldwide</span>
              <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">({globalFrameworks.length})</span>
            </div>
            {showGlobalFrameworks ? (
              <ChevronUp size={16} className="text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" />
            )}
          </button>

          {showGlobalFrameworks && (
            <div className="grid gap-2 border-t border-[hsl(var(--border))] px-4 pb-4 pt-3 sm:grid-cols-2">
              {globalFrameworks.map((regulation) => (
                <div key={regulation.id} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-3">
                  <p className="mb-0.5 text-xs font-semibold leading-snug text-[hsl(var(--foreground))]">{regulation.title}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2">
                    {regulation.description || regulation.full_description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RegionDrawer regionData={selectedRegion} onClose={() => setSelectedRegion(null)} />
    </div>
  )
}
