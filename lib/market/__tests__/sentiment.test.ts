import { describe, it, expect } from 'vitest'
import {
  FearGreedSchema,
  FearGreedHistorySchema,
  classifySentiment,
  getSentimentColor,
  getSentimentBgColor,
} from '@/lib/market/sentiment'

describe('sentiment: classifySentiment', () => {
  it('classifies values 0-20 as Extreme Fear', () => {
    expect(classifySentiment(0)).toBe('Extreme Fear')
    expect(classifySentiment(10)).toBe('Extreme Fear')
    expect(classifySentiment(20)).toBe('Extreme Fear')
  })

  it('classifies values 21-40 as Fear', () => {
    expect(classifySentiment(21)).toBe('Fear')
    expect(classifySentiment(30)).toBe('Fear')
    expect(classifySentiment(40)).toBe('Fear')
  })

  it('classifies values 41-60 as Neutral', () => {
    expect(classifySentiment(41)).toBe('Neutral')
    expect(classifySentiment(50)).toBe('Neutral')
    expect(classifySentiment(60)).toBe('Neutral')
  })

  it('classifies values 61-80 as Greed', () => {
    expect(classifySentiment(61)).toBe('Greed')
    expect(classifySentiment(70)).toBe('Greed')
    expect(classifySentiment(80)).toBe('Greed')
  })

  it('classifies values 81-100 as Extreme Greed', () => {
    expect(classifySentiment(81)).toBe('Extreme Greed')
    expect(classifySentiment(90)).toBe('Extreme Greed')
    expect(classifySentiment(100)).toBe('Extreme Greed')
  })
})

describe('sentiment: getSentimentColor', () => {
  it('returns rose for Extreme Fear', () => {
    expect(getSentimentColor(10)).toBe('text-rose-500')
  })

  it('returns amber for Fear', () => {
    expect(getSentimentColor(30)).toBe('text-amber-500')
  })

  it('returns zinc for Neutral', () => {
    expect(getSentimentColor(50)).toBe('text-zinc-400')
  })

  it('returns emerald-400 for Greed', () => {
    expect(getSentimentColor(70)).toBe('text-emerald-400')
  })

  it('returns emerald-500 for Extreme Greed', () => {
    expect(getSentimentColor(90)).toBe('text-emerald-500')
  })
})

describe('sentiment: getSentimentBgColor', () => {
  it('returns rose bg for Extreme Fear', () => {
    expect(getSentimentBgColor(10)).toBe('bg-rose-500')
  })

  it('returns emerald bg for Extreme Greed', () => {
    expect(getSentimentBgColor(90)).toBe('bg-emerald-500')
  })
})

describe('sentiment: FearGreedSchema', () => {
  it('validates a valid Fear & Greed entry', () => {
    const valid = {
      value: 25,
      classification: 'Fear' as const,
      timestamp: '2026-03-21T12:00:00Z',
    }
    const result = FearGreedSchema.parse(valid)
    expect(result.value).toBe(25)
    expect(result.classification).toBe('Fear')
  })

  it('rejects values below 0', () => {
    const invalid = { value: -1, classification: 'Fear', timestamp: '2026-03-21T12:00:00Z' }
    expect(() => FearGreedSchema.parse(invalid)).toThrow()
  })

  it('rejects values above 100', () => {
    const invalid = { value: 101, classification: 'Greed', timestamp: '2026-03-21T12:00:00Z' }
    expect(() => FearGreedSchema.parse(invalid)).toThrow()
  })

  it('rejects invalid classification', () => {
    const invalid = { value: 50, classification: 'Unknown', timestamp: '2026-03-21T12:00:00Z' }
    expect(() => FearGreedSchema.parse(invalid)).toThrow()
  })
})

describe('sentiment: FearGreedHistorySchema', () => {
  it('validates a valid history response', () => {
    const valid = {
      data: [
        { value: 25, classification: 'Fear' as const, timestamp: '2026-03-21T12:00:00Z' },
        { value: 75, classification: 'Greed' as const, timestamp: '2026-03-20T12:00:00Z' },
      ],
    }
    const result = FearGreedHistorySchema.parse(valid)
    expect(result.data).toHaveLength(2)
  })

  it('allows empty data array', () => {
    const valid = { data: [] }
    const result = FearGreedHistorySchema.parse(valid)
    expect(result.data).toHaveLength(0)
  })
})
