import { describe, it, expect } from 'vitest'
import { AiModelSchema } from '@/app/dashboard/settings/_schema'

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
