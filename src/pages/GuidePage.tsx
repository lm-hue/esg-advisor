import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Book,
  BookOpen,
  Bot,
  CircleHelp,
  Clock3,
  Compass,
  Laptop,
  MonitorSmartphone,
  RefreshCw,
  Globe2,
  Mail,
  Scale,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { fetchAllRegulations } from '../lib/regulations'
import { withAuthModal } from '../lib/authModal'
import { Regulation } from '../types'

interface GuidePageProps {
  user: any
}

interface WorkflowDefinition {
  id: string
  label: string
  eyebrow: string
  title: string
  description: string
  path: string
  icon: LucideIcon
  primaryAction: string
  bullets: string[]
  previewRows: Array<{ label: string; value: string }>
  callout: string
}

const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'regulations',
    label: 'Track regulations',
    eyebrow: 'ESG Home',
    title: 'Start with the full library and narrow down what matters.',
    description:
      'Scan the latest rules, ratings, frameworks, and standards in one place. Use compact multi-select filters, newest-first sorting, and bookmarks to build a focused view quickly.',
    path: '/esg-home',
    icon: BookOpen,
    primaryAction: 'Open regulations library',
    bullets: [
      'Filter by jurisdiction, type, theme, status, and watchlist',
      'Compare two regulations side by side from the list view',
      'Open any item for source links, summaries, and AI follow-up',
    ],
    previewRows: [
      { label: 'What you see first', value: 'Newest regulations and standards' },
      { label: 'Best when you need', value: 'Fast scanning and filtering' },
      { label: 'Helpful action', value: 'Bookmark rules to revisit later' },
    ],
    callout: 'This is the quickest way to get oriented if you are new to the workspace.',
  },
  {
    id: 'timeline',
    label: 'Watch the timeline',
    eyebrow: 'Timeline Monitor',
    title: 'See change in chronological order, starting from the latest.',
    description:
      'The timeline groups updates by month so you can follow regulation history naturally. Search, compare, filter, and jump into AI when a change needs interpretation.',
    path: '/timeline',
    icon: Clock3,
    primaryAction: 'Open timeline monitor',
    bullets: [
      'Track amendments, effective dates, and recent updates in order',
      'Keep multiple filter selections visible and removable below the controls',
      'Send a selected regulation or comparison directly into AI Advisor',
    ],
    previewRows: [
      { label: 'What you see first', value: 'Latest changes grouped by month' },
      { label: 'Best when you need', value: 'A chronological story of change' },
      { label: 'Helpful action', value: 'Compare two updates side by side' },
    ],
    callout: 'Use Timeline Monitor when you already know change is happening and want the sequence, not just a list.',
  },
  {
    id: 'compare',
    label: 'Compare regions',
    eyebrow: 'Compare',
    title: 'Match two jurisdictions and let the app surface overlap and gaps.',
    description:
      'The compare workspace helps teams understand how two regions differ before they ask AI for deeper interpretation. It shows theme overlap, status maturity, and representative regulations side by side.',
    path: '/compare',
    icon: Scale,
    primaryAction: 'Open compare',
    bullets: [
      'Choose Region A and Region B and swap them instantly',
      'See overlap, unique themes, and representative regulations',
      'Launch an AI-powered side-by-side analysis with both regions in context',
    ],
    previewRows: [
      { label: 'What you see first', value: 'Region-vs-region signals and insights' },
      { label: 'Best when you need', value: 'Cross-border regulatory comparison' },
      { label: 'Helpful action', value: 'Generate AI differences analysis' },
    ],
    callout: 'This is especially useful when policies need to work across multiple operating markets.',
  },
  {
    id: 'assessment',
    label: 'Assess a policy',
    eyebrow: 'Assessment',
    title: 'Upload a policy, select relevant rules, and review likely gaps.',
    description:
      'The assessment flow turns a policy document into an actionable review. It walks you from upload to selected regulations, then highlights likely coverage gaps and suggested actions.',
    path: '/assessment',
    icon: Search,
    primaryAction: 'Open assessment',
    bullets: [
      'Upload policy text and select the regulations you care about',
      'Review compliant, partial, and missing areas in one workspace',
      'Send any gap directly into AI Advisor for next-step guidance',
    ],
    previewRows: [
      { label: 'What you see first', value: 'A four-step review flow' },
      { label: 'Best when you need', value: 'A practical policy gap check' },
      { label: 'Helpful action', value: 'Turn gaps into concrete follow-ups' },
    ],
    callout: 'It is a useful first pass before legal review or implementation planning.',
  },
  {
    id: 'map',
    label: 'Explore the world map',
    eyebrow: 'World Map',
    title: 'Use geography to spot where tracked regulation is already concentrated.',
    description:
      'The world map turns the library into a visual view. Click a region to open its tracked regulations, scan global frameworks, and move from macro coverage into detail quickly.',
    path: '/regulatory-map',
    icon: Globe2,
    primaryAction: 'Open world map',
    bullets: [
      'See which regions have tracked rules or global frameworks',
      'Open a drawer with the mapped regulations for any region',
      'Use the mobile list view when you want the same coverage without the map',
    ],
    previewRows: [
      { label: 'What you see first', value: 'Region coverage and global frameworks' },
      { label: 'Best when you need', value: 'A visual geographic overview' },
      { label: 'Helpful action', value: 'Jump from region to detailed rules' },
    ],
    callout: 'Choose this view when the question starts with where rather than what.',
  },
  {
    id: 'advisor',
    label: 'Ask AI Advisor',
    eyebrow: 'AI Advisor',
    title: 'Bring context with you so the AI can answer more precisely.',
    description:
      'The AI Advisor is most useful when launched from a regulation, a comparison, or an assessment. It inherits that context so you can ask follow-up questions without restating the setup each time.',
    path: '/advisor',
    icon: Bot,
    primaryAction: 'Open AI Advisor',
    bullets: [
      'Ask about a single rule, two compared rules, two compared regions, or an assessment gap',
      'Use it for summaries, implications, and next-step guidance',
      'Stay inside the same workspace instead of rebuilding context manually',
    ],
    previewRows: [
      { label: 'What you see first', value: 'Context-aware prompts and summaries' },
      { label: 'Best when you need', value: 'Interpretation and explanation' },
      { label: 'Helpful action', value: 'Continue from the page you were on' },
    ],
    callout: 'The most effective path is to open AI from another workspace, not from a blank start.',
  },
]

const SUPPORT_FEATURES = [
  {
    label: 'Alerts',
    description: 'Configure targeted notifications around the regions, categories, and keywords you monitor.',
    path: '/alerts',
    icon: Bell,
  },
  {
    label: 'Glossary',
    description: 'Decode acronyms, frameworks, and disclosure terms quickly without leaving the app.',
    path: '/glossary',
    icon: Book,
  },
  {
    label: 'Community',
    description: 'Discuss interpretation questions and implementation ideas with the rest of the workspace.',
    path: '/community',
    icon: Users,
  },
]

const QUICK_START_STEPS = [
  {
    title: 'Open ESG Home first',
    description: 'Start with the library if you need a fast overview. Filter by region, type, or theme, then bookmark what matters.',
  },
  {
    title: 'Use Timeline Monitor or Compare next',
    description: 'Timeline Monitor is best for understanding change over time. Compare is best when you need cross-region differences.',
  },
  {
    title: 'Bring context into AI Advisor',
    description: 'Open AI from a regulation, comparison, or assessment so the advisor starts with the right background.',
  },
  {
    title: 'Save ongoing work with Alerts and bookmarks',
    description: 'Use alerts to stay informed and bookmarks to keep a short list of rules that deserve repeated review.',
  },
]

const FAQS = [
  {
    question: 'Do I need to install anything?',
    answer: 'No. ESG Compass runs in the browser, so you only need the app URL and a supported browser.',
  },
  {
    question: 'Can I use it from my phone, tablet, or laptop?',
    answer: 'Yes. The same workspace is available across devices, so you can review the same data wherever you sign in.',
  },
  {
    question: 'Do I have to download updates?',
    answer: 'No. The app updates automatically, which means you are always using the latest version available to your workspace.',
  },
  {
    question: 'Where should a new user begin?',
    answer: 'Begin with ESG Home for orientation, then move into Timeline Monitor or Compare, and use AI Advisor when you need interpretation.',
  },
  {
    question: 'What should I do if I get stuck on a feature?',
    answer: 'Use the Help menu in the header, restart the guided tour, open the full guide, or ask in Community for team context.',
  },
]

export default function GuidePage({ user }: GuidePageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWorkflowId, setActiveWorkflowId] = useState(WORKFLOWS[0].id)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllRegulations()
        setRegulations(data || [])
      } catch (error) {
        console.error('Error loading guide data:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!location.hash) return

    const id = location.hash.replace('#', '')
    const timeout = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [location.hash])

  const stats = useMemo(() => {
    const uniqueRegions = new Set(regulations.map((regulation) => regulation.region).filter(Boolean))
    const inForceCount = regulations.filter(
      (regulation) => ['effective', 'amended_effective', 'adopted_not_yet_effective', 'in_force', 'adopted'].includes(regulation.status)
    ).length
    const updatedCount = regulations.filter(
      (regulation) => Boolean(regulation.updated_at) && regulation.updated_at !== regulation.created_at
    ).length
    const globalFrameworkCount = regulations.filter((regulation) => regulation.region === 'Global').length

    return {
      total: regulations.length,
      regions: uniqueRegions.size,
      inForce: inForceCount,
      updates: updatedCount,
      globalFrameworks: globalFrameworkCount,
    }
  }, [regulations])

  const activeWorkflow = WORKFLOWS.find((workflow) => workflow.id === activeWorkflowId) || WORKFLOWS[0]
  const ActiveIcon = activeWorkflow.icon

  const openAuth = () => {
    navigate(withAuthModal(location.pathname, location.search))
  }

  return (
    <div className="page-shell space-y-8 md:space-y-10">
      <section className="guide-hero">
        <div className="guide-hero-grid">
          <div className="relative z-10">
            <div className="guide-kicker">
              <Compass size={13} />
              How It Works
            </div>

            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.05] text-[hsl(var(--foreground))] md:text-6xl">
              Learn the whole workspace in a few clicks, then decide where you want to start.
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))] md:text-lg">
              ESG Compass brings regulations, timelines, regional comparisons, policy reviews, AI guidance,
              alerts, and reference material into one product. This guide shows how each part fits together.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(activeWorkflow.path)}
                className="ui-button-primary"
              >
                {activeWorkflow.primaryAction}
                <ArrowRight size={16} />
              </button>
              {user ? (
                <button type="button" onClick={() => navigate('/esg-home')} className="ui-button-secondary">
                  Go to your workspace
                </button>
              ) : (
                <button type="button" onClick={openAuth} className="ui-button-secondary">
                  Sign in to save bookmarks
                </button>
              )}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="guide-stat">
                <span className="guide-stat-label">Tracked items</span>
                <span className="guide-stat-value">{loading ? '...' : stats.total}</span>
              </div>
              <div className="guide-stat">
                <span className="guide-stat-label">Jurisdictions</span>
                <span className="guide-stat-value">{loading ? '...' : stats.regions}</span>
              </div>
              <div className="guide-stat">
                <span className="guide-stat-label">In force</span>
                <span className="guide-stat-value">{loading ? '...' : stats.inForce}</span>
              </div>
              <div className="guide-stat">
                <span className="guide-stat-label">Recent updates</span>
                <span className="guide-stat-value">{loading ? '...' : stats.updates}</span>
              </div>
            </div>
          </div>

          <div className="guide-preview-stage">
            <div className="guide-floating-note guide-float">
              <span className="guide-floating-label">Why sign in</span>
              <p>Save bookmarks, open alerts, and keep moving without losing context.</p>
            </div>

            <div className="guide-floating-note guide-float-delayed">
              <span className="guide-floating-label">What AI gets</span>
              <p>Regulation, comparison, and assessment context can follow you into the advisor.</p>
            </div>

            <div key={activeWorkflow.id} className="guide-preview-panel guide-fade-up">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="ui-caption">{activeWorkflow.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                    {activeWorkflow.label}
                  </h3>
                </div>
                <div className="guide-preview-icon">
                  <ActiveIcon size={18} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {activeWorkflow.description}
              </p>

              <div className="mt-5 space-y-3">
                {activeWorkflow.previewRows.map((row) => (
                  <div key={row.label} className="guide-preview-row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                  How people use it
                </p>
                <ul className="mt-3 space-y-2.5">
                  {activeWorkflow.bullets.map((bullet) => (
                    <li key={bullet} className="guide-check-row">
                      <span className="guide-check-dot" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-[hsl(var(--border))] px-5 py-5 md:px-6">
          <p className="ui-caption">Choose a workflow</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Pick the question you want to answer first.</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                Each workspace focuses on a different job. Tap one and the preview updates instantly so you can see how the app is meant to be used.
              </p>
            </div>
            <div className="metric-pill">
              <Sparkles size={14} className="text-[hsl(var(--primary))]" />
              {loading ? 'Loading workspace coverage' : `${stats.globalFrameworks} global frameworks included`}
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-[hsl(var(--border))] p-4 lg:border-b-0 lg:border-r lg:p-5">
            <div className="grid gap-2">
              {WORKFLOWS.map((workflow) => {
                const Icon = workflow.icon
                const active = workflow.id === activeWorkflow.id

                return (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => setActiveWorkflowId(workflow.id)}
                    onMouseEnter={() => setActiveWorkflowId(workflow.id)}
                    className={`guide-workflow-tab ${active ? 'guide-workflow-tab-active' : ''}`}
                  >
                    <div className="guide-workflow-tab-icon">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{workflow.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{workflow.title}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div key={`${activeWorkflow.id}-detail`} className="guide-fade-up p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="guide-kicker">
                <ActiveIcon size={13} />
                {activeWorkflow.eyebrow}
              </span>
              <span className="metric-pill">
                <Sparkles size={13} className="text-[hsl(var(--primary))]" />
                Guided path
              </span>
            </div>

            <h3 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              {activeWorkflow.title}
            </h3>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              {activeWorkflow.description}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {activeWorkflow.previewRows.map((row) => (
                <div key={row.label} className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    {row.label}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-[hsl(var(--foreground))]">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,246,0.95)_100%)] p-5">
              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="ui-caption">What you can do here</p>
                  <ul className="mt-3 space-y-3">
                    {activeWorkflow.bullets.map((bullet) => (
                      <li key={bullet} className="guide-check-row">
                        <span className="guide-check-dot" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[20px] border border-[hsl(var(--border))] bg-white p-4">
                  <p className="ui-caption">Why this matters</p>
                  <p className="mt-3 text-sm leading-7 text-[hsl(var(--foreground))]">{activeWorkflow.callout}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(activeWorkflow.path)}
                  className="ui-button-primary"
                >
                  {activeWorkflow.primaryAction}
                  <ArrowRight size={16} />
                </button>
                {!user && (
                  <button type="button" onClick={openAuth} className="ui-button-secondary">
                    Sign in before you dive deeper
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card p-5 md:p-6">
          <p className="ui-caption">Everything else inside</p>
          <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">The app is more than a library.</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            Once you know the main workspaces, these supporting features make the product faster to live in every day.
          </p>

          <div className="mt-6 divide-y divide-[hsl(var(--border))]">
            {SUPPORT_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <button
                  key={feature.label}
                  type="button"
                  onClick={() => navigate(feature.path)}
                  className="guide-feature-row"
                >
                  <div className="guide-feature-row-icon">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{feature.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{feature.description}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-[hsl(var(--muted-foreground))]" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="guide-cta-panel">
          <p className="guide-kicker">
            <Sparkles size={13} />
            Start Simple
          </p>
          <h3 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            The easiest first session is browse, compare, then ask AI.
          </h3>
          <ol className="mt-6 space-y-4">
            <li className="guide-sequence-row">
              <span className="guide-sequence-number">1</span>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">Browse the ESG Home</p>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Filter down to a region or type that matters to you.
                </p>
              </div>
            </li>
            <li className="guide-sequence-row">
              <span className="guide-sequence-number">2</span>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">Open Timeline Monitor or Compare</p>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Build a clearer picture of change over time or across regions.
                </p>
              </div>
            </li>
            <li className="guide-sequence-row">
              <span className="guide-sequence-number">3</span>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">Use AI for interpretation</p>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Send that context into AI Advisor and ask for the practical implications.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <button type="button" onClick={() => navigate('/timeline')} className="ui-button-primary">
                Start with Timeline Monitor
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={openAuth} className="ui-button-primary">
                Sign in to start
                <ArrowRight size={16} />
              </button>
            )}
            <button type="button" onClick={() => navigate('/regulatory-map')} className="ui-button-secondary">
              Explore the World Map
            </button>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden border-[hsl(var(--primary))/0.14]">
        <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(120deg,rgba(15,123,92,0.08)_0%,rgba(247,209,106,0.08)_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="guide-kicker">
                <Sparkles size={13} />
                Testing Proposal
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">Direction 2: one Regulations page with multiple views</h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                This concept keeps one primary destination, <strong className="text-[hsl(var(--foreground))]">Regulations</strong>, and turns
                cards, table, and timeline into alternate views of the same filtered dataset. It is here only for testing and discussion.
              </p>
            </div>
            <div className="metric-pill">
              <BookOpen size={14} className="text-[hsl(var(--primary))]" />
              One page, three views
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 md:px-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <div className="surface-card-muted rounded-[24px] p-4">
              <p className="ui-caption">Proposed Page Name</p>
              <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">Regulations</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                A single research destination that lets users choose how to view the same regulation results.
              </p>
            </div>

            <div className="surface-card-muted rounded-[24px] p-4">
              <p className="ui-caption">Information Architecture</p>
              <ul className="mt-3 space-y-2.5">
                <li className="guide-check-row">
                  <span className="guide-check-dot" />
                  <span>Shared search and shared filters across all views</span>
                </li>
                <li className="guide-check-row">
                  <span className="guide-check-dot" />
                  <span>View switcher: Cards, Table, Timeline</span>
                </li>
                <li className="guide-check-row">
                  <span className="guide-check-dot" />
                  <span>Shared compare tray, bookmarks, and AI handoff</span>
                </li>
                <li className="guide-check-row">
                  <span className="guide-check-dot" />
                  <span>Optional sort control: date, relevance, region, status</span>
                </li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.72] p-4">
              <p className="ui-caption">Why Test It</p>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--foreground))]">
                This version reduces navigation overlap and makes timeline behavior feel like a visualization mode rather than a second destination with nearly the same content.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,246,0.95)_100%)] p-4 md:p-5">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="ui-caption">Wireframe</p>
                  <h4 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">Regulations</h4>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  {['Cards', 'Table', 'Timeline'].map((view, index) => (
                    <span
                      key={view}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        index === 0
                          ? 'border-[hsl(var(--primary))/0.25] bg-[hsl(var(--primary))/0.08] text-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {view}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.7] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                Search regulations, frameworks, sources, or themes...
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {['Theme', 'Type', 'Region', 'Status', 'Watchlist'].map((item) => (
                  <span key={item} className="rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {item}
                  </span>
                ))}
                <span className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))]">
                  Sort: Date
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.55] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Climate</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">EU</span>
                  </div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Card view example</p>
                  <p className="mt-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                    A compact regulation card for browsing and comparison.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.55] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Timeline</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Apr 2026</span>
                  </div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Same results, different view</p>
                  <p className="mt-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                    The timeline becomes a rendering option, not a separate destination.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-dashed border-[hsl(var(--primary))/0.25] bg-[hsl(var(--primary))/0.04] px-4 py-3 text-sm text-[hsl(var(--primary))]">
                Compare tray and AI actions would stay persistent across all three views.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="quick-start" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="surface-card p-5 md:p-6">
          <p className="ui-caption">Quick Start</p>
          <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">What the app does and why teams use it.</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            ESG Compass helps teams track ESG regulations, understand change, compare jurisdictions, assess policies, and get AI guidance without switching between separate tools.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="surface-card-muted rounded-[24px] p-4">
              <div className="guide-feature-row-icon !h-10 !w-10">
                <Laptop size={18} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">It lives in the browser</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                No local install is required. Open the app URL and start working.
              </p>
            </div>
            <div className="surface-card-muted rounded-[24px] p-4">
              <div className="guide-feature-row-icon !h-10 !w-10">
                <MonitorSmartphone size={18} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">It works across devices</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Use the same workspace from your phone, tablet, or computer.
              </p>
            </div>
            <div className="surface-card-muted rounded-[24px] p-4">
              <div className="guide-feature-row-icon !h-10 !w-10">
                <RefreshCw size={18} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">It stays up to date</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Automatic updates mean you are always using the latest available version.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card p-5 md:p-6">
          <p className="ui-caption">Step-By-Step</p>
          <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">A simple first session</h3>
          <div className="mt-6 space-y-4">
            {QUICK_START_STEPS.map((step, index) => (
              <div key={step.title} className="guide-sequence-row">
                <span className="guide-sequence-number">{index + 1}</span>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="surface-card p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="guide-feature-row-icon !h-10 !w-10">
              <CircleHelp size={18} />
            </div>
            <div>
              <p className="ui-caption">Contextual Help</p>
              <h3 className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">Help is available where users need it.</h3>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>The header Help button restarts the guided tour, opens the manual, and jumps to FAQs.</span>
            </li>
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>The sidebar now explains what the app does and keeps the “Start tour” action visible.</span>
            </li>
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>Page titles and descriptions in the shell explain each workspace before users need documentation.</span>
            </li>
          </ul>
        </div>

        <div className="surface-card p-5 md:p-6">
          <p className="ui-caption">Visual Aids And Training</p>
          <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">Recommended enablement assets</h3>
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-4">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">30-60 second walkthrough clips</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Record “Find your first regulation”, “Compare two regions”, and “Assess your first policy” as short videos or GIFs.
              </p>
            </div>
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-4">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Annotated screenshots</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Capture the sidebar, filters, compare view, and AI handoff states with numbered annotations that match the quick-start steps above.
              </p>
            </div>
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-4">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Role-specific training notes</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Create one-page instructions for analysts, policy owners, and executives so each audience sees only the workflows they actually use.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-card p-5 md:p-6">
          <p className="ui-caption">FAQ</p>
          <h3 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">Common questions users ask first</h3>
          <div className="mt-6 space-y-3">
            {FAQS.map((item) => (
              <div key={item.question} className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.65] p-4">
                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.question}</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="guide-cta-panel">
          <p className="guide-kicker">
            <Mail size={13} />
            Contact And Support
          </p>
          <h3 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            When users need help, route them to the shortest path.
          </h3>
          <ul className="mt-6 space-y-4">
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>Use the header Help menu for the guided tour, guide, and FAQ jump links.</span>
            </li>
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>Use Community when the question is about interpretation, process, or internal team practice.</span>
            </li>
            <li className="guide-check-row">
              <span className="guide-check-dot" />
              <span>For account access or workspace-specific issues, contact your workspace administrator or support owner.</span>
            </li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/community')} className="ui-button-primary">
              Open Community
              <ArrowRight size={16} />
            </button>
            <button type="button" onClick={() => navigate('/glossary')} className="ui-button-secondary">
              Open Glossary
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
