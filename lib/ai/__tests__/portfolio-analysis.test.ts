import { describe, it, expect } from 'vitest'
import { buildPortfolioAnalysisSystem, type PortfolioContext } from '@/lib/ai/portfolio-analysis'

const baseCtx: PortfolioContext = {
  positions: [],
  targetAllocations: null,
  riskTolerance: 'Medium',
  country: 'CR',
  baseCurrency: 'USD',
  totalValue: 0,
}

describe('buildPortfolioAnalysisSystem', () => {
  it('includes system instructions', () => {
    const prompt = buildPortfolioAnalysisSystem(baseCtx)
    expect(prompt).toContain('portfolio analyst assistant')
    expect(prompt).toContain('Never give definitive buy/sell recommendations')
  })

  it('includes user profile info', () => {
    const prompt = buildPortfolioAnalysisSystem({
      ...baseCtx,
      riskTolerance: 'Aggressive',
      country: 'CR',
      baseCurrency: 'CRC',
    })
    expect(prompt).toContain('Risk Tolerance: Aggressive')
    expect(prompt).toContain('Country: CR')
    expect(prompt).toContain('Base Currency: CRC')
  })

  it('shows empty state when no positions', () => {
    const prompt = buildPortfolioAnalysisSystem(baseCtx)
    expect(prompt).toContain('no positions yet')
  })

  it('lists positions with P&L', () => {
    const prompt = buildPortfolioAnalysisSystem({
      ...baseCtx,
      positions: [
        {
          symbol: 'VOO',
          asset_type: 'ETF',
          quantity: 10,
          average_buy_price: 400,
          current_price: 460,
          current_value: 4600,
          unrealized_pnl: 600,
          unrealized_pnl_pct: 15,
        },
        {
          symbol: 'BTC',
          asset_type: 'Crypto',
          quantity: 0.5,
          average_buy_price: 50000,
          current_price: 92000,
          current_value: 46000,
          unrealized_pnl: 21000,
          unrealized_pnl_pct: 84,
        },
      ],
      totalValue: 50600,
    })
    expect(prompt).toContain('VOO (ETF): 10 units @ avg $400.00')
    expect(prompt).toContain('+15.0%')
    expect(prompt).toContain('BTC (Crypto): 0.5 units @ avg $50000.00')
    expect(prompt).toContain('+84.0%')
  })

  it('includes current allocation breakdown', () => {
    const prompt = buildPortfolioAnalysisSystem({
      ...baseCtx,
      positions: [
        {
          symbol: 'VOO',
          asset_type: 'ETF',
          quantity: 10,
          average_buy_price: 400,
          current_price: 460,
          current_value: 4600,
          unrealized_pnl: 600,
          unrealized_pnl_pct: 15,
        },
      ],
      totalValue: 4600,
    })
    expect(prompt).toContain('CURRENT ALLOCATION')
    expect(prompt).toContain('VOO: 100.0%')
  })

  it('includes target allocations when present', () => {
    const prompt = buildPortfolioAnalysisSystem({
      ...baseCtx,
      positions: [
        {
          symbol: 'VOO',
          asset_type: 'ETF',
          quantity: 1,
          average_buy_price: 400,
          current_price: 460,
          current_value: 460,
          unrealized_pnl: 60,
          unrealized_pnl_pct: 15,
        },
      ],
      totalValue: 460,
      targetAllocations: { VOO: 50, QQQ: 20, BTC: 20, Cash: 10 },
    })
    expect(prompt).toContain('TARGET ALLOCATION')
    expect(prompt).toContain('VOO: 50%')
    expect(prompt).toContain('BTC: 20%')
  })

  it('shows negative P&L without + prefix', () => {
    const prompt = buildPortfolioAnalysisSystem({
      ...baseCtx,
      positions: [
        {
          symbol: 'QQQ',
          asset_type: 'ETF',
          quantity: 5,
          average_buy_price: 400,
          current_price: 380,
          current_value: 1900,
          unrealized_pnl: -100,
          unrealized_pnl_pct: -5,
        },
      ],
      totalValue: 1900,
    })
    expect(prompt).toContain('-5.0%')
    expect(prompt).not.toContain('+-5.0%')
  })
})
