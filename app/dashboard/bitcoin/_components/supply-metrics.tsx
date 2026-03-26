import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import type { SupplyMetrics as SupplyMetricsType } from '@/lib/bitcoin/halving'

interface SupplyMetricsProps {
  data: SupplyMetricsType
}

export function SupplyMetrics({ data }: SupplyMetricsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-base">Supply Metrics</CardTitle>
          <InfoTooltip text="Bitcoin's total supply is capped at 21 million coins. This card tracks how many have been mined, how many remain, the daily issuance rate, and the estimated year the last Bitcoin will be mined (~2140). Supply calculations assume a constant 10-minute block time; actual timing varies with hashrate fluctuations." />
        </div>
        <Coins className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supply progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Supply Mined</span>
            <span className="font-mono tabular-nums">{data.percentMined.toFixed(2)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${data.percentMined}%` }}
            />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total Mined</p>
            <p className="text-sm font-bold font-mono tabular-nums mt-0.5">
              {data.totalMined.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-bold font-mono tabular-nums mt-0.5">
              {data.remainingSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Mined Per Day</p>
            <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
              ~{data.btcMinedPerDay.toFixed(2)} BTC
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Last BTC Year</p>
            <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
              ~{data.estimatedLastBitcoinYear}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
