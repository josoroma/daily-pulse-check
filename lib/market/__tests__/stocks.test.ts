import { describe, it, expect } from 'vitest'
import { StockPriceSchema, OHLCVPointSchema, StockHistorySchema } from '@/lib/market/stocks'

describe('stocks: StockPriceSchema', () => {
  it('validates a valid stock price', () => {
    const valid = {
      symbol: 'VOO',
      price: 450.25,
      timestamp: '2026-03-21T12:00:00Z',
      currency: 'USD',
    }
    const result = StockPriceSchema.parse(valid)
    expect(result.symbol).toBe('VOO')
    expect(result.price).toBe(450.25)
  })

  it('rejects negative price', () => {
    const invalid = {
      symbol: 'VOO',
      price: -10,
      timestamp: '2026-03-21T12:00:00Z',
    }
    expect(() => StockPriceSchema.parse(invalid)).toThrow()
  })

  it('rejects zero price', () => {
    const invalid = {
      symbol: 'VOO',
      price: 0,
      timestamp: '2026-03-21T12:00:00Z',
    }
    expect(() => StockPriceSchema.parse(invalid)).toThrow()
  })

  it('rejects missing symbol', () => {
    const invalid = {
      price: 100,
      timestamp: '2026-03-21T12:00:00Z',
    }
    expect(() => StockPriceSchema.parse(invalid)).toThrow()
  })

  it('allows optional currency', () => {
    const valid = {
      symbol: 'QQQ',
      price: 380.5,
      timestamp: '2026-03-21T12:00:00Z',
    }
    const result = StockPriceSchema.parse(valid)
    expect(result.currency).toBeUndefined()
  })
})

describe('stocks: OHLCVPointSchema', () => {
  it('validates a valid OHLCV point', () => {
    const valid = {
      datetime: '2026-03-21',
      open: 450.0,
      high: 455.0,
      low: 448.0,
      close: 452.0,
      volume: 1500000,
    }
    const result = OHLCVPointSchema.parse(valid)
    expect(result.close).toBe(452.0)
    expect(result.volume).toBe(1500000)
  })

  it('rejects missing fields', () => {
    const invalid = {
      datetime: '2026-03-21',
      open: 450.0,
    }
    expect(() => OHLCVPointSchema.parse(invalid)).toThrow()
  })
})

describe('stocks: StockHistorySchema', () => {
  it('validates a valid history response', () => {
    const valid = {
      symbol: 'VOO',
      values: [
        { datetime: '2026-03-21', open: 450, high: 455, low: 448, close: 452, volume: 1500000 },
        { datetime: '2026-03-20', open: 448, high: 451, low: 446, close: 450, volume: 1200000 },
      ],
    }
    const result = StockHistorySchema.parse(valid)
    expect(result.values).toHaveLength(2)
    expect(result.symbol).toBe('VOO')
  })

  it('allows empty values array', () => {
    const valid = { symbol: 'VOO', values: [] }
    const result = StockHistorySchema.parse(valid)
    expect(result.values).toHaveLength(0)
  })
})
