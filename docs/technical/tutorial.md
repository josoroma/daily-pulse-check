# Finance Dashboard — User Tutorial

> A complete guide to using every feature of your personal finance dashboard. Covers navigation, portfolio management, market data, DCA automation, alerts, AI insights, Bitcoin analytics, reporting, and settings.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Navigation](#navigation)
- [1. Dashboard Overview](#1-dashboard-overview)
- [2. Portfolio Tracker](#2-portfolio-tracker)
- [3. Market Data](#3-market-data)
- [4. Bitcoin On-Chain Analytics](#4-bitcoin-on-chain-analytics)
- [5. DCA Automation](#5-dca-automation)
- [6. Alerts & Notifications](#6-alerts--notifications)
- [7. AI Insights](#7-ai-insights)
- [8. Analytics & Reporting](#8-analytics--reporting)
- [9. Settings](#9-settings)
- [External APIs Reference](#external-apis-reference)
- [Cron Jobs Reference](#cron-jobs-reference)
- [Database Tables Reference](#database-tables-reference)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)

---

## Getting Started

### 1. Sign Up or Log In

Visit the app and navigate to `/auth/signup` to create an account, or `/auth/login` to sign in. Authentication is handled by **Supabase Auth** and supports:

- **Email/password** — create an account with any email
- **Google OAuth** — sign in with your Google account (requires Google Cloud OAuth credentials in production)

On first login, a profile is automatically created for you via a database trigger. You'll see an **onboarding modal** prompting you to set your:

| Setting        | Options                                       | Default |
| -------------- | --------------------------------------------- | ------- |
| Display name   | Free text (max 100 characters)                | —       |
| Base currency  | USD or CRC (Costa Rican colón)                | USD     |
| Country        | Any (used for AI context and tax notes)       | CR      |
| Risk tolerance | Conservative, Medium, Medium-High, Aggressive | Medium  |

Complete this to get personalized AI analysis and currency formatting across the dashboard.

### 2. Navigate to the Dashboard

After login, you're redirected to `/dashboard`. The sidebar on the left gives you access to every feature.

---

## Navigation

The sidebar contains these sections:

| Page      | URL                        | What it does                                            |
| --------- | -------------------------- | ------------------------------------------------------- |
| Dashboard | `/dashboard`               | Overview with market snapshot and quick stats           |
| Portfolio | `/dashboard/portfolio`     | Manage positions, transactions, allocation, and P&L     |
| Markets   | `/dashboard/market`        | Live prices, charts, sentiment, and macro indicators    |
| Bitcoin   | `/dashboard/bitcoin`       | On-chain metrics, halving countdown, valuation models   |
| DCA       | `/dashboard/dca`           | Dollar-cost averaging schedules and performance         |
| Alerts    | `/dashboard/alerts`        | Price and technical indicator alerts                    |
| Insights  | `/dashboard/insights`      | AI-powered market summary, portfolio analysis, learning |
| Analytics | `/dashboard/analytics`     | Performance metrics, reports, tax export                |
| Tax       | `/dashboard/analytics/tax` | FIFO realized gains calculator and CSV export           |
| Settings  | `/dashboard/settings`      | Profile, appearance, AI model, API keys, notifications  |
| Data      | `/dashboard/settings/data` | Export, CSV import, password change, account deletion   |

A **notification bell** in the top-right header shows unread DCA reminders and alert notifications.

---

## 1. Dashboard Overview

The main dashboard page (`/dashboard`) gives you a quick summary:

- **Market snapshot** — current prices for VOO, QQQ, and Bitcoin
- **Portfolio value** — your total portfolio value with 24h change
- **Fear & Greed Index** — current crypto market sentiment
- **Quick actions** — links to add positions, create alerts, or check insights

---

## 2. Portfolio Tracker

**URL**: `/dashboard/portfolio`

### What You Can Do

#### Add Positions

1. Click **Add Position**
2. Select asset type: **ETF** (VOO, QQQ) or **Crypto** (BTC)
3. Enter quantity, average buy price, and optional notes
4. Submit — the position is saved and live P&L starts calculating

#### Log Transactions

1. Click the **Log Transaction** button on any position
2. Choose transaction type: **Buy**, **Sell**, or **DCA**
3. Enter quantity, price, and optional fee
4. Transactions automatically update the position's quantity and average cost basis

#### View Allocation

Switch to the **Allocation** tab to see:

- **Donut chart** — visual breakdown of portfolio by asset
- **Target allocation form** — set target percentages per asset (must sum to 100%)
- **Drift indicator** — bar chart comparing actual vs. target allocation
- **Rebalancing suggestions** — exact units to buy/sell to restore desired allocation

#### Track Performance

Switch to the **Performance** tab:

- **Area chart** showing portfolio value over time
- **Time range selector**: 1W, 1M, 3M, 6M, 1Y, ALL
- Performance data comes from daily snapshots stored in the `portfolio_snapshots` table

#### Summary Cards

At the top of the page:

| Card           | Description                                   |
| -------------- | --------------------------------------------- |
| Total Value    | Sum of all positions at current market prices |
| 24h Change     | Dollar and percentage change in the last day  |
| Unrealized P&L | Total gain/loss vs. cost basis                |
| Cost Basis     | Total amount invested                         |

**Live prices** are fetched from Twelve Data (VOO, QQQ) and CoinGecko (BTC) on every page load.

---

## 3. Market Data

**URL**: `/dashboard/market`

### Stocks & ETFs

- **VOO** (S&P 500 ETF) and **QQQ** (Nasdaq 100 ETF) live prices
- 30-day historical price charts with daily candles
- Data source: **Twelve Data API**
- Rate limit: 800 requests/day (free tier). When approaching the limit (750+), the app switches to cached data and shows an amber "Using cached data" badge

### Bitcoin

- Current price, market cap, 24h volume, 24h percentage change
- 90-day price history chart
- Data source: **CoinGecko API**

### USD/CRC Exchange Rate

- Derived from CoinGecko by dividing Bitcoin's CRC price by its USD price
- Used to display values in Costa Rican colones when your base currency is set to CRC

### Fear & Greed Index

- Current sentiment score (0–100) with classification:

| Value  | Classification | Meaning                      |
| ------ | -------------- | ---------------------------- |
| 0–20   | Extreme Fear   | Potential buying opportunity |
| 21–40  | Fear           | Market is cautious           |
| 41–60  | Neutral        | No strong signal             |
| 61–80  | Greed          | Market is bullish            |
| 81–100 | Extreme Greed  | Potential sell signal        |

- 30-day history chart
- Data source: **Alternative.me**

### Macro Indicators

| Indicator          | Source      | Description                   |
| ------------------ | ----------- | ----------------------------- |
| Fed Funds Rate     | FRED        | Federal Reserve interest rate |
| 10-Year Treasury   | FRED        | US Treasury bond yield        |
| Unemployment Rate  | FRED        | US unemployment percentage    |
| DXY (Dollar Index) | Twelve Data | US Dollar strength index      |
| Inflation Rate     | FRED        | Consumer price index change   |

---

## 4. Bitcoin On-Chain Analytics

### Network Health

**URL**: `/dashboard/bitcoin`

| Section           | What You See                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Live Metrics      | Block height, hashrate (EH/s) with 30-day sparkline, mempool size with fee tiers, difficulty |
| Halving Countdown | Blocks until next halving, estimated date, current/next block reward, progress bar           |
| Supply Metrics    | Total BTC mined, % of 21M cap, daily issuance, estimated year of last Bitcoin                |
| Halving Timeline  | Historical table of all halvings with block height, date, reward, and BTC price              |

**Auto-refresh**: On-chain data auto-polls every 60 seconds via the `/api/market/bitcoin/onchain` endpoint, using the Mempool.space API.

### Valuation Models

**URL**: `/dashboard/bitcoin/valuation`

| Model               | What It Shows                                                | Signal                                             |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| MVRV Z-Score        | Color-coded gauge — market cap vs. realized cap              | Green = undervalued, Red = bubble territory        |
| Stock-to-Flow (S2F) | Dual-line chart — actual BTC price vs. S2F model prediction  | Price below model = undervalued                    |
| Rainbow Price Band  | 9 stacked colored bands from "Fire Sale" to "Maximum Bubble" | Shows which historical band current price falls in |

All three models use the same 365-day BTC price history to minimize API calls.

---

## 5. DCA Automation

**URL**: `/dashboard/dca`

### Create a DCA Schedule

1. Click **Create Schedule**
2. Choose a symbol: **VOO**, **QQQ**, or **BTC**
3. Set the dollar amount per execution (e.g., $100)
4. Pick a frequency:

| Frequency | When It Runs                       |
| --------- | ---------------------------------- |
| Daily     | Every day                          |
| Weekly    | A specific day of the week         |
| Biweekly  | Every other week on a specific day |
| Monthly   | A specific day of the month (1–31) |

5. Save — the schedule is stored and the cron job will generate reminders

### How Reminders Work

A **daily cron job** (`/api/cron/dca-reminders`) runs once per day and:

1. Checks all active DCA schedules
2. Determines if today is a scheduled execution day
3. Creates an in-app notification for each due schedule
4. Notifications appear in the **bell icon** dropdown in the header

### DCA Performance Analytics

Switch to the DCA **Analytics** tab to see:

- **Summary cards**: Total invested, current value, average cost basis
- **Cost basis trend chart**: How your average purchase price has evolved
- **DCA vs. Lump Sum comparison**: Shows what your returns would have been if you had invested the total amount on day one vs. spreading it over time

---

## 6. Alerts & Notifications

**URL**: `/dashboard/alerts`

### Create an Alert

Click **Create Alert** and configure:

#### Price Alerts

| Condition | Description             | Example       |
| --------- | ----------------------- | ------------- |
| Above     | Triggers when price > X | VOO > $500    |
| Below     | Triggers when price < X | BTC < $50,000 |

#### Technical Indicator Alerts

| Condition      | Description                        | Parameters                |
| -------------- | ---------------------------------- | ------------------------- |
| RSI Above      | RSI exceeds threshold              | Period (default 14)       |
| RSI Below      | RSI drops below threshold          | Period (default 14)       |
| MA Cross Above | Price crosses above moving average | Period, Type (SMA or EMA) |
| MA Cross Below | Price crosses below moving average | Period, Type (SMA or EMA) |
| MVRV Above     | MVRV Z-Score exceeds value         | Bitcoin only              |
| MVRV Below     | MVRV Z-Score drops below value     | Bitcoin only              |

**Supported symbols**: VOO, QQQ, BTC (MVRV is Bitcoin-only).

### How Alert Evaluation Works

A **cron job** runs every **5 minutes** (`/api/cron/alert-evaluation`):

1. Fetches all active alerts from the database
2. Groups them by symbol to minimize API calls
3. Fetches current prices and calculates indicators (RSI, MA, MVRV)
4. Evaluates each alert condition against live data
5. When triggered:
   - Updates alert status to `triggered`
   - Creates an in-app notification
   - Dispatches to enabled channels (email via Resend, Telegram via Bot API)

### Notification Channels

| Channel  | Setup Required                                            |
| -------- | --------------------------------------------------------- |
| In-app   | Always enabled — notifications appear in the bell icon    |
| Email    | Enable in Settings > Notifications + configure Resend     |
| Telegram | Enable in Settings > Notifications + set Telegram Chat ID |

### Managing Alerts

- **Pause/Resume** — toggle an alert without deleting it
- **Delete** — permanently remove an alert
- Triggered alerts remain visible for review

---

## 7. AI Insights

**URL**: `/dashboard/insights`

Three tabs powered by AI models:

### Market Summary

- Generates a daily market briefing covering VOO, QQQ, Bitcoin, sentiment, and macro indicators
- Fetches live data and sends it as context to your configured AI model
- Results are cached (one summary per user per day in `ai_summaries` table)
- Click **Refresh** to regenerate with fresh data

### Portfolio Analysis

- Interactive chat that analyzes your actual portfolio
- Auto-sends an initial analysis request on first visit
- Receives your positions, allocation, P&L, risk tolerance, and country
- Ask follow-up questions like:
  - _"Should I increase my Bitcoin allocation?"_
  - _"What happens if the Fed raises rates?"_

### Learn

- Educational finance chatbot
- Ask about investing concepts: _"What is DCA?"_, _"How do ETFs work?"_, _"Explain Bitcoin halving"_
- Only financial topics accepted — non-financial questions get a polite redirect
- Context-aware: knows your country and base currency

### AI Model Options

Configure in **Settings > AI Model**:

| Provider | Models       | Pros                 | Cons              |
| -------- | ------------ | -------------------- | ----------------- |
| OpenAI   | GPT-4.1 Mini | High quality, fast   | Costs money       |
| Ollama   | qwen3.5:9b   | Free, private, local | Requires hardware |

Reasoning models (o4-mini, qwen3.5:9b) show their thinking process in a collapsible panel.

### Cron: Daily AI Summary

A cron job (`/api/cron/ai-summary`) generates a market summary daily for users who have opted in. It gathers the same live market data and writes the generated summary to `ai_summaries`.

---

## 8. Analytics & Reporting

**URL**: `/dashboard/analytics`

### Performance Metrics

| Metric                      | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| Total Return                | Current value vs. cost basis (dollar and percentage) |
| Time-Weighted Return (TWRR) | True investment performance excluding cash flows     |
| Per-Asset Breakdown         | Individual performance for each symbol               |
| Benchmark Comparison        | Your portfolio return vs. VOO (S&P 500) return       |

### Monthly / Yearly Reports

- **Period selector** to choose month or year
- **DCA adherence score** — percentage of scheduled DCA purchases you actually executed
- **PDF export** — download a formatted PDF report via jsPDF

### Tax-Relevant Export (Costa Rica)

- **FIFO realized gains calculator** — calculates gains using First-In, First-Out method
- **CSV export** — download transactions and realized gains as CSV
- **Country-specific tax notes** — displays relevant information based on your profile country (e.g., Costa Rica's territorial tax system)

---

## 9. Settings

**URL**: `/dashboard/settings`

### Profile Tab

Update your display name, base currency (USD/CRC), country, and risk tolerance. These values are used across the entire dashboard for currency formatting, AI analysis context, and DCA suggestions.

### Appearance Tab

Switch between **Light**, **Dark**, and **System** themes. Defaults to dark mode. Synced with the header theme toggle.

### AI Model Tab

Choose your AI provider and model:

- **OpenAI** — cloud-based, requires an OpenAI API key
- **Ollama** — local models, requires Ollama running on your machine (`http://localhost:11434`)

A **Test Connection** button lets you verify the model responds correctly.

### API Keys Tab

Securely store your own API keys for external services. Keys are encrypted before storage.

| Service     | Purpose                     | Free Tier?                           |
| ----------- | --------------------------- | ------------------------------------ |
| Twelve Data | Stock/ETF prices (VOO, QQQ) | 800 requests/day                     |
| CoinGecko   | Bitcoin price and history   | Yes (optional key for higher limits) |
| FRED        | Macro economic indicators   | Free with registration               |
| OpenAI      | AI insights and analysis    | Paid (pay-per-use)                   |

### Notifications Tab

- Enable/disable **email notifications** (requires Resend API setup)
- Enable/disable **Telegram notifications** and set your **Telegram Chat ID**

### Data & Account

**URL**: `/dashboard/settings/data`

- Export or manage your data
- Account deletion options

---

## External APIs Reference

All external API integrations and what they provide:

| API            | Base URL                           | Auth Method                         | What It Provides                                      |
| -------------- | ---------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| Twelve Data    | `https://api.twelvedata.com`       | `TWELVE_DATA_API_KEY` query param   | VOO/QQQ prices, DXY, historical OHLCV data            |
| CoinGecko      | `https://api.coingecko.com/api/v3` | Optional `x-cg-demo-api-key` header | Bitcoin price, market cap, history, CRC exchange rate |
| Alternative.me | `https://api.alternative.me/fng`   | None (public)                       | Crypto Fear & Greed Index (current + 30-day history)  |
| FRED           | `https://api.stlouisfed.org/fred`  | `FRED_API_KEY` query param          | Fed Funds Rate, 10Y Treasury, Unemployment, Inflation |
| Mempool.space  | `https://mempool.space/api`        | None (public)                       | Block height, hashrate, mempool, difficulty           |
| OpenAI         | `https://api.openai.com/v1`        | `OPENAI_API_KEY` Bearer token       | AI text generation, reasoning                         |
| Ollama         | `http://localhost:11434` (local)   | None                                | Local AI text generation                              |
| Resend         | `https://api.resend.com`           | API key                             | Email notification delivery                           |
| Telegram Bot   | `https://api.telegram.org`         | `TELEGRAM_BOT_TOKEN`                | Telegram message delivery                             |

### Rate Limits to Be Aware Of

| API         | Limit            | How It's Handled                                                        |
| ----------- | ---------------- | ----------------------------------------------------------------------- |
| Twelve Data | 800 requests/day | Tracked in `api_request_counts` table. At 750+, switches to cached data |
| CoinGecko   | ~30 requests/min | Uses `market_cache` table for response caching                          |
| FRED        | 120 requests/min | Light usage, rarely hits limits                                         |

---

## Cron Jobs Reference

Automated background jobs run on Vercel Cron (or can be triggered manually with the `CRON_SECRET` header):

| Cron Job         | Route                            | Frequency   | What It Does                                                                 |
| ---------------- | -------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| Alert Evaluation | `GET /api/cron/alert-evaluation` | Every 5 min | Evaluates all active alerts against live market data, triggers notifications |
| DCA Reminders    | `GET /api/cron/dca-reminders`    | Once daily  | Checks active DCA schedules, creates in-app reminders for due purchases      |
| AI Summary       | `GET /api/cron/ai-summary`       | Once daily  | Generates market summary for opted-in users and caches in `ai_summaries`     |

All cron endpoints are protected by the `CRON_SECRET` environment variable and require `Authorization: Bearer <CRON_SECRET>` to execute.

---

## Database Tables Reference

All tables use **Row Level Security (RLS)** — users can only access their own data.

### Core Tables

| Table           | Purpose                                       | Key Columns                                                                                                                                                                |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`      | User profile and preferences                  | `display_name`, `base_currency`, `country`, `risk_tolerance`, `ai_provider`, `ai_model`, `notification_email_enabled`, `notification_telegram_enabled`, `telegram_chat_id` |
| `portfolios`    | Container for investment positions            | `name`, `description`, `target_allocations` (JSONB)                                                                                                                        |
| `positions`     | Individual asset holdings within a portfolio  | `symbol`, `asset_type`, `quantity`, `average_buy_price`, `notes`                                                                                                           |
| `transactions`  | Buy/sell/DCA transaction log                  | `type`, `quantity`, `price`, `fee`, `executed_at`, `notes`                                                                                                                 |
| `dca_schedules` | Dollar-cost averaging automation schedules    | `symbol`, `amount`, `frequency`, `day_of_week`, `day_of_month`, `is_active`                                                                                                |
| `alerts`        | Price and indicator alert rules               | `symbol`, `condition`, `threshold`, `status`, `parameters` (JSONB), `notification_channels`                                                                                |
| `notifications` | In-app notifications (DCA reminders + alerts) | `type`, `title`, `body`, `read`, `related_id`                                                                                                                              |

### Supporting Tables

| Table                 | Purpose                                    | Key Columns                                                |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `portfolio_snapshots` | Daily portfolio value snapshots for charts | `snapshot_date`, `total_value`, `positions_data` (JSONB)   |
| `ai_summaries`        | Cached AI-generated market summaries       | `summary_date`, `content`, `model_used` (one per user/day) |
| `user_api_keys`       | Encrypted user-provided API keys           | `service`, `encrypted_key`, `is_valid`, `last_verified_at` |
| `market_cache`        | Cached API responses (system-wide)         | `key`, `data` (JSONB), `fetched_at`, `ttl_seconds`         |
| `api_request_counts`  | Rate limit tracking for Twelve Data        | `provider`, `date_key`, `request_count`                    |

### Auto-Created Data

- **Profile**: automatically created when you sign up (via database trigger `handle_new_user`)
- **Portfolio**: automatically created on first visit to `/dashboard/portfolio` (via `getOrCreatePortfolio()` server action)
- **Timestamps**: `updated_at` columns are auto-updated via database triggers

---

## Environment Variables

Required variables in `.env.local`:

| Variable                        | Required | Description                                      |
| ------------------------------- | -------- | ------------------------------------------------ | --- | ------------------- | --- | -------------------------------------------------- | --- | ---------------- | --- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase API URL                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Service role key for admin operations            |
| `TWELVE_DATA_API_KEY`           | Yes      | Twelve Data API key for stocks/ETFs              |
| `FRED_API_KEY`                  | Yes      | FRED API key for macro indicators                |
| `OPENAI_API_KEY`                | No       | OpenAI API key (only if using OpenAI)            |
| `COINGECKO_API_KEY`             | No       | CoinGecko API key (optional, for higher limits)  |
| `CRON_SECRET`                   | Yes      | Secret for authenticating cron job requests      |
| `TELEGRAM_BOT_TOKEN`            | No       | Telegram bot token (for Telegram alerts)         |
| `TELEGRAM_CHAT_ID`              | No       | Telegram chat ID (for Telegram alerts)           |
| `OLLAMA_BASE_URL`               | No       | Ollama URL, defaults to `http://localhost:11434` | \n  | `ENCRYPTION_SECRET` | Yes | 32-byte hex key for AES-256-GCM API key encryption | \n  | `RESEND_API_KEY` | No  | Resend API key (for email notifications) |

---

## Running Locally

### Prerequisites

- Node.js 18+
- Supabase CLI (`brew install supabase/tap/supabase`)
- (Optional) Ollama for local AI models

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase
supabase start

# 3. Apply database migrations
supabase db push

# 4. Generate TypeScript types from database
supabase gen types typescript --local > lib/supabase/database.types.ts

# 5. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 6. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Useful Commands

| Command                                                                  | Description              |
| ------------------------------------------------------------------------ | ------------------------ |
| `npm run dev`                                                            | Start development server |
| `npm run build`                                                          | Production build         |
| `npm run lint`                                                           | Run ESLint               |
| `npm test`                                                               | Run all Vitest tests     |
| `supabase start`                                                         | Start local Supabase     |
| `supabase stop`                                                          | Stop local Supabase      |
| `supabase db push`                                                       | Apply pending migrations |
| `supabase gen types typescript --local > lib/supabase/database.types.ts` | Regenerate DB types      |

---

## Tips for Getting the Most Out of the App

1. **Set your profile first** — currency, country, and risk tolerance affect AI analysis, formatting, and tax notes across the entire app.

2. **Use DCA schedules** — automate your investment reminders instead of trying to time the market. The app tracks adherence and shows how DCA compares to lump-sum investing.

3. **Set target allocations** — define your ideal portfolio split (e.g., 50% VOO, 30% QQQ, 20% BTC) and use the drift indicator to know when to rebalance.

4. **Create alerts for key levels** — set RSI alerts at 30 (oversold) and 70 (overbought) for your assets. Set MVRV alerts at 0 (Bitcoin undervalued) and 7 (bubble territory).

5. **Check the Bitcoin valuation page** — the MVRV Z-Score, Stock-to-Flow, and Rainbow charts help you assess whether Bitcoin is cheap or expensive relative to historical cycles.

6. **Use Ollama for privacy** — if you don't want your financial data sent to OpenAI, install Ollama locally and select it in Settings. All AI processing stays on your machine.

7. **Export for tax season** — use Analytics > Tax Export to generate FIFO realized gains and download CSV files for your accountant.

8. **Keep API keys fresh** — use Settings > API Keys to store your own keys. The app validates them and shows status so you know if one has expired.
