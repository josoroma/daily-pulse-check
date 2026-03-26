'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateAlertSchema, UpdateAlertSchema, SYMBOL_ASSET_MAP } from './_schema'

const uuidSchema = z.string().uuid()

// ============================================================
// Queries
// ============================================================

export async function getAlerts() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ============================================================
// Mutations
// ============================================================

export async function createAlert(formData: FormData) {
  const raw = {
    symbol: formData.get('symbol'),
    condition: formData.get('condition'),
    threshold: Number(formData.get('threshold')),
    notification_channels:
      formData.getAll('notification_channels').length > 0
        ? formData.getAll('notification_channels')
        : ['in_app'],
    parameters: {
      rsi_period: formData.get('rsi_period') ? Number(formData.get('rsi_period')) : undefined,
      ma_period: formData.get('ma_period') ? Number(formData.get('ma_period')) : undefined,
      ma_type: formData.get('ma_type') || undefined,
    },
  }

  const parsed = CreateAlertSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const assetType = SYMBOL_ASSET_MAP[parsed.data.symbol]
  if (!assetType) return { error: 'Unknown symbol' }

  const { error } = await supabase.from('alerts').insert({
    user_id: user.id,
    symbol: parsed.data.symbol,
    asset_type: assetType,
    condition: parsed.data.condition,
    threshold: parsed.data.threshold,
    notification_channels: parsed.data.notification_channels,
    parameters: parsed.data.parameters,
    status: 'active',
    is_active: true,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/alerts')
  return { success: true }
}

export async function updateAlert(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    status: formData.get('status') || undefined,
    threshold: formData.get('threshold') ? Number(formData.get('threshold')) : undefined,
    notification_channels:
      formData.getAll('notification_channels').length > 0
        ? formData.getAll('notification_channels')
        : undefined,
  }

  const parsed = UpdateAlertSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { id, ...updates } = parsed.data

  // Sync is_active with status
  const updatePayload: Record<string, unknown> = { ...updates }
  if (updates.status) {
    updatePayload.is_active = updates.status === 'active'
  }

  const { error } = await supabase
    .from('alerts')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/alerts')
  return { success: true }
}

export async function toggleAlertStatus(id: string, status: 'active' | 'paused') {
  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) return { error: 'Invalid alert ID' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('alerts')
    .update({
      status,
      is_active: status === 'active',
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/alerts')
  return { success: true }
}

export async function deleteAlert(id: string) {
  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) return { error: 'Invalid alert ID' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('alerts').delete().eq('id', id).eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/alerts')
  return { success: true }
}
