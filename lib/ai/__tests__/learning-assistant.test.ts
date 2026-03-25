import { describe, it, expect } from 'vitest'
import {
  isFinancialTopic,
  buildLearningSystemPrompt,
  STARTER_QUESTIONS,
  NON_FINANCIAL_RESPONSE,
  type LearningContext,
} from '@/lib/ai/learning-assistant'

describe('isFinancialTopic', () => {
  it('accepts questions about investing concepts', () => {
    expect(isFinancialTopic('What is the P/E ratio?')).toBe(true)
    expect(isFinancialTopic('How does DCA work?')).toBe(true)
    expect(isFinancialTopic('Explain Bitcoin halving')).toBe(true)
    expect(isFinancialTopic('Is the stock market overvalued?')).toBe(true)
  })

  it('accepts questions about specific assets', () => {
    expect(isFinancialTopic('What is an ETF?')).toBe(true)
    expect(isFinancialTopic('How do bonds work?')).toBe(true)
    expect(isFinancialTopic('Tell me about crypto volatility')).toBe(true)
  })

  it('accepts questions about macro indicators', () => {
    expect(isFinancialTopic('What does the Fed interest rate mean?')).toBe(true)
    expect(isFinancialTopic('How does inflation affect portfolios?')).toBe(true)
    expect(isFinancialTopic('What is the DXY index?')).toBe(true)
  })

  it('rejects non-financial topics', () => {
    expect(isFinancialTopic('Write me a poem')).toBe(false)
    expect(isFinancialTopic('What is the weather today?')).toBe(false)
    expect(isFinancialTopic('Tell me a joke')).toBe(false)
    expect(isFinancialTopic('How do I cook pasta?')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isFinancialTopic('BITCOIN price prediction')).toBe(true)
    expect(isFinancialTopic('What Is An ETF?')).toBe(true)
  })
})

describe('buildLearningSystemPrompt', () => {
  const baseCtx: LearningContext = {
    country: 'CR',
    baseCurrency: 'USD',
    portfolioSummary: null,
  }

  it('includes system instructions', () => {
    const prompt = buildLearningSystemPrompt(baseCtx)
    expect(prompt).toContain('financial education assistant')
    expect(prompt).toContain(NON_FINANCIAL_RESPONSE)
  })

  it('includes user country and currency', () => {
    const prompt = buildLearningSystemPrompt(baseCtx)
    expect(prompt).toContain('Country: CR')
    expect(prompt).toContain('Base Currency: USD')
  })

  it('includes portfolio summary when provided', () => {
    const prompt = buildLearningSystemPrompt({
      ...baseCtx,
      portfolioSummary: 'Holds: VOO, QQQ, BTC',
    })
    expect(prompt).toContain('Portfolio: Holds: VOO, QQQ, BTC')
  })

  it('omits portfolio line when null', () => {
    const prompt = buildLearningSystemPrompt(baseCtx)
    expect(prompt).not.toContain('Portfolio:')
  })
})

describe('STARTER_QUESTIONS', () => {
  it('has at least 3 starter questions', () => {
    expect(STARTER_QUESTIONS.length).toBeGreaterThanOrEqual(3)
  })

  it('all starter questions pass the financial topic filter', () => {
    for (const q of STARTER_QUESTIONS) {
      expect(isFinancialTopic(q)).toBe(true)
    }
  })
})
