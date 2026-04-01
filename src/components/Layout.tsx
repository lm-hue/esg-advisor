import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Menu, X, LogOut, LogIn, BookOpen, Clock, Cpu, Users, Bell, Book, BarChart2, Leaf
} from 'lucide-react'

interface LayoutProps {
  user: any
  isAdmin: boolean
}

const navItems = [
  { label: 'Regulations', path: '/regulations', icon: BookOpen },
  { label: 'Timeline', path: '/timeline', icon: Clock },
  { label: 'AI Advisor', path: '/advisor', icon: Cpu },
  { label: 'Community', path: '/community', icon: Users },
  { label: 'Alerts', path: '/alerts', icon: Bell },
  { label: 'Glossary', path: '/glossary', icon: Book },
]

const routeDescriptions: Record<string, string> = {
  '/regulations': 'Browse the latest sustainability regulations and track the ones that matter.',
  '/timeline': 'View upcoming deadlines and see which rules need attention first.',
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ label: 'Analytics', path: '/analytics', icon: BarChart2 }] : []),
  ]

  const currentItem = [...allNavItems].sort((a, b) => b.path.length - a.path.length)
    .find((item) => isActive(item.path))
  const HeaderIcon = currentItem?.icon || BookOpen

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] md:p-2">
      <div className="flex min-h-screen md:min-h-[calc(100vh-1rem)]">
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
            sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:w-24 md:translate-x-0'
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden border-r bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] shadow-2xl md:mr-2 md:rounded-[28px] md:border md:border-[hsl(var(--sidebar-border))] md:border-r">
            <div className="border-b border-white/10 px-4 py-5">
              <button
                type="button"
                onClick={() => navigate('/regulations')}
                className={`flex w-full items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} text-left`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Leaf size={18} className="text-[#f7d16a]" />
                </div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold text-white">RegulESG</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/45">Advisor Workspace</p>
                  </div>
                )}
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {allNavItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false)
                      }
                    }}
                    className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      sidebarOpen ? 'gap-3 justify-start' : 'justify-center'
                    } ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-[#f7d16a]' : 'text-white/55'} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </button>
                )
              })}
            </nav>

            <div className="border-t border-white/10 p-3">
              {user ? (
                <div className="space-y-3">
                  {sidebarOpen && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Signed In</p>
                      <p className="mt-1 truncate text-sm font-medium text-white/85">{user.email}</p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      sidebarOpen ? 'justify-center gap-2' : 'justify-center'
                    } bg-white/5 text-white/75 hover:bg-white/10 hover:text-white`}
                  >
                    <LogOut size={16} />
                    {sidebarOpen && 'Sign out'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    sidebarOpen ? 'justify-center gap-2' : 'justify-center'
                  } bg-[#0f7b5c] text-white hover:bg-[#116d53]`}
                >
                  <LogIn size={16} />
                  {sidebarOpen && 'Sign in'}
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-screen flex-1 flex-col overflow-hidden md:rounded-[28px] md:border md:border-[hsl(var(--border))] md:bg-white md:shadow-sm">
            <header className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-white/95 backdrop-blur">
              <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="ui-button-ghost shrink-0 !p-2"
                    aria-label="Toggle navigation"
                  >
                    {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
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
                          {routeDescriptions[currentItem?.path || '/regulations']}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {user ? (
                  <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:flex">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[180px] truncate">{user.email}</span>
                  </div>
                ) : (
                  <button onClick={() => navigate('/auth')} className="ui-button-primary">
                    <LogIn size={16} />
                    Sign in
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-[hsl(var(--background))/0.55]">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
