# Cron Jobs — Architecture & Setup Guide

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Catalog of Existing Cron Jobs](#catalog-of-existing-cron-jobs)
  - [Database Table Operations](#database-table-operations)
  - [Migration Map](#migration-map)
  - [User Value Map](#user-value-map)
  - [External API Inventory](#external-api-inventory)
  - [Navigation Routes Data Dependencies](#navigation-routes-data-dependencies)
  - [Cache Architecture](#cache-architecture)
  - [Periodicity Reference](#periodicity-reference)
- [Local Development Setup](#local-development-setup)
- [Vercel Production Setup](#vercel-production-setup)

---

## Overview

The finance dashboard runs **6 cron jobs** as Next.js API Route Handlers under `app/api/cron/`. Each endpoint is a `GET` handler protected by a `Bearer` token (`CRON_SECRET`). All use `runtime = 'edge'` and `dynamic = 'force-dynamic'`.

Cron jobs serve three purposes:

1. **Cache warming** — pre-fetch market data so dashboard loads are instant.
2. **Background processing** — generate portfolio snapshots, AI summaries, and evaluate alert triggers.
3. **Garbage collection** — clean up stale cache entries, old notifications, and expired data.

All cron routes use `createAdminClient()` from `lib/supabase/admin.ts` (service role key, bypasses RLS) for database operations.

```
app/api/cron/
├── market-prefetch/route.ts      # Cache warming — VOO, QQQ, BTC, Fear & Greed
├── portfolio-snapshot/route.ts   # Daily portfolio value snapshots
├── alert-evaluation/route.ts     # Evaluate price/indicator alerts, dispatch notifications
├── dca-reminders/route.ts        # Check DCA schedules, create reminder notifications
├── ai-summary/route.ts           # Generate AI market summaries per user
└── cache-cleanup/route.ts        # Garbage-collect stale data
```

---

## Environment Variables

| Variable                    | Required | Used By                         | Notes                                               |
| --------------------------- | -------- | ------------------------------- | --------------------------------------------------- |
| `CRON_SECRET`               | **Yes**  | All `app/api/cron/*/route.ts`   | Bearer token — guards every cron endpoint           |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes**  | `lib/supabase/admin.ts`         | Bypasses RLS — used by all cron DB operations       |
| `NEXT_PUBLIC_SUPABASE_URL`  | **Yes**  | `lib/supabase/admin.ts`         | Supabase project URL                                |
| `TWELVE_DATA_API_KEY`       | **Yes**  | `lib/market/stocks.ts`          | VOO/QQQ prices, history, DXY                        |
| `FRED_API_KEY`              | **Yes**  | `lib/market/macro.ts`           | Fed Funds, 10Y Treasury, Unemployment, CPI          |
| `COINGECKO_API_KEY`         | No       | `lib/market/crypto.ts`          | Bitcoin price, market data (free tier works)        |
| `OPENAI_API_KEY`            | No\*     | `lib/ai/provider.ts`            | Required if users have OpenAI as AI provider        |
| `OLLAMA_BASE_URL`           | No       | `lib/ai/provider.ts`            | For local Ollama models (default `localhost:11434`) |
| `TELEGRAM_BOT_TOKEN`        | No       | `lib/notifications/telegram.ts` | Alert dispatch to Telegram                          |
| `RESEND_API_KEY`            | No       | `lib/notifications/email.ts`    | Alert dispatch via email                            |

---

## Catalog of Existing Cron Jobs

### 1. `market-prefetch`

**Route**: `app/api/cron/market-prefetch/route.ts`
**Purpose**: Warm the market data cache so dashboard page loads hit cache instead of external APIs.

Calls four fetch functions via `Promise.allSettled`:

| Function                 | External API   | Cache Key                    | TTL    |
| ------------------------ | -------------- | ---------------------------- | ------ |
| `fetchPrice('VOO')`      | Twelve Data    | `stock:price:VOO`            | 5 min  |
| `fetchPrice('QQQ')`      | Twelve Data    | `stock:price:QQQ`            | 5 min  |
| `fetchBitcoinPrice()`    | CoinGecko      | `crypto:bitcoin:price`       | 5 min  |
| `fetchCryptoFearGreed()` | Alternative.me | `sentiment:crypto:feargreed` | 1 hour |

**Tables**: None directly — writes go to `market_cache` via `getCached()` in each fetch function.
**Response**: `{ prefetched, total, summary }`.

---

### 2. `portfolio-snapshot`

**Route**: `app/api/cron/portfolio-snapshot/route.ts`
**Purpose**: Record a daily snapshot of each user's portfolio value and position breakdown.

**Flow**:

1. Load all `positions` → group by `portfolio_id`.
2. Collect unique ETF symbols and crypto IDs.
3. Fetch live prices in parallel (`fetchPrice`, `fetchBitcoinPrice`, `fetchCoinsMarkets`).
4. Calculate `total_value` per portfolio.
5. Upsert into `portfolio_snapshots` (unique on `portfolio_id, snapshot_date`).

**Tables read**: `positions`.
**Tables written**: `portfolio_snapshots` (upsert).
**External APIs**: Twelve Data (ETFs), CoinGecko (crypto).
**Response**: `{ processed, snapshots, date }`.

---

### 3. `alert-evaluation`

**Route**: `app/api/cron/alert-evaluation/route.ts`
**Purpose**: Evaluate all active alerts against current market data. Trigger notifications and dispatch to external channels.

**Alert types evaluated**:

| Type                                         | Data needed                       | Evaluator function       |
| -------------------------------------------- | --------------------------------- | ------------------------ |
| Price (`above`/`below`)                      | Current price                     | `evaluatePriceAlert()`   |
| RSI (`rsi_above`/`rsi_below`)                | Historical closes                 | `evaluateRsiAlert()`     |
| MA cross (`ma_cross_above`/`ma_cross_below`) | Historical closes + current price | `evaluateMaCrossAlert()` |
| MVRV (`mvrv_above`/`mvrv_below`)             | MVRV Z-Score                      | `evaluateMvrvAlert()`    |

**Flow**:

1. Fetch active alerts where `last_triggered_at IS NULL`.
2. Group by symbol → batch-fetch prices and histories.
3. Run evaluators for each alert type.
4. Update triggered alerts (`status = 'triggered'`, `is_active = false`).
5. Insert `notifications` rows.
6. Dispatch to external channels (email, Telegram) via `dispatchNotification()`.

**Tables read**: `alerts`, `profiles` (for notification preferences).
**Tables written**: `alerts` (update status), `notifications` (insert).
**External APIs**: Twelve Data (prices/history), CoinGecko (BTC price/history), Blockchain.com (MVRV).
**Response**: `{ processed, triggered, symbols }`.

---

### 4. `dca-reminders`

**Route**: `app/api/cron/dca-reminders/route.ts`
**Purpose**: Check active DCA schedules and create reminder notifications for schedules due today.

**Flow**:

1. Fetch all active DCA schedules from `dca_schedules`.
2. For each schedule, call `isScheduleDue(schedule, now)` from `app/dashboard/dca/_utils.ts`.
3. Build `notifications` rows with type `dca_reminder`.
4. Batch-insert into `notifications`.

**Tables read**: `dca_schedules` (where `is_active = true`).
**Tables written**: `notifications`.
**External APIs**: None.
**Response**: `{ processed, reminders }`.

---

### 5. `ai-summary`

**Route**: `app/api/cron/ai-summary/route.ts`
**Purpose**: Generate a daily AI market summary for each user using their preferred AI provider/model.

**Flow**:

1. Fetch all `profiles` with `ai_provider` and `ai_model`.
2. Gather market context: VOO, QQQ, BTC prices + Fear & Greed + FRED indicators (Fed Funds, 10Y Treasury, Unemployment, DXY, Inflation).
3. For each user, skip if summary already exists for today.
4. Call `generateMarketSummary(provider, model, context)`.
5. Insert into `ai_summaries`.

**Tables read**: `profiles`, `ai_summaries` (check existing).
**Tables written**: `ai_summaries`.
**External APIs**: Twelve Data, CoinGecko, Alternative.me, FRED + the user's AI provider (OpenAI or Ollama).
**Response**: `{ processed, generated }`.

---

### 6. `cache-cleanup`

**Route**: `app/api/cron/cache-cleanup/route.ts`
**Purpose**: Garbage-collect stale data to keep the database lean.

**Retention policies**:

| Table                | Condition                                    | Retention |
| -------------------- | -------------------------------------------- | --------- |
| `market_cache`       | `updated_at < 7 days ago`                    | 7 days    |
| `api_request_counts` | `request_date < 30 days ago`                 | 30 days   |
| `notifications`      | `read = true` AND `created_at < 30 days ago` | 30 days   |
| `ai_summaries`       | `created_at < 90 days ago`                   | 90 days   |

**Tables written**: Deletes from `market_cache`, `api_request_counts`, `notifications`, `ai_summaries`.
**External APIs**: None.
**Response**: `{ cleaned, total, summary, cutoffs }`.

---

### Database Table Operations

Summary of every table that cron jobs read from or write to:

| Table                 | Read by                              | Written by                                                             | Operation                |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------- | ------------------------ |
| `market_cache`        | `market-prefetch` (via `getCached`)  | `market-prefetch` (upsert), `cache-cleanup` (delete)                   | Upsert / Delete          |
| `api_request_counts`  | `market-prefetch` (rate limit check) | `market-prefetch` (increment), `cache-cleanup` (delete)                | Upsert / Delete          |
| `positions`           | `portfolio-snapshot`                 | —                                                                      | Select                   |
| `portfolio_snapshots` | —                                    | `portfolio-snapshot` (upsert)                                          | Upsert                   |
| `alerts`              | `alert-evaluation`                   | `alert-evaluation` (update status)                                     | Select / Update          |
| `notifications`       | —                                    | `alert-evaluation`, `dca-reminders` (insert), `cache-cleanup` (delete) | Insert / Delete          |
| `dca_schedules`       | `dca-reminders`                      | —                                                                      | Select                   |
| `profiles`            | `ai-summary`, `alert-evaluation`     | —                                                                      | Select                   |
| `ai_summaries`        | `ai-summary` (check existing)        | `ai-summary` (insert), `cache-cleanup` (delete)                        | Select / Insert / Delete |

---

### Migration Map

Which migration file creates each cron-related table:

| Table                 | Migration file                                 |
| --------------------- | ---------------------------------------------- |
| `profiles`            | `20260320000000_initial_schema.sql`            |
| `portfolios`          | `20260320000000_initial_schema.sql`            |
| `positions`           | `20260320000000_initial_schema.sql`            |
| `dca_schedules`       | `20260320000000_initial_schema.sql`            |
| `alerts`              | `20260320000000_initial_schema.sql`            |
| `market_cache`        | `20260321000000_market_cache.sql`              |
| `api_request_counts`  | `20260321000000_market_cache.sql`              |
| `portfolio_snapshots` | `20260322000000_portfolio_snapshots.sql`       |
| `notifications`       | `20260322100000_dca_schedule_day_columns.sql`  |
| `ai_summaries`        | `20260323000000_ai_provider_and_summaries.sql` |

---

### User Value Map

What each cron job ultimately provides to end users:

| Cron Job             | User-Facing Value                                                    |
| -------------------- | -------------------------------------------------------------------- |
| `market-prefetch`    | Instant dashboard loads — no waiting for external API calls          |
| `portfolio-snapshot` | Historical portfolio charts, day-over-day performance tracking, TWRR |
| `alert-evaluation`   | Real-time price/indicator alerts with multi-channel delivery         |
| `dca-reminders`      | Timely DCA buy reminders based on user-defined schedules             |
| `ai-summary`         | Personalized daily AI market briefings on the Insights page          |
| `cache-cleanup`      | Keeps database lean; prevents stale data from accumulating           |

---

### External API Inventory

All external APIs called by cron jobs:

| Provider           | Base URL                                | Used By                                                                   | Auth                                  | Rate Limit              |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | ----------------------- |
| **Twelve Data**    | `https://api.twelvedata.com`            | `market-prefetch`, `portfolio-snapshot`, `alert-evaluation`, `ai-summary` | `TWELVE_DATA_API_KEY` query param     | 800 req/day (free tier) |
| **CoinGecko**      | `https://api.coingecko.com/api/v3`      | `market-prefetch`, `portfolio-snapshot`, `alert-evaluation`, `ai-summary` | `COINGECKO_API_KEY` header (optional) | 30 req/min (free)       |
| **Alternative.me** | `https://api.alternative.me/fng`        | `market-prefetch`, `ai-summary`                                           | None                                  | No documented limit     |
| **FRED**           | `https://api.stlouisfed.org/fred`       | `ai-summary`                                                              | `FRED_API_KEY` query param            | 120 req/min             |
| **Blockchain.com** | `https://api.blockchain.info`           | `alert-evaluation` (MVRV)                                                 | None                                  | Undocumented            |
| **OpenAI**         | `https://api.openai.com/v1`             | `ai-summary`                                                              | `OPENAI_API_KEY`                      | Per-plan limits         |
| **Ollama**         | `http://localhost:11434` (configurable) | `ai-summary`                                                              | None (local)                          | N/A                     |

---

### Navigation Routes Data Dependencies

Which dashboard routes depend on cron-populated data:

| Dashboard Route        | Tables Read (cron-populated)                           | Cron Dependencies                                                       |
| ---------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `/dashboard`           | `portfolio_snapshots`, `ai_summaries`, `notifications` | `portfolio-snapshot`, `ai-summary`, `alert-evaluation`, `dca-reminders` |
| `/dashboard/market`    | `market_cache` (via fetch functions)                   | `market-prefetch`, `cache-cleanup`                                      |
| `/dashboard/portfolio` | `portfolio_snapshots`, `market_cache`                  | `portfolio-snapshot`, `market-prefetch`, `cache-cleanup`                |
| `/dashboard/alerts`    | `alerts`                                               | `alert-evaluation`                                                      |
| `/dashboard/dca`       | `notifications`                                        | `dca-reminders`                                                         |
| `/dashboard/insights`  | `ai_summaries`                                         | `ai-summary`, `cache-cleanup`                                           |
| `/dashboard/analytics` | `portfolio_snapshots`, `market_cache`                  | `portfolio-snapshot`, `market-prefetch`, `cache-cleanup`                |
| `/dashboard/bitcoin`   | —                                                      | — (fetches live from mempool.space)                                     |
| `/dashboard/settings`  | —                                                      | — (user config only)                                                    |

---

### Cache Architecture

The caching system has two tiers, both managed in `lib/market/cache.ts`:

```
┌─────────────────────────────────────────────────┐
│                  Request Flow                    │
│                                                  │
│  1. In-Memory Cache (per-process, Map)           │
│     └─ hit? → return immediately                 │
│                                                  │
│  2. Supabase `market_cache` table (persistent)   │
│     └─ hit? → populate in-memory, return         │
│                                                  │
│  3. External API (Twelve Data, CoinGecko, etc.)  │
│     └─ fetch → store in both caches → return     │
└─────────────────────────────────────────────────┘
```

**TTL constants** (from `CacheTTL` in `lib/market/cache.ts`):

| Key              | TTL       | Used For                    |
| ---------------- | --------- | --------------------------- |
| `REALTIME_PRICE` | 5 minutes | Stock prices, Bitcoin price |
| `DAILY_HISTORY`  | 24 hours  | Historical OHLCV data       |
| `SENTIMENT`      | 1 hour    | Fear & Greed Index          |
| `MACRO`          | 24 hours  | FRED macro indicators       |

**`market_cache` table schema**:

| Column        | Type          | Description                            |
| ------------- | ------------- | -------------------------------------- |
| `key`         | `text` (PK)   | Cache key (e.g., `stock:price:VOO`)    |
| `data`        | `jsonb`       | Cached response payload                |
| `fetched_at`  | `timestamptz` | When the data was fetched              |
| `ttl_seconds` | `int`         | TTL in seconds (used for expiry check) |

**Rate limiting**: API request counts are tracked in `api_request_counts` (keyed by `provider` + `date_key`). The Twelve Data free tier threshold is 750 requests/day — once hit, `fetchPrice()` falls back to stale cache data via `getStaleFromSupabaseCache()`.

---

### Periodicity Reference

| Cron Job             | Schedule      | UTC Time    | Costa Rica Time | Rationale                                        |
| -------------------- | ------------- | ----------- | --------------- | ------------------------------------------------ |
| `market-prefetch`    | `*/5 * * * *` | Every 5 min | Every 5 min     | Keep cache warm for real-time dashboard loads    |
| `alert-evaluation`   | `*/5 * * * *` | Every 5 min | Every 5 min     | Near-real-time alert triggering                  |
| `portfolio-snapshot` | `0 2 * * *`   | 02:00 UTC   | 8:00 PM CST     | After US market close (4 PM ET = 10 PM UTC)      |
| `dca-reminders`      | `0 12 * * *`  | 12:00 UTC   | 6:00 AM CST     | Morning reminder before market opens             |
| `ai-summary`         | `0 13 * * *`  | 13:00 UTC   | 7:00 AM CST     | Morning briefing ready when user opens dashboard |
| `cache-cleanup`      | `0 3 * * *`   | 03:00 UTC   | 9:00 PM CST     | Nightly cleanup during low-traffic window        |

---

## Local Development Setup

Cron jobs are not automatically scheduled locally. Trigger them manually via `curl`:

```bash
# Set the secret (must match .env.local)
export CRON_SECRET=local-dev-cron-secret

# Market pre-fetch
curl -s http://localhost:3000/api/cron/market-prefetch \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# Portfolio snapshot
curl -s http://localhost:3000/api/cron/portfolio-snapshot \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# Alert evaluation
curl -s http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# DCA reminders
curl -s http://localhost:3000/api/cron/dca-reminders \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# AI summary generation
curl -s http://localhost:3000/api/cron/ai-summary \
  -H "Authorization: Bearer $CRON_SECRET" | jq

# Cache cleanup
curl -s http://localhost:3000/api/cron/cache-cleanup \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

**Prerequisites**:

- `npm run dev` running on port 3000
- `supabase start` running (local Postgres + Auth)
- `.env.local` configured with all required API keys (see [Environment Variables](#environment-variables))
- For `ai-summary`: either `OPENAI_API_KEY` set or Ollama running locally (`ollama serve`)

**Tip**: To automate local cron runs during development, use a `watch` command or a simple shell loop:

```bash
# Run market-prefetch every 5 minutes
while true; do
  curl -s http://localhost:3000/api/cron/market-prefetch \
    -H "Authorization: Bearer $CRON_SECRET" | jq '.summary'
  sleep 300
done
```

---

## Vercel Production Setup

On Vercel, cron jobs are configured via the `vercel.json` file in the project root. Since this project does not currently have a `vercel.json`, you need to create one:

```json
{
  "crons": [
    {
      "path": "/api/cron/market-prefetch",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/alert-evaluation",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/portfolio-snapshot",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/dca-reminders",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/cron/ai-summary",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/cron/cache-cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Environment Variables** — set in Vercel Dashboard → Settings → Environment Variables:

1. `CRON_SECRET` — generate a strong random token (`openssl rand -hex 32`).
2. `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings.
3. All market API keys: `TWELVE_DATA_API_KEY`, `FRED_API_KEY`, `COINGECKO_API_KEY`.
4. AI keys: `OPENAI_API_KEY` (if using OpenAI).
5. Notification keys: `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY` (if using those channels).

**Vercel Cron Limits** (Hobby plan):

- Maximum **2 cron jobs** on Hobby; **unlimited** on Pro.
- Minimum interval: **1 hour** on Hobby; **1 minute** on Pro.
- Vercel injects the `CRON_SECRET` automatically as `Authorization: Bearer <secret>` header.
- Cron requests have a **10-second timeout** on Hobby; **300 seconds** on Pro.

> **Note**: The 5-minute schedules (`market-prefetch`, `alert-evaluation`) require a Vercel **Pro** plan. On Hobby, consolidate into fewer jobs or increase intervals to hourly.

**Monitoring**: Vercel logs all cron executions in the **Functions** tab. Each cron response includes a JSON summary (`processed`, `triggered`, `prefetched`, etc.) for easy debugging.
