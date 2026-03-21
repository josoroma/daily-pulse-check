import { fetchPrice, isUsingCachedData } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'
import {
  fetchLatestIndicator,
  fetchInflationRate,
  fetchDXY,
  type MacroIndicator,
} from '@/lib/market/macro'
import { PriceCards } from './_components/price-cards'
import { FearGreedGauge } from './_components/fear-greed-gauge'
import { MacroIndicators } from './_components/macro-indicators'
import type { StockPrice } from '@/lib/market/stocks'
import type { BitcoinPrice } from '@/lib/market/crypto'
import type { FearGreed } from '@/lib/market/sentiment'

interface MarketData {
  voo: StockPrice | null
  qqq: StockPrice | null
  btc: BitcoinPrice | null
  sentiment: FearGreed | null
  usingCached: boolean
}

async function fetchMarketData(): Promise<MarketData> {
  const [voo, qqq, btc, sentiment, usingCached] = await Promise.allSettled([
    fetchPrice('VOO'),
    fetchPrice('QQQ'),
    fetchBitcoinPrice(),
    fetchCryptoFearGreed(),
    isUsingCachedData(),
  ])

  return {
    voo: voo.status === 'fulfilled' ? voo.value : null,
    qqq: qqq.status === 'fulfilled' ? qqq.value : null,
    btc: btc.status === 'fulfilled' ? btc.value : null,
    sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
    usingCached: usingCached.status === 'fulfilled' ? usingCached.value : false,
  }
}

async function fetchMacroData() {
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

  const inflationRate = results[4].status === 'fulfilled' ? results[4].value.rate : null

  return { indicators, inflationRate }
}

export default async function MarketPage() {
  const [market, macro] = await Promise.all([fetchMarketData(), fetchMacroData()])

  return (
    <div className="space-y-6 px-4 py-8">
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
    </div>
  )
}
