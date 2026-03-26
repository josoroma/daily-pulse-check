import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPrice, fetchHistory } from '@/lib/market/stocks'
import { fetchBitcoinPrice, fetchBitcoinHistory } from '@/lib/market/crypto'
import { calculateRsi } from '@/lib/indicators/rsi'
import { calculateMa, type MaType } from '@/lib/indicators/moving-average'
import { fetchMvrvZScore } from '@/lib/bitcoin/valuation'
import {
  evaluatePriceAlert,
  evaluateRsiAlert,
  evaluateMaCrossAlert,
  evaluateMvrvAlert,
  getNotificationType,
} from '@/app/dashboard/alerts/_utils'
import type { AlertRow } from '@/app/dashboard/alerts/_schema'
import { dispatchNotification, type UserChannelConfig } from '@/lib/notifications/dispatcher'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const PRICE_CONDITIONS = new Set(['above', 'below'])
const RSI_CONDITIONS = new Set(['rsi_above', 'rsi_below'])
const MA_CONDITIONS = new Set(['ma_cross_above', 'ma_cross_below'])
const MVRV_CONDITIONS = new Set(['mvrv_above', 'mvrv_below'])

type Notification = {
  user_id: string
  type: string
  title: string
  body: string
  related_id: string
}

/**
 * Cron job: Evaluate all active alerts (price + indicator) against current data.
 * Protected by CRON_SECRET header — only Vercel Cron or manual trigger.
 *
 * Runs every 5 minutes. Groups alerts by symbol to minimize API calls.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Fetch all active, non-triggered alerts
  const { data: alerts, error: fetchError } = await supabase
    .from('alerts')
    .select('*')
    .eq('status', 'active')
    .is('last_triggered_at', null)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ processed: 0, triggered: 0 })
  }

  // Categorize alerts
  const priceAlerts: AlertRow[] = []
  const rsiAlerts: AlertRow[] = []
  const maAlerts: AlertRow[] = []
  const mvrvAlerts: AlertRow[] = []

  for (const alert of alerts as AlertRow[]) {
    if (PRICE_CONDITIONS.has(alert.condition)) priceAlerts.push(alert)
    else if (RSI_CONDITIONS.has(alert.condition)) rsiAlerts.push(alert)
    else if (MA_CONDITIONS.has(alert.condition)) maAlerts.push(alert)
    else if (MVRV_CONDITIONS.has(alert.condition)) mvrvAlerts.push(alert)
  }

  // Collect unique symbols that need price data
  const allAlerts = [...priceAlerts, ...rsiAlerts, ...maAlerts]
  const symbolsNeedingPrice = new Set(allAlerts.map((a) => a.symbol))
  const symbolsNeedingHistory = new Set([...rsiAlerts, ...maAlerts].map((a) => a.symbol))

  // Fetch current prices (one API call per unique symbol)
  const priceMap = new Map<string, number>()
  const historyMap = new Map<string, number[]>()

  // Fetch prices in parallel
  const priceFetches = Array.from(symbolsNeedingPrice).map(async (symbol) => {
    try {
      if (symbol === 'BTC') {
        const btc = await fetchBitcoinPrice()
        priceMap.set('BTC', btc.priceUsd)
      } else {
        const stock = await fetchPrice(symbol)
        priceMap.set(symbol, stock.price)
      }
    } catch (error) {
      console.error(`[alert-cron] Failed to fetch price for ${symbol}:`, error)
    }
  })

  // Determine max history needed per symbol for RSI/MA calculations
  const maxPeriodsPerSymbol = new Map<string, number>()
  for (const alert of [...rsiAlerts, ...maAlerts]) {
    const params = alert.parameters ?? {}
    const period = (params.ma_period as number) ?? (params.rsi_period as number) ?? 200
    // Need period + 1 for RSI, period for MA; add buffer
    const needed = period + 10
    const current = maxPeriodsPerSymbol.get(alert.symbol) ?? 0
    if (needed > current) maxPeriodsPerSymbol.set(alert.symbol, needed)
  }

  // Fetch historical data in parallel
  const historyFetches = Array.from(symbolsNeedingHistory).map(async (symbol) => {
    const outputsize = maxPeriodsPerSymbol.get(symbol) ?? 210
    try {
      if (symbol === 'BTC') {
        const history = await fetchBitcoinHistory(outputsize)
        // CoinGecko returns [timestamp, price] — extract prices oldest first
        historyMap.set(
          'BTC',
          history.prices.map((p) => p.price),
        )
      } else {
        const history = await fetchHistory(symbol, '1day', outputsize)
        // Twelve Data returns newest first — reverse to oldest first
        historyMap.set(symbol, history.values.map((v) => v.close).reverse())
      }
    } catch (error) {
      console.error(`[alert-cron] Failed to fetch history for ${symbol}:`, error)
    }
  })

  await Promise.allSettled([...priceFetches, ...historyFetches])

  // Fetch MVRV Z-Score if any MVRV alerts exist
  let mvrvZScore: number | null = null
  if (mvrvAlerts.length > 0) {
    try {
      const mvrv = await fetchMvrvZScore()
      mvrvZScore = mvrv.zScore
    } catch (error) {
      console.error('[alert-cron] Failed to fetch MVRV Z-Score:', error)
    }
  }

  // Evaluate all alerts
  const notifications: Notification[] = []
  const triggeredAlertIds: string[] = []

  function recordTriggered(alert: AlertRow, title: string, body: string) {
    triggeredAlertIds.push(alert.id)
    notifications.push({
      user_id: alert.user_id,
      type: getNotificationType(alert.condition),
      title,
      body,
      related_id: alert.id,
    })
  }

  // 1. Price alerts
  for (const alert of priceAlerts) {
    const currentPrice = priceMap.get(alert.symbol)
    if (currentPrice === undefined) continue

    const result = evaluatePriceAlert(alert, currentPrice)
    if (result.fired) {
      recordTriggered(
        alert,
        `Alert: ${alert.symbol} ${alert.condition === 'above' ? '↑' : '↓'}`,
        result.message,
      )
    }
  }

  // 2. RSI alerts
  for (const alert of rsiAlerts) {
    const closingPrices = historyMap.get(alert.symbol)
    if (!closingPrices) continue

    const period = (alert.parameters?.rsi_period as number) ?? 14
    if (closingPrices.length < period + 1) continue

    try {
      const rsi = calculateRsi(closingPrices, period)
      const result = evaluateRsiAlert(alert, rsi.value)
      if (result.fired) {
        const arrow = alert.condition === 'rsi_above' ? '↑' : '↓'
        recordTriggered(alert, `Alert: ${alert.symbol} RSI ${arrow}`, result.message)
      }
    } catch (error) {
      console.error(`[alert-cron] RSI calculation failed for ${alert.symbol}:`, error)
    }
  }

  // 3. MA crossover alerts
  for (const alert of maAlerts) {
    const closingPrices = historyMap.get(alert.symbol)
    const currentPrice = priceMap.get(alert.symbol)
    if (!closingPrices || currentPrice === undefined) continue

    const params = alert.parameters ?? {}
    const period = (params.ma_period as number) ?? 200
    const maType = ((params.ma_type as string) ?? 'SMA').toLowerCase() as MaType
    if (closingPrices.length < period) continue

    try {
      const ma = calculateMa(closingPrices, period, maType)
      const result = evaluateMaCrossAlert(alert, currentPrice, ma.value)
      if (result.fired) {
        const arrow = alert.condition === 'ma_cross_above' ? '↑' : '↓'
        recordTriggered(alert, `Alert: ${alert.symbol} MA ${arrow}`, result.message)
      }
    } catch (error) {
      console.error(`[alert-cron] MA calculation failed for ${alert.symbol}:`, error)
    }
  }

  // 4. MVRV alerts (BTC only)
  if (mvrvZScore !== null) {
    for (const alert of mvrvAlerts) {
      const result = evaluateMvrvAlert(alert, mvrvZScore)
      if (result.fired) {
        const arrow = alert.condition === 'mvrv_above' ? '↑' : '↓'
        recordTriggered(alert, `Alert: BTC MVRV ${arrow}`, result.message)
      }
    }
  }

  // Update triggered alerts
  if (triggeredAlertIds.length > 0) {
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'triggered',
        is_active: false,
        last_triggered_at: now,
      })
      .in('id', triggeredAlertIds)

    if (updateError) {
      console.error('[alert-cron] Failed to update alerts:', updateError)
    }
  }

  // Insert notifications
  if (notifications.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(notifications)

    if (insertError) {
      console.error('[alert-cron] Failed to insert notifications:', insertError)
    }

    // Dispatch to external channels (email, telegram)
    const userIds = [...new Set(notifications.map((n) => n.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notification_email_enabled, notification_telegram_enabled, telegram_chat_id')
      .in('id', userIds)

    if (profiles) {
      // Fetch user emails from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]))

      const profileMap = new Map(profiles.map((p) => [p.id, p]))

      const dispatches = notifications.map(async (n) => {
        const profile = profileMap.get(n.user_id)
        if (!profile) return

        // Find the alert to get its notification_channels
        const alert = (alerts as AlertRow[]).find((a) => a.id === n.related_id)
        const channels = alert?.notification_channels ?? ['in_app']

        const config: UserChannelConfig = {
          email: emailMap.get(n.user_id) ?? null,
          notification_email_enabled: profile.notification_email_enabled,
          notification_telegram_enabled: profile.notification_telegram_enabled,
          telegram_chat_id: profile.telegram_chat_id,
        }

        try {
          await dispatchNotification(config, n.title, n.body, channels)
        } catch (error) {
          console.error(`[alert-cron] Dispatch failed for user ${n.user_id}:`, error)
        }
      })

      await Promise.allSettled(dispatches)
    }
  }

  return NextResponse.json({
    processed: alerts.length,
    triggered: triggeredAlertIds.length,
    symbols: Array.from(priceMap.entries()).map(([s, p]) => ({ symbol: s, price: p })),
  })
}
