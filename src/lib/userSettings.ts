import { supabase } from './supabase'

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

export async function ensureUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    return data
  }

  const { data: inserted, error: insertError } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      ...DEFAULT_USER_SETTINGS,
    })
    .select()
    .single()

  if (insertError) {
    const { data: existing, error: existingError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError || !existing) {
      throw insertError
    }

    return existing
  }

  return inserted
}

export async function getUserWatchlist(userId: string) {
  const settings = await ensureUserSettings(userId)
  return settings.watched_regulation_ids || []
}

export async function saveUserWatchlist(userId: string, watchedRegulationIds: string[]) {
  await ensureUserSettings(userId)

  const { error } = await supabase
    .from('user_settings')
    .update({ watched_regulation_ids: watchedRegulationIds })
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
