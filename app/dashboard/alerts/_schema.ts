import { z } from 'zod'

// ============================================================
// Constants
// ============================================================

export const ALERT_SYMBOLS = ['VOO', 'QQQ', 'BTC'] as const
export const ASSET_TYPES = ['ETF', 'Crypto'] as const
export const ALERT_STATUSES = ['active', 'triggered', 'paused'] as const

export const PRICE_CONDITIONS = ['above', 'below'] as const
export const INDICATOR_CONDITIONS = [
  'rsi_above',
  'rsi_below',
  'ma_cross_above',
  'ma_cross_below',
  'mvrv_above',
  'mvrv_below',
] as const

export const ALL_CONDITIONS = [...PRICE_CONDITIONS, ...INDICATOR_CONDITIONS] as const

export type AlertStatus = (typeof ALERT_STATUSES)[number]
export type AlertCondition = (typeof ALL_CONDITIONS)[number]

// ============================================================
// Symbol → asset type mapping
// ============================================================

export const SYMBOL_ASSET_MAP: Record<string, 'ETF' | 'Crypto'> = {
  VOO: 'ETF',
  QQQ: 'ETF',
  BTC: 'Crypto',
}

// ============================================================
// Condition display labels
// ============================================================

export const CONDITION_LABELS: Record<string, string> = {
  above: 'Price above',
  below: 'Price below',
  rsi_above: 'RSI above',
  rsi_below: 'RSI below',
  ma_cross_above: 'Crosses above MA',
  ma_cross_below: 'Crosses below MA',
  mvrv_above: 'MVRV Z-Score above',
  mvrv_below: 'MVRV Z-Score below',
}

// ============================================================
// Create Alert Schema
// ============================================================

export const CreateAlertSchema = z
  .object({
    symbol: z.enum(ALERT_SYMBOLS, { message: 'Symbol must be VOO, QQQ, or BTC' }),
    condition: z.enum(ALL_CONDITIONS, { message: 'Invalid alert condition' }),
    threshold: z
      .number({ message: 'Threshold is required' })
      .positive('Threshold must be positive'),
    notification_channels: z
      .array(z.enum(['in_app', 'email', 'telegram']))
      .min(1, 'At least one notification channel is required')
      .default(['in_app']),
    parameters: z
      .object({
        rsi_period: z.number().int().min(2).max(100).optional(),
        ma_period: z.number().int().min(5).max(500).optional(),
        ma_type: z.enum(['SMA', 'EMA']).optional(),
      })
      .default({}),
  })
  .refine(
    (data) => {
      if (data.condition.startsWith('rsi_')) {
        return data.threshold >= 0 && data.threshold <= 100
      }
      return true
    },
    { message: 'RSI threshold must be between 0 and 100', path: ['threshold'] },
  )

export type CreateAlert = z.infer<typeof CreateAlertSchema>

// ============================================================
// Update Alert Schema
// ============================================================

export const UpdateAlertSchema = z.object({
  id: z.string().uuid('Invalid alert ID'),
  status: z.enum(ALERT_STATUSES).optional(),
  threshold: z.number().positive('Threshold must be positive').optional(),
  notification_channels: z
    .array(z.enum(['in_app', 'email', 'telegram']))
    .min(1, 'At least one channel required')
    .optional(),
})

export type UpdateAlert = z.infer<typeof UpdateAlertSchema>

// ============================================================
// Alert row type (from DB query)
// ============================================================

export type AlertRow = {
  id: string
  user_id: string
  symbol: string
  asset_type: string
  condition: string
  threshold: number
  status: string
  is_active: boolean
  parameters: Record<string, unknown>
  notification_channels: string[]
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}
