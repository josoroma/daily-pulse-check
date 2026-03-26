import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

export const AI_PROVIDERS = ['openai', 'ollama'] as const
export type AiProvider = (typeof AI_PROVIDERS)[number]

export const OPENAI_MODELS = ['gpt-4.1-mini'] as const
export const OLLAMA_MODELS = ['qwen3.5:9b'] as const

export type OpenAiModel = (typeof OPENAI_MODELS)[number]
export type OllamaModel = (typeof OLLAMA_MODELS)[number]

export const DEFAULT_OPENAI_MODEL: OpenAiModel = 'gpt-4.1-mini'
export const DEFAULT_OLLAMA_MODEL: OllamaModel = 'qwen3.5:9b'

export const MODEL_REGISTRY: Record<AiProvider, readonly string[]> = {
  openai: OPENAI_MODELS,
  ollama: OLLAMA_MODELS,
}

// Models that use reasoning tokens (thinking) before generating content.
// These need unlimited max_tokens so reasoning doesn't consume the entire budget.
export const REASONING_MODELS = new Set(['qwen3.5:9b'])

export function getDefaultModel(provider: AiProvider): string {
  return provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_OLLAMA_MODEL
}

export function isValidModel(provider: AiProvider, model: string): boolean {
  return MODEL_REGISTRY[provider].includes(model)
}

export function isReasoningModel(model: string): boolean {
  return REASONING_MODELS.has(model)
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
}

// Custom fetch for Ollama that strips max_tokens.
// Reasoning models spend their budget on thinking first; a low max_tokens means
// all tokens go to reasoning with empty content output.
// Local models don't cost per token, so remove the cap entirely.
// Also inject `think: true` so smaller reasoning models (e.g. qwen3.5:9b)
// explicitly enable chain-of-thought — larger models default to thinking,
// but smaller ones require the flag.
const ollamaFetch: typeof globalThis.fetch = async (url, init) => {
  if (init?.body && typeof init.body === 'string') {
    const body = JSON.parse(init.body)
    delete body.max_tokens
    if (REASONING_MODELS.has(body.model)) {
      body.think = true
    }
    return globalThis.fetch(url, { ...init, body: JSON.stringify(body) })
  }
  return globalThis.fetch(url, init)
}

export function getLanguageModel(provider: AiProvider, model: string): LanguageModel {
  if (provider === 'ollama') {
    const ollama = createOpenAICompatible({
      baseURL: `${getOllamaBaseUrl()}/v1`,
      name: 'ollama',
      apiKey: 'ollama',
      fetch: ollamaFetch,
    })
    return ollama.chatModel(model)
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  return openai(model)
}
