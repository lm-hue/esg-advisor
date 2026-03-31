import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import RegulationsPage from './pages/RegulationsPage'
import RegulationDetailPage from './pages/RegulationDetailPage'
import TimelinePage from './pages/TimelinePage'
import ComplianceTrackerPage from './pages/ComplianceTrackerPage'
import AIAdvisorPage from './pages/AIAdvisorPage'
import CommunityPage from './pages/CommunityPage'
import AlertsPage from './pages/AlertsPage'
import GlossaryPage from './pages/GlossaryPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setUser(data.session.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.session.user.id)
          .single()
        setIsAdmin(profile?.is_admin || false)
      }
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()
          setIsAdmin(profile?.is_admin || false)
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/glossary" element={<GlossaryPage />} />

      <Route
        element={
          <AuthGuard user={user}>
            <Layout user={user} isAdmin={isAdmin} />
          </AuthGuard>
        }
      >
        <Route path="/" element={<Navigate to="/regulations" replace />} />
        <Route path="/regulations" element={<RegulationsPage user={user} />} />
        <Route path="/regulations/:id" element={<RegulationDetailPage user={user} />} />
        <Route path="/timeline" element={<TimelinePage user={user} />} />
        <Route path="/tracker" element={<ComplianceTrackerPage user={user} />} />
        <Route path="/advisor" element={<AIAdvisorPage user={user} />} />
        <Route path="/community" element={<CommunityPage user={user} />} />
        <Route path="/alerts" element={<AlertsPage user={user} />} />
        {isAdmin && (
          <Route path="/analytics" element={<AnalyticsPage />} />
        )}
      </Route>
    </Routes>
  )
}

export default App
