'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Timer } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import type { HalvingCountdown as HalvingCountdownType } from '@/lib/bitcoin/halving'
import { formatDateShort } from '@/lib/date'

interface HalvingCountdownProps {
  data: HalvingCountdownType
}

export function HalvingCountdown({ data }: HalvingCountdownProps) {
  const progressPercent = Math.min(data.percentComplete, 100)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <div className="flex items-center gap-1">
            <CardTitle className="text-base">Halving Countdown</CardTitle>
            <InfoTooltip text="Every 210,000 blocks (~4 years), the reward miners receive for each block is cut in half. This programmatic supply reduction has historically preceded major price appreciation cycles. The estimated date assumes an average 10-minute block time — actual timing shifts with network hashrate changes." />
          </div>
          <CardDescription>
            Next halving at block {data.nextHalvingBlock.toLocaleString()}
          </CardDescription>
        </div>
        <Timer className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blocks remaining - hero number */}
        <div className="text-center py-2">
          <div className="text-4xl font-bold font-mono tabular-nums text-orange-500">
            {data.blocksRemaining.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-1">blocks remaining</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Era {data.currentEra} Progress</span>
            <span className="font-mono tabular-nums">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Estimated Date</p>
            <p className="text-sm font-medium mt-0.5">
              {formatDateShort(new Date(data.estimatedDate))}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Days Remaining</p>
            <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
              ~{Math.round(data.estimatedDaysRemaining).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Current Reward</p>
            <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
              {data.currentReward} BTC
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Next Reward</p>
            <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
              {data.nextReward} BTC
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
