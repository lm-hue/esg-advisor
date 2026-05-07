import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { withAuthModal } from '../lib/authModal'
import WorkspaceTour from './WorkspaceTour'
import {
  BarChart2,
  Bell,
  Book,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cpu,
  FileText,
  Globe2,
  Leaf,
  LogIn,
  LogOut,
  Menu,
  PlayCircle,
  Scale,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react'

interface LayoutProps {
  user: any
  isAdmin: boolean
}

interface NavItemDefinition {
  label: string
  path: string
  icon: LucideIcon
  description: string
  comingSoon?: boolean
  group: 'Core workspaces' | 'Geographies' | 'Support and reference' | 'Admin'
}

const TOUR_STORAGE_KEY = 'regulesg-tour-seen-v1'

const baseNavItems: NavItemDefinition[] = [
  {
    label: 'ESG Home',
    path: '/esg-home',
    icon: BookOpen,
    description: 'Upcoming regulations, recent updates, community highlights and your watchlist.',
    group: 'Core workspaces',
  },
  {
    label: 'Regulations & Frameworks Library',
    path: '/framework-library',
    icon: FileText,
    description: 'Browse regulations, frameworks, and standards, and bookmark what matters.',
    group: 'Core workspaces',
  },
  {
    label: 'World Map',
    path: '/regulatory-map',
    icon: Globe2,
    description: 'Use geography to understand where tracked rules are concentrated.',
    group: 'Geographies',
  },
  {
    label: 'Compare',
    path: '/compare',
    icon: Scale,
    description: 'Match two regions side by side before you ask AI to interpret.',
    group: 'Geographies',
  },
  {
    label: 'Assessment',
    path: '/assessment',
    icon: Search,
    description: 'Upload a policy and review likely compliance gaps in one flow.',
    comingSoon: true,
    group: 'Core workspaces',
  },
  {
    label: 'AI Advisor',
    path: '/advisor',
    icon: Cpu,
    description: 'Ask follow-up questions with regulation, comparison, or assessment context.',
    comingSoon: true,
    group: 'Core workspaces',
  },
  {
    label: 'Glossary',
    path: '/glossary',
    icon: Book,
    description: 'Look up disclosure terms, acronyms, and reporting language quickly.',
    group: 'Support and reference',
  },
  {
    label: 'Alerts',
    path: '/alerts',
    icon: Bell,
    description: 'Set notifications for the regions, categories, and topics you monitor.',
    group: 'Support and reference',
  },
  {
    label: 'Community',
    path: '/community',
    icon: Users,
    description: 'Discuss interpretation questions and implementation ideas with your team.',
    group: 'Core workspaces',
  },
]

const routeDescriptions: Record<string, string> = {
  '/esg-home': 'Upcoming regulations, recent updates, community highlights and your watchlist.',
  '/timeline': 'Use the timeline monitor to follow regulatory change and see which rules need attention first.',
  '/compare': 'Compare regional regulatory landscapes with visuals, overlap signals, and AI analysis.',
  '/regulatory-map': 'Explore regulation coverage by geography and open any tracked region for detail.',
  '/assessment': 'Upload a policy, test it against selected regulations, and review likely compliance gaps.',
  '/how-it-works': 'Learn how each workspace fits together and where to start based on your goal.',
  '/framework-library': 'Browse the latest sustainability regulations in the library and track the ones that matter.',
  '/advisor': 'Ask ESG questions and get guidance grounded in your regulation data.',
  '/community': 'Discuss regulatory changes, interpretations, and implementation ideas.',
  '/alerts': 'Configure targeted notifications for the categories and regions you monitor.',
  '/glossary': 'Look up reporting terms, frameworks, and regulatory acronyms quickly.',
  '/analytics': 'Review platform-wide regulation, compliance, and engagement activity.',
}

export default function Layout({ user, isAdmin }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Core workspaces': true,
    'Geographies': true,
    'Support and reference': false,
    Admin: true,
  })
  const [helpMenuOpen, setHelpMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const sidebarNavRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleOpenAuth = () => {
    navigate(withAuthModal(location.pathname, location.search))
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const allNavItems = useMemo(() => {
    const items = [...baseNavItems]
    if (isAdmin) {
      items.push({
        label: 'Analytics',
        path: '/analytics',
        icon: BarChart2,
        description: 'Review platform-wide regulation, compliance, and engagement activity.',
        group: 'Admin',
      })
    }
    return items
  }, [isAdmin])

  const groupedNavItems = useMemo(() => {
    return allNavItems.reduce<Record<string, NavItemDefinition[]>>((acc, item) => {
      acc[item.group] = [...(acc[item.group] || []), item]
      return acc
    }, {})
  }, [allNavItems])
  const orderedGroups = useMemo(
    () => ['Core workspaces', 'Geographies', 'Support and reference', 'Admin'].filter((group) => groupedNavItems[group]?.length),
    [groupedNavItems]
  )

  const currentItem = [...allNavItems].sort((a, b) => b.path.length - a.path.length)
    .find((item) => isActive(item.path))
  const HeaderIcon = currentItem?.icon || BookOpen

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!helpMenuRef.current?.contains(event.target as Node)) {
        setHelpMenuOpen(false)
      }
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    setHelpMenuOpen(false)
    setUserMenuOpen(false)
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    const tourSeen = window.localStorage.getItem(TOUR_STORAGE_KEY)
    if (tourSeen) return

    const timeout = window.setTimeout(() => {
      setTourOpen(true)
      window.localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [])

  const tourSteps = [
    {
      id: 'navigation',
      title: 'Start with the left navigation',
      description: 'Core workspaces are grouped first, while help and reference areas live below them so the sidebar is easier to scan.',
      placement: 'right' as const,
      targetRef: sidebarNavRef,
    },
    {
      id: 'page-header',
      title: 'Use the header to understand each page',
      description: 'The page title explains where you are, and the line underneath tells you what that section is for before you start clicking around.',
      placement: 'bottom' as const,
      targetRef: headerRef,
    },
    {
      id: 'help',
      title: 'Open help when you need it',
      description: 'The help menu gives you a one-click way to restart this tour, open the full guide, jump to FAQs, or find support pathways.',
      placement: 'bottom' as const,
      targetRef: helpButtonRef,
    },
    {
      id: 'workspace',
      title: 'The main panel is your working area',
      description: 'Every page uses the same shell, so once you know the navigation and help entry points you can move between workflows without relearning the interface.',
      placement: 'top' as const,
      targetRef: contentRef,
    },
  ]

  const openGuideSection = (hash?: string) => {
    const target = hash ? `/how-it-works${hash}` : '/how-it-works'
    navigate(target)
    setHelpMenuOpen(false)
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [group]: !current[group],
    }))
  }

  return (
    <>
      <div className="h-screen overflow-hidden bg-[hsl(var(--background))] md:p-2">
        <div className="flex h-full">
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              aria-label="Close navigation"
            />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 md:static md:z-auto ${
              sidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full w-80 md:w-24 md:translate-x-0'
            }`}
          >
            <div className="flex h-full flex-col overflow-hidden border-r bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] shadow-2xl md:mr-2 md:rounded-[28px] md:border md:border-[hsl(var(--sidebar-border))] md:border-r">
              <div className="border-b border-white/10 px-4 py-5">
                <button
                  type="button"
                  onClick={() => navigate('/esg-home')}
                  className={`flex w-full items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} text-left`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Leaf size={18} className="text-[#f7d16a]" />
                  </div>
                  {sidebarOpen && (
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-semibold text-white">ESG Compass</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/45">Advisor Workspace</p>
                    </div>
                  )}
                </button>

              </div>

              <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto px-3 py-4">
                {orderedGroups.map((group) => (
                  <div key={group} className="mb-5 last:mb-0">
                    {sidebarOpen ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="flex w-full items-center justify-between rounded-xl px-3 pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38 transition hover:text-white/72"
                      >
                        <span>{group}</span>
                        {expandedGroups[group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : null}

                    {(sidebarOpen ? expandedGroups[group] : true) && (
                      <div className="space-y-1">
                        {groupedNavItems[group].map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path)

                        return (
                          <button
                            key={item.path}
                            type="button"
                            title={item.label}
                            onClick={() => {
                              navigate(item.path)
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false)
                              }
                            }}
                            className={`flex w-full items-start rounded-[20px] px-3 py-3 text-left text-sm font-medium transition-all ${
                              sidebarOpen ? 'gap-3 justify-start' : 'justify-center'
                            } ${
                              active
                                ? 'bg-white/10 text-white'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon size={18} className={`mt-0.5 shrink-0 ${active ? 'text-[#f7d16a]' : 'text-white/55'}`} />
                            {sidebarOpen && (
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="block truncate font-semibold">{item.label}</span>
                                  {item.comingSoon && (
                                    <span className="rounded-full border border-white/14 bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f7d16a]">
                                      Coming soon
                                    </span>
                                  )}
                                </div>
                                <span className={`mt-1 block text-xs leading-5 ${active ? 'text-white/65' : 'text-white/42'}`}>
                                  {item.description}
                                </span>
                              </div>
                            )}
                          </button>
                        )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col overflow-hidden md:rounded-[28px] md:border md:border-[hsl(var(--border))] md:bg-white md:shadow-sm">
              <header ref={headerRef} className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-white/95 backdrop-blur">
                <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="ui-button-ghost shrink-0 !p-2"
                      aria-label="Toggle navigation"
                    >
                      <Menu size={18} />
                    </button>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="page-icon !h-11 !w-11 shrink-0">
                          <HeaderIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <h1 className="truncate font-display text-2xl font-semibold leading-tight text-[hsl(var(--foreground))] md:text-3xl">
                            {currentItem?.label || 'ESG Advisor'}
                          </h1>
                          <p className="hidden truncate text-sm text-[hsl(var(--muted-foreground))] md:block">
                            {routeDescriptions[currentItem?.path || '/esg-home']}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div ref={helpMenuRef} className="relative">
                      <button
                        ref={helpButtonRef}
                        type="button"
                        onClick={() => setHelpMenuOpen((current) => !current)}
                        className="ui-button-secondary"
                      >
                        <CircleHelp size={16} />
                        Help
                      </button>

                      {helpMenuOpen && (
                        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-white shadow-xl">
                          <div className="border-b border-[hsl(var(--border))] px-4 py-4">
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Find your way quickly</p>
                            <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                              This app runs in your browser, works across devices, and updates automatically without installs.
                            </p>
                          </div>

                          <div className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTourOpen(true)
                                setHelpMenuOpen(false)
                              }}
                              className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-[hsl(var(--muted))/0.75]"
                            >
                              <PlayCircle size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                              <div>
                                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Start the guided tour</p>
                                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                  Walk through the navigation, page header, help menu, and main workspace.
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => openGuideSection('#quick-start')}
                              className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-[hsl(var(--muted))/0.75]"
                            >
                              <FileText size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                              <div>
                                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Open the user guide</p>
                                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                  Read the quick start, workflows, FAQs, training ideas, and support pathways.
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => openGuideSection('#faq')}
                              className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition hover:bg-[hsl(var(--muted))/0.75]"
                            >
                              <Book size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                              <div>
                                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Open FAQs and support</p>
                                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                  Jump to common questions, contact guidance, and what to do when you get stuck.
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {user ? (
                      <div ref={userMenuRef} className="relative hidden sm:block">
                        <button
                          type="button"
                          onClick={() => setUserMenuOpen((v) => !v)}
                          className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/0.3)] hover:text-[hsl(var(--foreground))]"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                            {user.email?.charAt(0).toUpperCase()}
                          </span>
                          <span className="max-w-[160px] truncate">{user.email}</span>
                          <ChevronDown size={13} className={`shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {userMenuOpen && (
                          <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white shadow-xl">
                            <div className="border-b border-[hsl(var(--border))] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Signed in as</p>
                              <p className="mt-0.5 truncate text-sm font-medium text-[hsl(var(--foreground))]">{user.email}</p>
                            </div>
                            <div className="p-1.5">
                              <button
                                type="button"
                                onClick={() => { setUserMenuOpen(false); handleLogout() }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <LogOut size={15} />
                                Sign out
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button type="button" onClick={handleOpenAuth} className="ui-button-primary">
                        <LogIn size={16} />
                        Sign in
                      </button>
                    )}
                  </div>
                </div>
              </header>

              <div ref={contentRef} id="main-scroll" className="min-h-0 flex-1 overflow-y-auto bg-[hsl(var(--background))/0.55]">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorkspaceTour open={tourOpen} steps={tourSteps} onClose={() => setTourOpen(false)} />
    </>
  )
}
