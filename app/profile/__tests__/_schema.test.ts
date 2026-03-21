import { describe, expect, it } from 'vitest'
import { UpdateProfileSchema } from '../_schema'

describe('UpdateProfileSchema', () => {
  it('validates a complete profile update', () => {
    const result = UpdateProfileSchema.safeParse({
      display_name: 'John Doe',
      base_currency: 'USD',
      country: 'CR',
      risk_tolerance: 'Medium-High',
    })
    expect(result.success).toBe(true)
  })

  it('validates without display_name', () => {
    const result = UpdateProfileSchema.safeParse({
      base_currency: 'CRC',
      country: 'CR',
      risk_tolerance: 'Conservative',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid base_currency', () => {
    const result = UpdateProfileSchema.safeParse({
      base_currency: 'EUR',
      country: 'CR',
      risk_tolerance: 'Medium',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid risk_tolerance', () => {
    const result = UpdateProfileSchema.safeParse({
      base_currency: 'USD',
      country: 'CR',
      risk_tolerance: 'YOLO',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty country', () => {
    const result = UpdateProfileSchema.safeParse({
      base_currency: 'USD',
      country: '',
      risk_tolerance: 'Medium',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const countryError = result.error.issues.find((e) => e.path?.includes('country'))
      expect(countryError?.message).toBe('Country is required')
    }
  })

  it('accepts all valid risk_tolerance values', () => {
    const tolerances = ['Conservative', 'Medium', 'Medium-High', 'Aggressive'] as const
    for (const risk_tolerance of tolerances) {
      const result = UpdateProfileSchema.safeParse({
        base_currency: 'USD',
        country: 'CR',
        risk_tolerance,
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts both valid base_currency values', () => {
    for (const base_currency of ['USD', 'CRC']) {
      const result = UpdateProfileSchema.safeParse({
        base_currency,
        country: 'CR',
        risk_tolerance: 'Medium',
      })
      expect(result.success).toBe(true)
    }
  })
})
