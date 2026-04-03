'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AiDisclaimer } from './ai-disclaimer'
import { InfoTooltip } from '@/components/info-tooltip'
import { STARTER_QUESTIONS } from '@/lib/ai/learning-assistant'
import { GraduationCap, Send, User, Bot, Brain, ChevronRight } from 'lucide-react'

type Message = { id: string; role: 'user' | 'assistant'; text: string; reasoning?: string }

export const LearningChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendMessage = async (text: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.text })),
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }])

      const decoder = new TextDecoder()
      let buffer = ''
      let reasoningText = ''
      let contentText = ''
      let done = false

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const evt = JSON.parse(line) as { type: string; text: string }
              if (evt.type === 'reasoning') {
                reasoningText += evt.text
              } else if (evt.type === 'text') {
                contentText += evt.text
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: contentText, reasoning: reasoningText || undefined }
                    : m,
                ),
              )
            } catch {
              // Plain text fallback (e.g. non-financial topic rejection)
              contentText += line
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, text: contentText } : m)),
              )
            }
          }
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
          <GraduationCap className="h-4 w-4 text-emerald-500" />
          Learning Assistant
          <InfoTooltip text="An AI tutor for investing concepts. Ask about DCA strategies, ETF vs individual stocks, crypto fundamentals, risk management, or any financial topic you want to learn about." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ask me about investing concepts, market mechanics, or financial strategies.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-96 space-y-3 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Bot className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                )}
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
                        <Brain className="h-3 w-3 text-emerald-400" />
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
                <Brain className="mt-1 h-4 w-4 shrink-0 animate-pulse text-emerald-500" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Thinking…</p>
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
                  <Brain className="h-3 w-3 animate-pulse text-emerald-400" />
                  <span>Thinking…</span>
                </div>
              )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about investing concepts…"
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
