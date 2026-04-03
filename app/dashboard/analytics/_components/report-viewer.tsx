'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/info-tooltip'
import { MONTHS } from '../_constants'
import type { MonthlyReport, YearlyReport } from '../_utils'
import { formatUsd, formatPct } from '../_utils'

interface ReportViewerProps {
  monthlyReports: MonthlyReport[]
  yearlyReport: YearlyReport | null
  availableYears: number[]
  selectedYear: number
  onYearChange: (year: number) => void
}

export const ReportViewer = ({
  monthlyReports,
  yearlyReport,
  availableYears,
  selectedYear,
  onYearChange,
}: ReportViewerProps) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')

  const monthlyChartData =
    yearlyReport?.monthlyReturns.map((m) => ({
      name: (MONTHS[m.month - 1] ?? `M${m.month}`).slice(0, 3),
      return: m.returnPct,
    })) ?? []

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <CardTitle>Performance Reports</CardTitle>
              <InfoTooltip text="Monthly and yearly performance summaries showing your returns, invested amounts, and growth. Switch between monthly detail cards and yearly bar charts to review your investing track record." />
            </div>
            <CardDescription>Track your investing discipline and results over time</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={viewMode}
              onValueChange={(v) => {
                if (v === 'monthly' || v === 'yearly') setViewMode(v)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'yearly' && yearlyReport ? (
        <YearlyReportView report={yearlyReport} chartData={monthlyChartData} />
      ) : (
        <MonthlyReportList reports={monthlyReports} />
      )}
    </div>
  )
}

// ============================================================
// Yearly Report View
// ============================================================

const YearlyReportView = ({
  report,
  chartData,
}: {
  report: YearlyReport
  chartData: Array<{ name: string; return: number }>
}) => (
  <div className="space-y-4">
    {/* Summary cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Total Invested" value={formatUsd(report.totalInvested)} />
      <SummaryCard label="Total Value" value={formatUsd(report.totalValue)} />
      <SummaryCard
        label="Unrealized Gains"
        value={formatUsd(report.unrealizedGains)}
        color={report.unrealizedGains >= 0 ? 'emerald' : 'rose'}
      />
      <SummaryCard
        label="Total Return"
        value={formatPct(report.totalReturnPct)}
        color={report.totalReturnPct >= 0 ? 'emerald' : 'rose'}
      />
    </div>

    {/* Month-by-month chart */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1">
          <CardTitle>Month-by-Month Returns</CardTitle>
          <InfoTooltip text="Bar chart showing each month's percentage return for the selected year. Green bars are positive months, red bars are negative. Helps visualize seasonal patterns in your investment returns." />
        </div>
        <CardDescription>{report.year} monthly performance breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, 'Return']}
              />
              <Bar dataKey="return" fill="hsl(220, 70%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            No monthly return data available.
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)

// ============================================================
// Monthly Report List
// ============================================================

const MonthlyReportList = ({ reports }: { reports: MonthlyReport[] }) => {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              No monthly report data available for this period.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <Card key={`${report.year}-${report.month}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {MONTHS[report.month - 1]} {report.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Starting Value</span>
              <span className="font-mono tabular-nums">{formatUsd(report.startingValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ending Value</span>
              <span className="font-mono tabular-nums font-medium">
                {formatUsd(report.endingValue)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Deposits</span>
              <span className="font-mono tabular-nums">{formatUsd(report.netDeposits)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Withdrawals</span>
              <span className="font-mono tabular-nums">{formatUsd(report.withdrawals)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Return</span>
              <span
                className={`font-mono tabular-nums font-semibold ${report.returnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {formatPct(report.returnPct)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1 border-t">
              <span className="text-muted-foreground">DCA Adherence</span>
              <AdherenceBadge score={report.dcaAdherencePct} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

const SummaryCard = ({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: 'emerald' | 'rose'
}) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-bold tabular-nums font-mono mt-1 ${
          color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : ''
        }`}
      >
        {value}
      </p>
    </CardContent>
  </Card>
)

export const AdherenceBadge = ({ score }: { score: number }) => {
  const variant =
    score >= 90
      ? 'text-emerald-500 bg-emerald-500/10'
      : score >= 70
        ? 'text-amber-500 bg-amber-500/10'
        : 'text-rose-500 bg-rose-500/10'

  return (
    <Badge variant="outline" className={`${variant} border-transparent font-mono tabular-nums`}>
      {score}%
    </Badge>
  )
}

export const ReportViewerSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </CardHeader>
    </Card>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)
