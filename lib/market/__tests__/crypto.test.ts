import { describe, it, expect } from 'vitest'
import {
  BitcoinPriceSchema,
  PricePointSchema,
  BitcoinHistorySchema,
  CoinHistoricalPriceSchema,
  CoinMarketChartSchema,
  CoinMarketDataSchema,
  convertUsdToCrc,
  formatDateForCoinGecko,
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

describe('crypto: formatDateForCoinGecko', () => {
  it('converts ISO date to dd-MM-yyyy', () => {
    expect(formatDateForCoinGecko('2026-01-15')).toBe('15-01-2026')
  })

  it('handles end-of-year dates', () => {
    expect(formatDateForCoinGecko('2025-12-31')).toBe('31-12-2025')
  })

  it('handles first day of year', () => {
    expect(formatDateForCoinGecko('2026-01-01')).toBe('01-01-2026')
  })

  it('throws on invalid format', () => {
    expect(() => formatDateForCoinGecko('15/01/2026')).toThrow('Invalid ISO date')
  })

  it('throws on incomplete date', () => {
    expect(() => formatDateForCoinGecko('2026-01')).toThrow('Invalid ISO date')
  })
})

describe('crypto: CoinHistoricalPriceSchema', () => {
  it('validates a valid historical price', () => {
    const valid = { coinId: 'bitcoin', date: '2026-01-15', priceUsd: 87500.5 }
    const result = CoinHistoricalPriceSchema.parse(valid)
    expect(result.coinId).toBe('bitcoin')
    expect(result.priceUsd).toBe(87500.5)
  })

  it('accepts zero price', () => {
    const valid = { coinId: 'bitcoin', date: '2026-01-15', priceUsd: 0 }
    const result = CoinHistoricalPriceSchema.parse(valid)
    expect(result.priceUsd).toBe(0)
  })

  it('rejects negative price', () => {
    expect(() =>
      CoinHistoricalPriceSchema.parse({ coinId: 'bitcoin', date: '2026-01-15', priceUsd: -100 }),
    ).toThrow()
  })

  it('rejects missing coinId', () => {
    expect(() => CoinHistoricalPriceSchema.parse({ date: '2026-01-15', priceUsd: 87500 })).toThrow()
  })
})

describe('crypto: CoinMarketChartSchema', () => {
  it('validates a valid market chart', () => {
    const valid = {
      coinId: 'bitcoin',
      prices: [
        { timestamp: 1711000000000, price: 87000 },
        { timestamp: 1711086400000, price: 87500 },
      ],
      marketCaps: [{ timestamp: 1711000000000, price: 1700000000000 }],
      volumes: [{ timestamp: 1711000000000, price: 25000000000 }],
    }
    const result = CoinMarketChartSchema.parse(valid)
    expect(result.prices).toHaveLength(2)
    expect(result.marketCaps).toHaveLength(1)
    expect(result.volumes).toHaveLength(1)
  })

  it('allows empty arrays', () => {
    const valid = { coinId: 'bitcoin', prices: [], marketCaps: [], volumes: [] }
    const result = CoinMarketChartSchema.parse(valid)
    expect(result.prices).toHaveLength(0)
  })
})

describe('crypto: CoinMarketDataSchema', () => {
  it('validates full market data with sparkline', () => {
    const valid = {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      currentPrice: 87500,
      marketCap: 1700000000000,
      marketCapRank: 1,
      high24h: 88000,
      low24h: 86500,
      priceChange24h: 1500,
      priceChangePercentage24h: 1.74,
      priceChangePercentage7d: 5.2,
      priceChangePercentage30d: 12.5,
      sparkline7d: [86000, 86500, 87000, 87200, 87500],
    }
    const result = CoinMarketDataSchema.parse(valid)
    expect(result.id).toBe('bitcoin')
    expect(result.sparkline7d).toHaveLength(5)
  })

  it('allows null optional fields', () => {
    const valid = {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: 'https://example.com/btc.png',
      currentPrice: 87500,
      marketCap: 1700000000000,
      marketCapRank: null,
      high24h: null,
      low24h: null,
      priceChange24h: null,
      priceChangePercentage24h: null,
      priceChangePercentage7d: null,
      priceChangePercentage30d: null,
      sparkline7d: null,
    }
    const result = CoinMarketDataSchema.parse(valid)
    expect(result.marketCapRank).toBeNull()
    expect(result.sparkline7d).toBeNull()
  })

  it('rejects missing required fields', () => {
    expect(() => CoinMarketDataSchema.parse({ id: 'bitcoin' })).toThrow()
  })
})
