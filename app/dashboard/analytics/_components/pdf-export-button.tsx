'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MONTHS } from '../_constants'
import type { MonthlyReport, YearlyReport } from '../_utils'
import { formatUsd, formatPct } from '../_utils'

interface PdfExportButtonProps {
  monthlyReports: MonthlyReport[]
  yearlyReport: YearlyReport | null
  selectedYear: number
}

export const PdfExportButton = ({
  monthlyReports,
  yearlyReport,
  selectedYear,
}: PdfExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Title
      doc.setFontSize(18)
      doc.text(`Investment Report — ${selectedYear}`, pageWidth / 2, 20, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, {
        align: 'center',
      })
      doc.setTextColor(0)

      let yPos = 38

      // Yearly summary
      if (yearlyReport) {
        doc.setFontSize(14)
        doc.text('Annual Summary', 14, yPos)
        yPos += 8

        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: [
            ['Total Invested', formatUsd(yearlyReport.totalInvested)],
            ['Total Value', formatUsd(yearlyReport.totalValue)],
            ['Unrealized Gains', formatUsd(yearlyReport.unrealizedGains)],
            ['Realized Gains', formatUsd(yearlyReport.realizedGains)],
            ['Total Return', formatPct(yearlyReport.totalReturnPct)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [34, 34, 34] },
          margin: { left: 14, right: 14 },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 12
      }

      // Monthly breakdown
      if (monthlyReports.length > 0) {
        if (yPos > 230) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.text('Monthly Breakdown', 14, yPos)
        yPos += 8

        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'Starting', 'Ending', 'Deposits', 'Withdrawals', 'Return %', 'DCA %']],
          body: monthlyReports.map((r) => [
            MONTHS[r.month - 1],
            formatUsd(r.startingValue),
            formatUsd(r.endingValue),
            formatUsd(r.netDeposits),
            formatUsd(r.withdrawals),
            formatPct(r.returnPct),
            `${r.dcaAdherencePct}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [34, 34, 34] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        })
      }

      doc.save(`investment-report-${selectedYear}.pdf`)
    } catch {
      console.error('PDF export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      Export PDF
    </Button>
  )
}
