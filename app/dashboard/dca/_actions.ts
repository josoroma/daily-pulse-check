'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateDcaScheduleSchema, UpdateDcaScheduleSchema } from './_schema'

// ============================================================
// DCA Schedules
// ============================================================

export async function getDcaSchedules() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('dca_schedules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createDcaSchedule(formData: FormData) {
  const raw = {
    portfolio_id: formData.get('portfolio_id'),
    symbol: formData.get('symbol'),
    asset_type: formData.get('asset_type'),
    amount: Number(formData.get('amount')),
    frequency: formData.get('frequency'),
    day_of_week: formData.get('day_of_week') ? Number(formData.get('day_of_week')) : null,
    day_of_month: formData.get('day_of_month') ? Number(formData.get('day_of_month')) : null,
  }

  const parsed = CreateDcaScheduleSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('dca_schedules').insert({
    user_id: user.id,
    portfolio_id: parsed.data.portfolio_id,
    symbol: parsed.data.symbol,
    asset_type: parsed.data.asset_type,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    day_of_week: parsed.data.day_of_week ?? null,
    day_of_month: parsed.data.day_of_month ?? null,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/dca')
  return { success: true }
}

export async function updateDcaSchedule(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
    frequency: formData.get('frequency') || undefined,
    day_of_week:
      formData.get('day_of_week') != null ? Number(formData.get('day_of_week')) : undefined,
    day_of_month:
      formData.get('day_of_month') != null ? Number(formData.get('day_of_month')) : undefined,
    is_active: formData.get('is_active') != null ? formData.get('is_active') === 'true' : undefined,
  }

  const parsed = UpdateDcaScheduleSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { id, ...updates } = parsed.data
  const { error } = await supabase
    .from('dca_schedules')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/dca')
  return { success: true }
}

export async function toggleDcaSchedule(id: string, isActive: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('dca_schedules')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/dca')
  return { success: true }
}

export async function deleteDcaSchedule(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('dca_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/dca')
  return { success: true }
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// DCA Transactions (for analytics)
// ============================================================

export async function getDcaTransactions(symbol?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('transactions')
    .select('*, position:positions(symbol, asset_type)')
    .eq('user_id', user.id)
    .eq('type', 'DCA')
    .order('executed_at', { ascending: true })

  if (symbol) {
    query = query.eq('position.symbol', symbol)
  }

  const { data } = await query
  return data ?? []
}

// ============================================================
// Mark DCA as Done (records a transaction from a reminder)
// ============================================================

export async function markDcaAsDone(
  scheduleId: string,
  executionPrice: number,
  executionQuantity: number,
) {
  if (executionPrice <= 0 || executionQuantity <= 0) {
    return { error: 'Price and quantity must be positive' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the schedule to get symbol, amount, portfolio
  const { data: schedule, error: scheduleError } = await supabase
    .from('dca_schedules')
    .select('id, portfolio_id, symbol, asset_type, amount')
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .single()

  if (scheduleError || !schedule) {
    return { error: 'Schedule not found' }
  }

  // Find or create the position for this symbol
  const { data: position } = await supabase
    .from('positions')
    .select('id, quantity, average_buy_price')
    .eq('portfolio_id', schedule.portfolio_id)
    .eq('symbol', schedule.symbol)
    .eq('user_id', user.id)
    .single()

  const price = executionPrice
  const quantity = executionQuantity

  if (position) {
    // Update existing position: adjust average buy price and quantity
    const oldTotal = position.quantity * position.average_buy_price
    const newQuantity = position.quantity + quantity
    const newAvgPrice = (oldTotal + price * quantity) / newQuantity

    const { error: updateError } = await supabase
      .from('positions')
      .update({
        quantity: newQuantity,
        average_buy_price: newAvgPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', position.id)
      .eq('user_id', user.id)

    if (updateError) return { error: updateError.message }

    // Record the transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      position_id: position.id,
      type: 'DCA',
      quantity,
      price,
      fee: 0,
      executed_at: new Date().toISOString(),
    })

    if (txError) return { error: txError.message }
  } else {
    // Create new position
    const { data: newPosition, error: createError } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        portfolio_id: schedule.portfolio_id,
        symbol: schedule.symbol,
        asset_type: schedule.asset_type,
        quantity,
        average_buy_price: price,
      })
      .select('id')
      .single()

    if (createError || !newPosition)
      return { error: createError?.message ?? 'Failed to create position' }

    // Record the transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      position_id: newPosition.id,
      type: 'DCA',
      quantity,
      price,
      fee: 0,
      executed_at: new Date().toISOString(),
    })

    if (txError) return { error: txError.message }
  }

  // Mark related notifications as read
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('related_id', scheduleId)
    .eq('user_id', user.id)
    .eq('read', false)

  revalidatePath('/dashboard/dca')
  revalidatePath('/dashboard/portfolio')
  return { success: true }
}
