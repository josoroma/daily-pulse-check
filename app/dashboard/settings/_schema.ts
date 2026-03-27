import { z } from 'zod'
import { AI_PROVIDERS, MODEL_REGISTRY } from '@/lib/ai/provider'

export const AiModelSchema = z
  .object({
    ai_provider: z.enum(AI_PROVIDERS, {
      message: 'Provider must be openai or ollama',
    }),
    ai_model: z.string().min(1, 'Model is required'),
  })
  .refine((data) => MODEL_REGISTRY[data.ai_provider].includes(data.ai_model), {
    message: 'Invalid model for the selected provider',
    path: ['ai_model'],
  })

export type AiModel = z.infer<typeof AiModelSchema>

export const API_KEY_SERVICES = ['twelve_data', 'openai', 'fred', 'coingecko'] as const
export type ApiKeyService = (typeof API_KEY_SERVICES)[number]

export const SaveApiKeySchema = z.object({
  service: z.enum(API_KEY_SERVICES, { message: 'Invalid service' }),
  api_key: z.string().min(1, 'API key is required').max(500, 'API key too long'),
})

export type SaveApiKey = z.infer<typeof SaveApiKeySchema>

export const ServiceSchema = z.object({
  service: z.enum(API_KEY_SERVICES, { message: 'Invalid service' }),
})

export type Service = z.infer<typeof ServiceSchema>

export const NotificationPreferencesSchema = z
  .object({
    notification_email_enabled: z
      .string()
      .transform((v) => v === 'true')
      .pipe(z.boolean()),
    notification_telegram_enabled: z
      .string()
      .transform((v) => v === 'true')
      .pipe(z.boolean()),
    telegram_chat_id: z.string().trim().optional().default(''),
  })
  .refine((data) => !data.notification_telegram_enabled || data.telegram_chat_id.length > 0, {
    message: 'Telegram Chat ID is required when Telegram is enabled',
    path: ['telegram_chat_id'],
  })

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or less'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type ChangePassword = z.infer<typeof ChangePasswordSchema>

export const DeleteAccountSchema = z.object({
  confirmation_email: z.string().email('Must be a valid email'),
})

export type DeleteAccount = z.infer<typeof DeleteAccountSchema>

export const CsvRowSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
  asset_type: z.enum(['ETF', 'Crypto'], { message: 'Asset type must be ETF or Crypto' }),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  average_buy_price: z.coerce.number().nonnegative('Price cannot be negative'),
  notes: z.string().max(500).optional().default(''),
})

export type CsvRow = z.infer<typeof CsvRowSchema>

export const ImportPositionsSchema = z.object({
  portfolioId: z.string().uuid('Invalid portfolio ID'),
  positions: CsvRowSchema.array().min(1, 'At least one position is required'),
})

export type ImportPositions = z.infer<typeof ImportPositionsSchema>
