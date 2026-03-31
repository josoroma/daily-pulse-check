import { describe, it, expect } from 'vitest'
import { buildActivityFeed, computeDayChange } from '../_utils'

describe('buildActivityFeed', () => {
  it('merges transactions and notifications sorted by timestamp descending', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 10,
        price: 450,
        executed_at: '2026-03-25T10:00:00Z',
        position: { symbol: 'VOO' },
      },
    ]
    const notifications = [
      {
        id: '2',
        title: 'Price Alert',
        body: 'BTC hit $100k',
        type: 'price_alert',
        read: false,
        created_at: '2026-03-26T08:00:00Z',
      },
    ]

    const result = buildActivityFeed(transactions, notifications)

    expect(result).toHaveLength(2)
    expect(result[0]!.kind).toBe('notification')
    expect(result[0]!.id).toBe('notif-2')
    expect(result[1]!.kind).toBe('transaction')
    expect(result[1]!.id).toBe('tx-1')
    expect(result[1]!.title).toBe('Buy VOO')
  })

  it('limits output to 5 items', () => {
    const transactions = Array.from({ length: 4 }, (_, i) => ({
      id: `tx-${i}`,
      type: 'Buy',
      quantity: 1,
      price: 100,
      executed_at: `2026-03-2${i}T10:00:00Z`,
      position: { symbol: 'VOO' },
    }))
    const notifications = Array.from({ length: 4 }, (_, i) => ({
      id: `n-${i}`,
      title: `Alert ${i}`,
      body: `Body ${i}`,
      type: 'price_alert',
      read: false,
      created_at: `2026-03-2${i}T12:00:00Z`,
    }))

    const result = buildActivityFeed(transactions, notifications)
    expect(result).toHaveLength(5)
  })

  it('returns empty array when no items', () => {
    const result = buildActivityFeed([], [])
    expect(result).toEqual([])
  })

  it('handles array position from Supabase join', () => {
    const transactions = [
      {
        id: '1',
        type: 'Sell',
        quantity: 5,
        price: 200,
        executed_at: '2026-03-25T10:00:00Z',
        position: [{ symbol: 'QQQ' }],
      },
    ]

    const result = buildActivityFeed(transactions, [])

    expect(result[0]!.title).toBe('Sell QQQ')
  })

  it('shows ??? for null position', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 1,
        price: 100,
        executed_at: '2026-03-25T10:00:00Z',
        position: null,
      },
    ]

    const result = buildActivityFeed(transactions, [])

    expect(result[0]!.title).toBe('Buy ???')
  })

  it('formats quantity and price in description', () => {
    const transactions = [
      {
        id: '1',
        type: 'Buy',
        quantity: 0.5,
        price: 98500,
        executed_at: '2026-03-25T10:00:00Z',
        position: { symbol: 'BTC' },
      },
    ]

    const result = buildActivityFeed(transactions, [])

    expect(result[0]!.description).toBe('0.5000 @ $98,500.00')
  })
})

describe('computeDayChange', () => {
  it('computes change from 2nd snapshot when 2+ available', () => {
    const result = computeDayChange(11000, [{ total_value: 10500 }, { total_value: 10000 }])
    expect(result.dayChangeAmount).toBe(1000)
    expect(result.dayChangePct).toBe(10)
  })

  it('computes change from single snapshot', () => {
    const result = computeDayChange(10500, [{ total_value: 10000 }])
    expect(result.dayChangeAmount).toBe(500)
    expect(result.dayChangePct).toBe(5)
  })

  it('returns zeros when no snapshots', () => {
    const result = computeDayChange(10000, [])
    expect(result.dayChangeAmount).toBe(0)
    expect(result.dayChangePct).toBe(0)
  })

  it('returns zeros when previous value is 0', () => {
    const result = computeDayChange(10000, [{ total_value: 0 }])
    expect(result.dayChangeAmount).toBe(0)
    expect(result.dayChangePct).toBe(0)
  })

  it('handles negative change correctly', () => {
    const result = computeDayChange(9000, [{ total_value: 10500 }, { total_value: 10000 }])
    expect(result.dayChangeAmount).toBe(-1000)
    expect(result.dayChangePct).toBe(-10)
  })
})
