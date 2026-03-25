'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateAiModel } from '@/app/dashboard/settings/_actions'
import { AI_PROVIDERS, MODEL_REGISTRY, getDefaultModel, type AiProvider } from '@/lib/ai/provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Bot, AlertTriangle } from 'lucide-react'

type AiModelCardProps = {
  defaultValues: {
    ai_provider: string
    ai_model: string
  }
}

export const AiModelCard = ({ defaultValues }: AiModelCardProps) => {
  const [provider, setProvider] = useState<AiProvider>(defaultValues.ai_provider as AiProvider)
  const [model, setModel] = useState(defaultValues.ai_model)
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>(
    defaultValues.ai_provider === 'ollama' ? 'checking' : 'idle',
  )

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateAiModel(formData)
      return result ?? null
    },
    null,
  )

  const models = MODEL_REGISTRY[provider]

  useEffect(() => {
    if (provider !== 'ollama') return

    let cancelled = false
    fetch('/api/ai/health')
      .then((res) => res.json())
      .then((data: { ok: boolean }) => {
        if (!cancelled) setOllamaStatus(data.ok ? 'ok' : 'error')
      })
      .catch(() => {
        if (!cancelled) setOllamaStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [provider])

  const handleProviderChange = (value: string | null) => {
    if (!value) return
    const newProvider = value as AiProvider
    setProvider(newProvider)
    setModel(getDefaultModel(newProvider))
    setOllamaStatus(newProvider === 'ollama' ? 'checking' : 'idle')
  }

  const handleModelChange = (value: string | null) => {
    if (value) setModel(value)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 text-sky-500" />
        <h3 className="text-lg font-semibold">AI Model</h3>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
            AI model preferences saved
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ai_provider">Provider</Label>
          <Select
            name="ai_provider"
            value={provider}
            onValueChange={handleProviderChange}
            disabled={isPending}
          >
            <SelectTrigger id="ai_provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === 'openai' ? 'OpenAI' : 'Ollama (Local)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ollamaStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Cannot connect to Ollama. Check that it is running.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ai_model">Model</Label>
          <Select
            name="ai_model"
            value={model}
            onValueChange={handleModelChange}
            disabled={isPending}
          >
            <SelectTrigger id="ai_model">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </form>
    </div>
  )
}
