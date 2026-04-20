# PDD.md — Product Design Document

> Finance Dashboard for Self-Directed Investors
> Version: 0.2.0 | Last updated: 2026-04-02

---

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Domain Model](#2-domain-model)
3. [Core Features](#3-core-features)
4. [User Workflows](#4-user-workflows)
5. [Data Sources & Refresh Strategy](#5-data-sources--refresh-strategy)
6. [Visual Design](#6-visual-design)
7. [Technical Architecture](#7-technical-architecture)

---

## 1. Core Concept

### Vision

A personal finance dashboard purpose-built for a self-directed investor operating from Costa Rica, tracking a focused three-asset portfolio: **VOO** (S&P 500), **QQQ** (Nasdaq 100), and **Bitcoin**. The dashboard replaces the daily ritual of checking five different apps and websites with a single, AI-augmented command center.

### Target User

A software developer living in Costa Rica who:

- **Invests internationally** through Interactive Brokers (stocks/ETFs) and a crypto exchange (Bitcoin)
- **Follows a DCA discipline** — weekly or monthly recurring buys regardless of price
- **Has a 10+ year time horizon** with medium-high risk tolerance
- **Wants signal, not noise** — 15 minutes per day maximum for market review
- **Understands code** — comfortable with APIs, automation, and building tools
- **Operates under Costa Rica's territorial tax system** — foreign investment gains are generally tax-exempt, but needs clean records for accountant compliance

### Portfolio Philosophy

```
Target Allocation
├── 50%  →  VOO   (broad US market exposure)
├── 20%  →  QQQ   (tech-weighted growth)
├── 20%  →  BTC   (asymmetric upside, monetary hedge)
└── 10%  →  Cash  (emergency fund + dry powder for dips)
```

The allocation is intentionally simple — three liquid, globally accessible assets that a single person can manage without a financial advisor. The dashboard enforces this simplicity by tracking drift, suggesting rebalances, and measuring DCA adherence rather than encouraging frequent trading.

### Design Principles

| Principle                | Meaning                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Data-first**           | Every screen starts with real numbers. No empty marketing states — meaningful defaults and realistic examples.                |
| **Opinionated defaults** | Tuned for a VOO/QQQ/BTC investor. Not a generic portfolio tracker — specialized for this asset mix.                           |
| **DCA over timing**      | The dashboard rewards consistency. DCA adherence scores, execution reminders, and historical proof that discipline compounds. |
| **AI as copilot**        | AI summarizes, explains, and alerts — never auto-trades. The investor stays in control.                                       |
| **Own your data**        | Supabase with RLS. Full data export. Account deletion. No vendor lock-in.                                                     |
| **Costa Rica context**   | CRC/USD dual currency display, territorial tax notes, time-zone-aware scheduling, IBKR platform awareness.                    |

---

## 2. Domain Model

### Entity Map

```
┌──────────────┐       ┌───────────────┐
│    User      │──1:1──│   Profile     │
│  (Supabase   │       │  currency     │
│   Auth)      │       │  country      │
│              │       │  risk_tol     │
└──────┬───────┘       └───────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐        ┌───────────────┐
│  Portfolio    │──1:N──│  Position     │
│  target_alloc│        │  symbol       │
│  (JSONB)     │        │  asset_type   │
│              │        │  quantity     │
└──────┬───────┘        │  avg_cost     │
       │                └───────┬───────┘
       │                        │ 1:N
       │                ┌───────▼───────┐
       │                │ Transaction   │
       │                │  type (buy/   │
       │                │   sell/dca)   │
       │                │  quantity     │
       │                │  price        │
       │                │  fee          │
       │                └───────────────┘
       │
       │ 1:N
       ▼
┌───────────────┐       ┌───────────────┐
│ DCA Schedule  │       │    Alert      │
│  symbol       │       │  symbol       │
│  amount_usd   │       │  condition    │
│  frequency    │       │  (above/below/│
│  day_trigger  │       │   rsi/ma)     │
│  status       │       │  target_value │
└──────┬────────┘       │  status       │
       │                └───────┬───────┘
       │ generates              │ fires
       ▼                        ▼
┌──────────────┐        ┌───────────────┐
│ Notification  │◀──────│  Dispatcher   │
│  type         │       │  (in-app,     │
│  title        │       │   email,      │
│  body         │       │   telegram)   │
│  read         │       └───────────────┘
└──────────────┘

┌───────────────┐
│ AI Summary    │
│  date         │
│  content      │
│  market_data  │
│  (snapshot)   │
└───────────────┘

┌───────────────┐
│ Portfolio     │
│  Snapshot     │
│  date         │
│  total_value  │
│  allocations  │
│  (daily cron) │
└───────────────┘
```

### Entity Definitions

| Entity                 | Purpose                                     | Key Fields                                                                                     | Ownership                    |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- |
| **User**               | Supabase Auth identity                      | id, email, created_at                                                                          | Auth-managed                 |
| **Profile**            | Investor context — drives personalization   | display_name, base_currency (USD/CRC), country, risk_tolerance                                 | 1:1 with User, RLS-protected |
| **Portfolio**          | Container for positions + target allocation | user_id, target_allocations (JSONB: `{VOO: 50, QQQ: 20, BTC: 20, CASH: 10}`)                   | 1:1 with User                |
| **Position**           | A holding in a specific asset               | symbol, asset_type (ETF/Crypto), quantity, avg_cost_basis, first_buy_date                      | N per Portfolio              |
| **Transaction**        | A buy, sell, or DCA execution record        | type, symbol, quantity, price_usd, fee_usd, executed_at, notes                                 | N per Position               |
| **DCA Schedule**       | Recurring buy plan                          | symbol, amount_usd, frequency, day_of_week/month, status (active/paused)                       | N per User                   |
| **Alert**              | Price or indicator trigger                  | symbol, condition_type, operator, target_value, status (active/triggered/paused), triggered_at | N per User                   |
| **Notification**       | Delivered message (any channel)             | type (dca_reminder/alert_fired/system), title, body, read, channel, created_at                 | N per User                   |
| **AI Summary**         | Cached daily AI briefing                    | date, content (markdown), market_snapshot (JSONB), model_version                               | 1 per day                    |
| **Portfolio Snapshot** | Daily portfolio state for charting          | date, total_value_usd, positions_snapshot (JSONB), allocations (JSONB)                         | 1 per day per User           |

### Data Integrity Rules

- All tables enforce RLS — users access only their own rows
- Positions auto-update `avg_cost_basis` when transactions are logged (weighted average method)
- Sell transactions enforce quantity check — cannot sell more than held
- DCA schedules marked "paused" skip reminder generation
- Alerts fire once — status flips to "triggered" and no duplicate notifications are created
- Portfolio snapshots are append-only — never mutated after creation

---

## 3. Core Features

### Feature Map by Epic

| #       | Feature Area               | Description                                                                                               | Route                               |
| ------- | -------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **E1**  | Project Foundation         | Next.js 16.2.1 + TypeScript strict + Tailwind v4 + shadcn/ui + Supabase + Vitest                          | — (infrastructure)                  |
| **E2**  | Authentication & Profile   | Email/password + Google OAuth, profile onboarding, sidebar layout                                         | `(auth)/`, `profile/`, `dashboard/` |
| **E3**  | Market Data Engine         | Real-time + historical prices for VOO, QQQ, BTC. Sentiment indices. Macro indicators.                     | `market/`, `api/market/`            |
| **E4**  | Portfolio Tracker          | Manual position entry, overview dashboard, transaction history, target allocation + drift alerts          | `portfolio/`                        |
| **E5**  | DCA Automation             | Schedule configuration, execution reminders, DCA vs lump-sum performance analysis                         | `dca/`                              |
| **E6**  | AI-Powered Insights        | Daily market summary, portfolio AI analysis, learning assistant chat                                      | `insights/`, `api/ai/`              |
| **E7**  | Alerts & Notifications     | Price alerts, technical indicator alerts (RSI, MA, MVRV), multi-channel delivery                          | `alerts/`                           |
| **E8**  | Bitcoin On-Chain Analytics | Network metrics (hashrate, mempool, difficulty), valuation models (MVRV, S2F, Rainbow), halving countdown | `bitcoin/`                          |
| **E9**  | Analytics & Reporting      | Performance metrics (TWRR, per-asset), monthly/yearly reports, tax-relevant CSV export (FIFO)             | `analytics/`                        |
| **E10** | Settings & Data Management | Theme, API keys, notification prefs, full data export (JSON), CSV import, account deletion                | `settings/`                         |

### Feature Detail

#### Market Data Engine (E3)

The engine aggregates six external APIs into a unified data layer consumed by every other feature. Each API integration lives in `lib/market/` and exposes typed functions with built-in caching.

**Data points tracked:**

| Category          | Specific Data                               | Source                 | Refresh Rate                     |
| ----------------- | ------------------------------------------- | ---------------------- | -------------------------------- |
| Stock/ETF prices  | VOO, QQQ — current price, OHLCV history     | Twelve Data            | 5 min (real-time), 24h (history) |
| Crypto prices     | BTC — price, market cap, volume, 24h change | CoinGecko              | 5 min                            |
| Crypto sentiment  | Fear & Greed Index (0-100) + classification | Alternative.me         | 24h                              |
| Macro indicators  | Fed Funds Rate, 10Y Treasury, CPI, DXY      | FRED + Twelve Data     | 24h                              |
| Bitcoin on-chain  | Block height, hashrate, mempool, difficulty | Mempool.space          | 60 sec                           |
| Bitcoin valuation | MVRV Z-Score, Stock-to-Flow, Rainbow bands  | CoinGecko + calculated | 24h                              |

**Caching strategy:** In-memory TTL cache (5 min for prices, 24h for macro/historical data) backed by Supabase rows for persistence across deploys. When an API returns an error or rate-limit response, the system falls back to the most recent cached value and displays a "Using cached data" indicator.

#### Portfolio Tracker (E4)

The portfolio tracker is the core transactional feature. It does not connect to exchange APIs — all position data is manually entered. This is a deliberate design choice: the user trades on IBKR and a crypto exchange, then logs transactions in the dashboard. This avoids OAuth token management, API key rotation, and exchange-specific quirks.

**Key calculations:**

| Calculation                 | Method                                        | Used In                         |
| --------------------------- | --------------------------------------------- | ------------------------------- |
| Unrealized P&L              | `(current_price - avg_cost_basis) × quantity` | Positions table, overview       |
| Realized P&L                | Sale proceeds − FIFO cost basis               | Transaction history, tax export |
| Average cost basis          | Weighted average across all buys              | Position card, DCA analytics    |
| Allocation drift            | `actual_pct - target_pct` per asset           | Rebalance alerts                |
| Rebalance suggestion        | Dollar amounts to buy/sell to restore targets | Portfolio overview              |
| Time-weighted return (TWRR) | Geometric linking of sub-period returns       | Analytics dashboard             |

#### DCA Automation (E5)

The DCA module does not execute trades — it enforces the investor's discipline. Schedules generate reminders, the user executes on their broker, then marks the DCA as done (which auto-logs a transaction).

**Schedule types:**

| Frequency | Trigger                             | Example                  |
| --------- | ----------------------------------- | ------------------------ |
| Daily     | Every day at user's configured time | BTC $25/day              |
| Weekly    | Specific day of week                | VOO $100 every Monday    |
| Biweekly  | Every other week on a specific day  | QQQ $150 biweekly Friday |
| Monthly   | Specific day of month               | VOO $400 on the 1st      |

**Analytics:** The DCA performance page proves that discipline works — it overlays each DCA buy point on the price chart, plots the evolving average cost basis, and compares the DCA outcome against a hypothetical lump-sum investment on day one.

#### AI-Powered Insights (E6)

Three distinct AI capabilities, all built on Vercel AI SDK with OpenAI:

1. **Daily Market Summary** — Auto-generated each morning. Ingests: VOO/QQQ closing prices, BTC price, Fear & Greed, macro events. Produces a 2-paragraph briefing stored in `ai_summaries` and displayed on the dashboard home. Uses `generateText` for cron jobs, `streamText` for on-demand refresh.

2. **Portfolio Analysis** — On-demand. Injects the user's positions, allocation, drift, P&L, and risk tolerance into a structured prompt. The AI identifies concentration risks, suggests rebalancing, and explains trade-offs. Chat follow-ups supported via `useChat`.

3. **Learning Assistant** — Scoped to financial topics only. Non-financial queries receive a polite redirect. Injects user context (Costa Rica, portfolio composition) for personalized answers. Starter questions guide exploration: "What is DCA?", "How do ETFs work?", "Explain Bitcoin halving."

**Guardrails:** Every AI response includes a disclaimer: "AI-generated analysis. Not financial advice. Always do your own research." The learning assistant has a topic filter that rejects non-financial prompts.

#### Alerts & Notifications (E7)

Two alert categories with three delivery channels:

**Alert types:**

| Type                | Conditions                                  | Example             |
| ------------------- | ------------------------------------------- | ------------------- |
| Price alert         | Above/below a target                        | "BTC below $80,000" |
| Technical indicator | RSI above/below, MA crossover, MVRV Z-Score | "VOO RSI below 30"  |

**Evaluation:** A Vercel Cron job runs every 5 minutes, fetches current prices and indicator values, and evaluates all active alerts. Triggered alerts flip to "triggered" status and fire a notification. Alerts do not re-trigger — the user must manually reset them.

**Delivery channels:**

| Channel  | Implementation                                             | Always On |
| -------- | ---------------------------------------------------------- | --------- |
| In-app   | Notification bell in dashboard header, unread badge        | Yes       |
| Email    | Supabase Edge Function → Resend API                        | Opt-in    |
| Telegram | Bot created via BotFather, `lib/notifications/telegram.ts` | Opt-in    |

#### Bitcoin On-Chain Analytics (E8)

A dedicated section for Bitcoin-specific analysis beyond price action. Three sub-features:

1. **Network Metrics** — Block height, hashrate (EH/s with 30d trend), mempool size (MB) with fee estimates (low/medium/high), mining difficulty with next adjustment estimate. Auto-refreshes every 60 seconds for a real-time feel. Data from Mempool.space.

2. **Valuation Models** — Three battle-tested cycle indicators:
   - **MVRV Z-Score** — color-coded zones: green (<0, undervalued), yellow (0-3, fair), orange (3-6, overvalued), red (>6, bubble territory)
   - **Stock-to-Flow** — model projection vs actual price with halving events marked on the timeline
   - **Rainbow Price Band** — logarithmic regression bands from "Fire Sale" through "Maximum Bubble" with current price position highlighted

3. **Halving Countdown** — Blocks remaining until next halving (1,050,000), estimated date, current and next block reward. Includes a halving history timeline with price context at each historical halving.

#### Analytics & Reporting (E9)

Three reporting capabilities for measuring investing success:

1. **Performance Metrics** — Total return (dollar + %), time-weighted rate of return (TWRR) that eliminates cash flow distortion, per-asset performance table (sortable), and benchmark comparison (user portfolio vs VOO over the same period).

2. **Periodic Reports** — Monthly and yearly summaries: starting value, ending value, net deposits, withdrawals, return %, DCA adherence score (scheduled vs executed DCA entries). Month-by-month return chart for yearly view. PDF export via client-side rendering.

3. **Tax-Relevant Export** — Realized gains summary using FIFO method. Full transaction history CSV. Year filter. Costa Rica tax context note: "Foreign investment gains may be exempt under the territorial tax system. Consult your accountant." Designed for handing to an accountant, not for automated filing.

---

## 4. User Workflows

### Daily Review (15 minutes)

```
┌─── Open Dashboard (/dashboard) ─────────────────────────────────┐
│                                                                 │
│  1. READ AI morning briefing (auto-generated at 8 AM)           │
│     └─ VOO/QQQ trend, BTC action, sentiment, macro events       │
│                                                                 │
│  2. GLANCE at portfolio value card                              │
│     └─ Total value, 24h change, unrealized P&L                  │
│                                                                 │
│  3. CHECK notification bell                                     │
│     └─ DCA reminders, triggered alerts                          │
│                                                                 │
│  4. If DCA reminder pending:                                    │
│     └─ Execute buy on IBKR/exchange → Mark as Done in dashboard  │
│                                                                 │
│  5. DONE — close dashboard, get on with the day                 │
└─────────────────────────────────────────────────────────────────┘
```

### Adding a New Position

```
Portfolio page → "Add Position" button
  ├── Select asset type (ETF / Crypto)
  ├── Enter: symbol, quantity, buy price (USD), date
  ├── Optional: notes
  ├── Submit (validated by Zod schema server-side)
  └── Position appears in table with live P&L from market data
```

### DCA Execution Cycle

```
Cron job checks due schedules (daily at configured time)
  │
  ├── Schedule due? YES → Create notification: "Buy $100 of VOO today"
  │                        Deliver via: in-app + enabled channels (email/telegram)
  │
  └── User receives reminder
        ├── Opens IBKR/exchange → Executes the buy
        ├── Returns to dashboard → Clicks "Mark as Done"
        ├── Enters actual execution price
        └── Transaction auto-logged → Position updated → DCA analytics refresh
```

### Rebalancing Flow

```
Portfolio page detects drift > 5%
  │
  ├── "Rebalance Needed" badge appears
  ├── User clicks badge → Sees suggested trades:
  │     "Sell 0.01 BTC ($920) → Buy 2 VOO ($920)"
  │
  ├── User decides to act:
  │     ├── Executes sell on exchange
  │     ├── Logs sell transaction in dashboard
  │     ├── Executes buy on IBKR
  │     ├── Logs buy transaction in dashboard
  │     └── Drift recalculates → Badge disappears
  │
  └── User decides to wait: no action required
```

### Alert Lifecycle

```
Create alert: "BTC below $80,000"
  │
  ├── Status: ACTIVE
  ├── Cron evaluates every 5 min
  │
  ├── BTC at $82,000 → No trigger
  ├── BTC at $79,500 → TRIGGER
  │     ├── Status: TRIGGERED
  │     ├── Notification: "BTC has dropped below $80,000 (current: $79,500)"
  │     ├── Delivered to: in-app + telegram (if enabled)
  │     └── No re-trigger on subsequent checks
  │
  └── User can reset to ACTIVE or delete
```

### AI Portfolio Analysis

```
Insights page → "Analyze My Portfolio" button
  │
  ├── System injects into prompt:
  │     Positions, allocation, drift, P&L, risk tolerance, country
  │
  ├── AI streams response:
  │     "Your portfolio is 35% BTC against a 20% target.
  │      Given your medium-high risk tolerance, this is acceptable
  │      during a bull phase, but consider trimming if BTC reaches
  │      40%+ to protect gains..."
  │
  ├── Disclaimer rendered below every AI output
  │
  └── User can ask follow-up: "Should I sell some BTC?"
        └── AI responds with context-aware answer
```

### End-of-Year Tax Flow

```
Analytics → Tax Export page
  │
  ├── Select year: 2026
  ├── View realized gains summary (FIFO method):
  │     Date | Symbol | Qty | Cost Basis | Sale Price | Gain/Loss | Holding Period
  │
  ├── Note displayed: "Costa Rica territorial tax system —
  │     foreign investment gains may be exempt. Consult your accountant."
  │
  ├── "Export CSV" → Downloads realized gains + full transactions
  └── Hand CSV to accountant → done
```

---

## 5. Data Sources & Refresh Strategy

### External API Inventory

| API                | Base URL                   | Data Provided                                                           | Auth                      | Free Tier Limits       | Fallback       |
| ------------------ | -------------------------- | ----------------------------------------------------------------------- | ------------------------- | ---------------------- | -------------- |
| **Twelve Data**    | `api.twelvedata.com`       | VOO/QQQ/DXY prices, OHLCV history                                       | API key                   | 800 req/day, 8 req/min | Supabase cache |
| **CoinGecko**      | `api.coingecko.com/api/v3` | BTC price, market cap, volume, chart history                            | None (or API key for Pro) | Generous (50 req/min)  | Supabase cache |
| **Alternative.me** | `api.alternative.me`       | Crypto Fear & Greed Index (0-100)                                       | None                      | Unlimited              | Supabase cache |
| **FRED**           | `api.stlouisfed.org`       | Fed Funds Rate, 10Y Yield, CPI, Unemployment                            | API key                   | Unlimited              | Supabase cache |
| **Mempool.space**  | `mempool.space/api`        | Block height, hashrate, mempool, difficulty, fees                       | None                      | Unlimited              | Supabase cache |
| **CoinGecko**      | `api.coingecko.com/api/v3` | BTC valuation data (market cap for MVRV, price history for S2F/Rainbow) | None (or API key for Pro) | Generous (50 req/min)  | Supabase cache |

### Refresh Tiers

| Tier               | Refresh Interval | Data Types                                                                     | Mechanism                               |
| ------------------ | ---------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| **Real-time**      | 60 seconds       | Bitcoin on-chain metrics (block height, mempool, hashrate)                     | Client-side polling with `setInterval`  |
| **Near real-time** | 5 minutes        | Asset prices (VOO, QQQ, BTC), portfolio value                                  | In-memory TTL cache, API route with SWR |
| **Daily**          | 24 hours         | Historical OHLCV, macro indicators, Fear & Greed, AI summary, valuation models | Vercel Cron → Supabase storage          |
| **On-demand**      | User-triggered   | AI portfolio analysis, AI chat, report generation, CSV export                  | Direct API call per request             |

### Caching Architecture

```
Client Request
  │
  ├── API Route (/api/market/price/VOO)
  │     │
  │     ├── Check in-memory cache (Map with TTL)
  │     │     ├── HIT + fresh → return cached
  │     │     └── MISS or stale ↓
  │     │
  │     ├── Check Supabase cache table
  │     │     ├── HIT + fresh → return, warm in-memory cache
  │     │     └── MISS or stale ↓
  │     │
  │     ├── Fetch from external API
  │     │     ├── SUCCESS → store in both caches, return
  │     │     └── ERROR → return stale cache + "Using cached data" flag
  │     │
  │     └── Rate limit approaching? → skip external fetch, serve cache
  │
  └── Client renders data with freshness indicator
```

### Rate Limit Management

Twelve Data's 800 req/day constraint is the binding limit. Strategy:

- **Request budgeting:** Track daily request count in an in-memory counter (reset at midnight UTC)
- **Aggressive caching:** 5-min TTL for prices, 24h for historical data
- **Batching:** Fetch VOO + QQQ + DXY in a single request where the API supports it
- **Throttle at 750 req:** Switch to cache-only mode and display "Using cached data" indicator
- **Priority queue:** Price fetches for portfolio calculation take priority over chart history fetches

---

## 6. Visual Design

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  Sidebar (240px, collapsible on mobile)  │   Main Content Area   │
│  ┌─────────────────────────────────┐     │                       │
│  │  Logo / App Name                │     │   Page Header         │
│  │                                 │     │   ─────────────────   │
│  │  Dashboard        ●             │     │                       │
│  │  Portfolio                      │     │   Content Grid        │
│  │  Markets                        │     │   (responsive cards)  │
│  │  DCA                            │     │                       │
│  │  Bitcoin                        │     │                       │
│  │  Alerts                         │     │                       │
│  │  Insights                       │     │                       │
│  │  Analytics                      │     │                       │
│  │  Settings                       │     │                       │
│  │                                 │     │                       │
│  │  ─────────────────              │     │                       │
│  │  [Avatar] User Name             │     │                       │
│  │  [ Log Out ]                    │     │                       │
│  └─────────────────────────────────┘     │                       │
└──────────────────────────────────────────────────────────────────┘
```

### Dashboard Home Layout

```
┌───────────────────────────────────────────────────────┐
│  [Notification Bell 3]                 [Theme Toggle] │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  AI Morning Briefing                             │ │
│  │  "Markets opened mixed. VOO +0.3% as labor..."   │ │
│  │  [Refresh]                                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐            │
│  │Total Value│  │  24h Δ   │  │ Unreal.  │            │
│  │ $32,485   │  │ +$215    │  │  P&L     │            │
│  │           │  │ (+0.67%) │  │ +$4,250  │            │
│  └───────────┘  └──────────┘  └──────────┘            │
│                                                       │
│  ┌─────────────────────┐  ┌──────────────────────┐    │
│  │  Allocation Donut   │  │  Portfolio Line Chart│    │
│  │  VOO 48% ██████     │  │   [1W][1M][3M][1Y]   │    │
│  │  QQQ 19% ███        │  │   ╱───────╲──╱───    │    │
│  │  BTC 23% ████       │  │  ╱         ╲╱        │    │
│  │  Cash 10% █         │  │                      │    │
│  └─────────────────────┘  └──────────────────────┘    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Fear&Greed│  │ DXY      │  │ Fed Rate │             │
│  │  32 Fear │  │ 104.2    │  │  5.25%   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└───────────────────────────────────────────────────────┘
```

### Component System

Built entirely on **shadcn/ui** — accessible, composable, Tailwind-styled:

| Component Category | shadcn/ui Components Used                     | Custom Components                   |
| ------------------ | --------------------------------------------- | ----------------------------------- |
| Layout             | `Sidebar`, `Sheet` (mobile), `Separator`      | Dashboard shell, page headers       |
| Data display       | `Card`, `Table`, `Badge`, `Tooltip`           | Metric cards, sparklines            |
| Forms              | `Input`, `Select`, `Button`, `Dialog`, `Form` | Position form, alert form, DCA form |
| Feedback           | `Toast`, `Skeleton`, `Alert`                  | Loading states, empty states        |
| Navigation         | `NavigationMenu`, `Tabs`, `Breadcrumb`        | Sidebar nav, settings tabs          |
| Charts             | — (shadcn/ui doesn't include charts)          | Recharts: line, donut, bar, area    |

### Chart Specifications

| Chart                       | Library                   | Used In              | Key Config                                                   |
| --------------------------- | ------------------------- | -------------------- | ------------------------------------------------------------ |
| Portfolio value over time   | Recharts `AreaChart`      | Dashboard, analytics | Time range selector, gradient fill                           |
| Allocation donut            | Recharts `PieChart`       | Dashboard, portfolio | Interactive segments, center total                           |
| Fear & Greed gauge          | Recharts `RadialBarChart` | Market page          | Radial gauge, color gradient (red→green)                     |
| Price history + DCA markers | Recharts `ComposedChart`  | DCA analytics        | Line (price) + Scatter (DCA buys) + ReferenceLine (avg cost) |
| MVRV Z-Score                | Recharts `AreaChart`      | Bitcoin valuation    | Color-coded background zones                                 |
| Stock-to-Flow               | Recharts `ComposedChart`  | Bitcoin valuation    | Scatter (actual) + Line (model) + ReferenceLine (halvings)   |
| Rainbow bands               | Recharts `AreaChart`      | Bitcoin valuation    | 9 stacked semi-transparent areas                             |
| Monthly returns             | Recharts `BarChart`       | Analytics reports    | Green (positive) / red (negative) bars                       |
| Drift comparison            | Recharts `BarChart`       | Portfolio            | Grouped bars: actual vs target per asset                     |

### Theming

- **Dark mode** as default (investors often check at night or early morning)
- **Light mode** available via `next-themes` or CSS variables toggle
- **System mode** follows OS preference
- Color palette: neutral grays for chrome, green for gains, red for losses, blue for informational, amber for warnings
- Consistent status colors: active (green), paused (amber), triggered (blue), error (red)

### Responsive Breakpoints

| Breakpoint              | Layout Behavior                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `< 768px` (mobile)      | Sidebar collapses to hamburger overlay. Cards stack vertically. Charts full-width.   |
| `768px–1024px` (tablet) | Sidebar remains, content uses 2-column grid. Charts side-by-side where space allows. |
| `> 1024px` (desktop)    | Full sidebar + 3-column card grid. Charts at optimal aspect ratio.                   |

### Loading & Empty States

Every data-dependent component has three visual states:

1. **Loading** — shadcn/ui `Skeleton` components matching the final layout shape
2. **Empty** — Descriptive message + call to action (e.g., "Add your first position to get started" + button)
3. **Error** — `Alert` component with error message + retry button + fallback to cached data if available

---

## 7. Technical Architecture

### Stack Summary

| Layer         | Technology                      | Role                                                       |
| ------------- | ------------------------------- | ---------------------------------------------------------- |
| Framework     | Next.js 16 (App Router)         | Server Components, Server Actions, API routes, Cron        |
| Language      | TypeScript strict               | Zero `any`, zero `@ts-ignore`                              |
| Styling       | Tailwind CSS v4                 | Utility-first, no custom CSS files                         |
| UI            | shadcn/ui                       | Accessible component primitives                            |
| State         | Jotai                           | Atomic client-side state, colocated `_atoms.ts` per route  |
| Forms         | React Hook Form + Zod           | Client hints + server-side validation in `_actions.ts`     |
| Database      | Supabase (Postgres)             | Tables, RLS, generated types                               |
| Auth          | Supabase Auth                   | Email/password + Google OAuth, session cookies             |
| AI            | Vercel AI SDK + OpenAI + Ollama | `generateText`, `streamText`, NDJSON streaming             |
| Charts        | Recharts                        | SVG-based responsive charts                                |
| Testing       | Vitest                          | Unit tests for pure logic — schemas, calculations, parsers |
| Hosting       | Vercel                          | Deployment, edge functions, cron jobs                      |
| Email         | Resend                          | Transactional notification emails                          |
| Notifications | Telegram Bot API                | Real-time push alerts                                      |

### Colocated Feature Architecture

Every route segment is a self-contained feature boundary. All related logic lives inside the route folder.

```
app/<route>/
├── page.tsx              # Server Component entry point (default export)
├── layout.tsx            # Optional layout wrapper
├── loading.tsx           # Optional Suspense fallback
├── error.tsx             # Optional error boundary
├── _components/          # UI components scoped to this route
│   └── <name>.tsx        #   PascalCase export, kebab-case file
├── _actions.ts           # Server Actions (mutations + validation)
├── _schema.ts            # Zod schemas (validation + inferred types)
├── _types.ts             # Types used by 3+ files in this route
├── _hooks.ts             # Client-side hooks
├── _atoms.ts             # Jotai atoms for client state
├── _constants.ts         # Static values, enums
├── _utils.ts             # Pure helper functions
└── __tests__/            # Unit tests mirroring _ files
    ├── _schema.test.ts
    ├── _actions.test.ts
    └── _utils.test.ts
```

**Decision rule:** If code is used by only this route, it goes in the route folder. If used by 2 routes, colocate in the higher route. If used by 3+ routes, move to `lib/<domain>/`.

### Shared Code (`lib/`)

Cross-cutting concerns that serve 3+ route segments:

| Module               | Purpose                                                                     | Consumers                            |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| `lib/supabase/`      | Client, server, middleware helpers, generated types                         | Every authenticated route            |
| `lib/market/`        | External API integrations (Twelve Data, CoinGecko, Alternative.me, FRED)    | Market, dashboard, portfolio, alerts |
| `lib/bitcoin/`       | On-chain data (Mempool.space), valuation models, halving calculations       | Bitcoin route, alerts, dashboard     |
| `lib/indicators/`    | RSI, SMA, EMA calculations                                                  | Alerts, market, bitcoin              |
| `lib/ai/`            | Prompt templates for market summary, portfolio analysis, learning assistant | Insights, dashboard, API routes      |
| `lib/notifications/` | Multi-channel dispatcher (in-app, email via Resend, Telegram)               | Alerts, DCA reminders                |
| `lib/utils/`         | Formatting (currency, dates, percentages)                                   | Every route                          |

### Server/Client Boundary

```
Server Components (default)          Client Components ('use client')
──────────────────────────           ──────────────────────────────
page.tsx — data fetching              Interactive forms (RHF)
layout.tsx — auth checks              Charts (Recharts)
_actions.ts — mutations               Real-time price tickers
_schema.ts — validation               Notification bell + dropdown
API routes — external APIs            Theme toggle
                                      AI chat (streaming UI)
                                      Sidebar collapse/expand
```

**Validation flow:** Client-side Zod parsing provides immediate UX hints. Server-side validation in `_actions.ts` is the authoritative gate — it re-validates with the same Zod schema before any database mutation.

### Database Schema

All tables live in Supabase Postgres with RLS enforced:

| Table                 | Key Columns                                                                   | RLS Policy             |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| `profiles`            | user_id (FK→auth.users), display_name, base_currency, country, risk_tolerance | Owner read/write       |
| `portfolios`          | user_id, target_allocations (JSONB)                                           | Owner read/write       |
| `positions`           | portfolio_id, symbol, asset_type, quantity, avg_cost_basis                    | Owner via portfolio    |
| `transactions`        | position_id, type, quantity, price_usd, fee_usd, executed_at                  | Owner via position     |
| `dca_schedules`       | user_id, symbol, amount_usd, frequency, day_trigger, status                   | Owner read/write       |
| `alerts`              | user_id, symbol, condition_type, operator, target_value, status               | Owner read/write       |
| `notifications`       | user_id, type, title, body, read, channel                                     | Owner read only        |
| `ai_summaries`        | date, content, market_snapshot (JSONB)                                        | All authenticated read |
| `portfolio_snapshots` | user_id, date, total_value_usd, positions_snapshot (JSONB)                    | Owner read only        |
| `market_cache`        | key, data (JSONB), cached_at, ttl_seconds                                     | System read/write      |
| `user_api_keys`       | user_id, service, encrypted_key, is_valid, last_verified_at                   | Owner read/write       |
| `api_request_counts`  | provider, date_key, request_count                                             | System read/write      |

Migrations are append-only in `supabase/migrations/`. Never modify an existing migration — always create a new one.

### Deployment Model

```
Vercel
├── Edge Network — Static assets, ISR pages
├── Serverless Functions — API routes, Server Actions
├── Cron Jobs
│   ├── Every 5 min: Evaluate active alerts
│   ├── Daily 8 AM: Generate AI market summary
│   ├── Daily 8 AM: Check due DCA schedules, send reminders
│   └── Daily midnight: Snapshot portfolio values
└── Environment Variables
    ├── NEXT_PUBLIC_SUPABASE_URL
    ├── NEXT_PUBLIC_SUPABASE_ANON_KEY
    ├── SUPABASE_SERVICE_ROLE_KEY (server-only)
    ├── OPENAI_API_KEY (server-only)
    ├── TWELVE_DATA_API_KEY (server-only)
    ├── FRED_API_KEY (server-only)
    ├── TELEGRAM_BOT_TOKEN (server-only)
    ├── RESEND_API_KEY (server-only)
    └── ENCRYPTION_SECRET (server-only, AES-256-GCM)

Supabase
├── Postgres — All application data
├── Auth — User management, OAuth, session tokens
├── RLS — Row-level security on every table
├── Edge Functions — Email notifications (Resend integration)
└── Realtime — Future: live price subscriptions (optional)
```

### Security Model

| Layer            | Measure                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication   | Supabase Auth with email/password + Google OAuth. Session cookies via `@supabase/ssr`.                                                   |
| Authorization    | RLS on every table. Users can only access their own data. Service role key used only in server-side cron jobs.                           |
| Input validation | Zod schemas validate all user input in `_actions.ts` before any database operation.                                                      |
| API keys         | User-provided API keys (e.g., Twelve Data) are encrypted at rest via AES-256-GCM in `user_api_keys` table using `ENCRYPTION_SECRET`.     |
| Environment      | All secret keys are server-only env vars — never prefixed with `NEXT_PUBLIC_`.                                                           |
| XSS/CSRF         | Next.js App Router handles CSRF via Server Actions. React's JSX escaping prevents XSS. AI output rendered as markdown with sanitization. |
| Rate limiting    | External API calls are rate-limited and cached. Alert evaluation cron has built-in deduplication.                                        |
| Account deletion | CASCADE delete across all user tables + Supabase Auth account removal.                                                                   |

---

## Appendix: Relationship to Other Docs

| Document                   | Purpose                                                          | Relationship to PDD                                                      |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **SPECS.md**               | Detailed epics, user stories, tasks, Gherkin acceptance criteria | PDD is the "what and why"; SPECS is the "what exactly and how to verify" |
| **CLAUDE.md**              | AI agent instructions — code style, conventions, commands        | PDD informs architecture; CLAUDE.md enforces it at the code level        |
| **README-ARCHITECTURE.md** | Route segment contract, naming rules, canonical example          | Technical details that implement PDD Section 7                           |
| **README-SPECS.md**        | Epic→route mapping, task→file mapping                            | Maps PDD features to code locations                                      |
| **README.md**              | Investing guide for Costa Rica developers                        | PDD Section 1 (user profile) is derived from this guide                  |
