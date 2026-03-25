import { describe, it, expect } from 'vitest'
import {
  AI_PROVIDERS,
  OPENAI_MODELS,
  OLLAMA_MODELS,
  getDefaultModel,
  isValidModel,
  MODEL_REGISTRY,
} from '@/lib/ai/provider'

describe('AI Provider', () => {
  describe('AI_PROVIDERS', () => {
    it('contains openai and ollama', () => {
      expect(AI_PROVIDERS).toContain('openai')
      expect(AI_PROVIDERS).toContain('ollama')
    })
  })

  describe('MODEL_REGISTRY', () => {
    it('maps openai to its model list', () => {
      expect(MODEL_REGISTRY.openai).toBe(OPENAI_MODELS)
    })

    it('maps ollama to its model list', () => {
      expect(MODEL_REGISTRY.ollama).toBe(OLLAMA_MODELS)
    })
  })

  describe('getDefaultModel', () => {
    it('returns gpt-4.1-mini for openai', () => {
      expect(getDefaultModel('openai')).toBe('gpt-4.1-mini')
    })

    it('returns qwen3.5:27b for ollama', () => {
      expect(getDefaultModel('ollama')).toBe('qwen3.5:27b')
    })
  })

  describe('isValidModel', () => {
    it('accepts valid openai models', () => {
      expect(isValidModel('openai', 'gpt-4.1-nano')).toBe(true)
      expect(isValidModel('openai', 'gpt-4.1-mini')).toBe(true)
      expect(isValidModel('openai', 'gpt-4.1')).toBe(true)
      expect(isValidModel('openai', 'o4-mini')).toBe(true)
    })

    it('rejects invalid openai models', () => {
      expect(isValidModel('openai', 'gpt-3.5-turbo')).toBe(false)
      expect(isValidModel('openai', 'qwen3.5:27b')).toBe(false)
    })

    it('accepts valid ollama models', () => {
      expect(isValidModel('ollama', 'qwen3.5:27b')).toBe(true)
      expect(isValidModel('ollama', 'llama3.1:8b')).toBe(true)
      expect(isValidModel('ollama', 'mistral')).toBe(true)
    })

    it('rejects invalid ollama models', () => {
      expect(isValidModel('ollama', 'gpt-4.1')).toBe(false)
      expect(isValidModel('ollama', 'claude-3')).toBe(false)
    })
  })
})
