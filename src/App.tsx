import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { isAuthModalOpen, withoutAuthModal } from './lib/authModal'
import Layout from './components/Layout'
import AuthModal from './components/AuthModal'
import RegulationsPage from './pages/RegulationsPage'
import RegulationDetailPage from './pages/RegulationDetailPage'
import TimelinePage from './pages/TimelinePage'
import AIAdvisorPage from './pages/AIAdvisorPage'
import CommunityPage from './pages/CommunityPage'
import AlertsPage from './pages/AlertsPage'
import GlossaryPage from './pages/GlossaryPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          setUser(data.session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()
          setIsAdmin(profile?.role === 'admin')
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          setIsAdmin(profile?.role === 'admin')
        } else {
          setUser(null)
          setIsAdmin(false)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="surface-card flex items-center gap-3 px-5 py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Loading workspace...</p>
        </div>
      </div>
    )
  }

  const authModalOpen = isAuthModalOpen(location.search)

  const closeAuthModal = () => {
    if (location.pathname === '/auth') {
      navigate('/regulations', { replace: true })
      return
    }

    navigate(withoutAuthModal(location.pathname, location.search), { replace: true })
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Navigate to="/regulations?auth=1" replace />} />

        <Route element={<Layout user={user} isAdmin={isAdmin} />}>
          <Route path="/" element={<Navigate to="/regulations" replace />} />
          <Route path="/regulations" element={<RegulationsPage user={user} />} />
          <Route path="/regulations/:id" element={<RegulationDetailPage user={user} />} />
          <Route path="/timeline" element={<TimelinePage user={user} />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/advisor" element={<AIAdvisorPage user={user} />} />
          <Route path="/community" element={<CommunityPage user={user} />} />
          <Route path="/alerts" element={<AlertsPage user={user} />} />
          {isAdmin && (
            <Route path="/analytics" element={<AnalyticsPage />} />
          )}
        </Route>
      </Routes>

      <AuthModal
        open={authModalOpen}
        user={user}
        currentPath={location.pathname}
        currentSearch={location.search}
        onClose={closeAuthModal}
      />
    </>
  )
}

export default App
