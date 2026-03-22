'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { daysAgoCR } from '@/lib/date'
import {
  CreatePositionSchema,
  UpdatePositionSchema,
  CreateTransactionSchema,
} from '@/app/portfolio/_schema'
import {
  calculateWeightedAverageCostBasis,
  calculateRealizedPnL,
  validateSellQuantity,
} from './_utils'

// ============================================================
// Portfolio
// ============================================================

export async function getOrCreatePortfolio() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (existing) return { data: existing }

  const { data: created, error } = await supabase
    .from('portfolios')
    .insert({ user_id: user.id, name: 'Main Portfolio' })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: created }
}

export async function getPortfolio() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return data
}

export async function updateTargetAllocations(
  portfolioId: string,
  allocations: Record<string, number>,
) {
  const total = Object.values(allocations).reduce((sum, v) => sum + v, 0)
  if (Math.abs(total - 100) > 0.01) {
    return { error: 'Allocations must sum to 100%' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('portfolios')
    .update({ target_allocations: allocations })
    .eq('id', portfolioId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/portfolio')
  return { success: true }
}

// ============================================================
// Positions
// ============================================================

export async function getPositions() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createPosition(formData: FormData) {
  const raw = {
    portfolio_id: formData.get('portfolio_id'),
    asset_type: formData.get('asset_type'),
    symbol: formData.get('symbol'),
    quantity: Number(formData.get('quantity')),
    average_buy_price: Number(formData.get('average_buy_price')),
    notes: formData.get('notes') || undefined,
  }

  const parsed = CreatePositionSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('positions').insert({
    user_id: user.id,
    portfolio_id: parsed.data.portfolio_id,
    asset_type: parsed.data.asset_type,
    symbol: parsed.data.symbol,
    quantity: parsed.data.quantity,
    average_buy_price: parsed.data.average_buy_price,
    notes: parsed.data.notes ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/portfolio')
  return { success: true }
}

export async function updatePosition(formData: FormData) {
  const raw = {
    id: formData.get('id'),
    portfolio_id: formData.get('portfolio_id') || undefined,
    asset_type: formData.get('asset_type') || undefined,
    symbol: formData.get('symbol') || undefined,
    quantity: formData.get('quantity') ? Number(formData.get('quantity')) : undefined,
    average_buy_price: formData.get('average_buy_price')
      ? Number(formData.get('average_buy_price'))
      : undefined,
    notes: formData.get('notes') || undefined,
  }

  const parsed = UpdatePositionSchema.safeParse(raw)
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
    .from('positions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/portfolio')
  return { success: true }
}

export async function deletePosition(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('positions').delete().eq('id', id).eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/portfolio')
  return { success: true }
}

// ============================================================
// Transactions
// ============================================================

export async function getTransactions(positionId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('transactions')
    .select('*, position:positions(symbol, asset_type)')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: false })

  if (positionId) {
    query = query.eq('position_id', positionId)
  }

  const { data } = await query
  return data ?? []
}

export async function createTransaction(formData: FormData) {
  const raw = {
    position_id: formData.get('position_id'),
    type: formData.get('type'),
    quantity: Number(formData.get('quantity')),
    price: Number(formData.get('price')),
    fee: formData.get('fee') ? Number(formData.get('fee')) : 0,
    executed_at: formData.get('executed_at'),
    notes: formData.get('notes') || undefined,
  }

  const parsed = CreateTransactionSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch current position
  const { data: position } = await supabase
    .from('positions')
    .select('*')
    .eq('id', parsed.data.position_id)
    .eq('user_id', user.id)
    .single()

  if (!position) return { error: 'Position not found' }

  const txType = parsed.data.type

  // Oversell prevention for Sell transactions
  if (txType === 'Sell') {
    const check = validateSellQuantity(Number(position.quantity), parsed.data.quantity)
    if (!check.valid) return { error: check.error }
  }

  // Insert the transaction
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    position_id: parsed.data.position_id,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    price: parsed.data.price,
    fee: parsed.data.fee,
    executed_at: parsed.data.executed_at.toISOString(),
    notes: parsed.data.notes ?? null,
  })

  if (txError) return { error: txError.message }

  // Update position based on transaction type
  if (txType === 'Buy' || txType === 'DCA') {
    const newAvgPrice = calculateWeightedAverageCostBasis(
      Number(position.quantity),
      Number(position.average_buy_price),
      parsed.data.quantity,
      parsed.data.price,
    )
    const newQuantity = Number(position.quantity) + parsed.data.quantity

    await supabase
      .from('positions')
      .update({ quantity: newQuantity, average_buy_price: newAvgPrice })
      .eq('id', position.id)
      .eq('user_id', user.id)
  } else if (txType === 'Sell') {
    const newQuantity = Number(position.quantity) - parsed.data.quantity

    if (newQuantity <= 0) {
      await supabase.from('positions').delete().eq('id', position.id).eq('user_id', user.id)
    } else {
      await supabase
        .from('positions')
        .update({ quantity: newQuantity })
        .eq('id', position.id)
        .eq('user_id', user.id)
    }
  }

  revalidatePath('/dashboard/portfolio')
  return {
    success: true,
    realizedPnl:
      txType === 'Sell'
        ? calculateRealizedPnL(
            parsed.data.quantity,
            parsed.data.price,
            Number(position.average_buy_price),
            parsed.data.fee,
          )
        : undefined,
  }
}

// ============================================================
// Portfolio Snapshots
// ============================================================

export async function getPortfolioSnapshots(days: number | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: true })

  if (days !== null) {
    query = query.gte('snapshot_date', daysAgoCR(days))
  }

  const { data } = await query
  return data ?? []
}
