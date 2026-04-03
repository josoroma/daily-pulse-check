'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/info-tooltip'
import { RefreshCw, Sparkles, Brain, ChevronRight } from 'lucide-react'

type MarketSummaryCardProps = {
  cachedSummary: string | null
}

export const MarketSummaryCard = ({ cachedSummary }: MarketSummaryCardProps) => {
  const [summary, setSummary] = useState(cachedSummary ?? '')
  const [reasoning, setReasoning] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const reasoningRef = useRef<HTMLPreElement>(null)

  const handleRefresh = useCallback(async () => {
    setIsStreaming(true)
    setIsThinking(true)
    setSummary('')
    setReasoning('')
    setShowReasoning(true)

    try {
      const res = await fetch('/api/ai/summary', { method: 'POST' })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        setSummary(errText || 'Failed to generate summary. Please try again.')
        setIsStreaming(false)
        setIsThinking(false)
        return
      }
      if (!res.body) {
        setSummary('Failed to generate summary. Please try again.')
        setIsStreaming(false)
        setIsThinking(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let reasoningText = ''
      let contentText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as { type: string; text: string }
            if (event.type === 'reasoning') {
              reasoningText += event.text
              setReasoning(reasoningText)
              if (reasoningRef.current) {
                reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight
              }
            } else if (event.type === 'text') {
              setIsThinking(false)
              contentText += event.text
              setSummary(contentText)
            } else if (event.type === 'error') {
              setSummary(event.text)
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (!contentText.trim()) {
        setSummary('No response from AI model. Check that the model is running and accessible.')
      }
    } catch {
      setSummary('Failed to generate summary. Please try again.')
    } finally {
      setIsStreaming(false)
      setIsThinking(false)
    }
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Daily Market Summary
          <InfoTooltip text="AI-generated analysis of today's market conditions including stock/crypto prices, sentiment indicators, macro data, and how they might affect your portfolio. Click Refresh to generate a new summary." />
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isStreaming}>
          <RefreshCw className={`h-4 w-4 ${isStreaming ? 'animate-spin' : ''}`} />
          <span className="ml-1 text-xs">{isStreaming ? 'Generating…' : 'Refresh'}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Reasoning collapsible */}
        {(reasoning || isThinking) && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Brain
                className={`h-3.5 w-3.5 text-amber-500 ${isThinking && !summary ? 'animate-pulse' : ''}`}
              />
              <ChevronRight
                className={`h-3 w-3 transition-transform ${showReasoning ? 'rotate-90' : ''}`}
              />
              <span>{isThinking && !summary ? 'Thinking…' : 'Chain of thought'}</span>
              {reasoning && (
                <span className="text-muted-foreground/60">
                  ({reasoning.length.toLocaleString()} chars)
                </span>
              )}
            </button>
            {showReasoning && reasoning && (
              <pre
                ref={reasoningRef}
                className="mt-2 max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono"
              >
                {reasoning}
              </pre>
            )}
          </div>
        )}

        {isStreaming && !summary && !reasoning && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {summary}
          </div>
        ) : !isStreaming ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No summary yet. Click Refresh to generate your daily briefing.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
