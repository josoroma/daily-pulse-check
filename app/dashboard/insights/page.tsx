import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getTodaySummary, getUserAiConfig } from './_actions'
import { MarketSummaryCard } from './_components/market-summary-card'
import { PortfolioAnalysis } from './_components/portfolio-analysis'
import { LearningChat } from './_components/learning-chat'
import { Bot } from 'lucide-react'

export default async function InsightsPage() {
  const [summary, aiConfig] = await Promise.all([getTodaySummary(), getUserAiConfig()])

  const provider = aiConfig?.ai_provider ?? 'openai'
  const model = aiConfig?.ai_model ?? 'gpt-4.1-mini'

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">AI-powered market analysis and recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-xs">
            {provider}/{model}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Market Summary</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
          <TabsTrigger value="learn">Learn</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <MarketSummaryCard cachedSummary={summary?.content ?? null} />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioAnalysis />
        </TabsContent>

        <TabsContent value="learn">
          <LearningChat />
        </TabsContent>
      </Tabs>
    </div>
  )
}
