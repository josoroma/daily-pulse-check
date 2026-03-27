import { describe, it, expect } from 'vitest'
import {
  calculateTotalReturn,
  calculatePerAssetPerformance,
  calculateTWRR,
  calculateBenchmarkReturn,
  compareToBenchmark,
  aggregateMonthlyReport,
  aggregateYearlyReport,
  calculateDcaAdherence,
  calculateFifoRealizedGains,
  generateCsv,
  realizedGainsToCsvRows,
  transactionsToCsvRows,
  getTaxNote,
} from '../_utils'

// ============================================================
// T-9.1.1: Total Return
// ============================================================

describe('calculateTotalReturn', () => {
  it('calculates total return as current minus cost basis', () => {
    const result = calculateTotalReturn([
      { quantity: 10, average_buy_price: 500, currentPrice: 575 },
      { quantity: 5, average_buy_price: 400, currentPrice: 450 },
    ])

    expect(result.totalCostBasis).toBe(7000) // 10*500 + 5*400
    expect(result.totalCurrentValue).toBe(8000) // 10*575 + 5*450
    expect(result.totalReturn).toBe(1000)
    expect(result.totalReturnPct).toBeCloseTo(14.29, 1)
  })

  it('returns 15% for $10,000 invested with $11,500 current value', () => {
    const result = calculateTotalReturn([
      { quantity: 100, average_buy_price: 100, currentPrice: 115 },
    ])

    expect(result.totalReturn).toBe(1500)
    expect(result.totalReturnPct).toBeCloseTo(15.0, 1)
  })

  it('handles zero investment gracefully', () => {
    const result = calculateTotalReturn([])
    expect(result.totalCostBasis).toBe(0)
    expect(result.totalCurrentValue).toBe(0)
    expect(result.totalReturn).toBe(0)
    expect(result.totalReturnPct).toBe(0)
  })

  it('handles positions with zero cost basis', () => {
    const result = calculateTotalReturn([{ quantity: 10, average_buy_price: 0, currentPrice: 100 }])
    expect(result.totalReturn).toBe(1000)
    expect(result.totalReturnPct).toBe(0) // can't divide by zero
  })

  it('handles negative returns correctly', () => {
    const result = calculateTotalReturn([
      { quantity: 10, average_buy_price: 100, currentPrice: 80 },
    ])
    expect(result.totalReturn).toBe(-200)
    expect(result.totalReturnPct).toBeCloseTo(-20.0, 1)
  })
})

describe('calculatePerAssetPerformance', () => {
  it('returns per-asset performance breakdown', () => {
    const result = calculatePerAssetPerformance([
      { symbol: 'VOO', asset_type: 'ETF', quantity: 10, average_buy_price: 400, currentPrice: 450 },
      {
        symbol: 'BTC',
        asset_type: 'Crypto',
        quantity: 0.5,
        average_buy_price: 50000,
        currentPrice: 60000,
      },
    ])

    expect(result).toHaveLength(2)
    expect(result[0]!.symbol).toBe('VOO')
    expect(result[0]!.costBasis).toBe(4000)
    expect(result[0]!.currentValue).toBe(4500)
    expect(result[0]!.unrealizedPnl).toBe(500)
    expect(result[0]!.returnPct).toBeCloseTo(12.5, 1)

    expect(result[1]!.symbol).toBe('BTC')
    expect(result[1]!.costBasis).toBe(25000)
    expect(result[1]!.currentValue).toBe(30000)
    expect(result[1]!.returnPct).toBeCloseTo(20.0, 1)
  })
})

// ============================================================
// T-9.1.2: TWRR
// ============================================================

describe('calculateTWRR', () => {
  it('calculates TWRR for snapshots without cash flows', () => {
    const snapshots = [
      { date: '2026-01-01', totalValue: 10000 },
      { date: '2026-01-02', totalValue: 10500 },
      { date: '2026-01-03', totalValue: 11000 },
    ]
    const result = calculateTWRR(snapshots, [])
    // (10500/10000) * (11000/10500) = 1.05 * 1.0476 = 1.1
    expect(result).toBeCloseTo(10.0, 0)
  })

  it('adjusts for cash flows properly', () => {
    const snapshots = [
      { date: '2026-01-01', totalValue: 10000 },
      { date: '2026-01-02', totalValue: 15000 },
    ]
    // $5000 deposit on day 1 means the pure return is 15000/(10000+5000) = 0%
    const cashFlows = [{ date: '2026-01-01', amount: 5000 }]
    const result = calculateTWRR(snapshots, cashFlows)
    expect(result).toBeCloseTo(0, 0)
  })

  it('returns 0 for fewer than 2 snapshots', () => {
    expect(calculateTWRR([], [])).toBe(0)
    expect(calculateTWRR([{ date: '2026-01-01', totalValue: 10000 }], [])).toBe(0)
  })

  it('handles zero value snapshots', () => {
    const snapshots = [
      { date: '2026-01-01', totalValue: 0 },
      { date: '2026-01-02', totalValue: 1000 },
    ]
    const result = calculateTWRR(snapshots, [])
    // denominator is 0, should skip, return 0
    expect(result).toBe(0)
  })
})

// ============================================================
// T-9.1.4: Benchmark Comparison
// ============================================================

describe('calculateBenchmarkReturn', () => {
  it('calculates benchmark return from start to end price', () => {
    const prices = [
      { date: '2026-01-01', close: 400 },
      { date: '2026-03-01', close: 450 },
    ]
    const result = calculateBenchmarkReturn(prices)
    expect(result).toBeCloseTo(12.5, 1)
  })

  it('handles unsorted prices', () => {
    const prices = [
      { date: '2026-03-01', close: 450 },
      { date: '2026-01-01', close: 400 },
    ]
    const result = calculateBenchmarkReturn(prices)
    expect(result).toBeCloseTo(12.5, 1)
  })

  it('returns 0 for fewer than 2 prices', () => {
    expect(calculateBenchmarkReturn([])).toBe(0)
    expect(calculateBenchmarkReturn([{ date: '2026-01-01', close: 400 }])).toBe(0)
  })

  it('returns 0 for zero start price', () => {
    const prices = [
      { date: '2026-01-01', close: 0 },
      { date: '2026-03-01', close: 450 },
    ]
    expect(calculateBenchmarkReturn(prices)).toBe(0)
  })
})

describe('compareToBenchmark', () => {
  it('identifies outperformance', () => {
    const result = compareToBenchmark(15, 12)
    expect(result.outperformancePct).toBeCloseTo(3, 1)
    expect(result.isOutperforming).toBe(true)
  })

  it('identifies underperformance', () => {
    const result = compareToBenchmark(8, 12)
    expect(result.outperformancePct).toBeCloseTo(-4, 1)
    expect(result.isOutperforming).toBe(false)
  })
})

// ============================================================
// T-9.2.1 & T-9.2.2: Report Aggregation
// ============================================================

describe('aggregateMonthlyReport', () => {
  it('aggregates monthly data from snapshots and transactions', () => {
    const snapshots = [
      { date: '2026-03-01', totalValue: 10000 },
      { date: '2026-03-15', totalValue: 10500 },
      { date: '2026-03-31', totalValue: 11000 },
    ]
    const transactions = [
      {
        id: '1',
        position_id: 'p1',
        type: 'Buy',
        quantity: 2,
        price: 400,
        fee: 0,
        executed_at: '2026-03-10T00:00:00Z',
        notes: null,
      },
    ]

    const result = aggregateMonthlyReport(2026, 3, snapshots, transactions, 83, ['VOO', 'BTC'])
    expect(result.startingValue).toBe(10000)
    expect(result.endingValue).toBe(11000)
    expect(result.netDeposits).toBe(800) // 2 * 400
    expect(result.withdrawals).toBe(0)
    expect(result.dcaAdherencePct).toBe(83)
  })

  it('handles months with no snapshots', () => {
    const result = aggregateMonthlyReport(2026, 6, [], [], 100, [])
    expect(result.startingValue).toBe(0)
    expect(result.endingValue).toBe(0)
    expect(result.returnPct).toBe(0)
  })
})

describe('aggregateYearlyReport', () => {
  it('aggregates yearly data', () => {
    const snapshots = [
      { date: '2026-01-01', totalValue: 10000 },
      { date: '2026-06-01', totalValue: 11000 },
      { date: '2026-12-31', totalValue: 12000 },
    ]

    const result = aggregateYearlyReport(2026, snapshots, [], 12000, 10000)
    expect(result.year).toBe(2026)
    expect(result.totalValue).toBe(12000)
    expect(result.unrealizedGains).toBe(2000)
    expect(result.totalReturnPct).toBeCloseTo(20, 1)
    expect(result.monthlyReturns).toHaveLength(12)
  })
})

// ============================================================
// T-9.2.3: DCA Adherence
// ============================================================

describe('calculateDcaAdherence', () => {
  it('calculates 83% for 10 of 12 executed', () => {
    expect(calculateDcaAdherence(12, 10)).toBe(83)
  })

  it('returns 100 for zero scheduled', () => {
    expect(calculateDcaAdherence(0, 0)).toBe(100)
  })

  it('returns 100% for perfect adherence', () => {
    expect(calculateDcaAdherence(12, 12)).toBe(100)
  })

  it('returns 0% for no executions', () => {
    expect(calculateDcaAdherence(12, 0)).toBe(0)
  })
})

// ============================================================
// T-9.3.1: FIFO Realized Gains
// ============================================================

describe('calculateFifoRealizedGains', () => {
  it('calculates FIFO gains for a simple buy-sell', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 10,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '2',
        type: 'Sell',
        quantity: 10,
        price: 120,
        fee: 5,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'VOO',
      },
    ]

    const gains = calculateFifoRealizedGains(transactions)
    expect(gains).toHaveLength(1)
    expect(gains[0]!.symbol).toBe('VOO')
    expect(gains[0]!.quantitySold).toBe(10)
    expect(gains[0]!.costBasis).toBe(1000)
    expect(gains[0]!.salePrice).toBe(1200)
    expect(gains[0]!.realizedGainLoss).toBeCloseTo(195, 0) // 1200 - 1000 - 5
    expect(gains[0]!.holdingPeriodDays).toBe(59)
  })

  it('handles multiple lots with FIFO order', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 5,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '2',
        type: 'Buy',
        quantity: 5,
        price: 150,
        fee: 0,
        executed_at: '2026-02-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '3',
        type: 'Sell',
        quantity: 7,
        price: 200,
        fee: 0,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'VOO',
      },
    ]

    const gains = calculateFifoRealizedGains(transactions)
    expect(gains).toHaveLength(2)

    // First lot: 5 units at $100, sold at $200
    expect(gains[0]!.quantitySold).toBe(5)
    expect(gains[0]!.costBasis).toBe(500)
    expect(gains[0]!.salePrice).toBe(1000)
    expect(gains[0]!.realizedGainLoss).toBe(500)

    // Second lot: 2 units at $150, sold at $200
    expect(gains[1]!.quantitySold).toBe(2)
    expect(gains[1]!.costBasis).toBe(300)
    expect(gains[1]!.salePrice).toBe(400)
    expect(gains[1]!.realizedGainLoss).toBe(100)
  })

  it('handles partial lot sells', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 10,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '2',
        type: 'Sell',
        quantity: 3,
        price: 120,
        fee: 0,
        executed_at: '2026-02-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '3',
        type: 'Sell',
        quantity: 4,
        price: 130,
        fee: 0,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'VOO',
      },
    ]

    const gains = calculateFifoRealizedGains(transactions)
    expect(gains).toHaveLength(2)

    // First sell: 3 from original lot
    expect(gains[0]!.quantitySold).toBe(3)
    expect(gains[0]!.costBasis).toBe(300)
    expect(gains[0]!.salePrice).toBe(360)
    expect(gains[0]!.realizedGainLoss).toBe(60)

    // Second sell: 4 from remaining original lot
    expect(gains[1]!.quantitySold).toBe(4)
    expect(gains[1]!.costBasis).toBe(400)
    expect(gains[1]!.salePrice).toBe(520)
    expect(gains[1]!.realizedGainLoss).toBe(120)
  })

  it('handles DCA buys as tax lots', () => {
    const transactions = [
      {
        id: '1',
        type: 'DCA',
        quantity: 2,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'BTC',
      },
      {
        id: '2',
        type: 'DCA',
        quantity: 2,
        price: 200,
        fee: 0,
        executed_at: '2026-02-01T00:00:00Z',
        symbol: 'BTC',
      },
      {
        id: '3',
        type: 'Sell',
        quantity: 3,
        price: 300,
        fee: 0,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'BTC',
      },
    ]

    const gains = calculateFifoRealizedGains(transactions)
    expect(gains).toHaveLength(2)
    // FIFO: 2 at $100 then 1 at $200
    expect(gains[0]!.costBasis).toBe(200) // 2 * 100
    expect(gains[1]!.costBasis).toBe(200) // 1 * 200
  })

  it('returns empty array for no sell transactions', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 10,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'VOO',
      },
    ]

    expect(calculateFifoRealizedGains(transactions)).toHaveLength(0)
  })

  it('handles multiple symbols independently', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 10,
        price: 100,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '2',
        type: 'Buy',
        quantity: 1,
        price: 50000,
        fee: 0,
        executed_at: '2026-01-01T00:00:00Z',
        symbol: 'BTC',
      },
      {
        id: '3',
        type: 'Sell',
        quantity: 5,
        price: 120,
        fee: 0,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'VOO',
      },
      {
        id: '4',
        type: 'Sell',
        quantity: 0.5,
        price: 60000,
        fee: 0,
        executed_at: '2026-03-01T00:00:00Z',
        symbol: 'BTC',
      },
    ]

    const gains = calculateFifoRealizedGains(transactions)
    expect(gains).toHaveLength(2)

    const vooGain = gains.find((g) => g.symbol === 'VOO')!
    expect(vooGain.costBasis).toBe(500)
    expect(vooGain.salePrice).toBe(600)

    const btcGain = gains.find((g) => g.symbol === 'BTC')!
    expect(btcGain.costBasis).toBe(25000)
    expect(btcGain.salePrice).toBe(30000)
  })
})

// ============================================================
// T-9.3.2: CSV Export
// ============================================================

describe('generateCsv', () => {
  it('generates CSV from headers and rows', () => {
    const csv = generateCsv(
      ['Name', 'Value'],
      [
        ['VOO', '100'],
        ['BTC', '50000'],
      ],
    )
    expect(csv).toBe('Name,Value\nVOO,100\nBTC,50000')
  })

  it('includes header note when provided', () => {
    const csv = generateCsv(['A', 'B'], [['1', '2']], 'Tax note here')
    expect(csv).toContain('Tax note here')
    expect(csv.split('\n')[0]).toBe('Tax note here')
    expect(csv.split('\n')[1]).toBe('')
    expect(csv.split('\n')[2]).toBe('A,B')
  })

  it('escapes fields with commas and quotes', () => {
    const csv = generateCsv(['Notes'], [['has, comma'], ['has "quote"']])
    expect(csv).toContain('"has, comma"')
    expect(csv).toContain('"has ""quote"""')
  })
})

describe('realizedGainsToCsvRows', () => {
  it('converts realized gains to CSV format', () => {
    const gains = [
      {
        sellDate: '2026-03-01T00:00:00Z',
        symbol: 'VOO',
        quantitySold: 10,
        costBasis: 1000,
        salePrice: 1200,
        realizedGainLoss: 195,
        holdingPeriodDays: 59,
      },
    ]

    const { headers, rows } = realizedGainsToCsvRows(gains)
    expect(headers).toContain('Symbol')
    expect(headers).toContain('Realized Gain/Loss (USD)')
    expect(rows).toHaveLength(1)
    expect(rows[0]![1]).toBe('VOO')
  })
})

describe('transactionsToCsvRows', () => {
  it('converts transactions to CSV format', () => {
    const txs = [
      {
        id: '1',
        position_id: 'p1',
        type: 'Buy',
        quantity: 10,
        price: 100,
        fee: 5,
        executed_at: '2026-01-15T00:00:00Z',
        notes: null,
        position: { symbol: 'VOO', asset_type: 'ETF' },
      },
    ]

    const { headers, rows } = transactionsToCsvRows(txs)
    expect(headers).toContain('Type')
    expect(headers).toContain('Symbol')
    expect(rows).toHaveLength(1)
    expect(rows[0]![2]).toBe('VOO')
  })
})

// ============================================================
// T-9.3.3: Tax Notes
// ============================================================

describe('getTaxNote', () => {
  it('returns Costa Rica tax note for CR', () => {
    const note = getTaxNote('CR')
    expect(note).toContain('Costa Rica territorial tax system')
    expect(note).toContain('Consult your accountant')
  })

  it('returns Costa Rica note for full country name', () => {
    expect(getTaxNote('Costa Rica')).toContain('Costa Rica')
  })

  it('returns undefined for unknown country', () => {
    expect(getTaxNote('US')).toBeUndefined()
  })
})
