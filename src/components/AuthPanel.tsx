import { FormEvent, useState } from 'react'
import { resendSignupConfirmation, signInWithEmail, signUpWithEmail } from '../lib/auth'

type AuthMode = 'signin' | 'signup'

interface AuthPanelProps {
  embedded?: boolean
}

export default function AuthPanel({ embedded = false }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('')
  const [resendingEmail, setResendingEmail] = useState(false)

  const clearStatus = () => {
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearStatus()

    if (!email.trim() || !password) {
      setErrorMessage('Enter both your email address and password.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Your passwords do not match yet.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password)
        setPendingConfirmationEmail('')
        setSuccessMessage('Signing you in...')
      } else {
        const result = await signUpWithEmail(email.trim(), password)
        setSuccessMessage(result.message || 'Your account is ready.')
        setPendingConfirmationEmail(result.requiresEmailConfirmation ? email.trim() : '')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingConfirmationEmail) return

    clearStatus()
    setResendingEmail(true)

    try {
      await resendSignupConfirmation(pendingConfirmationEmail)
      setSuccessMessage(`Another verification email was sent to ${pendingConfirmationEmail}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resend the verification email.')
    } finally {
      setResendingEmail(false)
    }
  }

  const panelPadding = embedded ? '' : 'rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm'

  return (
    <div className={panelPadding}>
      <div className="mb-6 flex rounded-xl bg-[hsl(var(--muted))] p-1">
        <button
          type="button"
          onClick={() => {
            clearStatus()
            setMode('signin')
            setPendingConfirmationEmail('')
          }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'signin'
              ? 'bg-white text-[hsl(var(--foreground))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            clearStatus()
            setMode('signup')
          }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'signup'
              ? 'bg-white text-[hsl(var(--foreground))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
            Work email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="ui-input"
            placeholder="name@company.com"
            disabled={loading || resendingEmail}
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ui-input"
            placeholder={mode === 'signin' ? 'Enter your password' : 'Use at least 8 characters'}
            disabled={loading || resendingEmail}
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
              Confirm password
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="ui-input"
              placeholder="Repeat your password"
              disabled={loading || resendingEmail}
            />
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        <button type="submit" disabled={loading || resendingEmail} className="ui-button-primary w-full">
          {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {pendingConfirmationEmail && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            If your project still requires email confirmation, use the resend button below after checking spam and promotions folders.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendingEmail}
            className="ui-button-secondary mt-3 w-full"
          >
            {resendingEmail ? 'Sending...' : 'Resend verification email'}
          </button>
        </div>
      )}
    </div>
  )
}
