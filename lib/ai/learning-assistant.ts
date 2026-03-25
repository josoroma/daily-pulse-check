import type { AiProvider } from '@/lib/ai/provider'

export type LearningContext = {
  country: string
  baseCurrency: string
  portfolioSummary: string | null
}

const FINANCIAL_TOPICS = [
  'invest',
  'stock',
  'bond',
  'etf',
  'fund',
  'portfolio',
  'dividend',
  'market',
  'bull',
  'bear',
  'crypto',
  'bitcoin',
  'btc',
  'eth',
  'dca',
  'dollar cost',
  'lump sum',
  'rebalance',
  'allocation',
  'p/e',
  'ratio',
  'valuation',
  'earnings',
  'revenue',
  'profit',
  'inflation',
  'interest rate',
  'fed',
  'treasury',
  'yield',
  'risk',
  'volatility',
  'diversif',
  'hedge',
  'short',
  'long',
  'tax',
  'capital gain',
  'ira',
  'roth',
  '401k',
  'retirement',
  'rsi',
  'moving average',
  'technical',
  'fundamental',
  'indicator',
  'halving',
  'mining',
  'blockchain',
  'defi',
  'staking',
  'forex',
  'currency',
  'dxy',
  'exchange rate',
  'economy',
  'gdp',
  'unemployment',
  'recession',
  'financial',
  'money',
  'saving',
  'budget',
  'compound',
  's&p',
  'nasdaq',
  'dow',
  'index',
  'sector',
  'option',
  'future',
  'derivative',
  'leverage',
  'mvrv',
  'on-chain',
  'fear',
  'greed',
  'sentiment',
]

export function isFinancialTopic(message: string): boolean {
  const lower = message.toLowerCase()
  return FINANCIAL_TOPICS.some((topic) => lower.includes(topic))
}

export const NON_FINANCIAL_RESPONSE =
  "I'm focused on helping with investing and financial topics. Please ask me about markets, portfolio strategy, or investing concepts."

export function buildLearningSystemPrompt(ctx: LearningContext): string {
  const lines: string[] = []

  lines.push('You are a friendly financial education assistant.')
  lines.push('Explain investing concepts in plain language with practical examples.')
  lines.push('When relevant, include current data or historical context.')
  lines.push('Keep answers focused and concise (2–3 paragraphs).')
  lines.push('If the user asks something unrelated to finance or investing, respond:')
  lines.push(`"${NON_FINANCIAL_RESPONSE}"`)
  lines.push('')
  lines.push('--- USER CONTEXT ---')
  lines.push(`Country: ${ctx.country}`)
  lines.push(`Base Currency: ${ctx.baseCurrency}`)
  if (ctx.portfolioSummary) {
    lines.push(`Portfolio: ${ctx.portfolioSummary}`)
  }
  lines.push('')
  lines.push(
    "Consider the user's context when answering. For example, if they invest in USD from Costa Rica, explain currency impacts when relevant.",
  )

  return lines.join('\n')
}

export const STARTER_QUESTIONS = [
  'What is DCA?',
  'How do ETFs work?',
  'Explain Bitcoin halving',
  'What is the P/E ratio?',
  'Is DCA better than lump sum?',
] as const

export type LearningAssistantConfig = {
  provider: AiProvider
  model: string
}
