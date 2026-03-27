'use server'

import { createClient } from '@/lib/supabase/server'
import { daysAgoCR } from '@/lib/date'

// ============================================================
// Analytics Data Fetching
// ============================================================

export async function getAnalyticsPositions() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('positions')
    .select('*, portfolio:portfolios(id, name)')
    .eq('user_id', user.id)
    .order('symbol', { ascending: true })

  return data ?? []
}

export async function getAnalyticsSnapshots(days: number | null = null) {
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

export async function getAnalyticsTransactions(year?: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('transactions')
    .select('*, position:positions(symbol, asset_type)')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: true })

  if (year) {
    const startDate = `${year}-01-01T00:00:00.000Z`
    const endDate = `${year + 1}-01-01T00:00:00.000Z`
    query = query.gte('executed_at', startDate).lt('executed_at', endDate)
  }

  const { data } = await query
  return data ?? []
}

export async function getDcaScheduleStats(year: number, month?: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { scheduled: 0, executed: 0 }

  // Get all active DCA schedules to figure out how many were due
  const { data: schedules } = await supabase
    .from('dca_schedules')
    .select('*')
    .eq('user_id', user.id)

  if (!schedules || schedules.length === 0) return { scheduled: 0, executed: 0 }

  // Count DCA transactions in the period
  let txQuery = supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('type', 'DCA')

  if (month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`
    txQuery = txQuery.gte('executed_at', startDate).lt('executed_at', endDate)
  } else {
    const startDate = `${year}-01-01T00:00:00.000Z`
    const endDate = `${year + 1}-01-01T00:00:00.000Z`
    txQuery = txQuery.gte('executed_at', startDate).lt('executed_at', endDate)
  }

  const { count: executedCount } = await txQuery

  // Estimate scheduled count based on active schedules × period
  const monthsInPeriod = month ? 1 : 12
  let scheduledCount = 0
  for (const schedule of schedules) {
    if (schedule.frequency === 'Daily') {
      scheduledCount += 30 * monthsInPeriod
    } else if (schedule.frequency === 'Weekly') {
      scheduledCount += 4 * monthsInPeriod
    } else if (schedule.frequency === 'Biweekly') {
      scheduledCount += 2 * monthsInPeriod
    } else if (schedule.frequency === 'Monthly') {
      scheduledCount += monthsInPeriod
    }
  }

  return { scheduled: scheduledCount, executed: executedCount ?? 0 }
}

export async function getUserCountry(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'US'

  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user.id)
    .single()

  return profile?.country ?? 'US'
}

export async function getTransactionYears(): Promise<number[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return [new Date().getFullYear()]

  const { data } = await supabase
    .from('transactions')
    .select('executed_at')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: true })

  if (!data || data.length === 0) return [new Date().getFullYear()]

  const years = new Set<number>()
  for (const tx of data) {
    years.add(new Date(tx.executed_at).getFullYear())
  }

  return Array.from(years).sort((a, b) => b - a)
}
