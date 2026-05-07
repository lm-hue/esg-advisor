import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllRegulations } from '../lib/regulations'
import { Regulation } from '../types'
import { Check, CheckCircle2, FileText, Play, Search, Sparkles, Upload, X } from 'lucide-react'
import { formatCategoryLabel, formatStatusLabel, isRegulationCurrentlyEffective, normalizeCategoryKey, normalizeStatus } from '../lib/appTheme'

type AssessmentStatus = 'compliant' | 'partial' | 'non_compliant'
type AssessmentPriority = 'high' | 'medium' | 'low'

interface AssessmentRow {
  id: string
  regulationId: string
  regulationTitle: string
  status: AssessmentStatus
  priority: AssessmentPriority
  requirementArea: string
  gapDescription: string
  recommendedAction: string
}

const STEP_ITEMS = [
  'Upload Policy',
  'Select Regulations',
  'Run Analysis',
  'Review & Act',
]

const STATUS_STYLES: Record<AssessmentStatus, string> = {
  compliant: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  non_compliant: 'border-rose-200 bg-rose-50 text-rose-700',
}

const PRIORITY_STYLES: Record<AssessmentPriority, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const REQUIREMENT_LIBRARY: Record<
  string,
  {
    area: string
    keywords: string[]
    action: string
  }
> = {
  Climate: {
    area: 'Climate governance and emissions disclosure',
    keywords: ['climate', 'emissions', 'scope 1', 'scope 2', 'scope 3', 'transition plan', 'decarbon'],
    action: 'Add a clear climate governance section covering emissions boundaries, targets, and oversight responsibilities.',
  },
  Environmental: {
    area: 'Environmental controls and reporting',
    keywords: ['environment', 'waste', 'water', 'pollution', 'resource', 'environmental impact'],
    action: 'Document environmental controls, metrics, and reporting responsibilities in a more explicit way.',
  },
  Circularity: {
    area: 'Circularity strategy and resource use',
    keywords: ['circular', 'recycling', 'reuse', 'waste', 'materials', 'resource efficiency'],
    action: 'Define circularity objectives, material recovery practices, and measurable waste reduction commitments.',
  },
  Nature: {
    area: 'Nature and biodiversity risk management',
    keywords: ['nature', 'biodiversity', 'ecosystem', 'land use', 'deforestation', 'habitat'],
    action: 'Add language on biodiversity dependencies, land-use impacts, and escalation for nature-related risks.',
  },
  Social: {
    area: 'Social safeguards and workforce standards',
    keywords: ['human rights', 'labour', 'worker', 'diversity', 'health and safety', 'community'],
    action: 'Strengthen the policy with workforce, supply chain, and community impact commitments.',
  },
  Governance: {
    area: 'Governance, controls, and accountability',
    keywords: ['governance', 'board', 'oversight', 'ethics', 'controls', 'accountability', 'risk committee'],
    action: 'Clarify governance ownership, board reporting lines, and decision-making accountability.',
  },
}

function getRequirementProfile(regulation: Regulation) {
  return REQUIREMENT_LIBRARY[normalizeCategoryKey(regulation.category)] || {
    area: 'Policy coverage and reporting readiness',
    keywords: ['policy', 'reporting', 'disclosure', 'risk', 'oversight'],
    action: 'Clarify policy ownership, reporting cadence, and evidence collection against the selected regulation.',
  }
}

function buildAssessmentRows(regulations: Regulation[], policyText: string) {
  const normalizedText = policyText.toLowerCase()

  return regulations.map<AssessmentRow>((regulation) => {
    const profile = getRequirementProfile(regulation)
    const titleTokens = regulation.title.toLowerCase().split(/\W+/).filter((token) => token.length > 4).slice(0, 4)
    const keywordSet = [...profile.keywords, ...titleTokens]
    const hits = keywordSet.reduce((count, keyword) => count + (normalizedText.includes(keyword) ? 1 : 0), 0)

    let status: AssessmentStatus = 'non_compliant'
    if (hits >= 4) status = 'compliant'
    else if (hits >= 2) status = 'partial'

    const priority: AssessmentPriority =
      status === 'compliant'
        ? 'low'
        : isRegulationCurrentlyEffective(regulation.status) || normalizeStatus(regulation.status) === 'adopted_not_yet_effective'
          ? 'high'
          : 'medium'

    const gapDescription =
      status === 'compliant'
        ? `${profile.area} appears to be covered in the uploaded policy language.`
        : status === 'partial'
          ? `${profile.area} is mentioned, but the policy does not yet show enough detail for strong compliance confidence.`
          : `${profile.area} is not clearly evidenced in the uploaded policy and likely needs targeted additions.`

    return {
      id: `${regulation.id}-${status}`,
      regulationId: regulation.id,
      regulationTitle: regulation.title,
      status,
      priority,
      requirementArea: profile.area,
      gapDescription,
      recommendedAction: profile.action,
    }
  })
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center gap-0 overflow-x-auto">
      {STEP_ITEMS.map((label, index) => {
        const stepNumber = index + 1
        const complete = currentStep > stepNumber
        const active = currentStep === stepNumber

        return (
          <div key={label} className="flex min-w-[96px] flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  complete
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                    : active
                      ? 'border-[hsl(var(--primary))] bg-white text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))]'
                }`}
              >
                {complete ? <Check size={14} /> : stepNumber}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                {label}
              </span>
            </div>
            {index < STEP_ITEMS.length - 1 && (
              <div className={`mb-5 h-px flex-1 ${complete ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [fileName, setFileName] = useState('')
  const [policyText, setPolicyText] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [running, setRunning] = useState(false)
  const [rows, setRows] = useState<AssessmentRow[]>([])
  const [addressed, setAddressed] = useState<Record<string, boolean>>({})
  const [extractionNote, setExtractionNote] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllRegulations()
        setRegulations(data || [])
      } catch (error) {
        console.error('Error fetching regulations:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filteredRegulations = useMemo(() => {
    if (!search.trim()) return regulations
    const query = search.toLowerCase()
    return regulations.filter((regulation) =>
      regulation.title.toLowerCase().includes(query) ||
      regulation.region.toLowerCase().includes(query) ||
      normalizeCategoryKey(regulation.category).toLowerCase().includes(query)
    )
  }, [regulations, search])

  const selectedRegulations = useMemo(
    () => regulations.filter((regulation) => selectedIds.includes(regulation.id)),
    [regulations, selectedIds]
  )

  const actionRows = rows.filter((row) => row.status !== 'compliant')
  const addressedCount = actionRows.filter((row) => addressed[row.id]).length

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setExtractionNote('')

    try {
      const rawText = await file.text()
      const cleanedText = rawText.replace(/\s+/g, ' ').trim()

      if (cleanedText.length >= 120) {
        setPolicyText(cleanedText)
        setExtractionNote('Text extracted from the uploaded file and ready for assessment.')
      } else {
        setPolicyText(`${file.name} internal policy governance reporting risk oversight roles responsibilities sustainability disclosure controls.`)
        setExtractionNote('Text extraction was limited, so the assessment will use available file metadata and a lightweight fallback context.')
      }
    } catch {
      setPolicyText(`${file.name} internal policy governance reporting risk oversight roles responsibilities sustainability disclosure controls.`)
      setExtractionNote('The file could not be read directly, so the assessment will use a lightweight fallback context.')
    }
  }

  const toggleRegulation = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const runAssessment = async () => {
    setRunning(true)
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    const nextRows = buildAssessmentRows(selectedRegulations, policyText)
    setRows(nextRows)
    setAddressed({})
    setRunning(false)
    setStep(4)
  }

  const resetAssessment = () => {
    setStep(1)
    setFileName('')
    setPolicyText('')
    setSelectedIds([])
    setRows([])
    setAddressed({})
    setExtractionNote('')
    setSearch('')
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading assessment workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-narrow md:max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="page-icon">
            <Search size={20} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold text-[hsl(var(--foreground))]">Policy Gap Assessment</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Assess an internal policy against selected ESG regulations and surface likely action gaps.
            </p>
          </div>
        </div>

        {step > 1 && (
          <button onClick={resetAssessment} className="ui-button-ghost">
            Start over
          </button>
        )}
      </div>

      <Stepper currentStep={step} />

      {step === 1 && (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">1</div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Upload your policy document</h3>
            </div>

            <div className="rounded-[24px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))/0.7] p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]">
                <Upload size={24} />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Upload a text-rich file for local policy review</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                The workspace reads the uploaded file locally and uses the extracted policy language to estimate where coverage looks strong, partial, or missing.
              </p>

              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90">
                <FileText size={16} />
                Choose file
                <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            {fileName && (
              <div className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{fileName}</p>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{extractionNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('')
                      setPolicyText('')
                      setExtractionNote('')
                    }}
                    className="ui-button-ghost !p-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!fileName} className="ui-button-primary disabled:opacity-50">
              Next: Select regulations
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">2</div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Select regulations to test against</h3>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, region, or theme"
                  className="ui-input pl-10"
                />
              </div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                {selectedIds.length} selected
              </div>
            </div>

            <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
              {filteredRegulations.slice(0, 40).map((regulation) => {
                const active = selectedIds.includes(regulation.id)
                return (
                  <button
                    key={regulation.id}
                    type="button"
                    onClick={() => toggleRegulation(regulation.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
                      active
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.06]'
                        : 'border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--background))/0.7]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        active
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white'
                          : 'border-[hsl(var(--border))] bg-white text-transparent'
                      }`}
                    >
                      <Check size={12} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-6 text-[hsl(var(--foreground))]">{regulation.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <span>{regulation.region}</span>
                        <span>&bull;</span>
                        <span>{formatCategoryLabel(regulation.category)}</span>
                        <span>&bull;</span>
                        <span>{formatStatusLabel(regulation.status)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="ui-button-secondary">
              Back
            </button>
            <button onClick={() => setStep(3)} disabled={selectedIds.length === 0} className="ui-button-primary disabled:opacity-50">
              Next: Run analysis
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">3</div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Run the gap assessment</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="surface-card-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Policy file</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">{fileName || 'No file uploaded'}</p>
              </div>
              <div className="surface-card-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Regulations selected</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">{selectedRegulations.length}</p>
              </div>
              <div className="surface-card-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Assessment mode</p>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--foreground))]">Coverage and action review</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[hsl(var(--background))/0.75] px-4 py-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              The assessment checks whether the uploaded policy appears to address core requirement areas implied by your selected regulations, then flags likely gaps and follow-up actions for review.
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="ui-button-secondary">
              Back
            </button>
            <button onClick={runAssessment} disabled={running} className="ui-button-primary">
              <Play size={16} />
              {running ? 'Running…' : 'Run analysis'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="ui-stat-card">
              <p className="ui-stat-card-value">{rows.length}</p>
              <p className="ui-stat-card-label mt-2">Checks run</p>
            </div>
            <div className="ui-stat-card">
              <p className="ui-stat-card-value">{rows.filter((row) => row.status === 'compliant').length}</p>
              <p className="ui-stat-card-label mt-2">Compliant</p>
            </div>
            <div className="ui-stat-card">
              <p className="ui-stat-card-value">{rows.filter((row) => row.priority === 'high').length}</p>
              <p className="ui-stat-card-label mt-2">High priority</p>
            </div>
            <div className="ui-stat-card">
              <p className="ui-stat-card-value">{addressedCount}</p>
              <p className="ui-stat-card-label mt-2">Actions addressed</p>
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Required actions</h3>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Review the detected gaps and use AI to draft follow-up actions, remediation language, or implementation questions.
                </p>
              </div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                {addressedCount}/{actionRows.length} addressed
              </div>
            </div>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--border))]">
              <div
                className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
                style={{ width: `${actionRows.length ? (addressedCount / actionRows.length) * 100 : 100}%` }}
              />
            </div>

            {actionRows.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                <p className="mt-3 text-base font-semibold text-emerald-800">No material gaps detected</p>
                <p className="mt-1 text-sm text-emerald-700">The uploaded policy appears to cover the selected requirement areas well.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionRows.map((row) => (
                  <div
                    key={row.id}
                    className={`rounded-2xl border p-4 transition-opacity ${addressed[row.id] ? 'opacity-55' : ''} ${STATUS_STYLES[row.status]}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setAddressed((current) => ({ ...current, [row.id]: !current[row.id] }))}
                        className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-current"
                      >
                        {addressed[row.id] && <Check size={12} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.regulationTitle}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[row.priority]}`}>
                            {row.priority}
                          </span>
                        </div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">{row.requirementArea}</p>
                        <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))/0.84]">{row.gapDescription}</p>
                        <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">→ {row.recommendedAction}</p>
                      </div>

                      <button
                        onClick={() =>
                          navigate(
                            `/advisor?context=${encodeURIComponent(
                              `Help me address this compliance gap for ${row.regulationTitle}: ${row.gapDescription} Recommended action: ${row.recommendedAction}`
                            )}`
                          )
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--primary))/0.1] px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))/0.16]"
                      >
                        <Sparkles size={12} />
                        Ask AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
