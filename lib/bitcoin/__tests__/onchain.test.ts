import { describe, it, expect } from 'vitest'
import {
  BlockHeightSchema,
  HashrateDataSchema,
  MempoolDataSchema,
  DifficultyDataSchema,
} from '@/lib/bitcoin/onchain'

describe('onchain: BlockHeightSchema', () => {
  it('validates a valid block height', () => {
    const valid = {
      height: 890_000,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = BlockHeightSchema.parse(valid)
    expect(result.height).toBe(890_000)
  })

  it('rejects negative height', () => {
    const invalid = {
      height: -1,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => BlockHeightSchema.parse(invalid)).toThrow()
  })

  it('accepts height of 0 (genesis)', () => {
    const valid = {
      height: 0,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = BlockHeightSchema.parse(valid)
    expect(result.height).toBe(0)
  })

  it('rejects non-integer height', () => {
    const invalid = {
      height: 890_000.5,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => BlockHeightSchema.parse(invalid)).toThrow()
  })
})

describe('onchain: HashrateDataSchema', () => {
  it('validates valid hashrate data', () => {
    const valid = {
      currentHashrate: 750_000_000_000_000_000_000,
      currentDifficulty: 110_000_000_000_000,
      hashrates: [
        { timestamp: 1711324800, avgHashrate: 700_000_000_000_000_000_000 },
        { timestamp: 1711411200, avgHashrate: 720_000_000_000_000_000_000 },
      ],
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = HashrateDataSchema.parse(valid)
    expect(result.hashrates).toHaveLength(2)
    expect(result.currentHashrate).toBe(750_000_000_000_000_000_000)
  })

  it('accepts empty hashrates array', () => {
    const valid = {
      currentHashrate: 750_000_000_000_000_000_000,
      currentDifficulty: 110_000_000_000_000,
      hashrates: [],
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = HashrateDataSchema.parse(valid)
    expect(result.hashrates).toHaveLength(0)
  })

  it('rejects negative currentHashrate', () => {
    const invalid = {
      currentHashrate: -1,
      currentDifficulty: 110_000_000_000_000,
      hashrates: [],
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => HashrateDataSchema.parse(invalid)).toThrow()
  })
})

describe('onchain: MempoolDataSchema', () => {
  it('validates valid mempool data', () => {
    const valid = {
      size: 45_000,
      bytes: 150_000_000,
      feeRates: {
        fastest: 25,
        halfHour: 18,
        hour: 12,
        economy: 6,
        minimum: 3,
      },
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = MempoolDataSchema.parse(valid)
    expect(result.size).toBe(45_000)
    expect(result.feeRates.fastest).toBe(25)
  })

  it('accepts zero values for empty mempool', () => {
    const valid = {
      size: 0,
      bytes: 0,
      feeRates: {
        fastest: 1,
        halfHour: 1,
        hour: 1,
        economy: 1,
        minimum: 1,
      },
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = MempoolDataSchema.parse(valid)
    expect(result.size).toBe(0)
  })

  it('rejects missing feeRates fields', () => {
    const invalid = {
      size: 45_000,
      bytes: 150_000_000,
      feeRates: {
        fastest: 25,
        // missing other fields
      },
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => MempoolDataSchema.parse(invalid)).toThrow()
  })
})

describe('onchain: DifficultyDataSchema', () => {
  it('validates valid difficulty data', () => {
    const valid = {
      currentDifficulty: 110_000_000_000_000,
      progressPercent: 45.5,
      remainingBlocks: 1100,
      remainingTime: 660_000,
      estimatedRetargetDate: '2026-04-15T00:00:00Z',
      nextDifficultyEstimate: 115_000_000_000_000,
      changePercent: 4.55,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = DifficultyDataSchema.parse(valid)
    expect(result.changePercent).toBe(4.55)
    expect(result.remainingBlocks).toBe(1100)
  })

  it('accepts negative changePercent for difficulty decrease', () => {
    const valid = {
      currentDifficulty: 110_000_000_000_000,
      progressPercent: 80.0,
      remainingBlocks: 400,
      remainingTime: 240_000,
      estimatedRetargetDate: '2026-04-01T00:00:00Z',
      nextDifficultyEstimate: 105_000_000_000_000,
      changePercent: -4.55,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    const result = DifficultyDataSchema.parse(valid)
    expect(result.changePercent).toBe(-4.55)
  })

  it('rejects zero currentDifficulty', () => {
    const invalid = {
      currentDifficulty: 0,
      progressPercent: 45.5,
      remainingBlocks: 1100,
      remainingTime: 660_000,
      estimatedRetargetDate: '2026-04-15T00:00:00Z',
      nextDifficultyEstimate: 115_000_000_000_000,
      changePercent: 4.55,
      lastUpdated: '2026-03-25T12:00:00Z',
    }
    expect(() => DifficultyDataSchema.parse(invalid)).toThrow()
  })
})
