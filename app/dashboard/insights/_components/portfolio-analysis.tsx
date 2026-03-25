'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AiDisclaimer } from './ai-disclaimer'
import { Briefcase, Send, User, Bot, Brain, ChevronRight } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  reasoning?: string
}

export const PortfolioAnalysis = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/ai/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: text }].map((m) => ({
              role: 'role' in m ? m.role : 'user',
              content: 'text' in m ? m.text : (m as { content: string }).content,
            })),
          }),
        })

        if (!res.ok) throw new Error('Request failed')

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No stream')

        const assistantId = crypto.randomUUID()
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', text: '', reasoning: '' },
        ])

        const decoder = new TextDecoder()
        let buffer = ''
        let reasoningText = ''
        let contentText = ''

        while (true) {
          const { value, done } = await reader.read()
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
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, reasoning: reasoningText } : m)),
                )
              } else if (event.type === 'text') {
                contentText += event.text
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: contentText } : m)),
                )
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch {
        setError('Failed to get analysis. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [messages],
  )

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      sendMessage(
        'Analyze my portfolio. What are the key risks, opportunities, and rebalancing actions I should consider?',
      )
    }
  }, [sendMessage])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput('')
    sendMessage(text)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Briefcase className="h-4 w-4 text-sky-500" />
          Portfolio Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={scrollRef} className="max-h-96 space-y-3 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && <Bot className="mt-1 h-4 w-4 shrink-0 text-sky-500" />}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {msg.role === 'assistant' && msg.reasoning && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleReasoning(msg.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                    >
                      <Brain className="h-3 w-3 text-sky-400" />
                      <ChevronRight
                        className={`h-2.5 w-2.5 transition-transform ${expandedReasoning.has(msg.id) ? 'rotate-90' : ''}`}
                      />
                      <span>Thinking ({msg.reasoning.length.toLocaleString()} chars)</span>
                    </button>
                    {expandedReasoning.has(msg.id) && (
                      <pre className="mt-1.5 max-h-32 overflow-y-auto rounded border bg-background/50 p-2 text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
                        {msg.reasoning}
                      </pre>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
              {msg.role === 'user' && (
                <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2">
              <Brain className="mt-1 h-4 w-4 shrink-0 animate-pulse text-sky-500" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Analyzing…</p>
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          )}
          {isLoading &&
            messages[messages.length - 1]?.role === 'assistant' &&
            !messages[messages.length - 1]?.text &&
            messages[messages.length - 1]?.reasoning && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Brain className="h-3 w-3 animate-pulse text-sky-400" />
                <span>Thinking…</span>
              </div>
            )}
        </div>

        {error && (
          <div className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question…"
            disabled={isLoading}
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <AiDisclaimer />
      </CardContent>
    </Card>
  )
}
