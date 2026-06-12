import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    // Check for an error forwarded by Supabase in the URL (e.g. expired link)
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error_description') || params.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError.replace(/\+/g, ' ')))
      return
    }

    // The Supabase client (detectSessionInUrl: true by default) automatically
    // reads the #access_token from the URL hash and establishes the session.
    // We listen for that event and redirect once confirmed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/esg-home', { replace: true })
      }
    })

    // Fallback: if the session was already set before this component mounted
    // (race condition on fast connections), getSession will catch it.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/esg-home', { replace: true })
      }
    })

    // Safety timeout — something went wrong if we're still here after 12 s.
    const timeout = setTimeout(() => {
      setError(
        'The verification link has expired or has already been used. Request a new one from the sign-in page.'
      )
    }, 12000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="surface-card max-w-sm w-full px-6 py-8 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <a
            href="/esg-home?auth=1"
            className="mt-5 inline-block text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="surface-card flex items-center gap-3 px-5 py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">Verifying your email…</p>
      </div>
    </div>
  )
}
