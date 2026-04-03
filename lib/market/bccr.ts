import { z } from 'zod'
import { getCached, CacheTTL } from '@/lib/market/cache'

// --- SDDE REST API (new JSON-based BCCR API) ---

const SDDE_BASE = 'https://apim.bccr.fi.cr/SDDE/api/Bccr.Ge.SDDE.Publico.Indicadores.API'

// --- BCCR Indicator Codes ---

export const BCCR_INDICATORS = {
  USD_CRC_SELL: { code: 318, name: 'USD/CRC Sell Rate', unit: '₡' },
  USD_CRC_BUY: { code: 317, name: 'USD/CRC Buy Rate', unit: '₡' },
  TPM: { code: 3541, name: 'Monetary Policy Rate', unit: '%' },
  TBP: { code: 423, name: 'Basic Passive Rate (TBP)', unit: '%' },
} as const

export type BccrIndicatorId = keyof typeof BCCR_INDICATORS

// --- SDDE Response Schema ---
// Actual response: { estado, mensaje, datos: [{ codigoIndicador, nombreIndicador, series: [{ fecha, valorDatoPorPeriodo }] }] }

export const SddeSeriesItemSchema = z.object({
  fecha: z.string(),
  valorDatoPorPeriodo: z.number(),
})

export const SddeIndicadorSchema = z.object({
  codigoIndicador: z.string(),
  nombreIndicador: z.string().optional(),
  series: z.array(SddeSeriesItemSchema),
})

export const SddeResponseSchema = z.object({
  estado: z.boolean(),
  mensaje: z.string().optional(),
  datos: z.array(SddeIndicadorSchema),
})

export type SddeSeriesItem = z.infer<typeof SddeSeriesItemSchema>

// --- Application Schemas (unchanged public contract) ---

export const BccrObservationSchema = z.object({
  date: z.string(),
  value: z.number(),
})

export type BccrObservation = z.infer<typeof BccrObservationSchema>

export const BccrIndicatorSchema = z.object({
  name: z.string(),
  value: z.number(),
  date: z.string(),
  unit: z.string(),
})

export type BccrIndicator = z.infer<typeof BccrIndicatorSchema>

export const ExchangeRatePointSchema = z.object({
  date: z.string(),
  buy: z.number(),
  sell: z.number(),
})

export type ExchangeRatePoint = z.infer<typeof ExchangeRatePointSchema>

// --- Internal helpers ---

function getToken(): string {
  const token = process.env.BCCR_SDDE_TOKEN
  if (!token) {
    throw new Error('BCCR_SDDE_TOKEN is not configured')
  }
  return token
}

function formatDateSdde(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

function normalizeDate(raw: string): string {
  // Handle ISO format: "2026-03-15T00:00:00" → "2026-03-15"
  if (raw.includes('T')) {
    return raw.split('T')[0] ?? raw
  }
  // Handle yyyy/mm/dd or yyyy-mm-dd
  if (raw.includes('/')) {
    const parts = raw.split('/')
    if (parts.length === 3 && (parts[0]?.length ?? 0) === 4) {
      return `${parts[0]}-${parts[1]?.padStart(2, '0')}-${parts[2]?.padStart(2, '0')}`
    }
  }
  return raw
}

function extractObservations(data: unknown): Array<{ date: string; value: number }> {
  // Parse the SDDE wrapper: { estado, datos: [{ series: [{ fecha, valorDatoPorPeriodo }] }] }
  const parsed = SddeResponseSchema.safeParse(data)
  if (parsed.success) {
    if (!parsed.data.estado) {
      throw new Error(`BCCR SDDE: ${parsed.data.mensaje ?? 'request failed'}`)
    }
    const series = parsed.data.datos[0]?.series ?? []
    return series.map((item) => ({
      date: normalizeDate(item.fecha),
      value: item.valorDatoPorPeriodo,
    }))
  }

  throw new Error('BCCR SDDE: unexpected response format')
}

async function fetchFromSdde(
  indicatorCode: number,
  startDate: Date,
  endDate: Date,
): Promise<Array<{ date: string; value: number }>> {
  const token = getToken()

  const params = new URLSearchParams({
    fechaInicio: formatDateSdde(startDate),
    fechaFin: formatDateSdde(endDate),
    idioma: 'ES',
  })

  const url = `${SDDE_BASE}/indicadoresEconomicos/${indicatorCode}/series?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })

  if (response.status === 401) {
    throw new Error('BCCR SDDE: invalid or expired token — check BCCR_SDDE_TOKEN')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`BCCR SDDE error: ${response.status} ${response.statusText} ${body}`)
  }

  const json: unknown = await response.json()
  return extractObservations(json)
}

// --- Public API ---

export async function fetchBccrIndicator(indicatorId: BccrIndicatorId): Promise<BccrIndicator> {
  const config = BCCR_INDICATORS[indicatorId]
  const cacheKey = `bccr:indicator:${indicatorId}`

  return getCached<BccrIndicator>(cacheKey, CacheTTL.MACRO, async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7) // Look back 7 days to ensure we get data

    const observations = await fetchFromSdde(config.code, startDate, endDate)

    if (observations.length === 0) {
      throw new Error(`No data returned for BCCR indicator ${indicatorId}`)
    }

    // Sort by date descending and take the latest
    observations.sort((a, b) => b.date.localeCompare(a.date))
    const latest = observations[0]!

    return {
      name: config.name,
      value: latest.value,
      date: latest.date,
      unit: config.unit,
    }
  })
}

export async function fetchExchangeRateHistory(days: number = 30): Promise<ExchangeRatePoint[]> {
  const cacheKey = `bccr:exchange_rate_history:${days}`

  return getCached<ExchangeRatePoint[]>(cacheKey, CacheTTL.MACRO, async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [buyData, sellData] = await Promise.all([
      fetchFromSdde(BCCR_INDICATORS.USD_CRC_BUY.code, startDate, endDate),
      fetchFromSdde(BCCR_INDICATORS.USD_CRC_SELL.code, startDate, endDate),
    ])

    // Create a map of sell rates by date
    const sellMap = new Map<string, number>()
    for (const obs of sellData) {
      sellMap.set(obs.date, obs.value)
    }

    // Merge buy and sell into paired points
    const points: ExchangeRatePoint[] = []
    for (const buyObs of buyData) {
      const sellValue = sellMap.get(buyObs.date)
      if (sellValue !== undefined) {
        points.push({
          date: buyObs.date,
          buy: buyObs.value,
          sell: sellValue,
        })
      }
    }

    // Sort by date ascending for charting
    points.sort((a, b) => a.date.localeCompare(b.date))

    return points
  })
}

// --- Pure helpers (testable) ---

export { formatDateSdde, normalizeDate, extractObservations }
