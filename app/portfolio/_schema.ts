import { z } from 'zod'

// ============================================================
// Profiles
// ============================================================
export const CreateProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100),
  base_currency: z.enum(['USD', 'CRC'], {
    message: 'Base currency is required',
  }),
  country: z.string().min(1, 'Country is required').max(100),
  risk_tolerance: z.enum(['Conservative', 'Medium', 'Medium-High', 'Aggressive'], {
    message: 'Risk tolerance is required',
  }),
})

export type CreateProfile = z.infer<typeof CreateProfileSchema>

export const UpdateProfileSchema = CreateProfileSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>

// ============================================================
// Portfolios
// ============================================================
export const CreatePortfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Portfolio name must be 100 characters or less'),
  description: z.string().max(500).optional(),
})

export type CreatePortfolio = z.infer<typeof CreatePortfolioSchema>

export const UpdatePortfolioSchema = CreatePortfolioSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdatePortfolio = z.infer<typeof UpdatePortfolioSchema>

// ============================================================
// Positions
// ============================================================
export const CreatePositionSchema = z.object({
  portfolio_id: z.string().uuid('Invalid portfolio'),
  asset_type: z.enum(['ETF', 'Crypto'], {
    message: 'Asset type is required',
  }),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .toUpperCase(),
  quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be positive'),
  average_buy_price: z
    .number({ message: 'Buy price is required' })
    .nonnegative('Buy price cannot be negative'),
  notes: z.string().max(500).optional(),
})

export type CreatePosition = z.infer<typeof CreatePositionSchema>

export const UpdatePositionSchema = CreatePositionSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdatePosition = z.infer<typeof UpdatePositionSchema>

// ============================================================
// Transactions
// ============================================================
export const CreateTransactionSchema = z.object({
  position_id: z.string().uuid('Invalid position'),
  type: z.enum(['Buy', 'Sell', 'DCA'], {
    message: 'Transaction type is required',
  }),
  quantity: z.number({ message: 'Quantity is required' }).positive('Quantity must be positive'),
  price: z.number({ message: 'Price is required' }).nonnegative('Price cannot be negative'),
  fee: z.number().nonnegative('Fee cannot be negative').default(0),
  executed_at: z.coerce.date({ message: 'Execution date is required' }),
  notes: z.string().max(500).optional(),
})

export type CreateTransaction = z.infer<typeof CreateTransactionSchema>

// ============================================================
// Alerts
// ============================================================
export const CreateAlertSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
  asset_type: z.enum(['ETF', 'Crypto'], {
    message: 'Asset type is required',
  }),
  condition: z.enum(['above', 'below', 'pct_change_up', 'pct_change_down'], {
    message: 'Condition is required',
  }),
  threshold: z.number({ message: 'Threshold is required' }),
  notification_channels: z
    .array(z.enum(['in_app', 'telegram', 'email']))
    .min(1, 'At least one notification channel is required')
    .default(['in_app']),
})

export type CreateAlert = z.infer<typeof CreateAlertSchema>

export const UpdateAlertSchema = CreateAlertSchema.partial().extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
})

export type UpdateAlert = z.infer<typeof UpdateAlertSchema>
