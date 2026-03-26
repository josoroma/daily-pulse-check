import { z } from 'zod'

// --- Constants ---

/** Blocks between each halving event */
export const HALVING_INTERVAL = 210_000

/** Maximum Bitcoin supply */
export const MAX_SUPPLY = 21_000_000

/** Average block time in seconds (target: 10 minutes) */
export const AVG_BLOCK_TIME_SECONDS = 600

/** Initial block reward in BTC */
export const INITIAL_REWARD = 50

// --- Schemas ---

export const HalvingEventSchema = z.object({
  number: z.number().int().positive(),
  blockHeight: z.number().int().nonnegative(),
  reward: z.number().positive(),
  date: z.string().nullable(),
  priceAtHalving: z.number().nullable(),
})

export type HalvingEvent = z.infer<typeof HalvingEventSchema>

export const HalvingCountdownSchema = z.object({
  currentBlockHeight: z.number().int().nonnegative(),
  nextHalvingBlock: z.number().int().positive(),
  blocksRemaining: z.number().int().nonnegative(),
  estimatedDate: z.string(),
  estimatedDaysRemaining: z.number().nonnegative(),
  currentReward: z.number().positive(),
  nextReward: z.number().positive(),
  currentEra: z.number().int().positive(),
  percentComplete: z.number().min(0).max(100),
})

export type HalvingCountdown = z.infer<typeof HalvingCountdownSchema>

export const SupplyMetricsSchema = z.object({
  totalMined: z.number().nonnegative(),
  percentMined: z.number().min(0).max(100),
  remainingSupply: z.number().nonnegative(),
  currentBlockReward: z.number().positive(),
  blocksPerDay: z.number().positive(),
  btcMinedPerDay: z.number().positive(),
  estimatedLastBitcoinYear: z.number().int().positive(),
})

export type SupplyMetrics = z.infer<typeof SupplyMetricsSchema>

// --- Historical data ---

export const HALVING_HISTORY: HalvingEvent[] = [
  {
    number: 1,
    blockHeight: 210_000,
    reward: 25,
    date: '2012-11-28',
    priceAtHalving: 12.35,
  },
  {
    number: 2,
    blockHeight: 420_000,
    reward: 12.5,
    date: '2016-07-09',
    priceAtHalving: 650.63,
  },
  {
    number: 3,
    blockHeight: 630_000,
    reward: 6.25,
    date: '2020-05-11',
    priceAtHalving: 8_821.42,
  },
  {
    number: 4,
    blockHeight: 840_000,
    reward: 3.125,
    date: '2024-04-19',
    priceAtHalving: 63_846.0,
  },
]

// --- Pure calculation functions ---

/** Get the block reward for a given era (1-indexed) */
export function getBlockReward(era: number): number {
  return INITIAL_REWARD / Math.pow(2, era - 1)
}

/** Get the current halving era based on block height */
export function getHalvingEra(blockHeight: number): number {
  return Math.floor(blockHeight / HALVING_INTERVAL) + 1
}

/** Get the next halving block height */
export function getNextHalvingBlock(blockHeight: number): number {
  const era = getHalvingEra(blockHeight)
  return era * HALVING_INTERVAL
}

/** Calculate blocks remaining until next halving */
export function getBlocksRemaining(blockHeight: number): number {
  return getNextHalvingBlock(blockHeight) - blockHeight
}

/** Estimate date of next halving based on current block height and avg block time */
export function estimateHalvingDate(
  blockHeight: number,
  avgBlockTimeSeconds: number = AVG_BLOCK_TIME_SECONDS,
): Date {
  const blocksRemaining = getBlocksRemaining(blockHeight)
  const secondsRemaining = blocksRemaining * avgBlockTimeSeconds
  return new Date(Date.now() + secondsRemaining * 1000)
}

/** Calculate total Bitcoin mined up to a given block height */
export function calculateTotalMined(blockHeight: number): number {
  let total = 0
  let reward = INITIAL_REWARD
  let blocksProcessed = 0

  while (blocksProcessed < blockHeight) {
    const eraEnd = Math.min(
      blocksProcessed + HALVING_INTERVAL - (blocksProcessed % HALVING_INTERVAL),
      blockHeight,
    )
    const blocksInEra = eraEnd - blocksProcessed
    total += blocksInEra * reward
    blocksProcessed = eraEnd
    if (blocksProcessed % HALVING_INTERVAL === 0) {
      reward /= 2
    }
  }

  return Math.min(total, MAX_SUPPLY)
}

/** Build halving countdown from current block height */
export function calculateHalvingCountdown(blockHeight: number): HalvingCountdown {
  const era = getHalvingEra(blockHeight)
  const nextHalvingBlock = getNextHalvingBlock(blockHeight)
  const blocksRemaining = getBlocksRemaining(blockHeight)
  const estimatedDate = estimateHalvingDate(blockHeight)
  const daysRemaining = (blocksRemaining * AVG_BLOCK_TIME_SECONDS) / 86_400
  const currentReward = getBlockReward(era)
  const nextReward = getBlockReward(era + 1)
  const blocksIntoEra = blockHeight - (era - 1) * HALVING_INTERVAL
  const percentComplete = (blocksIntoEra / HALVING_INTERVAL) * 100

  const parsed: HalvingCountdown = {
    currentBlockHeight: blockHeight,
    nextHalvingBlock,
    blocksRemaining,
    estimatedDate: estimatedDate.toISOString(),
    estimatedDaysRemaining: Math.round(daysRemaining * 10) / 10,
    currentReward,
    nextReward,
    currentEra: era,
    percentComplete: Math.round(percentComplete * 100) / 100,
  }

  return HalvingCountdownSchema.parse(parsed)
}

/** Calculate supply metrics from current block height */
export function calculateSupplyMetrics(blockHeight: number): SupplyMetrics {
  const era = getHalvingEra(blockHeight)
  const currentBlockReward = getBlockReward(era)
  const totalMined = calculateTotalMined(blockHeight)
  const blocksPerDay = 86_400 / AVG_BLOCK_TIME_SECONDS
  const btcMinedPerDay = blocksPerDay * currentBlockReward

  // Estimate year of last Bitcoin: each era halves the reward
  // After ~33 halvings, reward < 1 satoshi (effectively 0)
  // Genesis block: 2009-01-03
  // Each halving ~4 years apart
  const estimatedLastBitcoinYear = 2009 + 33 * 4 // ~2141

  const parsed: SupplyMetrics = {
    totalMined: Math.round(totalMined * 100) / 100,
    percentMined: Math.round((totalMined / MAX_SUPPLY) * 10000) / 100,
    remainingSupply: Math.round((MAX_SUPPLY - totalMined) * 100) / 100,
    currentBlockReward,
    blocksPerDay,
    btcMinedPerDay: Math.round(btcMinedPerDay * 100) / 100,
    estimatedLastBitcoinYear,
  }

  return SupplyMetricsSchema.parse(parsed)
}
