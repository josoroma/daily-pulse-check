import { describe, it, expect } from 'vitest'
import {
  FredObservationSchema,
  FredSeriesSchema,
  MacroIndicatorSchema,
  calculateYoYInflation,
  parseObservations,
  FRED_SERIES,
} from '@/lib/market/macro'

describe('macro: FredObservationSchema', () => {
  it('validates a valid observation', () => {
    const valid = { date: '2026-03-01', value: 5.25 }
    const result = FredObservationSchema.parse(valid)
    expect(result.date).toBe('2026-03-01')
    expect(result.value).toBe(5.25)
  })

  it('rejects missing date', () => {
    expect(() => FredObservationSchema.parse({ value: 5.25 })).toThrow()
  })

  it('rejects missing value', () => {
    expect(() => FredObservationSchema.parse({ date: '2026-03-01' })).toThrow()
  })
})

describe('macro: FredSeriesSchema', () => {
  it('validates a valid series', () => {
    const valid = {
      seriesId: 'FEDFUNDS',
      title: 'Federal Funds Rate',
      observations: [
        { date: '2026-03-01', value: 5.25 },
        { date: '2026-02-01', value: 5.25 },
      ],
    }
    const result = FredSeriesSchema.parse(valid)
    expect(result.observations).toHaveLength(2)
  })
})

describe('macro: MacroIndicatorSchema', () => {
  it('validates a valid indicator', () => {
    const valid = {
      name: 'Federal Funds Rate',
      value: 5.25,
      date: '2026-03-01',
      unit: '%',
    }
    const result = MacroIndicatorSchema.parse(valid)
    expect(result.name).toBe('Federal Funds Rate')
    expect(result.unit).toBe('%')
  })
})

describe('macro: calculateYoYInflation', () => {
  it('calculates year-over-year inflation rate', () => {
    // CPI observations sorted desc by date
    const observations = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-${String(12 - i).padStart(2, '0')}-01`,
      value: 310 - i * 0.5, // Gradually decreasing going back
    }))

    const rate = calculateYoYInflation(observations)
    expect(rate).not.toBeNull()
    // (310 - 304.5) / 304.5 * 100 ≈ 1.806%
    expect(rate!).toBeCloseTo(1.806, 1)
  })

  it('returns null when fewer than 12 observations', () => {
    const observations = [
      { date: '2026-03-01', value: 310 },
      { date: '2026-02-01', value: 309 },
    ]
    expect(calculateYoYInflation(observations)).toBeNull()
  })

  it('returns null when year-ago value is zero', () => {
    const observations = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-${String(12 - i).padStart(2, '0')}-01`,
      value: i === 11 ? 0 : 310,
    }))
    expect(calculateYoYInflation(observations)).toBeNull()
  })

  it('handles negative inflation (deflation)', () => {
    const observations = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-${String(12 - i).padStart(2, '0')}-01`,
      value: 300 + i * 0.5, // Values increasing going back = current lower
    }))

    const rate = calculateYoYInflation(observations)
    expect(rate).not.toBeNull()
    expect(rate!).toBeLessThan(0)
  })

  it('handles zero inflation', () => {
    const observations = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-${String(12 - i).padStart(2, '0')}-01`,
      value: 310, // All same
    }))

    const rate = calculateYoYInflation(observations)
    expect(rate).toBe(0)
  })
})

describe('macro: FRED_SERIES config', () => {
  it('has configuration for FEDFUNDS', () => {
    expect(FRED_SERIES.FEDFUNDS).toEqual({ title: 'Federal Funds Rate', unit: '%' })
  })

  it('has configuration for DGS10', () => {
    expect(FRED_SERIES.DGS10).toEqual({ title: '10-Year Treasury Yield', unit: '%' })
  })

  it('has configuration for CPIAUCSL', () => {
    expect(FRED_SERIES.CPIAUCSL).toEqual({ title: 'Consumer Price Index', unit: 'index' })
  })

  it('has configuration for UNRATE', () => {
    expect(FRED_SERIES.UNRATE).toEqual({ title: 'Unemployment Rate', unit: '%' })
  })
})

describe('macro: parseObservations', () => {
  it('parses valid observations', () => {
    const raw = [
      { date: '2026-03-01', value: '5.25' },
      { date: '2026-02-01', value: '5.50' },
    ]
    const result = parseObservations(raw)
    expect(result).toEqual([
      { date: '2026-03-01', value: 5.25 },
      { date: '2026-02-01', value: 5.5 },
    ])
  })

  it('filters out missing values (dot notation)', () => {
    const raw = [
      { date: '2026-03-01', value: '5.25' },
      { date: '2026-02-01', value: '.' },
      { date: '2026-01-01', value: '5.00' },
    ]
    const result = parseObservations(raw)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.date)).toEqual(['2026-03-01', '2026-01-01'])
  })

  it('returns empty array for empty input', () => {
    expect(parseObservations([])).toEqual([])
  })

  it('handles all-dot observations', () => {
    const raw = [
      { date: '2026-03-01', value: '.' },
      { date: '2026-02-01', value: '.' },
    ]
    expect(parseObservations(raw)).toEqual([])
  })
})
