import { supabase } from './supabase'

const PASSWORD_MIN_LENGTH = 8

export interface SignupResult {
  requiresEmailConfirmation: boolean
  message?: string
}

function getRedirectUrl() {
  return `${window.location.origin}/auth/callback`
}

function normalizeAuthError(message?: string): string {
  if (!message) return 'Authentication is currently unavailable.'
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'That email and password combination was not recognised.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox or use the resend button below.'
  }
  if (lower.includes('user already registered')) {
    return 'An account already exists for this email. Try signing in instead.'
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment before trying again.'
  }

  return message
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(normalizeAuthError(error.message))
}

export async function signUpWithEmail(email: string, password: string): Promise<SignupResult> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`)
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getRedirectUrl() },
  })

  if (error) throw new Error(normalizeAuthError(error.message))

  // Supabase silently returns an empty identities array when the email is already
  // registered, to prevent user enumeration. Surface a clearer message.
  if (data.user && (data.user.identities ?? []).length === 0) {
    throw new Error('An account already exists for this email. Try signing in instead.')
  }

  const needsConfirmation = !data.session

  return {
    requiresEmailConfirmation: needsConfirmation,
    message: needsConfirmation
      ? 'Check your inbox — we sent a verification link to activate your account.'
      : 'Your account is ready. Signing you in now.',
  }
}

export async function resendSignupConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getRedirectUrl() },
  })
  if (error) throw new Error(normalizeAuthError(error.message))
}
