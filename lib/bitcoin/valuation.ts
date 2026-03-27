import { z } from 'zod'
import { getCached, getStaleFromSupabaseCache, CacheTTL } from '@/lib/market/cache'
import { HALVING_INTERVAL, INITIAL_REWARD, HALVING_HISTORY } from '@/lib/bitcoin/halving'
import { RAINBOW_BANDS } from '@/lib/bitcoin/rainbow-bands'

/**
 * MVRV Z-Score calculation for Bitcoin.
 *
 * MVRV = Market Cap / Realized Cap
 * Z-Score = (Market Cap - Realized Cap) / StdDev(Market Cap)
 *
 * Since realized cap requires on-chain data (UTXO set), we use
 * a CoinGecko-based market cap approach with a realized cap estimate
 * from Blockchain.com's free API endpoint, falling back to a
 * thermocap multiple heuristic.
 */

export const MvrvDataSchema = z.object({
  marketCap: z.number().positive(),
  realizedCap: z.number().positive(),
  mvrvRatio: z.number(),
  zScore: z.number(),
  lastUpdated: z.string(),
})

export type MvrvData = z.infer<typeof MvrvDataSchema>

// --- Stock-to-Flow ---

export const S2FPointSchema = z.object({
  timestamp: z.number(),
  price: z.number().positive(),
  s2fModelPrice: z.number().positive(),
  s2fRatio: z.number().nonnegative(),
})

export type S2FPoint = z.infer<typeof S2FPointSchema>

export const S2FDataSchema = z.object({
  dataPoints: z.array(S2FPointSchema),
  currentS2F: z.number().nonnegative(),
  currentModelPrice: z.number().positive(),
  halvingEvents: z.array(
    z.object({
      timestamp: z.number(),
      blockHeight: z.number().int(),
      label: z.string(),
    }),
  ),
  lastUpdated: z.string(),
})

export type S2FData = z.infer<typeof S2FDataSchema>

// --- Rainbow Price Band ---

export const RainbowBandSchema = z.object({
  label: z.string(),
  color: z.string(),
  upper: z.number(),
  lower: z.number(),
})

export type RainbowBand = z.infer<typeof RainbowBandSchema>

export const RainbowPointSchema = z.object({
  timestamp: z.number(),
  price: z.number().positive(),
  daysSinceGenesis: z.number().positive(),
  bands: z.array(RainbowBandSchema),
})

export type RainbowPoint = z.infer<typeof RainbowPointSchema>

export const RainbowDataSchema = z.object({
  dataPoints: z.array(RainbowPointSchema),
  currentBand: z.string(),
  lastUpdated: z.string(),
})

export type RainbowData = z.infer<typeof RainbowDataSchema>

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

/**
 * Realized cap discount factor applied to current market cap.
 * True realized cap requires on-chain UTXO data (Glassnode / CoinMetrics).
 * This approximation assumes realized cap ≈ 65% of market cap.
 */
const REALIZED_CAP_DISCOUNT = 0.65

/** Thermocap heuristic: avg market cap × 0.7 as lower-bound realized cap estimate */
const REALIZED_CAP_FALLBACK_MULT = 0.7

function getCoinGeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey
  }
  return headers
}

/** Shared Bitcoin price history (365 days) — reused by S2F and Rainbow to avoid duplicate API calls */
export async function fetchBtcPriceHistory(): Promise<Array<[number, number]>> {
  const cacheKey = 'bitcoin:price-history:365d'

  return getCached<Array<[number, number]>>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
    const response = await fetch(
      `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`,
      { headers: getCoinGeckoHeaders(), next: { revalidate: 0 } },
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const raw = (await response.json()) as { prices: Array<[number, number]> }
    return raw.prices ?? []
  })
}

/**
 * Estimate realized cap from historical market cap data.
 *
 * ⚠️ APPROXIMATION: True realized cap requires UTXO-set data (Glassnode,
 * CoinMetrics). We estimate it as the average of:
 *   - current market cap × 0.65 (realized cap discount)
 *   - 365-day average market cap × 0.70 (thermocap heuristic)
 * This blends short-term and long-term signals for a more stable estimate.
 */
function estimateRealizedCap(currentMarketCap: number, historicalMarketCaps: number[]): number {
  const discounted = currentMarketCap * REALIZED_CAP_DISCOUNT
  if (historicalMarketCaps.length === 0) return discounted

  const avgMarketCap =
    historicalMarketCaps.reduce((sum, cap) => sum + cap, 0) / historicalMarketCaps.length
  const heuristic = avgMarketCap * REALIZED_CAP_FALLBACK_MULT

  return (discounted + heuristic) / 2
}

/**
 * Fetch MVRV Z-Score data for Bitcoin.
 *
 * Uses CoinGecko for market cap and estimates realized cap from
 * historical market cap data. The Z-Score is calculated from
 * historical market cap standard deviation.
 */
export async function fetchMvrvZScore(): Promise<MvrvData> {
  const cacheKey = 'bitcoin:mvrv:zscore'

  try {
    return await getCached<MvrvData>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      // Fetch current Bitcoin market data from CoinGecko
      const btcResponse = await fetch(
        `${COINGECKO_BASE}/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false`,
        { headers: getCoinGeckoHeaders(), next: { revalidate: 0 } },
      )

      if (!btcResponse.ok) {
        throw new Error(`CoinGecko API error: ${btcResponse.status}`)
      }

      const btcData = (await btcResponse.json()) as {
        market_data: {
          market_cap: { usd: number }
          total_supply: number
          current_price: { usd: number }
        }
        last_updated: string
      }

      const marketCap = btcData.market_data.market_cap.usd

      // Fetch historical market caps for standard deviation calculation
      const historyResponse = await fetch(
        `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`,
        { headers: getCoinGeckoHeaders(), next: { revalidate: 0 } },
      )

      if (!historyResponse.ok) {
        throw new Error(`CoinGecko history API error: ${historyResponse.status}`)
      }

      const historyData = (await historyResponse.json()) as {
        market_caps: Array<[number, number]>
      }

      const marketCaps = historyData.market_caps.map(([, cap]) => cap).filter((cap) => cap > 0)

      // Estimate realized cap from CoinGecko data (no external dependency)
      const realizedCap = estimateRealizedCap(marketCap, marketCaps)

      // Calculate standard deviation of market caps
      const mean = marketCaps.reduce((sum, cap) => sum + cap, 0) / marketCaps.length
      const variance =
        marketCaps.reduce((sum, cap) => sum + Math.pow(cap - mean, 2), 0) / marketCaps.length
      const stdDev = Math.sqrt(variance)

      // MVRV Ratio
      const mvrvRatio = marketCap / realizedCap

      // Z-Score = (Market Cap - Realized Cap) / StdDev
      const zScore = stdDev > 0 ? (marketCap - realizedCap) / stdDev : 0

      const parsed: MvrvData = {
        marketCap,
        realizedCap,
        mvrvRatio: Math.round(mvrvRatio * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        lastUpdated: btcData.last_updated ?? new Date().toISOString(),
      }

      return MvrvDataSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<MvrvData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] MVRV fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

// --- Stock-to-Flow Pure Calculations ---

/**
 * Calculate S2F ratio: stock (current supply) / flow (annual production).
 * After each halving, flow halves → S2F doubles.
 */
export function calculateS2FRatio(blockHeight: number): number {
  const era = Math.floor(blockHeight / HALVING_INTERVAL) + 1
  const reward = INITIAL_REWARD / Math.pow(2, era - 1)
  const blocksPerYear = (365.25 * 24 * 3600) / 600
  const annualFlow = reward * blocksPerYear

  // Approximate circulating supply
  let supply = 0
  let r = INITIAL_REWARD
  for (let e = 1; e < era; e++) {
    supply += HALVING_INTERVAL * r
    r /= 2
  }
  supply += (blockHeight % HALVING_INTERVAL) * reward

  if (annualFlow === 0) return Infinity
  return supply / annualFlow
}

/**
 * S2F model price: ln(price) = 3.21 × ln(S2F) − 1.6
 *
 * Based on PlanB's original 2019 regression ("Modeling Bitcoin Value with
 * Scarcity"). The coefficients were fitted on pre-2020 data; the model
 * has increasingly diverged from spot price since the 2021 cycle.
 * Displayed for educational/historical context rather than as a forecast.
 */
export function s2fModelPrice(s2fRatio: number): number {
  if (s2fRatio <= 0) return 0
  return Math.exp(3.21 * Math.log(s2fRatio) - 1.6)
}

/** Fetch S2F chart data using CoinGecko historical prices */
export async function fetchS2FData(priceHistory?: Array<[number, number]>): Promise<S2FData> {
  const cacheKey = 'bitcoin:s2f:data'

  try {
    return await getCached<S2FData>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      const prices = priceHistory ?? (await fetchBtcPriceHistory())

      // Bitcoin genesis block: 2009-01-03
      const genesisTimestamp = new Date('2009-01-03T00:00:00Z').getTime()
      const avgBlockTimeMs = 600 * 1000

      const dataPoints: S2FPoint[] = prices
        .filter(([, price]) => price > 0)
        .map(([timestamp, price]) => {
          // Estimate block height from timestamp
          const elapsedMs = timestamp - genesisTimestamp
          const estimatedBlockHeight = Math.max(0, Math.floor(elapsedMs / avgBlockTimeMs))
          const s2fRatio = calculateS2FRatio(estimatedBlockHeight)
          const modelPrice = s2fModelPrice(s2fRatio)

          return {
            timestamp,
            price,
            s2fModelPrice: Math.round(modelPrice * 100) / 100,
            s2fRatio: Math.round(s2fRatio * 100) / 100,
          }
        })

      // Build halving events for chart markers
      const halvingEvents = HALVING_HISTORY.map((h) => ({
        timestamp: h.date ? new Date(h.date).getTime() : 0,
        blockHeight: h.blockHeight,
        label: `Halving #${h.number} (${h.reward} BTC)`,
      })).filter((e) => e.timestamp > 0)

      // Current S2F
      const now = Date.now()
      const currentEstimatedHeight = Math.floor((now - genesisTimestamp) / avgBlockTimeMs)
      const currentS2F = calculateS2FRatio(currentEstimatedHeight)
      const currentModelPrice = s2fModelPrice(currentS2F)

      return S2FDataSchema.parse({
        dataPoints,
        currentS2F: Math.round(currentS2F * 100) / 100,
        currentModelPrice: Math.round(currentModelPrice * 100) / 100,
        halvingEvents,
        lastUpdated: new Date().toISOString(),
      })
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<S2FData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] S2F fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

// --- Rainbow Price Band Pure Calculations ---

export { RAINBOW_BANDS } from '@/lib/bitcoin/rainbow-bands'

/**
 * Logarithmic regression for Rainbow Price Band.
 * log10(price) = a * log10(daysSinceGenesis) + b
 * Fitted constants derived from historical BTC data.
 */
export function rainbowBasePrice(daysSinceGenesis: number): number {
  if (daysSinceGenesis <= 0) return 0
  // Logarithmic regression: log10(price) = 5.84 * log10(days) - 17.01
  const log10Price = 5.84 * Math.log10(daysSinceGenesis) - 17.01
  return Math.pow(10, log10Price)
}

/**
 * Get rainbow band boundaries for a given day.
 * Each band is a multiplier of the base regression price.
 */
export function getRainbowBands(daysSinceGenesis: number): RainbowBand[] {
  const base = rainbowBasePrice(daysSinceGenesis)
  // 10 boundary multipliers define 9 bands (ascending)
  const multipliers = [0.4, 0.5, 0.65, 0.85, 1.1, 1.5, 2.1, 3.0, 4.5, 7.0]

  // RAINBOW_BANDS[0] = Maximum Bubble (highest), [8] = Fire Sale (lowest)
  // Assign multipliers in reverse: band 0 gets [mult[8], mult[9]], band 8 gets [mult[0], mult[1]]
  return RAINBOW_BANDS.map((band, i) => {
    const ri = RAINBOW_BANDS.length - 1 - i
    return {
      label: band.label,
      color: band.color,
      lower: base * multipliers[ri]!,
      upper: base * multipliers[ri + 1]!,
    }
  })
}

/** Determine which Rainbow band the current price falls into */
export function getCurrentBand(price: number, daysSinceGenesis: number): string {
  const bands = getRainbowBands(daysSinceGenesis)
  // Bands ordered top→bottom (Maximum Bubble first, Fire Sale last)
  // Find the first band from top where price >= lower
  for (const band of bands) {
    if (price >= band.lower) return band.label
  }
  return RAINBOW_BANDS[RAINBOW_BANDS.length - 1]!.label // Below all = Fire Sale
}

/** Fetch Rainbow chart data using CoinGecko historical prices */
export async function fetchRainbowData(
  priceHistory?: Array<[number, number]>,
): Promise<RainbowData> {
  const cacheKey = 'bitcoin:rainbow:data'

  try {
    return await getCached<RainbowData>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      const prices = priceHistory ?? (await fetchBtcPriceHistory())

      const genesisTimestamp = new Date('2009-01-03T00:00:00Z').getTime()

      const dataPoints: RainbowPoint[] = prices
        .filter(([, price]) => price > 0)
        .map(([timestamp, price]) => {
          const daysSinceGenesis = (timestamp - genesisTimestamp) / 86_400_000
          const bands = getRainbowBands(daysSinceGenesis)

          return {
            timestamp,
            price,
            daysSinceGenesis: Math.round(daysSinceGenesis),
            bands,
          }
        })

      // Current band
      const lastPoint = dataPoints[dataPoints.length - 1]
      const currentBand = lastPoint
        ? getCurrentBand(lastPoint.price, lastPoint.daysSinceGenesis)
        : 'Unknown'

      return RainbowDataSchema.parse({
        dataPoints,
        currentBand,
        lastUpdated: new Date().toISOString(),
      })
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<RainbowData>(cacheKey)
    if (stale) {
      console.error('[bitcoin] Rainbow fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}
