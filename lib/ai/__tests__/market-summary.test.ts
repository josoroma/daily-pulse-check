import { describe, it, expect } from 'vitest'
import { buildMarketSummaryPrompt, type MarketContext } from '@/lib/ai/market-summary'

const baseContext: MarketContext = {
  voo: null,
  qqq: null,
  btc: null,
  sentiment: null,
  indicators: [],
  inflationRate: null,
}

describe('buildMarketSummaryPrompt', () => {
  it('includes system instructions', () => {
    const prompt = buildMarketSummaryPrompt(baseContext)
    expect(prompt).toContain('concise market analyst')
    expect(prompt).toContain('CURRENT MARKET DATA')
  })

  it('includes VOO price when provided', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      voo: { symbol: 'VOO', price: 460.5, timestamp: '2026-03-17', currency: 'USD' },
    })
    expect(prompt).toContain('VOO (S&P 500 ETF): $460.50')
  })

  it('includes QQQ price when provided', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      qqq: { symbol: 'QQQ', price: 390.25, timestamp: '2026-03-17', currency: 'USD' },
    })
    expect(prompt).toContain('QQQ (Nasdaq 100 ETF): $390.25')
  })

  it('includes BTC with positive change', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      btc: {
        priceUsd: 92000,
        priceCrc: null,
        marketCap: 1800000000000,
        volume24h: 30000000000,
        percentChange24h: 2.5,
        lastUpdated: '2026-03-17',
      },
    })
    expect(prompt).toContain('Bitcoin: $92,000')
    expect(prompt).toContain('+2.5%')
  })

  it('includes BTC with negative change', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      btc: {
        priceUsd: 80000,
        priceCrc: null,
        marketCap: 1600000000000,
        volume24h: 25000000000,
        percentChange24h: -3.5,
        lastUpdated: '2026-03-17',
      },
    })
    expect(prompt).toContain('-3.5%')
  })

  it('includes Fear & Greed sentiment', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      sentiment: { value: 30, classification: 'Fear', timestamp: '2026-03-17' },
    })
    expect(prompt).toContain('Crypto Fear & Greed Index: 30/100 (Fear)')
  })

  it('includes macro indicators', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      indicators: [
        { name: 'Federal Funds Rate', value: 4.5, date: '2026-03-16', unit: '%' },
        { name: '10-Year Treasury Yield', value: 4.2, date: '2026-03-16', unit: '%' },
      ],
    })
    expect(prompt).toContain('Federal Funds Rate: 4.5%')
    expect(prompt).toContain('10-Year Treasury Yield: 4.2%')
  })

  it('includes inflation rate when provided', () => {
    const prompt = buildMarketSummaryPrompt({
      ...baseContext,
      inflationRate: 3.2,
    })
    expect(prompt).toContain('YoY Inflation Rate: 3.2%')
  })

  it('omits missing data gracefully', () => {
    const prompt = buildMarketSummaryPrompt(baseContext)
    expect(prompt).not.toContain('VOO (S&P 500 ETF): $')
    expect(prompt).not.toContain('Bitcoin: $')
    expect(prompt).not.toContain('Fear & Greed Index:')
    expect(prompt).not.toContain('YoY Inflation Rate:')
  })
})
