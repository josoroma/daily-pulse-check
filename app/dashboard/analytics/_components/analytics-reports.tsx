'use client'

import { useState } from 'react'
import { ReportViewer } from './report-viewer'
import { PdfExportButton } from './pdf-export-button'
import type { MonthlyReport, YearlyReport } from '../_utils'

interface AnalyticsReportsProps {
  monthlyReports: MonthlyReport[]
  yearlyReport: YearlyReport | null
  availableYears: number[]
  initialYear: number
}

export const AnalyticsReports = ({
  monthlyReports,
  yearlyReport,
  availableYears,
  initialYear,
}: AnalyticsReportsProps) => {
  const [selectedYear, setSelectedYear] = useState(initialYear)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PdfExportButton
          monthlyReports={monthlyReports}
          yearlyReport={yearlyReport}
          selectedYear={selectedYear}
        />
      </div>
      <ReportViewer
        monthlyReports={monthlyReports}
        yearlyReport={yearlyReport}
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
    </div>
  )
}
