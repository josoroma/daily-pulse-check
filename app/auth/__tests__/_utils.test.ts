import { describe, expect, it } from 'vitest'
import { getDisplayName, getInitials } from '../_utils'

describe('getDisplayName', () => {
  it('returns profile display name when available', () => {
    expect(getDisplayName('José Romero', 'jose@example.com')).toBe('José Romero')
  })

  it('falls back to email prefix when no profile name', () => {
    expect(getDisplayName(null, 'jose@example.com')).toBe('jose')
  })

  it('falls back to email prefix when profile name is empty string', () => {
    expect(getDisplayName('', 'jose@example.com')).toBe('jose')
  })

  it('returns "User" when neither profile name nor email exists', () => {
    expect(getDisplayName(null, null)).toBe('User')
  })

  it('returns "User" when both are undefined', () => {
    expect(getDisplayName(undefined, undefined)).toBe('User')
  })

  it('returns "User" when email is empty string and no profile name', () => {
    expect(getDisplayName(null, '')).toBe('User')
  })
})

describe('getInitials', () => {
  it('returns two-letter initials from first and last name', () => {
    expect(getInitials('José Romero')).toBe('JR')
  })

  it('returns single initial for single-word name', () => {
    expect(getInitials('José')).toBe('J')
  })

  it('limits to 2 initials for long names', () => {
    expect(getInitials('José Antonio Romero García')).toBe('JA')
  })

  it('uppercases lowercase names', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('returns "U" for "User" fallback', () => {
    expect(getInitials('User')).toBe('U')
  })
})
