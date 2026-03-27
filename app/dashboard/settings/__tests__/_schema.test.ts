import { describe, it, expect } from 'vitest'
import {
  AiModelSchema,
  SaveApiKeySchema,
  ServiceSchema,
  NotificationPreferencesSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
  CsvRowSchema,
  ImportPositionsSchema,
} from '@/app/dashboard/settings/_schema'

describe('AiModelSchema', () => {
  it('accepts valid openai provider + model', () => {
    const result = AiModelSchema.safeParse({
      ai_provider: 'openai',
      ai_model: 'gpt-4.1-mini',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid ollama provider + model', () => {
    const result = AiModelSchema.safeParse({
      ai_provider: 'ollama',
      ai_model: 'qwen3.5:9b',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid provider', () => {
    const result = AiModelSchema.safeParse({
      ai_provider: 'anthropic',
      ai_model: 'claude-3',
    })
    expect(result.success).toBe(false)
  })

  it('rejects model that does not belong to selected provider', () => {
    const result = AiModelSchema.safeParse({
      ai_provider: 'openai',
      ai_model: 'qwen3.5:9b',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty model string', () => {
    const result = AiModelSchema.safeParse({
      ai_provider: 'openai',
      ai_model: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('SaveApiKeySchema', () => {
  it('accepts valid service and key', () => {
    const result = SaveApiKeySchema.safeParse({
      service: 'twelve_data',
      api_key: 'abc123xyz',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all valid services', () => {
    for (const service of ['twelve_data', 'openai', 'fred', 'coingecko']) {
      const result = SaveApiKeySchema.safeParse({ service, api_key: 'key' })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid service', () => {
    const result = SaveApiKeySchema.safeParse({
      service: 'stripe',
      api_key: 'key123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty api key', () => {
    const result = SaveApiKeySchema.safeParse({
      service: 'openai',
      api_key: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects api key exceeding max length', () => {
    const result = SaveApiKeySchema.safeParse({
      service: 'openai',
      api_key: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('ChangePasswordSchema', () => {
  it('accepts matching passwords of valid length', () => {
    const result = ChangePasswordSchema.safeParse({
      current_password: 'OldP@ssw0rd',
      new_password: 'MyS3cureP@ss',
      confirm_password: 'MyS3cureP@ss',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing current password', () => {
    const result = ChangePasswordSchema.safeParse({
      current_password: '',
      new_password: 'MyS3cureP@ss',
      confirm_password: 'MyS3cureP@ss',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = ChangePasswordSchema.safeParse({
      current_password: 'OldP@ssw0rd',
      new_password: 'short',
      confirm_password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = ChangePasswordSchema.safeParse({
      current_password: 'OldP@ssw0rd',
      new_password: 'password123',
      confirm_password: 'password456',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('confirm_password')
    }
  })

  it('rejects password exceeding max length', () => {
    const long = 'a'.repeat(129)
    const result = ChangePasswordSchema.safeParse({
      current_password: 'OldP@ssw0rd',
      new_password: long,
      confirm_password: long,
    })
    expect(result.success).toBe(false)
  })
})

describe('DeleteAccountSchema', () => {
  it('accepts valid email', () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation_email: 'user@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation_email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })
})

describe('CsvRowSchema', () => {
  it('accepts valid row', () => {
    const result = CsvRowSchema.safeParse({
      symbol: 'VOO',
      asset_type: 'ETF',
      quantity: '10',
      average_buy_price: '420.50',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symbol).toBe('VOO')
      expect(result.data.quantity).toBe(10)
    }
  })

  it('uppercases symbol', () => {
    const result = CsvRowSchema.safeParse({
      symbol: 'voo',
      asset_type: 'ETF',
      quantity: '10',
      average_buy_price: '420',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symbol).toBe('VOO')
    }
  })

  it('coerces string numbers', () => {
    const result = CsvRowSchema.safeParse({
      symbol: 'BTC',
      asset_type: 'Crypto',
      quantity: '0.5',
      average_buy_price: '45000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(0.5)
      expect(result.data.average_buy_price).toBe(45000)
    }
  })

  it('rejects invalid asset type', () => {
    const result = CsvRowSchema.safeParse({
      symbol: 'VOO',
      asset_type: 'Stock',
      quantity: '10',
      average_buy_price: '420',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty symbol', () => {
    const result = CsvRowSchema.safeParse({
      symbol: '',
      asset_type: 'ETF',
      quantity: '10',
      average_buy_price: '420',
    })
    expect(result.success).toBe(false)
  })

  it('defaults notes to empty string', () => {
    const result = CsvRowSchema.safeParse({
      symbol: 'VOO',
      asset_type: 'ETF',
      quantity: '10',
      average_buy_price: '420',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('')
    }
  })
})

describe('ImportPositionsSchema', () => {
  const validRow = {
    symbol: 'VOO',
    asset_type: 'ETF',
    quantity: 10,
    average_buy_price: 420.5,
  }

  it('accepts valid portfolioId and positions', () => {
    const result = ImportPositionsSchema.safeParse({
      portfolioId: '550e8400-e29b-41d4-a716-446655440000',
      positions: [validRow],
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID portfolioId', () => {
    const result = ImportPositionsSchema.safeParse({
      portfolioId: 'not-a-uuid',
      positions: [validRow],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('portfolioId')
    }
  })

  it('rejects empty positions array', () => {
    const result = ImportPositionsSchema.safeParse({
      portfolioId: '550e8400-e29b-41d4-a716-446655440000',
      positions: [],
    })
    expect(result.success).toBe(false)
  })

  it('validates individual position rows', () => {
    const result = ImportPositionsSchema.safeParse({
      portfolioId: '550e8400-e29b-41d4-a716-446655440000',
      positions: [{ symbol: '', asset_type: 'Stock', quantity: -1, average_buy_price: -5 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('ServiceSchema', () => {
  it('accepts valid service', () => {
    const result = ServiceSchema.safeParse({ service: 'twelve_data' })
    expect(result.success).toBe(true)
  })

  it('accepts all valid services', () => {
    for (const service of ['twelve_data', 'openai', 'fred', 'coingecko']) {
      const result = ServiceSchema.safeParse({ service })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid service', () => {
    const result = ServiceSchema.safeParse({ service: 'stripe' })
    expect(result.success).toBe(false)
  })
})

describe('NotificationPreferencesSchema', () => {
  it('accepts valid preferences with email enabled', () => {
    const result = NotificationPreferencesSchema.safeParse({
      notification_email_enabled: 'true',
      notification_telegram_enabled: 'false',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notification_email_enabled).toBe(true)
      expect(result.data.notification_telegram_enabled).toBe(false)
    }
  })

  it('accepts telegram enabled with chat id', () => {
    const result = NotificationPreferencesSchema.safeParse({
      notification_email_enabled: 'false',
      notification_telegram_enabled: 'true',
      telegram_chat_id: '123456789',
    })
    expect(result.success).toBe(true)
  })

  it('rejects telegram enabled without chat id', () => {
    const result = NotificationPreferencesSchema.safeParse({
      notification_email_enabled: 'false',
      notification_telegram_enabled: 'true',
      telegram_chat_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('transforms string booleans to actual booleans', () => {
    const result = NotificationPreferencesSchema.safeParse({
      notification_email_enabled: 'false',
      notification_telegram_enabled: 'false',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notification_email_enabled).toBe(false)
      expect(typeof result.data.notification_email_enabled).toBe('boolean')
    }
  })
})
