import { z } from 'zod'
import { getCached, getStaleFromSupabaseCache, CacheTTL } from '@/lib/market/cache'

const MEMPOOL_BASE = 'https://mempool.space/api'

// --- Schemas ---

export const BlockHeightSchema = z.object({
  height: z.number().int().nonnegative(),
  lastUpdated: z.string(),
})

export type BlockHeight = z.infer<typeof BlockHeightSchema>

export const HashrateDataSchema = z.object({
  currentHashrate: z.number().nonnegative(),
  currentDifficulty: z.number().nonnegative(),
  hashrates: z.array(
    z.object({
      timestamp: z.number(),
      avgHashrate: z.number().nonnegative(),
    }),
  ),
  lastUpdated: z.string(),
})

export type HashrateData = z.infer<typeof HashrateDataSchema>

export const MempoolDataSchema = z.object({
  size: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  feeRates: z.object({
    fastest: z.number().nonnegative(),
    halfHour: z.number().nonnegative(),
    hour: z.number().nonnegative(),
    economy: z.number().nonnegative(),
    minimum: z.number().nonnegative(),
  }),
  lastUpdated: z.string(),
})

export type MempoolData = z.infer<typeof MempoolDataSchema>

export const DifficultyDataSchema = z.object({
  currentDifficulty: z.number().positive(),
  progressPercent: z.number(),
  remainingBlocks: z.number().int().nonnegative(),
  remainingTime: z.number().nonnegative(),
  estimatedRetargetDate: z.string(),
  nextDifficultyEstimate: z.number().positive(),
  changePercent: z.number(),
  lastUpdated: z.string(),
})

export type DifficultyData = z.infer<typeof DifficultyDataSchema>

// --- Internal helpers ---

async function fetchFromMempool<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${MEMPOOL_BASE}${endpoint}`, {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Mempool.space API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

// --- Public API ---

export async function fetchBlockHeight(): Promise<BlockHeight> {
  const cacheKey = 'bitcoin:block:height'

  try {
    return await getCached<BlockHeight>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const height = await fetchFromMempool<number>('/blocks/tip/height')

      const parsed: BlockHeight = {
        height,
        lastUpdated: new Date().toISOString(),
      }

      return BlockHeightSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<BlockHeight>(cacheKey)
    if (stale) {
      console.error('[bitcoin] Block height fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

export async function fetchHashrate(): Promise<HashrateData> {
  const cacheKey = 'bitcoin:hashrate:30d'

  try {
    return await getCached<HashrateData>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      const raw = await fetchFromMempool<{
        currentHashrate: number
        currentDifficulty: number
        hashrates: Array<{
          timestamp: number
          avgHashrate: number
        }>
      }>('/v1/mining/hashrate/1m')

      const parsed: HashrateData = {
        currentHashrate: raw.currentHashrate,
        currentDifficulty: raw.currentDifficulty,
        hashrates: (raw.hashrates ?? []).map((h) => ({
          timestamp: h.timestamp,
          avgHashrate: h.avgHashrate,
        })),
        lastUpdated: new Date().toISOString(),
      }

      return HashrateDataSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<HashrateData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] Hashrate fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

export async function fetchMempool(): Promise<MempoolData> {
  const cacheKey = 'bitcoin:mempool'

  try {
    return await getCached<MempoolData>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const [mempool, fees] = await Promise.all([
        fetchFromMempool<{
          count: number
          vsize: number
        }>('/mempool'),
        fetchFromMempool<{
          fastestFee: number
          halfHourFee: number
          hourFee: number
          economyFee: number
          minimumFee: number
        }>('/v1/fees/recommended'),
      ])

      const parsed: MempoolData = {
        size: mempool.count,
        bytes: mempool.vsize,
        feeRates: {
          fastest: fees.fastestFee,
          halfHour: fees.halfHourFee,
          hour: fees.hourFee,
          economy: fees.economyFee,
          minimum: fees.minimumFee,
        },
        lastUpdated: new Date().toISOString(),
      }

      return MempoolDataSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<MempoolData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] Mempool fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

export async function fetchDifficulty(currentDifficultyOverride?: number): Promise<DifficultyData> {
  const cacheKey = 'bitcoin:difficulty'

  try {
    return await getCached<DifficultyData>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const raw = await fetchFromMempool<{
        progressPercent: number
        difficultyChange: number
        estimatedRetargetDate: number
        remainingBlocks: number
        remainingTime: number
        previousRetarget: number
        previousTime: number
        nextRetargetHeight: number
        timeAvg: number
        timeOffset: number
        expectedBlocks: number
      }>('/v1/difficulty-adjustment')

      // Use override if provided (avoids redundant fetch when called in parallel with fetchHashrate)
      const currentDifficulty =
        currentDifficultyOverride ?? (await fetchHashrate()).currentDifficulty

      const parsed: DifficultyData = {
        currentDifficulty,
        progressPercent: raw.progressPercent,
        remainingBlocks: raw.remainingBlocks,
        remainingTime: raw.remainingTime,
        estimatedRetargetDate: new Date(raw.estimatedRetargetDate * 1000).toISOString(),
        nextDifficultyEstimate: currentDifficulty * (1 + raw.difficultyChange / 100),
        changePercent: Math.round(raw.difficultyChange * 100) / 100,
        lastUpdated: new Date().toISOString(),
      }

      return DifficultyDataSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<DifficultyData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] Difficulty fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}
