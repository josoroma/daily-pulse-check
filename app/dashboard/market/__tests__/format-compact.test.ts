import { describe, it, expect } from 'vitest'
import { formatCompact } from '@/app/dashboard/market/_components/price-cards'

describe('price-cards: formatCompact', () => {
  it('formats trillions', () => {
    expect(formatCompact(1.5e12)).toBe('1.50T')
  })

  it('formats billions', () => {
    expect(formatCompact(42.7e9)).toBe('42.70B')
  })

  it('formats millions', () => {
    expect(formatCompact(8.123e6)).toBe('8.12M')
  })

  it('formats values below 1M with locale string', () => {
    expect(formatCompact(999999)).toBe('999,999')
  })

  it('handles exact boundary at 1T', () => {
    expect(formatCompact(1e12)).toBe('1.00T')
  })

  it('handles exact boundary at 1B', () => {
    expect(formatCompact(1e9)).toBe('1.00B')
  })

  it('handles exact boundary at 1M', () => {
    expect(formatCompact(1e6)).toBe('1.00M')
  })

  it('handles zero', () => {
    expect(formatCompact(0)).toBe('0')
  })
})
