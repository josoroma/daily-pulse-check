import { fetchPrice, isUsingCachedData } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'
import {
  fetchLatestIndicator,
  fetchInflationRate,
  fetchDXY,
  type MacroIndicator,
} from '@/lib/market/macro'
import {
  fetchBccrIndicator,
  fetchExchangeRateHistory,
  BCCR_INDICATORS,
  type BccrIndicator,
  type BccrIndicatorId,
  type ExchangeRatePoint,
} from '@/lib/market/bccr'
import { PriceCards } from './_components/price-cards'
import { FearGreedGauge } from './_components/fear-greed-gauge'
import { MacroIndicators } from './_components/macro-indicators'
import { CrMacroIndicators } from './_components/cr-macro-indicators'
import { ExchangeRateChart } from './_components/exchange-rate-chart'
import { ErrorToasts } from '../_components/error-toasts'
import type { StockPrice } from '@/lib/market/stocks'
import type { BitcoinPrice } from '@/lib/market/crypto'
import type { FearGreed } from '@/lib/market/sentiment'

interface MarketData {
  voo: StockPrice | null
  qqq: StockPrice | null
  btc: BitcoinPrice | null
  sentiment: FearGreed | null
  usingCached: boolean
  errors: string[]
}

async function fetchMarketData(): Promise<MarketData> {
  const errors: string[] = []
  const [voo, qqq, btc, sentiment, usingCached] = await Promise.allSettled([
    fetchPrice('VOO'),
    fetchPrice('QQQ'),
    fetchBitcoinPrice(),
    fetchCryptoFearGreed(),
    isUsingCachedData(),
  ])

  if (voo.status === 'rejected') errors.push('VOO price failed to load')
  if (qqq.status === 'rejected') errors.push('QQQ price failed to load')
  if (btc.status === 'rejected') errors.push('Bitcoin price failed to load')
  if (sentiment.status === 'rejected') errors.push('Fear & Greed index failed to load')

  return {
    voo: voo.status === 'fulfilled' ? voo.value : null,
    qqq: qqq.status === 'fulfilled' ? qqq.value : null,
    btc: btc.status === 'fulfilled' ? btc.value : null,
    sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
    usingCached: usingCached.status === 'fulfilled' ? usingCached.value : false,
    errors,
  }
}

async function fetchMacroData() {
  const errors: string[] = []
  const results = await Promise.allSettled([
    fetchLatestIndicator('FEDFUNDS'),
    fetchLatestIndicator('DGS10'),
    fetchLatestIndicator('UNRATE'),
    fetchDXY(),
    fetchInflationRate(),
  ])

  const indicators: MacroIndicator[] = []
  if (results[0].status === 'fulfilled') indicators.push(results[0].value)
  if (results[1].status === 'fulfilled') indicators.push(results[1].value)
  if (results[2].status === 'fulfilled') indicators.push(results[2].value)
  if (results[3].status === 'fulfilled') indicators.push(results[3].value)

  const indicatorResults = results.slice(0, 4)
  const failedCount = indicatorResults.filter((r) => r.status === 'rejected').length

  // Only show error if ALL indicators failed — partial data is still useful
  if (failedCount > 0 && indicators.length === 0) {
    errors.push('Macro indicators failed to load')
  }

  const inflationRate = results[4].status === 'fulfilled' ? results[4].value.rate : null

  return { indicators, inflationRate, errors }
}

interface CrMacroData {
  indicators: BccrIndicator[]
  exchangeHistory: ExchangeRatePoint[]
  errors: string[]
}

async function fetchCrMacroData(): Promise<CrMacroData> {
  const errors: string[] = []
  const indicatorIds = Object.keys(BCCR_INDICATORS) as BccrIndicatorId[]

  const [indicatorResults, historyResult] = await Promise.all([
    Promise.allSettled(indicatorIds.map((id) => fetchBccrIndicator(id))),
    fetchExchangeRateHistory(30).catch(() => null),
  ])

  const indicators: BccrIndicator[] = []
  for (const result of indicatorResults) {
    if (result.status === 'fulfilled') indicators.push(result.value)
  }

  if (indicators.length === 0) {
    errors.push('Costa Rican macro indicators failed to load')
  }

  const exchangeHistory = historyResult ?? []

  if (!historyResult) {
    errors.push('USD/CRC exchange rate history failed to load')
  }

  return { indicators, exchangeHistory, errors }
}

export default async function MarketPage() {
  const [market, macro, crMacro] = await Promise.all([
    fetchMarketData(),
    fetchMacroData(),
    fetchCrMacroData(),
  ])
  const errors = [...market.errors, ...macro.errors, ...crMacro.errors]

  return (
    <div className="space-y-6 px-4 py-8">
      {errors.length > 0 && <ErrorToasts errors={errors} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground">Live market data and sentiment indicators</p>
        </div>
      </div>

      <PriceCards
        voo={market.voo}
        qqq={market.qqq}
        btc={market.btc}
        usingCachedData={market.usingCached}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FearGreedGauge data={market.sentiment} />
        <MacroIndicators indicators={macro.indicators} inflationRate={macro.inflationRate} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CrMacroIndicators indicators={crMacro.indicators} />
        <ExchangeRateChart data={crMacro.exchangeHistory} />
      </div>
    </div>
  )
}
