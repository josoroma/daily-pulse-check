import { ArrowRight, BarChart3, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold tracking-tight">Finance Dashboard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Personal Finance Tracker
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Track <span className="text-[hsl(220,70%,55%)]">VOO</span>,{' '}
            <span className="text-[hsl(280,65%,60%)]">QQQ</span> &{' '}
            <span className="text-[hsl(35,95%,55%)]">Bitcoin</span>
          </h1>

          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            A personal finance dashboard for tracking investments, DCA schedules, and portfolio
            performance — built for a self-directed investor.
          </p>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mx-auto mt-16 grid max-w-3xl gap-6 px-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-2 inline-flex rounded-md bg-emerald-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold">Portfolio Tracking</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Real-time P&L, cost basis, and allocation across VOO, QQQ, and BTC.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-2 inline-flex rounded-md bg-sky-500/10 p-2">
              <BarChart3 className="h-4 w-4 text-sky-500" />
            </div>
            <h3 className="text-sm font-semibold">DCA Automation</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Schedule recurring investments and compare DCA vs lump-sum returns.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <div className="mb-2 inline-flex rounded-md bg-amber-500/10 p-2">
              <Shield className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-semibold">AI Insights</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AI-powered market summaries, portfolio analysis, and learning assistant.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Finance Dashboard — Personal investment tracker
        </p>
      </footer>
    </div>
  )
}
