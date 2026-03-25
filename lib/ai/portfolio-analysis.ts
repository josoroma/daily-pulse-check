import type { AiProvider } from '@/lib/ai/provider'

export type PortfolioPosition = {
  symbol: string
  asset_type: string
  quantity: number
  average_buy_price: number
  current_price: number
  current_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
}

export type PortfolioContext = {
  positions: PortfolioPosition[]
  targetAllocations: Record<string, number> | null
  riskTolerance: string
  country: string
  baseCurrency: string
  totalValue: number
}

export function buildPortfolioAnalysisSystem(ctx: PortfolioContext): string {
  const lines: string[] = []

  lines.push('You are a portfolio analyst assistant for a personal finance dashboard.')
  lines.push("Analyze the user's portfolio and provide clear, actionable insights.")
  lines.push('Consider their risk tolerance, country, and investment goals.')
  lines.push('Be specific about numbers — reference actual positions, allocations, and P&L.')
  lines.push('If allocation has drifted from targets, suggest specific rebalancing actions.')
  lines.push(
    'Keep responses concise (2–4 paragraphs for initial analysis, shorter for follow-ups).',
  )
  lines.push('Never give definitive buy/sell recommendations. Frame suggestions as considerations.')
  lines.push('')
  lines.push('--- USER PROFILE ---')
  lines.push(`Risk Tolerance: ${ctx.riskTolerance}`)
  lines.push(`Country: ${ctx.country}`)
  lines.push(`Base Currency: ${ctx.baseCurrency}`)
  lines.push('')
  lines.push('--- PORTFOLIO ---')
  lines.push(
    `Total Value: $${ctx.totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
  )
  lines.push('')

  if (ctx.positions.length === 0) {
    lines.push('The user has no positions yet.')
  } else {
    for (const pos of ctx.positions) {
      const dir = pos.unrealized_pnl_pct >= 0 ? '+' : ''
      lines.push(
        `${pos.symbol} (${pos.asset_type}): ${pos.quantity} units @ avg $${pos.average_buy_price.toFixed(2)}, ` +
          `current $${pos.current_price.toFixed(2)}, value $${pos.current_value.toFixed(2)}, ` +
          `P&L ${dir}${pos.unrealized_pnl_pct.toFixed(1)}%`,
      )
    }

    // Allocation breakdown
    if (ctx.totalValue > 0) {
      lines.push('')
      lines.push('--- CURRENT ALLOCATION ---')
      for (const pos of ctx.positions) {
        const pct = (pos.current_value / ctx.totalValue) * 100
        lines.push(`${pos.symbol}: ${pct.toFixed(1)}%`)
      }
    }

    if (ctx.targetAllocations && Object.keys(ctx.targetAllocations).length > 0) {
      lines.push('')
      lines.push('--- TARGET ALLOCATION ---')
      for (const [symbol, target] of Object.entries(ctx.targetAllocations)) {
        lines.push(`${symbol}: ${target}%`)
      }
    }
  }

  return lines.join('\n')
}

export function buildPortfolioAnalysisMessages(
  ctx: PortfolioContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: buildPortfolioAnalysisSystem(ctx) },
    {
      role: 'user',
      content:
        'Analyze my portfolio. What are the key risks, opportunities, and rebalancing actions I should consider?',
    },
  ]
}

export type PortfolioAnalysisConfig = {
  provider: AiProvider
  model: string
}
