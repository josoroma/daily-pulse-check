'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  AiModelSchema,
  SaveApiKeySchema,
  ServiceSchema,
  NotificationPreferencesSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
  ImportPositionsSchema,
} from './_schema'
import { sanitizeExportData } from './_utils'
import { toISO } from '@/lib/date'
import { encrypt } from '@/lib/encryption'

export async function updateAiModel(formData: FormData) {
  const raw = {
    ai_provider: formData.get('ai_provider'),
    ai_model: formData.get('ai_model'),
  }

  const parsed = AiModelSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ai_provider: parsed.data.ai_provider,
      ai_model: parsed.data.ai_model,
      updated_at: toISO(new Date()),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function getAiPreferences() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model')
    .eq('id', user.id)
    .single()

  return data
}

export async function getNotificationPreferences() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('notification_email_enabled, notification_telegram_enabled, telegram_chat_id')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateNotificationPreferences(formData: FormData) {
  const raw = {
    notification_email_enabled: formData.get('notification_email_enabled'),
    notification_telegram_enabled: formData.get('notification_telegram_enabled'),
    telegram_chat_id: formData.get('telegram_chat_id') ?? '',
  }

  const parsed = NotificationPreferencesSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      notification_email_enabled: parsed.data.notification_email_enabled,
      notification_telegram_enabled: parsed.data.notification_telegram_enabled,
      telegram_chat_id: parsed.data.telegram_chat_id || null,
      updated_at: toISO(new Date()),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ============================================================
// API Key Management
// ============================================================

export async function getApiKeyStatuses() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return {}

  const { data } = await supabase
    .from('user_api_keys')
    .select('service, is_valid, last_verified_at')
    .eq('user_id', user.id)

  const statuses: Record<
    string,
    { hasKey: boolean; isValid: boolean | null; lastVerified: string | null }
  > = {}
  for (const row of data ?? []) {
    statuses[row.service] = {
      hasKey: true,
      isValid: row.is_valid,
      lastVerified: row.last_verified_at,
    }
  }
  return statuses
}

export async function saveApiKey(formData: FormData) {
  const raw = {
    service: formData.get('service'),
    api_key: formData.get('api_key'),
  }

  const parsed = SaveApiKeySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const encryptedKey = encrypt(parsed.data.api_key)
  const now = toISO(new Date())

  const { error } = await supabase.from('user_api_keys').upsert(
    {
      user_id: user.id,
      service: parsed.data.service,
      encrypted_key: encryptedKey,
      is_valid: null,
      last_verified_at: null,
      updated_at: now,
    },
    { onConflict: 'user_id,service' },
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteApiKey(formData: FormData) {
  const parsed = ServiceSchema.safeParse({ service: formData.get('service') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid service' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('service', parsed.data.service)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function testApiKey(formData: FormData) {
  const parsed = ServiceSchema.safeParse({ service: formData.get('service') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid service' }
  }
  const service = parsed.data.service

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the encrypted key
  const { data: keyRow } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('service', service)
    .single()

  if (!keyRow) {
    return { error: 'No API key found for this service' }
  }

  // Decrypt and test connectivity
  const { decrypt } = await import('@/lib/encryption')
  const apiKey = decrypt(keyRow.encrypted_key)

  let isValid = false
  try {
    if (service === 'twelve_data') {
      const res = await fetch(
        `https://api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=1&apikey=${encodeURIComponent(apiKey)}`,
      )
      const data = await res.json()
      isValid = !data.code || data.status !== 'error'
    } else if (service === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      isValid = res.ok
    } else if (service === 'fred') {
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series?series_id=DFF&api_key=${encodeURIComponent(apiKey)}&file_type=json`,
      )
      isValid = res.ok
    } else if (service === 'coingecko') {
      const res = await fetch('https://api.coingecko.com/api/v3/ping', {
        headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : {},
      })
      isValid = res.ok
    }
  } catch {
    isValid = false
  }

  // Update verification status
  const { error: updateError } = await supabase
    .from('user_api_keys')
    .update({
      is_valid: isValid,
      last_verified_at: toISO(new Date()),
      updated_at: toISO(new Date()),
    })
    .eq('user_id', user.id)
    .eq('service', service)

  if (updateError) {
    return { error: updateError.message }
  }

  if (!isValid) {
    return { error: 'Connection test failed — check your API key' }
  }

  return { success: true }
}

// ============================================================
// Data Export
// ============================================================

export async function exportAllData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const [
    { data: profile },
    { data: portfolios },
    { data: positions },
    { data: transactions },
    { data: dcaSchedules },
    { data: alerts },
    { data: snapshots },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'display_name, base_currency, country, risk_tolerance, ai_provider, ai_model, notification_email_enabled, notification_telegram_enabled, created_at',
      )
      .eq('id', user.id)
      .single(),
    supabase
      .from('portfolios')
      .select('name, description, target_allocations, created_at')
      .eq('user_id', user.id),
    supabase
      .from('positions')
      .select('asset_type, symbol, quantity, average_buy_price, notes, created_at')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('type, quantity, price, fee, executed_at, notes, created_at')
      .eq('user_id', user.id),
    supabase
      .from('dca_schedules')
      .select('symbol, asset_type, amount, frequency, is_active, next_execution_at, created_at')
      .eq('user_id', user.id),
    supabase
      .from('alerts')
      .select(
        'symbol, asset_type, condition, threshold, status, notification_channels, parameters, created_at',
      )
      .eq('user_id', user.id),
    supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_value, positions_data, created_at')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(365),
  ])

  return sanitizeExportData({
    exportedAt: toISO(new Date()),
    version: '1.0.0',
    profile: profile ?? null,
    portfolios: portfolios ?? [],
    positions: positions ?? [],
    transactions: transactions ?? [],
    dcaSchedules: dcaSchedules ?? [],
    alerts: alerts ?? [],
    portfolioSnapshots: snapshots ?? [],
  })
}

// ============================================================
// Password Change
// ============================================================

export async function changePassword(formData: FormData) {
  const raw = {
    current_password: formData.get('current_password'),
    new_password: formData.get('new_password'),
    confirm_password: formData.get('confirm_password'),
  }

  const parsed = ChangePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!user.email) {
    return { error: 'Account has no email address' }
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  })

  if (signInError) {
    return { error: 'Current password is incorrect' }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// ============================================================
// Account Deletion
// ============================================================

export async function deleteAccount(formData: FormData) {
  const raw = {
    confirmation_email: formData.get('confirmation_email'),
  }

  const parsed = DeleteAccountSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify the confirmation email matches
  if (parsed.data.confirmation_email !== user.email) {
    return { error: 'Email does not match your account email' }
  }

  // Use admin client to delete the auth user (cascade deletes handle all data)
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    return { error: error.message }
  }

  // Sign out the current session
  await supabase.auth.signOut()

  redirect('/')
}

// ============================================================
// CSV Import
// ============================================================

export async function importPositions(
  portfolioId: string,
  positions: Array<{
    symbol: string
    asset_type: string
    quantity: number
    average_buy_price: number
    notes?: string
  }>,
) {
  const parsed = ImportPositionsSchema.safeParse({ portfolioId, positions })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify the portfolio belongs to the user
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', parsed.data.portfolioId)
    .eq('user_id', user.id)
    .single()

  if (!portfolio) {
    return { error: 'Portfolio not found' }
  }

  const now = toISO(new Date())
  const rows = parsed.data.positions.map((p) => ({
    user_id: user.id,
    portfolio_id: parsed.data.portfolioId,
    asset_type: p.asset_type,
    symbol: p.symbol,
    quantity: p.quantity,
    average_buy_price: p.average_buy_price,
    notes: p.notes ?? null,
    created_at: now,
    updated_at: now,
  }))

  const { error, data } = await supabase.from('positions').insert(rows).select('id')

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/portfolio')
  return { success: true, count: data?.length ?? 0 }
}
