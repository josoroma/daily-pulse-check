# Finance Dashboard

> Personal finance dashboard for self-directed investors tracking VOO, QQQ, and Bitcoin — built with Next.js 15, TypeScript, Supabase, and Vercel AI SDK.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

A purpose-built dashboard for a Costa Rica-based software developer managing a focused three-asset portfolio through Interactive Brokers (VOO, QQQ) and Kraken (Bitcoin). Replaces the daily ritual of checking multiple apps with a single, AI-augmented command center.

**Target allocation:**

```
├── 50%  →  VOO   (S&P 500 — broad US market exposure)
├── 20%  →  QQQ   (Nasdaq 100 — tech-weighted growth)
├── 20%  →  BTC   (Bitcoin — asymmetric upside, monetary hedge)
└── 10%  →  Cash  (emergency fund + dry powder for dips)
```

**Core philosophy:** DCA over timing. AI as copilot, never auto-trader. Own your data. 15 minutes per day.

---

## Features

### Market Data Engine
- Real-time prices for VOO, QQQ, and Bitcoin from Twelve Data and CoinGecko
- Crypto Fear & Greed Index with radial gauge visualization
- Macro indicators: Fed Funds Rate, 10Y Treasury Yield, DXY, CPI from FRED
- Two-layer caching (in-memory TTL + Supabase) with graceful API fallback

### Portfolio Tracker
- Manual position entry — no exchange API keys required
- Transaction history with buy/sell/DCA logging
- Unrealized P&L, realized P&L (FIFO), and weighted average cost basis
- Target allocation with drift detection and rebalancing suggestions
- Portfolio value over time with daily snapshots

### DCA Automation
- Recurring schedule configuration (daily, weekly, biweekly, monthly)
- Execution reminders via in-app, email (Resend), and Telegram
- "Mark as Done" flow that auto-logs transactions
- DCA vs lump-sum performance comparison

### AI-Powered Insights
- Daily market summary — auto-generated morning briefing with streaming UI
- Portfolio analysis — personalized risk assessment and rebalancing advice
- Learning assistant — financial Q&A scoped to investing topics with guardrails
- Vercel AI SDK with OpenAI (`generateText`, `streamText`, `useChat`)

### Alerts & Notifications
- Price alerts: above/below target for any tracked asset
- Technical indicator alerts: RSI, 200-day MA crossover, MVRV Z-Score
- Multi-channel delivery: in-app bell, email (Resend), Telegram bot
- Cron-based evaluation every 5 minutes with deduplication

### Bitcoin On-Chain Analytics
- Network metrics from Mempool.space: block height, hashrate, mempool size, difficulty
- Valuation models: MVRV Z-Score (color-coded zones), Stock-to-Flow, Rainbow Price Band
- Halving countdown with block estimation and historical timeline

### Analytics & Reporting
- Time-weighted rate of return (TWRR) eliminating cash flow distortion
- Per-asset performance table with benchmark comparison (vs VOO)
- Monthly and yearly reports with DCA adherence scores
- Tax-relevant CSV export using FIFO method with Costa Rica territorial tax context
- PDF report export

### Settings & Data Management
- Dark/light/system theme toggle
- Encrypted API key storage
- Full data export (JSON) and CSV position import
- Account deletion with cascade across all tables

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components, Server Actions, API routes, Cron |
| Language | TypeScript (strict) | Zero `any`, zero `@ts-ignore` |
| Styling | Tailwind CSS v4 | Utility-first, no custom CSS files |
| UI Components | shadcn/ui | Accessible, composable primitives |
| State | Jotai | Atomic client-side state per route segment |
| Forms | React Hook Form + Zod | Client hints + server-side validation |
| Database & Auth | Supabase (Postgres + Auth + RLS) | Backend-as-a-Service with row-level security |
| AI | Vercel AI SDK + OpenAI | Streaming AI responses |
| Charts | Recharts | SVG-based responsive data visualization |
| Testing | Vitest | Unit tests for pure logic |
| Hosting | Vercel | Deployment, edge functions, cron jobs |
| Email | Resend | Transactional notification emails |
| Notifications | Telegram Bot API | Real-time push alerts |

---

## Architecture

**Colocated feature-based** — every route segment is a self-contained feature boundary.

```
app/<route>/
├── page.tsx              # Server Component entry point
├── _components/          # UI components scoped to this route
├── _actions.ts           # Server Actions (mutations + validation)
├── _schema.ts            # Zod schemas (validation + inferred types)
├── _hooks.ts             # Client-side hooks
├── _atoms.ts             # Jotai atoms for client state
├── _utils.ts             # Pure helper functions
└── __tests__/            # Unit tests mirroring _ files
```

**Decision rule:** Used by 1 route → colocate. Used by 2 routes → colocate in the higher route. Used by 3+ routes → move to `lib/<domain>/`.

### External APIs

| API | Data | Free Tier |
|---|---|---|
| Twelve Data | Stock/ETF prices (VOO, QQQ), DXY | 800 req/day |
| CoinGecko | Bitcoin price, market cap, volume | Generous free tier |
| FRED | Macro data (Fed rate, 10Y yield, CPI) | Unlimited |
| Alternative.me | Crypto Fear & Greed Index | Unlimited |
| Mempool.space | Bitcoin on-chain data | Unlimited |
| LookIntoBitcoin | MVRV Z-Score, Stock-to-Flow | Web scraping / API |

---

## Project Structure

```
app/
├── page.tsx                        # Landing page
├── (auth)/                         # Login, signup, OAuth callback
├── dashboard/                      # Dashboard home + sidebar layout
├── portfolio/                      # Position entry, overview, transactions
├── market/                         # Market data, sentiment, macro indicators
├── dca/                            # DCA schedules + analytics
├── bitcoin/                        # On-chain metrics + valuation models
├── alerts/                         # Price + technical indicator alerts
├── insights/                       # AI analysis + learning chat
├── analytics/                      # Performance metrics + tax export
├── settings/                       # App config + data management
├── profile/                        # Profile onboarding + editing
└── api/                            # Market, AI, alerts, DCA cron endpoints

lib/
├── supabase/                       # Client, server, middleware, generated types
├── market/                         # Twelve Data, CoinGecko, Alternative.me, FRED
├── bitcoin/                        # Mempool.space, valuation models, halving
├── indicators/                     # RSI, SMA, EMA calculations
├── ai/                             # Prompt templates (summary, analysis, assistant)
├── notifications/                  # Multi-channel dispatcher + Telegram bot
└── utils/                          # Formatting, dates, currency helpers

supabase/
└── migrations/                     # Append-only SQL migrations
```

---

## Getting Started

<!-- TODO: Add installation and setup instructions -->

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm test` | Run Vitest |
| `supabase start` | Start local Supabase |
| `supabase db push` | Apply migrations |
| `supabase gen types typescript --local > lib/supabase/database.types.ts` | Regenerate types |

---

## Documentation

| Document | Purpose |
|---|---|
| [PDD.md](PDD.md) | Product Design Document — vision, domain model, features, workflows, visual design |
| [SPECS.md](SPECS.md) | Epics, user stories, tasks, and Gherkin acceptance criteria |
| [CLAUDE.md](CLAUDE.md) | AI agent instructions — code conventions, architecture rules, commands |

---

## License

MIT