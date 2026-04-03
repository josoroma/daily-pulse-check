'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardSummaryProps {
  summary: string | null
}

const MAX_PREVIEW_LENGTH = 300

export const DashboardSummary = ({ summary }: DashboardSummaryProps) => {
  const truncated =
    summary && summary.length > MAX_PREVIEW_LENGTH
      ? summary.slice(0, MAX_PREVIEW_LENGTH).trimEnd() + '…'
      : summary

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-amber-500" />
          AI Briefing
          <InfoTooltip text="An AI-generated summary of today's market conditions, your portfolio performance, and key events. Refreshed daily from the Insights page using your preferred AI model." />
        </CardTitle>
        <Link
          href="/dashboard/insights"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          {summary ? 'Full insights' : 'Generate'}
        </Link>
      </CardHeader>
      <CardContent>
        {truncated ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {truncated}
            </p>
            {summary && summary.length > MAX_PREVIEW_LENGTH && (
              <Link
                href="/dashboard/insights"
                className={cn(
                  buttonVariants({ variant: 'link', size: 'sm' }),
                  'h-auto p-0 text-xs',
                )}
              >
                Read more →
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No summary yet today. Generate one on the Insights page.
            </p>
            <Link
              href="/dashboard/insights"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Go to Insights
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
