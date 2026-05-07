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
import CompareRegionsPage from './pages/CompareRegionsPage'
import AssessmentPage from './pages/AssessmentPage'
import WorldMapPage from './pages/WorldMapPage'
import GuidePage from './pages/GuidePage'
import DirectionTwoConceptPage from './pages/DirectionTwoConceptPage'
import SourceDocumentPage from './pages/SourceDocumentPage'
import AuthCallbackPage from './pages/AuthCallbackPage'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          // Fetch profile role in background — don't block the loading state
          supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data: profile }) => setIsAdmin(profile?.role === 'admin'), () => {})
        } else {
          setUser(null)
          setIsAdmin(false)
        }
        if (!initialized) {
          initialized = true
          setLoading(false)
        }
      }
    )

    // Safety net: clear spinner if onAuthStateChange never fires
    const timeout = setTimeout(() => {
      if (!initialized) {
        initialized = true
        setLoading(false)
      }
    }, 8000)

    return () => {
      subscription?.unsubscribe()
      clearTimeout(timeout)
    }
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
      navigate('/esg-home', { replace: true })
      return
    }

    navigate(withoutAuthModal(location.pathname, location.search), { replace: true })
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Navigate to="/esg-home?auth=1" replace />} />
        <Route path="/regulations" element={<Navigate to="/esg-home" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<Layout user={user} isAdmin={isAdmin} />}>
          <Route path="/" element={<Navigate to="/esg-home" replace />} />
          <Route path="/esg-home" element={<RegulationsPage user={user} />} />
          <Route path="/esg-home/:id" element={<RegulationDetailPage user={user} />} />
          <Route path="/sources/:documentId" element={<SourceDocumentPage />} />
          <Route path="/timeline" element={<TimelinePage user={user} />} />
          <Route path="/compare" element={<CompareRegionsPage />} />
          <Route path="/regulatory-map" element={<WorldMapPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/how-it-works" element={<GuidePage user={user} />} />
          <Route path="/framework-library" element={<DirectionTwoConceptPage user={user} />} />
          <Route path="/framework-library/:id" element={<RegulationDetailPage user={user} />} />
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
        onClose={closeAuthModal}
      />
    </>
  )
}

export default App
