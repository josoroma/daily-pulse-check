import { describe, expect, it } from 'vitest'
import { LoginSchema, SignupSchema } from '../_schema'

describe('LoginSchema', () => {
  it('validates a correct login payload', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = LoginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please enter a valid email address')
    }
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters')
    }
  })

  it('rejects missing email', () => {
    const result = LoginSchema.safeParse({
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success).toBe(false)
  })
})

describe('SignupSchema', () => {
  it('validates a correct signup payload', () => {
    const result = SignupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = SignupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'different456',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find((e) => e.path?.includes('confirmPassword'))
      expect(confirmError?.message).toBe('Passwords do not match')
    }
  })

  it('rejects an invalid email', () => {
    const result = SignupSchema.safeParse({
      email: 'bad',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = SignupSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty confirmPassword', () => {
    const result = SignupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
  })
})
