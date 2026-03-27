'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/info-tooltip'
import { useCurrency } from '@/app/dashboard/_hooks'
import type { StockPrice } from '@/lib/market/stocks'
import type { BitcoinPrice } from '@/lib/market/crypto'

interface PriceCardsProps {
  voo: StockPrice | null
  qqq: StockPrice | null
  btc: BitcoinPrice | null
  isLoading?: boolean
  usingCachedData?: boolean
}

export const PriceCards = ({ voo, qqq, btc, isLoading, usingCachedData }: PriceCardsProps) => {
  const { format } = useCurrency()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PriceCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {voo && (
        <PriceCard
          symbol="VOO"
          name="Vanguard S&P 500"
          price={voo.price}
          format={format}
          accentColor="text-blue-500"
          bgColor="bg-blue-500/10"
          infoText="Vanguard S&P 500 ETF — tracks the 500 largest US companies by market cap. One of the most popular low-cost index funds for broad US stock market exposure. Expense ratio: 0.03%."
        />
      )}
      {qqq && (
        <PriceCard
          symbol="QQQ"
          name="Invesco QQQ Trust"
          price={qqq.price}
          format={format}
          accentColor="text-purple-500"
          bgColor="bg-purple-500/10"
          infoText="Invesco QQQ Trust — tracks the Nasdaq-100 index, which includes the 100 largest non-financial Nasdaq-listed companies. Heavily weighted toward tech (Apple, Microsoft, Nvidia, etc.). More growth-oriented and volatile than VOO."
        />
      )}
      {btc && <BitcoinPriceCard data={btc} format={format} />}
      {usingCachedData && (
        <div className="col-span-full">
          <Badge variant="outline" className="text-amber-500 border-amber-500/30">
            Using cached data — API limit approaching
          </Badge>
        </div>
      )}
    </div>
  )
}

const PriceCard = ({
  symbol,
  name,
  price,
  format,
  accentColor,
  bgColor,
  infoText,
}: {
  symbol: string
  name: string
  price: number
  format: (amount: number) => string
  accentColor: string
  bgColor: string
  infoText?: string
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex items-center gap-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
        {infoText && <InfoTooltip text={infoText} />}
      </div>
      <Badge variant="outline" className={`${accentColor} ${bgColor} border-transparent`}>
        {symbol}
      </Badge>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold tabular-nums font-mono">{format(price)}</div>
    </CardContent>
  </Card>
)

const BitcoinPriceCard = ({
  data,
  format,
}: {
  data: BitcoinPrice
  format: (amount: number) => string
}) => {
  const isPositive = data.percentChange24h >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Bitcoin</CardTitle>
          <InfoTooltip text="Current Bitcoin price in USD (and CRC if available), with 24-hour percentage change. Market cap = price × circulating supply. Volume shows how much BTC was traded in the last 24 hours. Data from CoinGecko." />
        </div>
        <Badge variant="outline" className="text-orange-500 bg-orange-500/10 border-transparent">
          BTC
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums font-mono">{format(data.priceUsd)}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {isPositive ? '+' : ''}
            {data.percentChange24h.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground">24h</span>
        </div>
        {data.priceCrc && (
          <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            ₡
            {data.priceCrc.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>MCap: ${formatCompact(data.marketCap)}</span>
          <span>Vol: ${formatCompact(data.volume24h)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function formatCompact(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  return value.toLocaleString()
}

const PriceCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-12 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
)
