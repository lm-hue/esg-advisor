import { createClient } from 'npm:@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const DEFAULT_USER_SETTINGS = {
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
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizePassword(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function mapAuthError(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('already been registered')) {
    return 'An account already exists for this email address. Try signing in instead.'
  }

  if (normalizedMessage.includes('password')) {
    return 'Use a stronger password with at least 8 characters.'
  }

  return message
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: 'The auth-signup function is missing Supabase server credentials.',
    })
  }

  const payload = await request.json().catch(() => null)
  const email = normalizeEmail(payload?.email)
  const password = normalizePassword(payload?.password)

  if (!email || !password) {
    return jsonResponse(400, { error: 'Email and password are required.' })
  }

  if (password.length < 8) {
    return jsonResponse(400, { error: 'Use a stronger password with at least 8 characters.' })
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return jsonResponse(400, { error: mapAuthError(error?.message || 'Unable to create this account.') })
  }

  await adminSupabase
    .from('user_settings')
    .upsert(
      {
        user_id: data.user.id,
        ...DEFAULT_USER_SETTINGS,
      },
      { onConflict: 'user_id' }
    )

  return jsonResponse(200, {
    message: 'Account created.',
    requiresEmailConfirmation: false,
  })
})
