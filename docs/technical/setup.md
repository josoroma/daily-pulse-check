# Local Development Setup Guide

> Last updated: 2026-04-04

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Clone & Install](#1-clone--install)
  - [2. Supabase (Local Database & Auth)](#2-supabase-local-database--auth)
  - [3. Environment Variables](#3-environment-variables)
  - [4. External API Keys](#4-external-api-keys)
  - [5. AI / LLM Configuration](#5-ai--llm-configuration)
  - [6. Start the Dev Server](#6-start-the-dev-server)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [AI Models](#ai-models)
- [External APIs Reference](#external-apis-reference)
- [API Routes](#api-routes)
- [Development Commands](#development-commands)
- [Project Configuration Files](#project-configuration-files)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Prerequisites

| Tool                  | Version                                     | Install                                                                                          |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Node.js**           | ≥ 18.18 (Next.js 16 + React 19 requirement) | `brew install node` or [nvm](https://github.com/nvm-sh/nvm)                                      |
| **npm**               | ≥ 9                                         | Ships with Node.js                                                                               |
| **Supabase CLI**      | ≥ 2.x                                       | `brew install supabase/tap/supabase`                                                             |
| **Docker**            | Latest                                      | Required by `supabase start` — [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Ollama** (optional) | Latest                                      | `brew install ollama` or [ollama.com](https://ollama.com/)                                       |
| **Git**               | Latest                                      | `brew install git`                                                                               |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase (requires Docker running)
supabase start

# 3. Create .env.local (copy output from supabase start)
cat > .env.local << 'EOF'
# Supabase (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>

# Security
ENCRYPTION_SECRET=change-me-to-a-32-char-secret-k
CRON_SECRET=local-dev-cron-secret

# Market Data APIs (get free keys — see "External API Keys" section)
TWELVE_DATA_API_KEY=your-key-here
FRED_API_KEY=your-key-here
BCCR_SDDE_TOKEN=your-token-here

# AI (choose one or both)
OPENAI_API_KEY=sk-your-key-here
OLLAMA_BASE_URL=http://localhost:11434
EOF

# 4. Apply database migrations
supabase db push

# 5. Start dev server
npm run dev

# 6. Open http://localhost:3000 → sign up → /dashboard
```

---

## Step-by-Step Setup

### 1. Clone & Install

```bash
git clone <repo-url> finance
cd finance
npm install
```

**What gets installed (27 runtime + 13 dev dependencies):**

| Category      | Packages                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Framework** | `next` 16.2.1, `react` 19.2.4, `react-dom` 19.2.4                                                                |
| **Styling**   | `tailwindcss` ^4, `@tailwindcss/postcss`, `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **UI**        | `shadcn` ^4.1.0, `@base-ui/react`, `lucide-react`, `next-themes`, `sonner`, `recharts` ^3.8.0                    |
| **State**     | `jotai` ^2.18.1                                                                                                  |
| **Forms**     | `react-hook-form` ^7.71.2, `@hookform/resolvers` ^5.2.2, `zod` ^4.3.6                                            |
| **Database**  | `@supabase/supabase-js` ^2.99.3, `@supabase/ssr` ^0.9.0                                                          |
| **AI**        | `ai` ^6.0.134, `@ai-sdk/openai` ^3.0.47, `@ai-sdk/openai-compatible` ^2.0.37, `@ai-sdk/react` ^3.0.139           |
| **Dates**     | `date-fns` ^4.1.0, `@date-fns/tz` ^1.4.1                                                                         |
| **PDF**       | `jspdf` ^4.2.1, `jspdf-autotable` ^5.0.7                                                                         |
| **Dev**       | `typescript` ^5, `vitest` ^4.1.0, `eslint`, `prettier`, `husky`, `lint-staged`, `@commitlint/cli`                |

**Git hooks** are set up automatically via `husky` (the `prepare` script runs on install):

- **Pre-commit**: `lint-staged` runs ESLint + Prettier on staged files
- **Commit-msg**: `commitlint` enforces `type(scope): description` format with allowed scopes: `setup`, `auth`, `portfolio`, `market`, `dca`, `alerts`, `insights`, `bitcoin`, `analytics`, `settings`

---

### 2. Supabase (Local Database & Auth)

Supabase provides **Postgres 17 + Auth + REST API + Realtime + Studio** in a local Docker environment.

#### Start Supabase

```bash
# Ensure Docker Desktop is running first
supabase start
```

This spins up ~7 Docker containers. On first run it pulls images (~2 GB). Output includes:

```
         API URL: http://127.0.0.1:54331
     GraphQL URL: http://127.0.0.1:54331/graphql/v1
  S3 Storage URL: http://127.0.0.1:54331/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54332/postgres
      Studio URL: http://127.0.0.1:54333
    Inbucket URL: http://127.0.0.1:54334
      JWT secret: super-secret-jwt-token-...
        anon key: eyJhbGci...
service_role key: eyJhbGci...
   S3 Access Key: ...
   S3 Secret Key: ...
```

Save the **API URL**, **anon key**, and **service_role key** — they go in `.env.local`.

#### Local Ports

| Service       | Port  | Purpose                                 |
| ------------- | ----- | --------------------------------------- |
| **API**       | 54331 | Supabase REST + Auth API                |
| **Postgres**  | 54332 | Direct DB access (`psql`)               |
| **Studio**    | 54333 | Web UI for tables, SQL editor, auth     |
| **Inbucket**  | 54334 | Fake email inbox (captures auth emails) |
| **Analytics** | 54337 | Logflare analytics                      |
| **Shadow DB** | 54330 | Migration diffing                       |

#### Apply Migrations

```bash
supabase db push
```

This runs all 8 migration files in order:

| #   | Migration                                         | Creates                                                                                           |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `20260320000000_initial_schema.sql`               | `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts` + RLS + triggers |
| 2   | `20260321000000_market_cache.sql`                 | `market_cache`, `api_request_counts`                                                              |
| 3   | `20260321100000_restrict_cache_rls.sql`           | Tightened RLS on cache tables                                                                     |
| 4   | `20260322000000_portfolio_snapshots.sql`          | `portfolio_snapshots`                                                                             |
| 5   | `20260322100000_dca_schedule_day_columns.sql`     | Day-of-week/month columns on `dca_schedules`                                                      |
| 6   | `20260323000000_ai_provider_and_summaries.sql`    | `ai_summaries` table, `ai_provider`/`ai_model` columns on `profiles`                              |
| 7   | `20260325000000_alerts_status_and_indicators.sql` | Alert status enum, indicator types (RSI, MA, MVRV)                                                |
| 8   | `20260326000000_user_api_keys.sql`                | `user_api_keys` (encrypted storage)                                                               |

#### Studio (Database UI)

Open [http://127.0.0.1:54333](http://127.0.0.1:54333) to browse tables, run SQL, manage auth users, and inspect RLS policies.

#### Inbucket (Email Testing)

Open [http://127.0.0.1:54334](http://127.0.0.1:54334) to view sign-up confirmation emails and password reset emails captured locally. Email confirmations are **disabled by default** in local dev (see `supabase/config.toml`).

#### Useful Supabase Commands

```bash
supabase start          # Start all services
supabase stop           # Stop all services (preserves data)
supabase stop --no-backup  # Stop and wipe all data
supabase db reset       # Drop + re-run all migrations + seed
supabase db push        # Apply pending migrations
supabase status         # Show running services and keys

# Regenerate TypeScript types from local schema
supabase gen types typescript --local > lib/supabase/database.types.ts

# Connect directly via psql
psql postgresql://postgres:postgres@127.0.0.1:54332/postgres

# Create a new migration
supabase migration new <name>
```

---

### 3. Environment Variables

Create `.env.local` in the project root (Git-ignored by default):

```bash
# ─── Supabase ──────────────────────────────────────────────
# From `supabase start` output
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# ─── Security ──────────────────────────────────────────────
# AES-256-GCM encryption for user API keys. Minimum 32 characters.
ENCRYPTION_SECRET=change-me-to-a-real-secret-at-least-32-chars

# Bearer token for cron job authentication
CRON_SECRET=local-dev-cron-secret

# ─── Market Data APIs ─────────────────────────────────────
# Twelve Data — stocks/ETFs (VOO, QQQ, DXY)
TWELVE_DATA_API_KEY=your-twelve-data-key

# FRED — US macro indicators (Fed Funds, 10Y Treasury, CPI, Unemployment)
FRED_API_KEY=your-fred-key

# BCCR — Costa Rica central bank (exchange rates, TPM, TBP)
BCCR_SDDE_TOKEN=your-bccr-token

# CoinGecko — crypto prices (optional — free tier works without key)
COINGECKO_API_KEY=

# ─── AI Providers ─────────────────────────────────────────
# OpenAI (optional — for gpt-4.1-mini)
OPENAI_API_KEY=sk-your-openai-key

# Ollama (optional — defaults to http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434

# ─── Notifications (optional) ─────────────────────────────
# Telegram alerts
TELEGRAM_BOT_TOKEN=
# Email alerts via Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=alerts@yourdomain.com

# ─── App URLs ─────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Variable Reference

| Variable                        | Required | Used By                         | Notes                                            |
| ------------------------------- | -------- | ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Yes**  | All Supabase clients            | From `supabase start`                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes**  | Browser + server clients        | From `supabase start`                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Yes**  | Admin client (cron jobs)        | Bypasses RLS — never expose to client            |
| `ENCRYPTION_SECRET`             | **Yes**  | `lib/encryption.ts`             | AES-256-GCM key derivation; min 32 chars         |
| `CRON_SECRET`                   | **Yes**  | `app/api/cron/*/route.ts`       | Bearer token for cron endpoints                  |
| `TWELVE_DATA_API_KEY`           | **Yes**  | `lib/market/stocks.ts`          | Stock prices, history, DXY                       |
| `FRED_API_KEY`                  | **Yes**  | `lib/market/macro.ts`           | US macro economic data                           |
| `BCCR_SDDE_TOKEN`               | **Yes**  | `lib/market/bccr.ts`            | Costa Rica exchange rates                        |
| `COINGECKO_API_KEY`             | No       | `lib/market/crypto.ts`          | Free tier works without it                       |
| `OPENAI_API_KEY`                | No\*     | `lib/ai/provider.ts`            | Required if using OpenAI models                  |
| `OLLAMA_BASE_URL`               | No       | `lib/ai/provider.ts`            | Defaults to `http://localhost:11434`             |
| `TELEGRAM_BOT_TOKEN`            | No       | `lib/notifications/telegram.ts` | Only for Telegram alert delivery                 |
| `RESEND_API_KEY`                | No       | `lib/notifications/email.ts`    | Only for email alert delivery                    |
| `RESEND_FROM_EMAIL`             | No       | `lib/notifications/email.ts`    | Defaults to `alerts@finance.local`               |
| `NEXT_PUBLIC_SITE_URL`          | No       | `app/auth/_actions.ts`          | OAuth redirect; defaults `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL`           | No       | `lib/notifications/email.ts`    | Links in notification emails                     |

\* At least one AI provider (OpenAI or Ollama) is needed for AI Insights features to work.

---

### 4. External API Keys

All API keys are **free tier** and sufficient for development.

#### Twelve Data (Stock & ETF prices)

1. Go to [twelvedata.com](https://twelvedata.com/) → Sign up
2. Dashboard → API Keys → copy your key
3. **Free tier**: 800 API credits/day, 8 requests/minute
4. **Used for**: VOO, QQQ, DXY prices and history
5. The app tracks usage in `api_request_counts` table and falls back to stale cache near the 750 req/day threshold

#### FRED (Federal Reserve Economic Data)

1. Go to [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html) → Request API Key
2. Verify email, copy key
3. **Free tier**: 120 requests/minute (very generous)
4. **Used for**: Fed Funds Rate (`FEDFUNDS`), 10-Year Treasury (`DGS10`), CPI (`CPIAUCSL`), Unemployment (`UNRATE`)

#### BCCR SDDE (Costa Rica Central Bank)

1. Go to [gee.bccr.fi.cr/indicadoreseconomicos/](https://gee.bccr.fi.cr/indicadoreseconomicos/) → Register
2. Request API access for SDDE
3. **Used for**: USD/CRC exchange rates (buy/sell), TPM (monetary policy rate), TBP (basic passive rate)
4. **Indicators**: `317` (buy), `318` (sell), `3541` (TPM), `423` (TBP)

#### CoinGecko (Crypto prices) — Optional

1. Go to [coingecko.com/en/api](https://www.coingecko.com/en/api) → Get free Demo API key
2. **Free tier**: 10,000 calls/month
3. **Works without key** — the app sends the key as `x-cg-demo-key` header only if set
4. **Used for**: Bitcoin price, history, market cap, sparklines, batch coin data

#### OpenAI — Optional

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create key
2. **Used for**: `gpt-4.1-mini` model (AI market summaries, portfolio analysis, learning chat)
3. **Not needed** if using Ollama locally

#### Resend (Email notifications) — Optional

1. Go to [resend.com](https://resend.com/) → Sign up → API Keys
2. Verify a sender domain or use the sandbox
3. **Free tier**: 100 emails/day
4. **Used for**: Alert notification emails

#### Telegram Bot — Optional

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot`
2. Copy the bot token
3. To get your chat ID: message your bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. **Used for**: Alert notifications via Telegram

#### Public APIs (No Key Required)

These APIs are used without authentication:

| API                | URL                              | Data                                                |
| ------------------ | -------------------------------- | --------------------------------------------------- |
| **Alternative.me** | `https://api.alternative.me/fng` | Crypto Fear & Greed Index                           |
| **Mempool.space**  | `https://mempool.space/api`      | Bitcoin block height, hashrate, mempool, difficulty |
| **Blockchain.com** | `https://api.blockchain.info`    | Full BTC price history (for S2F, Rainbow, MVRV)     |

---

### 5. AI / LLM Configuration

The app supports two AI providers. You need **at least one** for AI Insights to work.

#### Option A: Ollama (Local, Free)

```bash
# Install Ollama
brew install ollama

# Start the Ollama server
ollama serve

# Pull the default model (4.9 GB download)
ollama pull qwen3.5:9b

# Verify it's running
curl http://localhost:11434/api/tags
```

**Details:**

- **Model**: `qwen3.5:9b` — a reasoning model that uses `<think>...</think>` chain-of-thought
- **Base URL**: `http://localhost:11434` (default, no env var needed)
- **Protocol**: OpenAI-compatible API (`/v1/chat/completions`)
- **Custom fetch**: The app strips `max_tokens` and injects `think: true` for reasoning models (see `lib/ai/provider.ts`)
- **VRAM**: Needs ~6 GB for `qwen3.5:9b` (runs on most GPUs, or CPU with ~16 GB RAM)

#### Option B: OpenAI (Cloud, Paid)

```bash
# Add to .env.local
OPENAI_API_KEY=sk-your-key-here
```

**Details:**

- **Model**: `gpt-4.1-mini`
- **Cost**: ~$0.40 / 1M input tokens, ~$1.60 / 1M output tokens
- **No local resources needed**

#### Per-User Model Selection

Each user can choose their AI provider and model in **Settings → AI Model**:

- Setting is stored in `profiles.ai_provider` and `profiles.ai_model` columns
- Defaults: `openai` / `gpt-4.1-mini`
- The Settings page has a diagnostics panel to test connectivity to both providers

#### Model Registry

Defined in `lib/ai/provider.ts`:

```
OPENAI_MODELS = ['gpt-4.1-mini']
OLLAMA_MODELS = ['qwen3.5:9b']
REASONING_MODELS = Set(['qwen3.5:9b'])
```

#### AI Features

| Feature                     | Route / Endpoint       | Trigger                                    |
| --------------------------- | ---------------------- | ------------------------------------------ |
| **Market Summary**          | `/api/ai/summary`      | Cached daily (cron) + on-demand regenerate |
| **Portfolio Analysis**      | `/api/ai/portfolio`    | On-demand (streams on page mount)          |
| **Learning Chat**           | `/api/ai/learn`        | User-initiated Q&A                         |
| **Health Check**            | `/api/ai/health`       | Provider connectivity diagnostics          |
| **Daily AI Summary** (cron) | `/api/cron/ai-summary` | Scheduled daily                            |

All AI responses stream via NDJSON (`lib/ai/stream.ts`) with `{ type: 'reasoning' | 'text' | 'error', text }` events.

---

### 6. Start the Dev Server

```bash
npm run dev
```

The app starts with **Turbopack** (`next dev --turbopack`) at [http://localhost:3000](http://localhost:3000).

#### First Use

1. Navigate to [http://localhost:3000](http://localhost:3000) → redirects to `/auth/login`
2. Click **Sign up** → create an account with email/password
3. In local dev, **email confirmation is disabled** — you can sign in immediately
4. After sign-in: redirected to `/dashboard`
5. A `profiles` row is auto-created via a database trigger (`handle_new_user`)
6. Go to **Portfolio** → add positions (VOO, QQQ, BTC)
7. Market data loads on first visit (cached for subsequent requests)

#### Auth Flow

| Method             | How It Works                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Email/Password** | `supabase.auth.signUp()` / `signInWithPassword()`                                                             |
| **Google OAuth**   | `supabase.auth.signInWithOAuth({ provider: 'google' })` — configured but **disabled by default** in local dev |
| **Callback**       | `/auth/callback` exchanges OAuth code for session                                                             |
| **Middleware**     | `proxy.ts` refreshes session + protects `/dashboard/*` routes                                                 |

#### Inbucket for Auth Emails

If email confirmation is enabled, view emails at [http://127.0.0.1:54334](http://127.0.0.1:54334).

---

## Database Schema

### Entity Relationship

```
auth.users (Supabase Auth)
    │
    ├─── profiles (1:1)
    │        ├── display_name, base_currency, country, risk_tolerance
    │        ├── ai_provider, ai_model
    │        └── notification preferences
    │
    ├─── portfolios (1:N)
    │        ├── name, description, target_allocations (JSONB)
    │        │
    │        ├─── positions (1:N)
    │        │        ├── asset_type (ETF|Crypto), symbol, quantity, average_buy_price
    │        │        │
    │        │        └─── transactions (1:N)
    │        │                 └── type (Buy|Sell|DCA), quantity, price, fee, executed_at
    │        │
    │        ├─── portfolio_snapshots (1:N)
    │        │        └── snapshot_date, total_value, positions_data (JSONB)
    │        │
    │        └─── dca_schedules (1:N)
    │                 └── symbol, amount, frequency, day_of_week/month, is_active
    │
    ├─── alerts (1:N)
    │        └── symbol, condition, threshold, indicator_type, status, notification_channels
    │
    ├─── ai_summaries (1:N, unique per day)
    │        └── summary_date, content, model_used
    │
    ├─── user_api_keys (1:N, unique per service)
    │        └── service, encrypted_key, is_valid
    │
    └─── notifications (1:N)
             └── title, body, type, channels, read status

market_cache (shared, no user_id)
    └── key (PK), data (JSONB), fetched_at, ttl_seconds

api_request_counts (shared)
    └── provider, date_key, request_count
```

### RLS (Row-Level Security)

**Every table** has RLS enabled. Users can only read/write their own data via `auth.uid() = user_id` policies. The `market_cache` and `api_request_counts` tables are shared (accessible to all authenticated users).

Cron jobs use `createAdminClient()` (service role key) which **bypasses RLS** for cross-user operations like generating AI summaries for all users.

---

## AI Models

### Supported Models

| Provider   | Model          | Type      | Size   | Notes                                                 |
| ---------- | -------------- | --------- | ------ | ----------------------------------------------------- |
| **Ollama** | `qwen3.5:9b`   | Reasoning | 4.9 GB | Local, free. Uses `<think>` tags for chain-of-thought |
| **OpenAI** | `gpt-4.1-mini` | Standard  | Cloud  | Paid. Fast, cost-effective                            |

### Adding New Models

1. Add the model name to the appropriate array in `lib/ai/provider.ts`:
   ```ts
   export const OLLAMA_MODELS = ['qwen3.5:9b', 'your-new-model'] as const
   ```
2. If it's a reasoning model, add to `REASONING_MODELS`:
   ```ts
   export const REASONING_MODELS = new Set(['qwen3.5:9b', 'your-new-model'])
   ```
3. Update the schema validation in `app/dashboard/settings/_schema.ts`
4. The Settings UI dropdown auto-populates from these arrays

### AI Streaming Architecture

```
Client → POST /api/ai/summary
           │
           ├── Gather market context (all APIs)
           ├── getLanguageModel(provider, model)
           ├── streamText({ model, prompt })
           ├── createAiNdjsonStream(fullStream)
           │     ├── reasoning-delta → { type: 'reasoning', text }
           │     ├── <think>...</think> → { type: 'reasoning', text }
           │     └── text-delta → { type: 'text', text }
           └── ndjsonResponse(stream)
```

---

## External APIs Reference

### Data Flow: API → Cache → Component

```
External API
    │
    ├── lib/market/stocks.ts ──── getCached('stock:price:VOO', 5min, fetcher)
    ├── lib/market/crypto.ts ──── getCached('crypto:bitcoin:price', 5min, fetcher)
    ├── lib/market/sentiment.ts ── getCached('sentiment:*', 1hr, fetcher)
    ├── lib/market/macro.ts ───── getCached('macro:*', 24hr, fetcher)
    ├── lib/market/bccr.ts ────── getCached('bccr:*', 24hr, fetcher)
    ├── lib/bitcoin/onchain.ts ── getCached('bitcoin:*', 5min, fetcher)
    └── lib/bitcoin/valuation.ts ─ getCached('bitcoin:mvrv|s2f|rainbow', 24hr, fetcher)
           │
           ▼
    Two-Tier Cache
    ├── Memory Map (in-process, instant)
    └── Supabase market_cache table (shared, ~50ms)
           │
           ▼
    Dashboard Components (cards, charts, gauges, tables)
```

### API Endpoints by Provider

| Provider           | Endpoint                            | Used For                          | Cache TTL |
| ------------------ | ----------------------------------- | --------------------------------- | --------- |
| **Twelve Data**    | `/price?symbol=VOO`                 | Live stock price                  | 5 min     |
| **Twelve Data**    | `/time_series?symbol=VOO`           | Price history (OHLCV)             | 24 hr     |
| **CoinGecko**      | `/coins/markets`                    | BTC price, market cap             | 5 min     |
| **CoinGecko**      | `/coins/bitcoin/market_chart`       | BTC price history                 | 24 hr     |
| **CoinGecko**      | `/coins/{id}/history`               | Historical cost basis             | 24 hr     |
| **CoinGecko**      | `/coins/markets` (batch)            | Multiple coins + sparklines       | 5 min     |
| **Alternative.me** | `/fng`                              | Fear & Greed index                | 1 hr      |
| **Alternative.me** | `/fng?limit=N`                      | Fear & Greed history              | 1 hr      |
| **FRED**           | `/fred/series/observations`         | Fed Funds, 10Y, CPI, Unemployment | 24 hr     |
| **BCCR**           | `/Indicador/ObtenerValor`           | USD/CRC rates, TPM, TBP           | 24 hr     |
| **Mempool.space**  | `/blocks/tip/height`                | Bitcoin block height              | 5 min     |
| **Mempool.space**  | `/v1/mining/hashrate/1m`            | 30-day hashrate                   | 24 hr     |
| **Mempool.space**  | `/mempool` + `/v1/fees/recommended` | Mempool stats + fee rates         | 5 min     |
| **Mempool.space**  | `/v1/difficulty-adjustment`         | Difficulty adjustment             | 5 min     |
| **Blockchain.com** | `/charts/market-price?timespan=all` | Full BTC price history            | 24 hr     |

---

## API Routes

The app exposes **18 API route handlers** across four categories:

### AI Routes (`/api/ai/`)

| Route               | Method | Purpose                            |
| ------------------- | ------ | ---------------------------------- |
| `/api/ai/health`    | GET    | AI provider connectivity check     |
| `/api/ai/summary`   | POST   | Stream market summary (NDJSON)     |
| `/api/ai/portfolio` | POST   | Stream portfolio analysis (NDJSON) |
| `/api/ai/learn`     | POST   | Stream learning chat response      |
| `/api/ai/test`      | POST   | AI model test endpoint             |

### Cron Routes (`/api/cron/`)

All cron routes use `GET`, require `Authorization: Bearer $CRON_SECRET`, and use `createAdminClient()` (service role, bypasses RLS). See [cronjobs.md](cronjobs.md) for architecture details.

| Route                          | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `/api/cron/market-prefetch`    | Cache warming — VOO, QQQ, BTC, Fear & Greed |
| `/api/cron/portfolio-snapshot` | Daily portfolio value snapshots             |
| `/api/cron/alert-evaluation`   | Evaluate price/indicator alerts, dispatch   |
| `/api/cron/dca-reminders`      | Check DCA schedules, create notifications   |
| `/api/cron/ai-summary`         | Generate AI market summaries per user       |
| `/api/cron/cache-cleanup`      | Garbage-collect stale cache entries         |

### Market Routes (`/api/market/`)

| Route                           | Method | Purpose                                   |
| ------------------------------- | ------ | ----------------------------------------- |
| `/api/market/price/[symbol]`    | GET    | Live stock/ETF price (Twelve Data)        |
| `/api/market/history/[symbol]`  | GET    | Price history OHLCV (Twelve Data)         |
| `/api/market/crypto/[coinId]`   | GET    | Crypto price + market cap                 |
| `/api/market/sentiment`         | GET    | Fear & Greed index                        |
| `/api/market/macro/[seriesId]`  | GET    | FRED macro indicators                     |
| `/api/market/bccr`              | GET    | Costa Rica central bank rates             |
| `/api/market/exchange-rate`     | GET    | USD/CRC exchange rate                     |
| `/api/market/bitcoin/onchain`   | GET    | On-chain metrics (Mempool)                |
| `/api/market/bitcoin/valuation` | GET    | BTC valuation models (S2F, Rainbow, MVRV) |

### Database Routes (`/api/db/`)

| Route          | Method | Purpose                    |
| -------------- | ------ | -------------------------- |
| `/api/db/test` | GET    | Database connectivity test |

### Dashboard Subroutes

Some dashboard routes have nested subroutes:

| Route                          | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `/dashboard/analytics/tax`     | Tax report generation and export              |
| `/dashboard/bitcoin/valuation` | Bitcoin valuation models (S2F, Rainbow, MVRV) |
| `/dashboard/settings/data`     | Data management (import/export)               |

---

## Development Commands

### Daily Workflow

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint check
npm test                 # Run all Vitest tests
npm run test:watch       # Vitest watch mode
npm run format           # Prettier format all files
npm run format:check     # Prettier check (CI)
```

### Supabase

```bash
supabase start           # Start local Supabase
supabase stop            # Stop (preserves data)
supabase stop --no-backup  # Stop + wipe data
supabase db reset        # Drop all + re-run migrations
supabase db push         # Apply pending migrations
supabase status          # Show services + keys
supabase migration new <name>  # Create new migration

# Regenerate TypeScript types
supabase gen types typescript --local > lib/supabase/database.types.ts
```

### Ollama

```bash
ollama serve             # Start Ollama server
ollama pull qwen3.5:9b   # Download model
ollama list              # Show installed models
ollama run qwen3.5:9b    # Interactive test
```

### Testing Cron Jobs

There are **6 cron endpoints** (see [cronjobs.md](cronjobs.md) for full details):

```bash
# Manually trigger cron endpoints
curl -X POST http://localhost:3000/api/cron/market-prefetch \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/portfolio-snapshot \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/dca-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/ai-summary \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/cache-cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

### shadcn/ui Components

```bash
# Add a new component
npx shadcn@latest add <component-name>

# Examples
npx shadcn@latest add accordion
npx shadcn@latest add chart
```

---

## Project Configuration Files

| File                    | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `next.config.ts`        | Next.js config (currently empty)                                    |
| `tsconfig.json`         | TypeScript strict mode, `@/` path alias, `noUncheckedIndexedAccess` |
| `vitest.config.ts`      | Test runner: globals, `__tests__/` pattern, `@/` alias              |
| `eslint.config.mjs`     | Flat config: Next.js core-web-vitals + TypeScript + Prettier        |
| `postcss.config.mjs`    | Tailwind CSS v4 via `@tailwindcss/postcss`                          |
| `commitlint.config.mjs` | Conventional commits with scoped enum                               |
| `components.json`       | shadcn/ui config: `base-nova` style, RSC, Lucide icons              |
| `supabase/config.toml`  | Local Supabase: ports, auth, email, OAuth                           |
| `proxy.ts`              | Next.js middleware (session refresh + route protection)             |
| `app/globals.css`       | Tailwind imports + Luma dark theme (OKLCH colors)                   |

### TypeScript Strictness

The project uses maximum TypeScript strictness:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitAny": true
}
```

- No `any` types allowed
- No `@ts-ignore` or `as unknown as` casts
- Array/object index access returns `T | undefined`

### Tailwind CSS v4

Tailwind v4 uses CSS-native configuration instead of `tailwind.config.js`:

- Import: `@import 'tailwindcss'` in `globals.css`
- Theme: CSS custom properties with OKLCH color space
- Dark mode: `@custom-variant dark (&:is(.dark *))` (class-based)
- PostCSS: `@tailwindcss/postcss` plugin

### Theme: Luma

The app uses a custom dark theme called "Luma":

- **Backgrounds**: Deep blacks via `oklch(0.13)` → `oklch(0.18)` elevation
- **Borders**: Soft `oklch(1 0 0 / 7%)` instead of harsh lines
- **Radius**: `0.875rem` base for rounded geometry
- **Elevation**: Box shadows for depth, not border contrast

---

## Troubleshooting

### Docker / Supabase won't start

```bash
# Check Docker is running
docker info

# Clean up and restart
supabase stop --no-backup
docker system prune -f
supabase start
```

### "Missing environment variable" errors

Ensure `.env.local` exists in the project root (not in a subdirectory). Restart the dev server after changing env vars — Next.js only reads them at startup.

### Twelve Data rate limit (empty price data)

The app tracks requests in `api_request_counts`. When near the 750/day threshold, it returns stale cached data. Check current usage:

```sql
-- In Supabase Studio SQL editor (http://127.0.0.1:54333)
SELECT * FROM api_request_counts WHERE date_key = current_date;
```

To reset: `DELETE FROM api_request_counts;`

### Ollama connection refused

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# If not running
ollama serve

# Verify the model is pulled
ollama list
# Should show qwen3.5:9b

# If not pulled
ollama pull qwen3.5:9b
```

### AI responses empty (Ollama reasoning models)

The `qwen3.5:9b` model needs `think: true` in the request body. The app handles this automatically via the custom fetch in `lib/ai/provider.ts`. If you see empty responses:

1. Check the Settings page diagnostics panel
2. Verify the model is in `REASONING_MODELS` set
3. Test directly: `ollama run qwen3.5:9b "What is 2+2?"`

### Auth callback errors

- Verify `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local`
- In `supabase/config.toml`, redirect URLs include `localhost:3000/auth/callback`
- For Google OAuth: configure OAuth credentials in Supabase dashboard / config.toml

### Migrations fail

```bash
# Check migration status
supabase migration list

# Full reset (destructive — re-runs all migrations)
supabase db reset

# View migration SQL
cat supabase/migrations/20260320000000_initial_schema.sql
```

### Old cache causing stale data

```sql
-- Clear all cached market data
DELETE FROM market_cache;

-- Clear rate limit counters
DELETE FROM api_request_counts;
```

### Encryption errors for API keys

`ENCRYPTION_SECRET` must be at least **32 characters**. The app uses the first 32 chars as the AES-256-GCM key. If you change this value, previously encrypted API keys become unreadable — users will need to re-enter them.

---

## Related Documentation

### Technical Docs (`docs/technical/`)

| Document                       | Content                                                   |
| ------------------------------ | --------------------------------------------------------- |
| [cronjobs.md](cronjobs.md)     | Cron job architecture, database tables, cache, scheduling |
| [runtimeEnv.md](runtimeEnv.md) | Runtime environment variable patterns in Next.js          |
| [claude.md](claude.md)         | AI assistant project context and conventions              |

### Route Docs (`docs/routes/`)

Each dashboard route has a dedicated documentation file:

| Document                                         | Route                  |
| ------------------------------------------------ | ---------------------- |
| [alerts.md](../routes/alerts.md)                 | `/dashboard/alerts`    |
| [analytics.md](../routes/analytics.md)           | `/dashboard/analytics` |
| [authentication.md](../routes/authentication.md) | `/auth/*`              |
| [bitcoin.md](../routes/bitcoin.md)               | `/dashboard/bitcoin`   |
| [dashboard.md](../routes/dashboard.md)           | `/dashboard`           |
| [dca.md](../routes/dca.md)                       | `/dashboard/dca`       |
| [insights.md](../routes/insights.md)             | `/dashboard/insights`  |
| [market.md](../routes/market.md)                 | `/dashboard/market`    |
| [portfolio.md](../routes/portfolio.md)           | `/dashboard/portfolio` |
| [settings.md](../routes/settings.md)             | `/dashboard/settings`  |
