import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import OnboardingModal from '../components/OnboardingModal'
import AuthPanel from '../components/AuthPanel'
import { ensureUserSettings } from '../lib/userSettings'
import { Leaf } from 'lucide-react'

export default function AuthPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setUser(data.session.user)
        await checkOnboarding(data.session.user.id)
      }
      setLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await checkOnboarding(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const checkOnboarding = async (userId: string) => {
    try {
      const settings = await ensureUserSettings(userId)
      setUserSettings(settings)

      if (!settings.onboarding_completed) {
        setShowOnboarding(true)
      } else {
        navigate('/esg-home')
      }
    } catch (error) {
      console.error('Error checking onboarding:', error)
    }
  }

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    navigate('/esg-home')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="surface-card flex items-center gap-3 px-5 py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Loading sign-in...</p>
        </div>
      </div>
    )
  }

  if (user && showOnboarding && userSettings) {
    return <OnboardingModal userSettings={userSettings} userId={user.id} onComplete={handleOnboardingComplete} />
  }

  if (user && !showOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="surface-card flex items-center gap-3 px-5 py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Preparing workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-10 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                <Leaf size={16} />
              </span>
              ESG Compass Advisor Workspace
            </div>
            <h1 className="font-display text-5xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              Sustainability compliance, styled like the reference app.
            </h1>
            <p className="mt-4 text-lg leading-8 text-[hsl(var(--muted-foreground))]">
              Sign in to track regulations, monitor deadlines, configure alerts, and ask your AI advisor questions about ESG reporting obligations.
            </p>
          </div>
        </div>

        <div className="surface-card mx-auto w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
              <Leaf size={20} />
            </div>
            <h1 className="font-display text-3xl font-semibold text-[hsl(var(--foreground))]">ESG Compass</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Your AI-powered ESG compliance guide</p>
          </div>

          <AuthPanel />
        </div>
      </div>
    </div>
  )
}
