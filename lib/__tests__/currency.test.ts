import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent } from '@/lib/currency'

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,234.56')
  })

  it('formats USD explicitly', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toContain('1,234.56')
  })

  it('formats CRC with exchange rate', () => {
    const result = formatCurrency(100, 'CRC', { exchangeRate: 515 })
    expect(result).toContain('51')
    expect(result).toContain('500')
  })

  it('shows conversion note when showConversion is true', () => {
    const result = formatCurrency(100, 'CRC', { exchangeRate: 515, showConversion: true })
    expect(result).toContain('51')
    expect(result).toContain('$100')
  })

  it('falls back to USD when CRC has no exchange rate', () => {
    const result = formatCurrency(100, 'CRC')
    expect(result).toContain('100')
  })

  it('handles zero amounts', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-500, 'USD')
    expect(result).toContain('500')
  })
})

describe('formatPercent', () => {
  it('formats positive percentage with + prefix', () => {
    expect(formatPercent(5.25)).toBe('+5.25%')
  })

  it('formats negative percentage', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%')
  })

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })

  it('respects custom decimals', () => {
    expect(formatPercent(5.256, 1)).toBe('+5.3%')
  })
})
