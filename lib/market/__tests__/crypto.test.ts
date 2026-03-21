import { describe, it, expect } from 'vitest'
import {
  BitcoinPriceSchema,
  PricePointSchema,
  BitcoinHistorySchema,
  convertUsdToCrc,
} from '@/lib/market/crypto'

describe('crypto: BitcoinPriceSchema', () => {
  it('validates a valid Bitcoin price', () => {
    const valid = {
      priceUsd: 87500.5,
      priceCrc: 45000000.0,
      marketCap: 1700000000000,
      volume24h: 25000000000,
      percentChange24h: 2.5,
      lastUpdated: '2026-03-21T12:00:00Z',
    }
    const result = BitcoinPriceSchema.parse(valid)
    expect(result.priceUsd).toBe(87500.5)
    expect(result.priceCrc).toBe(45000000.0)
  })

  it('allows null priceCrc', () => {
    const valid = {
      priceUsd: 87500.5,
      priceCrc: null,
      marketCap: 1700000000000,
      volume24h: 25000000000,
      percentChange24h: -1.2,
      lastUpdated: '2026-03-21T12:00:00Z',
    }
    const result = BitcoinPriceSchema.parse(valid)
    expect(result.priceCrc).toBeNull()
  })

  it('rejects negative priceUsd', () => {
    const invalid = {
      priceUsd: -100,
      priceCrc: null,
      marketCap: 1700000000000,
      volume24h: 25000000000,
      percentChange24h: 2.5,
      lastUpdated: '2026-03-21T12:00:00Z',
    }
    expect(() => BitcoinPriceSchema.parse(invalid)).toThrow()
  })

  it('accepts negative percentChange24h', () => {
    const valid = {
      priceUsd: 87500.5,
      priceCrc: null,
      marketCap: 1700000000000,
      volume24h: 25000000000,
      percentChange24h: -5.5,
      lastUpdated: '2026-03-21T12:00:00Z',
    }
    const result = BitcoinPriceSchema.parse(valid)
    expect(result.percentChange24h).toBe(-5.5)
  })

  it('rejects missing fields', () => {
    const invalid = { priceUsd: 87500 }
    expect(() => BitcoinPriceSchema.parse(invalid)).toThrow()
  })
})

describe('crypto: PricePointSchema', () => {
  it('validates a valid price point', () => {
    const valid = { timestamp: 1711000000000, price: 87500.5 }
    const result = PricePointSchema.parse(valid)
    expect(result.timestamp).toBe(1711000000000)
    expect(result.price).toBe(87500.5)
  })
})

describe('crypto: BitcoinHistorySchema', () => {
  it('validates a valid history response', () => {
    const valid = {
      prices: [
        { timestamp: 1711000000000, price: 87000 },
        { timestamp: 1711086400000, price: 87500 },
      ],
    }
    const result = BitcoinHistorySchema.parse(valid)
    expect(result.prices).toHaveLength(2)
  })

  it('allows empty prices array', () => {
    const valid = { prices: [] }
    const result = BitcoinHistorySchema.parse(valid)
    expect(result.prices).toHaveLength(0)
  })
})

describe('crypto: convertUsdToCrc', () => {
  it('converts USD to CRC using a rate', () => {
    const result = convertUsdToCrc(100, 515)
    expect(result).toBe(51500)
  })

  it('handles zero amount', () => {
    const result = convertUsdToCrc(0, 515)
    expect(result).toBe(0)
  })

  it('handles fractional amounts', () => {
    const result = convertUsdToCrc(0.5, 515)
    expect(result).toBe(257.5)
  })

  it('handles large Bitcoin prices', () => {
    const result = convertUsdToCrc(87500, 515)
    expect(result).toBe(45062500)
  })
})
