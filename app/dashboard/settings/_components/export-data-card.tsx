'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import { exportAllData } from '../_actions'

export const ExportDataCard = () => {
  const [isPending, startTransition] = useTransition()
  const [lastExport, setLastExport] = useState<string | null>(null)

  const handleExport = () => {
    startTransition(async () => {
      const result = await exportAllData()

      if ('error' in result) {
        toast.error(String(result.error))
        return
      }

      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance-dashboard-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastExport(new Date().toLocaleString())
      toast.success('Data exported successfully')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-sky-500" />
          Export All Data
          <InfoTooltip text="Download a complete JSON backup of your profile, portfolios, positions, transactions, DCA schedules, alerts, and snapshots. No sensitive data like API keys or passwords is included." />
        </CardTitle>
        <CardDescription>
          Download all your data as a JSON file. Includes profile, portfolios, positions,
          transactions, DCA schedules, alerts, and portfolio snapshots. No sensitive data (API keys,
          passwords) is included.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleExport} disabled={isPending} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export All Data
        </Button>
        {lastExport && <p className="text-xs text-muted-foreground">Last exported: {lastExport}</p>}
      </CardContent>
    </Card>
  )
}
