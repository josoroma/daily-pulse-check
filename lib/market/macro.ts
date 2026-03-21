import { z } from 'zod'
import { getCached, getStaleFromSupabaseCache, CacheTTL } from '@/lib/market/cache'

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations'

// --- Response Schemas ---

export const FredObservationSchema = z.object({
  date: z.string(),
  value: z.number(),
})

export type FredObservation = z.infer<typeof FredObservationSchema>

export const FredSeriesSchema = z.object({
  seriesId: z.string(),
  title: z.string(),
  observations: z.array(FredObservationSchema),
})

export type FredSeries = z.infer<typeof FredSeriesSchema>

export const MacroIndicatorSchema = z.object({
  name: z.string(),
  value: z.number(),
  date: z.string(),
  unit: z.string(),
})

export type MacroIndicator = z.infer<typeof MacroIndicatorSchema>

// --- Series Configuration ---

export const FRED_SERIES = {
  FEDFUNDS: { title: 'Federal Funds Rate', unit: '%' },
  DGS10: { title: '10-Year Treasury Yield', unit: '%' },
  CPIAUCSL: { title: 'Consumer Price Index', unit: 'index' },
  UNRATE: { title: 'Unemployment Rate', unit: '%' },
} as const

export type FredSeriesId = keyof typeof FRED_SERIES

// --- Internal helpers ---

function getApiKey(): string {
  const key = process.env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY is not configured')
  return key
}

interface FredApiResponse {
  observations: Array<{
    date: string
    value: string
  }>
}

async function fetchFromFred(seriesId: string, limit: number = 12): Promise<FredApiResponse> {
  const url = new URL(FRED_BASE)
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('sort_order', 'desc')
  url.searchParams.set('limit', limit.toString())

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<FredApiResponse>
}

export function parseObservations(
  observations: FredApiResponse['observations'],
): FredObservation[] {
  return observations
    .filter((obs) => obs.value !== '.')
    .map((obs) => ({
      date: obs.date,
      value: parseFloat(obs.value),
    }))
}

// --- Public API ---

export async function fetchFredSeries(
  seriesId: FredSeriesId,
  limit: number = 12,
): Promise<FredSeries> {
  const cacheKey = `macro:fred:${seriesId}:${limit}`
  const config = FRED_SERIES[seriesId]

  try {
    return await getCached<FredSeries>(cacheKey, CacheTTL.MACRO, async () => {
      const raw = await fetchFromFred(seriesId, limit)

      const parsed: FredSeries = {
        seriesId,
        title: config.title,
        observations: parseObservations(raw.observations),
      }

      return FredSeriesSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<FredSeries>(cacheKey)
    if (stale) {
      console.error(`[macro] FRED fetch failed for ${seriesId}, using stale cache:`, error)
      return stale.data
    }
    throw error
  }
}

export async function fetchLatestIndicator(seriesId: FredSeriesId): Promise<MacroIndicator> {
  const series = await fetchFredSeries(seriesId, 1)
  const config = FRED_SERIES[seriesId]

  const latest = series.observations[0]
  if (!latest) {
    throw new Error(`No observations available for ${seriesId}`)
  }

  return MacroIndicatorSchema.parse({
    name: config.title,
    value: latest.value,
    date: latest.date,
    unit: config.unit,
  })
}

// --- DXY via Twelve Data ---

export async function fetchDXY(): Promise<MacroIndicator> {
  const cacheKey = 'macro:dxy'

  try {
    return await getCached<MacroIndicator>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const { fetchPrice } = await import('@/lib/market/stocks')
      const price = await fetchPrice('DXY')

      return MacroIndicatorSchema.parse({
        name: 'US Dollar Index (DXY)',
        value: price.price,
        date: price.timestamp,
        unit: 'index',
      })
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<MacroIndicator>(cacheKey)
    if (stale) {
      console.error('[macro] DXY fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

// --- Derived Calculations ---

export function calculateYoYInflation(observations: FredObservation[]): number | null {
  // Observations should be sorted desc by date
  // Need at least 12 months of data
  if (observations.length < 12) return null

  const currentObs = observations[0]
  const yearAgoObs = observations[11]
  if (!currentObs || !yearAgoObs) return null

  const current = currentObs.value
  const yearAgo = yearAgoObs.value

  if (yearAgo === 0) return null

  return ((current - yearAgo) / yearAgo) * 100
}

export async function fetchInflationRate(): Promise<{
  rate: number | null
  observations: FredObservation[]
}> {
  const series = await fetchFredSeries('CPIAUCSL', 13)
  const rate = calculateYoYInflation(series.observations)
  return { rate, observations: series.observations }
}
