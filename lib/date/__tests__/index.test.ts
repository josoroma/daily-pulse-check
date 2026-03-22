import { describe, it, expect } from 'vitest'
import {
  todayCR,
  nowCR,
  parseCR,
  formatDateISO,
  formatDateShort,
  formatMonthYear,
  toISO,
  daysAgoCR,
  isValidDate,
} from '../index'

describe('lib/date', () => {
  it('todayCR returns YYYY-MM-DD format', () => {
    expect(todayCR()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('nowCR returns a TZDate', () => {
    const now = nowCR()
    expect(now).toBeInstanceOf(Date)
    expect(now.timeZone).toBe('America/Costa_Rica')
  })

  it('parseCR handles ISO string', () => {
    const result = parseCR('2026-03-21T12:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.timeZone).toBe('America/Costa_Rica')
  })

  it('parseCR handles Date object', () => {
    const result = parseCR(new Date('2026-03-21T12:00:00Z'))
    expect(result.timeZone).toBe('America/Costa_Rica')
  })

  it('formatDateISO returns YYYY-MM-DD', () => {
    expect(formatDateISO('2026-03-21T12:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formatDateShort returns human-readable date', () => {
    const result = formatDateShort('2026-03-21T12:00:00Z')
    expect(result).toMatch(/\d{1,2}\s\w{3}\s\d{4}/)
  })

  it('formatMonthYear returns month + year', () => {
    const result = formatMonthYear('2026-03-21T12:00:00Z')
    expect(result).toMatch(/\w{3}\s\d{4}/)
  })

  it('toISO returns ISO string', () => {
    const date = new Date('2026-03-21T12:00:00Z')
    expect(toISO(date)).toBe('2026-03-21T12:00:00.000Z')
  })

  it('daysAgoCR returns YYYY-MM-DD for N days ago', () => {
    const result = daysAgoCR(7)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('isValidDate validates correctly', () => {
    expect(isValidDate(new Date())).toBe(true)
    expect(isValidDate('2026-03-21')).toBe(true)
    expect(isValidDate('not-a-date')).toBe(false)
    expect(isValidDate(null)).toBe(false)
    expect(isValidDate(42)).toBe(false)
  })
})
