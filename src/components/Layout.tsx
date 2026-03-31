import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Menu, X, LogOut, Settings } from 'lucide-react'

interface LayoutProps {
  user: any
  isAdmin: boolean
}

export default function Layout({ user, isAdmin }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const navItems = [
    { label: 'Regulations', path: '/regulations', icon: '📋' },
    { label: 'Timeline', path: '/timeline', icon: '📅' },
    { label: 'Compliance', path: '/tracker', icon: '✓' },
    { label: 'AI Advisor', path: '/advisor', icon: '🤖' },
    { label: 'Community', path: '/community', icon: '👥' },
    { label: 'Alerts', path: '/alerts', icon: '🔔' },
    { label: 'Glossary', path: '/glossary', icon: '📚' },
    ...(isAdmin ? [{ label: 'Analytics', path: '/analytics', icon: '📊' }] : []),
  ]

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-slate-950 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">ESG Advisor</h1>
          <p className="text-xs text-slate-400 mt-1">Compliance Guide</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-800 p-4 space-y-3">
          <div className="px-4 py-2 bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-medium text-white truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-600 hover:text-slate-900"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center space-x-4">
            <Settings size={20} className="text-slate-600 cursor-pointer hover:text-slate-900" />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
