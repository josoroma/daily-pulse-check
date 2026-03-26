import { describe, it, expect } from 'vitest'
import {
  MvrvDataSchema,
  S2FPointSchema,
  RainbowBandSchema,
  calculateS2FRatio,
  s2fModelPrice,
  rainbowBasePrice,
  getRainbowBands,
  getCurrentBand,
  RAINBOW_BANDS,
} from '@/lib/bitcoin/valuation'

describe('valuation: MvrvDataSchema', () => {
  it('validates valid MVRV data', () => {
    const valid = {
      marketCap: 1_700_000_000_000,
      realizedCap: 600_000_000_000,
      mvrvRatio: 2.83,
      zScore: 1.5,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = MvrvDataSchema.parse(valid)
    expect(result.mvrvRatio).toBe(2.83)
    expect(result.zScore).toBe(1.5)
  })

  it('rejects zero marketCap', () => {
    const invalid = {
      marketCap: 0,
      realizedCap: 600_000_000_000,
      mvrvRatio: 0,
      zScore: 0,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => MvrvDataSchema.parse(invalid)).toThrow()
  })

  it('accepts negative zScore (undervalued)', () => {
    const valid = {
      marketCap: 500_000_000_000,
      realizedCap: 600_000_000_000,
      mvrvRatio: 0.83,
      zScore: -1.2,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = MvrvDataSchema.parse(valid)
    expect(result.zScore).toBe(-1.2)
  })
})

describe('valuation: calculateS2FRatio', () => {
  it('returns increasing S2F for later eras', () => {
    const s2fEra1 = calculateS2FRatio(100_000) // Era 1
    const s2fEra2 = calculateS2FRatio(300_000) // Era 2
    const s2fEra3 = calculateS2FRatio(500_000) // Era 3
    expect(s2fEra2).toBeGreaterThan(s2fEra1)
    expect(s2fEra3).toBeGreaterThan(s2fEra2)
  })

  it('approximately doubles at each halving boundary', () => {
    // Just before and after first halving
    const beforeHalving = calculateS2FRatio(209_999)
    const afterHalving = calculateS2FRatio(210_001)
    // S2F should roughly double (not exactly due to supply accumulation)
    expect(afterHalving / beforeHalving).toBeGreaterThan(1.8)
    expect(afterHalving / beforeHalving).toBeLessThan(2.2)
  })

  it('returns 0 at genesis (no supply mined)', () => {
    expect(calculateS2FRatio(0)).toBe(0)
  })

  it('returns positive for any mined block height', () => {
    expect(calculateS2FRatio(1)).toBeGreaterThan(0)
    expect(calculateS2FRatio(890_000)).toBeGreaterThan(0)
  })

  it('returns S2F around 120 for current era 5', () => {
    // After 4th halving (era 5), S2F ~ 120
    const s2f = calculateS2FRatio(890_000)
    expect(s2f).toBeGreaterThan(100)
    expect(s2f).toBeLessThan(150)
  })
})

describe('valuation: s2fModelPrice', () => {
  it('returns 0 for zero S2F ratio', () => {
    expect(s2fModelPrice(0)).toBe(0)
  })

  it('returns positive for positive S2F ratio', () => {
    expect(s2fModelPrice(50)).toBeGreaterThan(0)
  })

  it('returns higher price for higher S2F ratio', () => {
    const price25 = s2fModelPrice(25)
    const price50 = s2fModelPrice(50)
    const price100 = s2fModelPrice(100)
    expect(price50).toBeGreaterThan(price25)
    expect(price100).toBeGreaterThan(price50)
  })

  it('follows logarithmic relationship', () => {
    // ln(price) = 3.21 * ln(S2F) - 1.6
    const s2f = 50
    const expected = Math.exp(3.21 * Math.log(s2f) - 1.6)
    expect(s2fModelPrice(s2f)).toBeCloseTo(expected, 2)
  })
})

describe('valuation: S2FPointSchema', () => {
  it('validates valid S2F point', () => {
    const valid = {
      timestamp: 1711324800000,
      price: 87500,
      s2fModelPrice: 95000,
      s2fRatio: 120,
    }
    const result = S2FPointSchema.parse(valid)
    expect(result.price).toBe(87500)
  })

  it('rejects negative price', () => {
    const invalid = {
      timestamp: 1711324800000,
      price: -100,
      s2fModelPrice: 95000,
      s2fRatio: 120,
    }
    expect(() => S2FPointSchema.parse(invalid)).toThrow()
  })
})

describe('valuation: rainbowBasePrice', () => {
  it('returns 0 for 0 days', () => {
    expect(rainbowBasePrice(0)).toBe(0)
  })

  it('returns positive for positive days', () => {
    expect(rainbowBasePrice(1000)).toBeGreaterThan(0)
  })

  it('increases with more days (logarithmic growth)', () => {
    const price1000 = rainbowBasePrice(1000)
    const price3000 = rainbowBasePrice(3000)
    const price6000 = rainbowBasePrice(6000)
    expect(price3000).toBeGreaterThan(price1000)
    expect(price6000).toBeGreaterThan(price3000)
  })
})

describe('valuation: getRainbowBands', () => {
  it('returns 9 bands', () => {
    const bands = getRainbowBands(5000)
    expect(bands).toHaveLength(9)
  })

  it('bands are ordered from bottom (Fire Sale) to top (Maximum Bubble)', () => {
    const bands = getRainbowBands(5000)
    expect(bands[8]!.label).toBe('Fire Sale')
    expect(bands[0]!.label).toBe('Maximum Bubble')
  })

  it('each band has lower < upper', () => {
    const bands = getRainbowBands(5000)
    for (const band of bands) {
      expect(band.upper).toBeGreaterThan(band.lower)
    }
  })

  it('adjacent bands touch (lower of higher = upper of lower)', () => {
    const bands = getRainbowBands(5000)
    for (let i = 0; i < bands.length - 1; i++) {
      expect(bands[i]!.lower).toBeCloseTo(bands[i + 1]!.upper, 2)
    }
  })
})

describe('valuation: getCurrentBand', () => {
  it('returns Fire Sale for very low price', () => {
    const band = getCurrentBand(1, 5000)
    expect(band).toBe('Fire Sale')
  })

  it('returns Maximum Bubble for very high price', () => {
    const bands = getRainbowBands(5000)
    // Use a price above the Maximum Bubble upper bound
    const band = getCurrentBand(bands[0]!.upper * 10, 5000)
    expect(band).toBe('Maximum Bubble')
  })

  it('returns a valid band label for moderate price', () => {
    const bands = getRainbowBands(6000)
    const middleBand = bands[4]! // Hold
    const midPrice = (middleBand.lower + middleBand.upper) / 2
    const result = getCurrentBand(midPrice, 6000)
    expect(RAINBOW_BANDS.map((b) => b.label)).toContain(result)
  })
})

describe('valuation: RAINBOW_BANDS', () => {
  it('has exactly 9 bands', () => {
    expect(RAINBOW_BANDS).toHaveLength(9)
  })

  it('first band is Maximum Bubble', () => {
    expect(RAINBOW_BANDS[0].label).toBe('Maximum Bubble')
  })

  it('last band is Fire Sale', () => {
    expect(RAINBOW_BANDS[8].label).toBe('Fire Sale')
  })

  it('all bands have HSL colors', () => {
    for (const band of RAINBOW_BANDS) {
      expect(band.color).toMatch(/^hsl\(\d+,/)
    }
  })
})

describe('valuation: RainbowBandSchema', () => {
  it('validates valid band', () => {
    const valid = {
      label: 'Hold',
      color: 'hsl(60, 80%, 50%)',
      upper: 150_000,
      lower: 80_000,
    }
    const result = RainbowBandSchema.parse(valid)
    expect(result.label).toBe('Hold')
  })
})
