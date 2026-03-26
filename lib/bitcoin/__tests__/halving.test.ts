import { describe, it, expect } from 'vitest'
import {
  getBlockReward,
  getHalvingEra,
  getNextHalvingBlock,
  getBlocksRemaining,
  estimateHalvingDate,
  calculateTotalMined,
  calculateHalvingCountdown,
  calculateSupplyMetrics,
  HALVING_INTERVAL,
  MAX_SUPPLY,
  INITIAL_REWARD,
  AVG_BLOCK_TIME_SECONDS,
  HALVING_HISTORY,
} from '@/lib/bitcoin/halving'

describe('halving: getBlockReward', () => {
  it('returns 50 BTC for era 1', () => {
    expect(getBlockReward(1)).toBe(50)
  })

  it('returns 25 BTC for era 2', () => {
    expect(getBlockReward(2)).toBe(25)
  })

  it('returns 3.125 BTC for era 5 (current era as of 2024)', () => {
    expect(getBlockReward(5)).toBe(3.125)
  })

  it('returns 1.5625 BTC for era 6 (next halving)', () => {
    expect(getBlockReward(6)).toBe(1.5625)
  })

  it('halves with each successive era', () => {
    for (let era = 1; era <= 10; era++) {
      expect(getBlockReward(era)).toBe(INITIAL_REWARD / Math.pow(2, era - 1))
    }
  })
})

describe('halving: getHalvingEra', () => {
  it('returns era 1 for genesis block', () => {
    expect(getHalvingEra(0)).toBe(1)
  })

  it('returns era 1 for block 209,999', () => {
    expect(getHalvingEra(209_999)).toBe(1)
  })

  it('returns era 2 for block 210,000', () => {
    expect(getHalvingEra(210_000)).toBe(2)
  })

  it('returns era 5 for block 840,000 (2024 halving)', () => {
    expect(getHalvingEra(840_000)).toBe(5)
  })

  it('returns era 5 for block 890,000 (current approximate height)', () => {
    expect(getHalvingEra(890_000)).toBe(5)
  })
})

describe('halving: getNextHalvingBlock', () => {
  it('returns 210,000 for block 0', () => {
    expect(getNextHalvingBlock(0)).toBe(210_000)
  })

  it('returns 210,000 for block 100,000', () => {
    expect(getNextHalvingBlock(100_000)).toBe(210_000)
  })

  it('returns 420,000 for block 210,000', () => {
    expect(getNextHalvingBlock(210_000)).toBe(420_000)
  })

  it('returns 1,050,000 for block 890,000', () => {
    expect(getNextHalvingBlock(890_000)).toBe(1_050_000)
  })
})

describe('halving: getBlocksRemaining', () => {
  it('returns full interval for genesis block', () => {
    expect(getBlocksRemaining(0)).toBe(210_000)
  })

  it('returns 1 for block one before halving', () => {
    expect(getBlocksRemaining(209_999)).toBe(1)
  })

  it('returns full interval for block at halving boundary', () => {
    expect(getBlocksRemaining(210_000)).toBe(210_000)
  })

  it('returns correct remaining for current approximate height', () => {
    const remaining = getBlocksRemaining(890_000)
    expect(remaining).toBe(1_050_000 - 890_000)
    expect(remaining).toBe(160_000)
  })
})

describe('halving: estimateHalvingDate', () => {
  it('returns future date for current block height', () => {
    const date = estimateHalvingDate(890_000)
    expect(date.getTime()).toBeGreaterThan(Date.now())
  })

  it('estimates correctly with known avg block time', () => {
    const now = Date.now()
    const blocksRemaining = 1000
    const blockHeight = 1_050_000 - blocksRemaining
    const date = estimateHalvingDate(blockHeight, 600)
    const expectedMs = now + blocksRemaining * 600 * 1000
    // Allow 1 second tolerance for test timing
    expect(Math.abs(date.getTime() - expectedMs)).toBeLessThan(1000)
  })

  it('respects custom avg block time', () => {
    const fast = estimateHalvingDate(890_000, 300) // 5 min blocks
    const slow = estimateHalvingDate(890_000, 900) // 15 min blocks
    expect(fast.getTime()).toBeLessThan(slow.getTime())
  })
})

describe('halving: calculateTotalMined', () => {
  it('returns 0 for block 0', () => {
    expect(calculateTotalMined(0)).toBe(0)
  })

  it('returns 50 for block 1', () => {
    expect(calculateTotalMined(1)).toBe(50)
  })

  it('returns 10,500,000 for block 210,000 (end of era 1)', () => {
    expect(calculateTotalMined(210_000)).toBe(210_000 * 50)
  })

  it('returns correct supply for block 420,000 (end of era 2)', () => {
    const expected = 210_000 * 50 + 210_000 * 25
    expect(calculateTotalMined(420_000)).toBe(expected)
  })

  it('never exceeds MAX_SUPPLY', () => {
    // Very high block height
    const mined = calculateTotalMined(100_000_000)
    expect(mined).toBeLessThanOrEqual(MAX_SUPPLY)
  })

  it('returns increasing values for increasing heights', () => {
    const at100k = calculateTotalMined(100_000)
    const at200k = calculateTotalMined(200_000)
    const at500k = calculateTotalMined(500_000)
    expect(at200k).toBeGreaterThan(at100k)
    expect(at500k).toBeGreaterThan(at200k)
  })
})

describe('halving: calculateHalvingCountdown', () => {
  it('returns valid countdown for current approximate height', () => {
    const countdown = calculateHalvingCountdown(890_000)
    expect(countdown.currentBlockHeight).toBe(890_000)
    expect(countdown.nextHalvingBlock).toBe(1_050_000)
    expect(countdown.blocksRemaining).toBe(160_000)
    expect(countdown.currentReward).toBe(3.125)
    expect(countdown.nextReward).toBe(1.5625)
    expect(countdown.currentEra).toBe(5)
    expect(countdown.estimatedDaysRemaining).toBeGreaterThan(0)
    expect(countdown.percentComplete).toBeGreaterThan(0)
    expect(countdown.percentComplete).toBeLessThan(100)
  })

  it('shows high percent complete near halving', () => {
    const countdown = calculateHalvingCountdown(1_049_990)
    expect(countdown.percentComplete).toBeGreaterThan(99)
    expect(countdown.blocksRemaining).toBe(10)
  })

  it('shows low percent complete just after halving', () => {
    const countdown = calculateHalvingCountdown(840_001)
    expect(countdown.percentComplete).toBeLessThan(1)
  })
})

describe('halving: calculateSupplyMetrics', () => {
  it('returns valid supply metrics for current height', () => {
    const metrics = calculateSupplyMetrics(890_000)
    expect(metrics.totalMined).toBeGreaterThan(0)
    expect(metrics.percentMined).toBeGreaterThan(90)
    expect(metrics.percentMined).toBeLessThan(100)
    expect(metrics.remainingSupply).toBeGreaterThan(0)
    expect(metrics.currentBlockReward).toBe(3.125)
    expect(metrics.blocksPerDay).toBe(144) // 86400 / 600
    expect(metrics.btcMinedPerDay).toBe(450) // 144 * 3.125
    expect(metrics.estimatedLastBitcoinYear).toBe(2141)
  })

  it('totalMined + remainingSupply equals MAX_SUPPLY', () => {
    const metrics = calculateSupplyMetrics(890_000)
    expect(metrics.totalMined + metrics.remainingSupply).toBeCloseTo(MAX_SUPPLY, 0)
  })
})

describe('halving: HALVING_HISTORY', () => {
  it('contains 4 historical halvings', () => {
    expect(HALVING_HISTORY).toHaveLength(4)
  })

  it('has correct block heights', () => {
    expect(HALVING_HISTORY[0]!.blockHeight).toBe(210_000)
    expect(HALVING_HISTORY[1]!.blockHeight).toBe(420_000)
    expect(HALVING_HISTORY[2]!.blockHeight).toBe(630_000)
    expect(HALVING_HISTORY[3]!.blockHeight).toBe(840_000)
  })

  it('has halving rewards that halve each time', () => {
    expect(HALVING_HISTORY[0]!.reward).toBe(25)
    expect(HALVING_HISTORY[1]!.reward).toBe(12.5)
    expect(HALVING_HISTORY[2]!.reward).toBe(6.25)
    expect(HALVING_HISTORY[3]!.reward).toBe(3.125)
  })

  it('has dates for all halvings', () => {
    for (const halving of HALVING_HISTORY) {
      expect(halving.date).not.toBeNull()
    }
  })

  it('block heights are multiples of HALVING_INTERVAL', () => {
    for (const halving of HALVING_HISTORY) {
      expect(halving.blockHeight % HALVING_INTERVAL).toBe(0)
    }
  })
})

describe('halving: constants', () => {
  it('HALVING_INTERVAL is 210,000', () => {
    expect(HALVING_INTERVAL).toBe(210_000)
  })

  it('MAX_SUPPLY is 21,000,000', () => {
    expect(MAX_SUPPLY).toBe(21_000_000)
  })

  it('AVG_BLOCK_TIME_SECONDS is 600 (10 minutes)', () => {
    expect(AVG_BLOCK_TIME_SECONDS).toBe(600)
  })

  it('INITIAL_REWARD is 50', () => {
    expect(INITIAL_REWARD).toBe(50)
  })
})
