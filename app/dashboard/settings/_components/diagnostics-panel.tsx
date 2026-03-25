'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle2, Database, Loader2, Server, XCircle } from 'lucide-react'

type DiagnosticsPanelProps = {
  provider: string
  model: string
}

type TestResult = {
  label: string
  ok: boolean
  message: string
  elapsed: number
}

export const DiagnosticsPanel = ({ provider, model }: DiagnosticsPanelProps) => {
  const [results, setResults] = useState<TestResult[]>([])
  const [aiStreamText, setAiStreamText] = useState('')
  const [isPending, startTransition] = useTransition()

  const runDiagnostics = () => {
    setResults([])
    setAiStreamText('')

    startTransition(async () => {
      const tests: TestResult[] = []

      // 1. Ollama health check (only if provider is ollama)
      if (provider === 'ollama') {
        const start = Date.now()
        try {
          const res = await fetch('/api/ai/health')
          const data = (await res.json()) as { ok: boolean }
          tests.push({
            label: 'Ollama Server',
            ok: data.ok,
            message: data.ok ? 'Running and reachable' : 'Cannot connect to Ollama',
            elapsed: Date.now() - start,
          })
        } catch {
          tests.push({
            label: 'Ollama Server',
            ok: false,
            message: 'Connection failed',
            elapsed: Date.now() - start,
          })
        }
        setResults([...tests])
      }

      // 2. Supabase connection test
      const dbStart = Date.now()
      try {
        const res = await fetch('/api/db/test')
        const data = (await res.json()) as { ok: boolean; message?: string; elapsed: number }
        tests.push({
          label: 'Supabase Database',
          ok: data.ok,
          message: data.ok ? 'Connected' : (data.message ?? 'Connection failed'),
          elapsed: data.elapsed ?? Date.now() - dbStart,
        })
      } catch {
        tests.push({
          label: 'Supabase Database',
          ok: false,
          message: 'Connection failed',
          elapsed: Date.now() - dbStart,
        })
      }
      setResults([...tests])

      // 3. AI model streaming test
      const aiStart = Date.now()
      try {
        const res = await fetch('/api/ai/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, model }),
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          tests.push({
            label: `AI Model (${model})`,
            ok: false,
            message: errText || 'Request failed',
            elapsed: Date.now() - aiStart,
          })
          setResults([...tests])
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          tests.push({
            label: `AI Model (${model})`,
            ok: false,
            message: 'No response stream',
            elapsed: Date.now() - aiStart,
          })
          setResults([...tests])
          return
        }

        const decoder = new TextDecoder()
        let text = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setAiStreamText(text)
        }

        const hasError = text.includes('[Error:')
        tests.push({
          label: `AI Model (${model})`,
          ok: !hasError && text.trim().length > 0,
          message: hasError ? text : text.trim().length > 0 ? 'Responding' : 'Empty response',
          elapsed: Date.now() - aiStart,
        })
      } catch {
        tests.push({
          label: `AI Model (${model})`,
          ok: false,
          message: 'Connection failed',
          elapsed: Date.now() - aiStart,
        })
      }
      setResults([...tests])
    })
  }

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-sky-500" />
            System Diagnostics
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test connectivity to your database and AI model ({provider}/{model})
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDiagnostics} disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Running Tests…' : 'Run All Tests'}
          </Button>

          {results.length > 0 && (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.label} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {r.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {r.label.includes('Database') && (
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {r.label.includes('Ollama') && (
                        <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{r.label}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {r.elapsed}ms
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {aiStreamText && (
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">AI Response:</p>
              <pre className="whitespace-pre-wrap text-sm text-emerald-500">{aiStreamText}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
