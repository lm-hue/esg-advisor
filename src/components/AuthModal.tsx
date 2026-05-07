import { useEffect, useState } from 'react'
import { X, Leaf } from 'lucide-react'
import { ensureUserSettings } from '../lib/userSettings'
import OnboardingModal from './OnboardingModal'
import AuthPanel from './AuthPanel'

interface AuthModalProps {
  open: boolean
  user: any
  onClose: () => void
}

export default function AuthModal({ open, user, onClose }: AuthModalProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowOnboarding(false)
      setUserSettings(null)
      setLoading(false)
      return
    }

    if (!user) {
      setShowOnboarding(false)
      setUserSettings(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const loadSettings = async () => {
      setLoading(true)

      try {
        const settings = await ensureUserSettings(user.id)
        if (cancelled) return

        setUserSettings(settings)

        if (settings.onboarding_completed) {
          setShowOnboarding(false)
          onClose()
        } else {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Error preparing sign-in modal:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [open, user, onClose])

  if (!open) return null

  if (user && showOnboarding && userSettings) {
    return (
      <OnboardingModal
        userSettings={userSettings}
        userId={user.id}
        onComplete={() => {
          setShowOnboarding(false)
          onClose()
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))/0.38] p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0"
        aria-label="Close sign-in modal"
      />

      <div className="surface-card relative z-10 w-full max-w-4xl overflow-hidden border-[hsl(var(--border))/0.9] shadow-2xl">
        <div className="grid md:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden border-r border-[hsl(var(--border))] bg-[linear-gradient(180deg,rgba(245,248,245,0.96)_0%,rgba(238,244,240,0.94)_100%)] p-8 md:block">
            <div className="inline-flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-white/90 px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                <Leaf size={16} />
              </span>
              ESG Compass Advisor Workspace
            </div>

            <div className="mt-10 max-w-sm">
              <h2 className="font-display text-4xl font-semibold leading-tight text-[hsl(var(--foreground))]">
                Sign in without leaving your workspace.
              </h2>
              <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">
                Track regulations, save a watchlist, and configure alerts right from the current page.
              </p>
            </div>
          </div>

          <div className="relative bg-white p-6 sm:p-8">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              aria-label="Close sign-in"
            >
              <X size={18} />
            </button>

            <div className="mx-auto max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                  <Leaf size={20} />
                </div>
                <h1 className="font-display text-3xl font-semibold text-[hsl(var(--foreground))]">ESG Compass</h1>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Your AI-powered ESG compliance guide</p>
              </div>

              {user && loading ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">Preparing workspace...</p>
                  </div>
                </div>
              ) : (
                <AuthPanel embedded />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
