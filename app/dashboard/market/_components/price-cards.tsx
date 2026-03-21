'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
          accentColor="text-blue-500"
          bgColor="bg-blue-500/10"
        />
      )}
      {qqq && (
        <PriceCard
          symbol="QQQ"
          name="Invesco QQQ Trust"
          price={qqq.price}
          accentColor="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      )}
      {btc && <BitcoinPriceCard data={btc} />}
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
  accentColor,
  bgColor,
}: {
  symbol: string
  name: string
  price: number
  accentColor: string
  bgColor: string
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
      <Badge variant="outline" className={`${accentColor} ${bgColor} border-transparent`}>
        {symbol}
      </Badge>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold tabular-nums font-mono">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </CardContent>
  </Card>
)

const BitcoinPriceCard = ({ data }: { data: BitcoinPrice }) => {
  const isPositive = data.percentChange24h >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Bitcoin</CardTitle>
        <Badge variant="outline" className="text-orange-500 bg-orange-500/10 border-transparent">
          BTC
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums font-mono">
          $
          {data.priceUsd.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
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
