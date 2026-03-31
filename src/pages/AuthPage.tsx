import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import OnboardingModal from '../components/OnboardingModal'

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await checkOnboarding(session.user.id)
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const checkOnboarding = async (userId: string) => {
    try {
      let { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No user settings found, create default
        const { data: newSettings } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            industry: '',
            regions: [],
            esg_categories: [],
            watched_regulation_ids: [],
            onboarding_completed: false,
            alerts_enabled: true,
            alert_categories: [],
            alert_regions: [],
            alert_keywords: [],
            alert_frequency: 'weekly',
          })
          .select()
          .single()
        setUserSettings(newSettings)
        setShowOnboarding(true)
      } else if (data) {
        setUserSettings(data)
        if (!data.onboarding_completed) {
          setShowOnboarding(true)
        } else {
          navigate('/regulations')
        }
      }
    } catch (error) {
      console.error('Error checking onboarding:', error)
    }
  }

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    navigate('/regulations')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && showOnboarding && userSettings) {
    return <OnboardingModal userSettings={userSettings} userId={user.id} onComplete={handleOnboardingComplete} />
  }

  if (user && !showOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ESG Advisor</h1>
          <p className="text-slate-600">Your AI-powered ESG compliance guide</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          redirectTo={`${window.location.origin}/regulations`}
        />
      </div>
    </div>
  )
}
