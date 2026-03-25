'use server'

import { createClient } from '@/lib/supabase/server'

export async function getTodaySummary() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('ai_summaries')
    .select('content, created_at, model_used')
    .eq('user_id', user.id)
    .eq('summary_date', today)
    .single()

  return data
}

export async function getUserAiConfig() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model, risk_tolerance, country, base_currency')
    .eq('id', user.id)
    .single()

  return data
}
