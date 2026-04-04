# Cron Jobs — Architecture & Setup Guide

> Last updated: 2026-04-03

## Table of Contents

- [Overview](#overview)
- [Existing Cron Jobs](#existing-cron-jobs)
- [Missing Cron Jobs (Should Exist)](#missing-cron-jobs-should-exist)
- [Database Table Operations](#database-table-operations)
- [Migration Map](#migration-map)
- [User Value Map](#user-value-map)
- [External API Inventory](#external-api-inventory)
- [Dashboard Data Dependencies](#dashboard-data-dependencies)
- [Cache Architecture](#cache-architecture)
- [Periodicity Reference](#periodicity-reference)
- [Local Setup](#local-setup)
- [Local Development Setup](#local-development-setup)
- [Vercel Production Setup](#vercel-production-setup)
- [Environment Variables](#environment-variables)

---

## Overview

The finance dashboard relies on **6 external APIs** and **1 AI provider** to populate cards, charts, gauges, and tables across 8 dashboard sections. A two-tier cache (in-memory + Supabase `market_cache`) prevents redundant API calls, but **cron jobs are essential** to keep cached data fresh — especially for rate-limited APIs like Twelve Data (750 req/day).

Currently, **3 cron routes exist** but **no scheduler is configured** (no `vercel.json`, no `pg_cron`). Additionally, **2 cron jobs are missing** that the dashboard implicitly depends on.

---

## Existing Cron Jobs

### 1. AI Daily Summary — `/api/cron/ai-summary`

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| **Route**    | `app/api/cron/ai-summary/route.ts`              |
| **Auth**     | `Authorization: Bearer $CRON_SECRET`            |
| **Schedule** | **Once daily** — 6:00 AM Costa Rica (12:00 UTC) |
| **Duration** | ~30–60s (AI generation per user)                |

**What it does:**

1. Fetches all market context in parallel:
   - `fetchPrice('VOO')`, `fetchPrice('QQQ')` → Twelve Data
   - `fetchBitcoinPrice()` → CoinGecko
   - `fetchCryptoFearGreed()` → Alternative.me
   - `fetchLatestIndicator('FEDFUNDS', 'DGS10', 'UNRATE')` → FRED
   - `fetchDXY()` → Twelve Data
   - `fetchInflationRate()` → FRED (CPIAUCSL)
2. For each user: generates a personalized AI market summary via `generateMarketSummary()`
3. Stores result in `ai_summaries` table (one per user per day)

**Database operations:**

| Operation    | Table                | Detail                                                                                   |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------- |
| **SELECT**   | `profiles`           | All users — reads `id`, `ai_provider`, `ai_model` to determine which LLM to use per user |
| **SELECT**   | `ai_summaries`       | Check if today's summary already exists for this user (dedup)                            |
| **INSERT**   | `ai_summaries`       | One row per user per day: `{ user_id, summary_date, content, model_used }`               |
| _(indirect)_ | `market_cache`       | Market fetch functions read/write cache via `getCached()`                                |
| _(indirect)_ | `api_request_counts` | Rate limit tracking incremented by Twelve Data calls                                     |

**Auth client:** `createAdminClient()` — service role key, bypasses RLS for cross-user iteration.

**Migration:** `20260323000000_ai_provider_and_summaries.sql` — creates `ai_summaries` table + adds `ai_provider`/`ai_model` columns to `profiles`.

**Feeds these components:**

| Component           | Route                 | Type                             |
| ------------------- | --------------------- | -------------------------------- |
| `DashboardSummary`  | `/dashboard`          | Card                             |
| `MarketSummaryCard` | `/dashboard/insights` | Card (with on-demand regenerate) |

---

### 2. Alert Evaluation — `/api/cron/alert-evaluation`

| Property     | Value                                    |
| ------------ | ---------------------------------------- |
| **Route**    | `app/api/cron/alert-evaluation/route.ts` |
| **Auth**     | `Authorization: Bearer $CRON_SECRET`     |
| **Schedule** | **Every 5 minutes**                      |
| **Duration** | ~5–15s depending on active alert count   |

**What it does:**

1. Loads all active alerts from `alerts` table
2. Fetches live prices per unique symbol:
   - `fetchPrice(symbol)` → Twelve Data (stocks/ETFs)
   - `fetchBitcoinPrice()` → CoinGecko (BTC)
3. For RSI/MA crossover alerts: fetches historical data
   - `fetchHistory(symbol)` → Twelve Data
   - `fetchBitcoinHistory()` → CoinGecko
4. For MVRV alerts: `fetchMvrvZScore()` → CoinGecko + Blockchain.com
5. Evaluates conditions, marks triggered alerts in DB
6. Dispatches notifications: `in_app` (always) + `email` (Resend) + `telegram` (Telegram Bot API)

**Database operations:**

| Operation    | Table                | Detail                                                                                                       |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **SELECT**   | `alerts`             | All rows where `status = 'active'` — loads alert definitions with thresholds                                 |
| **UPDATE**   | `alerts`             | Sets `status → 'triggered'`, `is_active → false`, `last_triggered_at → now()` for each triggered alert       |
| **INSERT**   | `notifications`      | Bulk insert one notification per triggered alert: `{ user_id, type: 'alert', title, body, related_id }`      |
| **SELECT**   | `profiles`           | Reads `notification_email_enabled`, `notification_telegram_enabled`, `telegram_chat_id` for dispatch routing |
| **SELECT**   | `auth.users`         | `supabase.auth.admin.listUsers()` — fetches email addresses for email notifications                          |
| _(indirect)_ | `market_cache`       | Price fetch functions may read/write cache                                                                   |
| _(indirect)_ | `api_request_counts` | Rate limit tracking                                                                                          |

**Auth client:** `createAdminClient()` — service role key, bypasses RLS.

**Migrations:**

- `20260320000000_initial_schema.sql` — creates `alerts` table (base columns)
- `20260325000000_alerts_status_and_indicators.sql` — adds `status` column, `parameters` JSONB, indicator types (RSI, MA, MVRV)

**Feeds these components:**

| Component            | Route                 | Type                   |
| -------------------- | --------------------- | ---------------------- |
| `AlertsTable`        | `/dashboard/alerts`   | Table (status updates) |
| `NotificationCenter` | `/dashboard` (layout) | Dropdown               |

---

### 3. DCA Reminders — `/api/cron/dca-reminders`

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| **Route**    | `app/api/cron/dca-reminders/route.ts`           |
| **Auth**     | `Authorization: Bearer $CRON_SECRET`            |
| **Schedule** | **Once daily** — 7:00 AM Costa Rica (13:00 UTC) |
| **Duration** | <5s                                             |

**What it does:**

1. Loads all active DCA schedules from `dca_schedules` table
2. Checks if today matches the schedule frequency (weekly/biweekly/monthly)
3. Creates reminder notifications in `notifications` table for schedules due today

**No external API calls.** Pure database read + write.

**Database operations:**

| Operation  | Table           | Detail                                                                                                     |
| ---------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| **SELECT** | `dca_schedules` | All rows where `is_active = true` — reads `frequency`, `day_of_week`, `day_of_month` to check if due today |
| **INSERT** | `notifications` | Bulk insert one reminder per due schedule: `{ user_id, type: 'dca_reminder', title, body, related_id }`    |

**Auth client:** `createAdminClient()` — service role key, bypasses RLS.

**Migrations:**

- `20260320000000_initial_schema.sql` — creates `dca_schedules` table (base columns)
- `20260322100000_dca_schedule_day_columns.sql` — adds `day_of_week`, `day_of_month` columns for precise scheduling

**Feeds these components:**

| Component            | Route                 | Type     |
| -------------------- | --------------------- | -------- |
| `NotificationCenter` | `/dashboard` (layout) | Dropdown |
| `SchedulesList`      | `/dashboard/dca`      | Table    |

---

## More Cron Jobs

### 4. Portfolio Snapshot — `app/api/cron/portfolio-snapshot/route.ts`

| Property     | Value                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| **Route**    | Does not exist yet                                                              |
| **Schedule** | **Once daily** — 8:00 PM Costa Rica (02:00 UTC next day), after US market close |
| **Priority** | **High** — 5 components depend on snapshot data                                 |

**What it should do:**

1. For each user: load positions from `positions` table
2. Fetch latest prices for each position's asset:
   - `fetchPrice(symbol)` → Twelve Data (stocks/ETFs)
   - `fetchBitcoinPrice()` → CoinGecko (BTC)
   - `fetchCoinsMarkets(coinIds)` → CoinGecko (other crypto)
3. Calculate total portfolio value
4. Insert a row into `portfolio_snapshots` table: `{ user_id, date, total_value }`

**Database operations (proposed):**

| Operation    | Table                 | Detail                                                                                                                                             |
| ------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SELECT**   | `portfolios`          | All user portfolios                                                                                                                                |
| **SELECT**   | `positions`           | All positions per portfolio — reads `symbol`, `asset_type`, `quantity`, `average_buy_price`                                                        |
| **UPSERT**   | `portfolio_snapshots` | One row per portfolio per day: `{ user_id, portfolio_id, snapshot_date, total_value, positions_data }` — unique on `(portfolio_id, snapshot_date)` |
| _(indirect)_ | `market_cache`        | Price fetches go through cache layer                                                                                                               |
| _(indirect)_ | `api_request_counts`  | Rate limit tracking                                                                                                                                |

**Auth client:** Should use `createAdminClient()` — service role key for cross-user iteration.

**Migration:** `20260322000000_portfolio_snapshots.sql` — **already exists**. Creates `portfolio_snapshots` table with `positions_data` JSONB, unique constraint on `(portfolio_id, snapshot_date)`, RLS policies, and indexes.

**Why this matters:** Without this cron, the `portfolio_snapshots` table stays empty. The 30-day performance chart on the dashboard home shows nothing. Analytics benchmark comparisons and monthly reports have no data. This is the **highest-priority missing cron** — it's the only way historical portfolio value is tracked.

**Would feed these components:**

| Component                           | Route                  | Type                          |
| ----------------------------------- | ---------------------- | ----------------------------- |
| `DashboardPerformance`              | `/dashboard`           | Area chart (30-day)           |
| `PerformanceChart`                  | `/dashboard/portfolio` | Area chart (filterable)       |
| `BenchmarkChart`                    | `/dashboard/analytics` | Area chart (portfolio vs VOO) |
| `PerformanceSummary`                | `/dashboard/analytics` | 4× metric cards               |
| `AnalyticsReports` / `ReportViewer` | `/dashboard/analytics` | Monthly/yearly bar charts     |

---

### 5. Market Data Pre-fetch — `app/api/cron/market-prefetch/route.ts`

| Property     | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| **Route**    | Does not exist yet                                                                  |
| **Schedule** | **Every 15 minutes** (market hours: Mon–Fri 8:30 AM – 3:30 PM CT / 14:30–21:30 UTC) |
| **Priority** | **Medium** — reduces latency for first page load, conserves Twelve Data quota       |

**What it should do:**

1. Pre-warm the `market_cache` for commonly accessed data:
   - `fetchPrice('VOO')`, `fetchPrice('QQQ')` → Twelve Data
   - `fetchBitcoinPrice()` → CoinGecko
   - `fetchCryptoFearGreed()` → Alternative.me
2. Outside market hours (or on weekends): skip stock price fetches

**Rationale:** Without this, the first user to hit the dashboard after cache TTL expiry triggers synchronous API calls, adding 1–3s latency. Pre-fetching ensures the cache is always warm.

**Database operations (proposed):**

| Operation  | Table                | Detail                                                         |
| ---------- | -------------------- | -------------------------------------------------------------- |
| **UPSERT** | `market_cache`       | Writes fresh data for each pre-fetched key (via `getCached()`) |
| **UPSERT** | `api_request_counts` | Increments Twelve Data counter per call                        |

**Auth client:** Should use `createAdminClient()` — cache write RLS requires service role after migration `20260321100000`.

**Migration:** `20260321000000_market_cache.sql` + `20260321100000_restrict_cache_rls.sql` — **both already exist**. No new migration needed.

---

### 6. Cache Cleanup — `app/api/cron/cache-cleanup/route.ts`

| Property     | Value                                           |
| ------------ | ----------------------------------------------- |
| **Route**    | Does not exist yet                              |
| **Schedule** | **Once daily** — 4:00 AM Costa Rica (10:00 UTC) |
| **Priority** | **Low** — hygiene task                          |

**What it should do:**

1. Delete rows from `market_cache` where `fetched_at + ttl_seconds < now() - interval '7 days'`
2. Delete rows from `api_request_counts` older than 30 days
3. Optionally: delete old `notifications` (read, >30 days)
4. Optionally: prune `ai_summaries` older than 90 days

**Database operations (proposed):**

| Operation  | Table                | Detail                                                                              |
| ---------- | -------------------- | ----------------------------------------------------------------------------------- |
| **DELETE** | `market_cache`       | Rows where `fetched_at + ttl_seconds < now() - interval '7 days'`                   |
| **DELETE** | `api_request_counts` | Rows where `date_key < current_date - 30`                                           |
| **DELETE** | `notifications`      | _(optional)_ Rows where `read = true` and `created_at < now() - interval '30 days'` |
| **DELETE** | `ai_summaries`       | _(optional)_ Rows where `summary_date < current_date - 90`                          |

**Auth client:** Should use `createAdminClient()` — deletes span all users.

**Migration:** No new migration needed — all tables already exist.

---

## Database Table Operations

### Complete Table × Cron Matrix

Shows every database table and how each cron job interacts with it:

| Table                 | Migration             | `ai-summary` | `alert-eval` | `dca-remind` | `portfolio-snap` ⚠️ | `market-prefetch` ⚠️ | `cache-cleanup` ⚠️ |
| --------------------- | --------------------- | :----------: | :----------: | :----------: | :-----------------: | :------------------: | :----------------: |
| `profiles`            | `20260320000000`      |    **R**     |    **R**     |      —       |          —          |          —           |         —          |
| `portfolios`          | `20260320000000`      |      —       |      —       |      —       |        **R**        |          —           |         —          |
| `positions`           | `20260320000000`      |      —       |      —       |      —       |        **R**        |          —           |         —          |
| `transactions`        | `20260320000000`      |      —       |      —       |      —       |          —          |          —           |         —          |
| `dca_schedules`       | `20260320000000`      |      —       |      —       |    **R**     |          —          |          —           |         —          |
| `alerts`              | `20260320000000`      |      —       |   **R/U**    |      —       |          —          |          —           |         —          |
| `notifications`       | `20260322100000`      |      —       |    **C**     |    **C**     |          —          |          —           |       **D**        |
| `market_cache`        | `20260321000000`      |    _r/w_     |    _r/w_     |      —       |        _r/w_        |       **C/U**        |       **D**        |
| `api_request_counts`  | `20260321000000`      |    _r/w_     |    _r/w_     |      —       |        _r/w_        |       **C/U**        |       **D**        |
| `portfolio_snapshots` | `20260322000000`      |      —       |      —       |      —       |        **C**        |          —           |         —          |
| `ai_summaries`        | `20260323000000`      |   **R/C**    |      —       |      —       |          —          |          —           |       **D**        |
| `user_api_keys`       | `20260326000000`      |      —       |      —       |      —       |          —          |          —           |         —          |
| `auth.users`          | _(Supabase internal)_ |      —       |    **R**     |      —       |          —          |          —           |         —          |

**Legend:** **R** = SELECT, **C** = INSERT, **U** = UPDATE, **D** = DELETE, _r/w_ = indirect via cache layer, ⚠️ = not implemented

### Table Schema Quick Reference

#### `ai_summaries` — Written by AI Summary cron

```sql
create table public.ai_summaries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  summary_date  date not null default current_date,
  content       text not null,
  model_used    text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, summary_date)  -- one summary per user per day
);
```

#### `alerts` — Read + Updated by Alert Evaluation cron

```sql
create table public.alerts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  symbol                text not null,
  asset_type            text not null check (asset_type in ('ETF', 'Crypto')),
  condition             text not null,  -- 'above', 'below', 'pct_change_up', 'pct_change_down'
  threshold             numeric not null,
  status                text not null default 'active',  -- 'active', 'triggered', 'paused'
  is_active             boolean not null default true,
  parameters            jsonb default '{}',  -- indicator-specific (RSI period, MA windows, etc.)
  last_triggered_at     timestamptz,
  notification_channels text[] not null default '{in_app}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
```

#### `notifications` — Written by Alert Evaluation + DCA Reminders crons

```sql
-- Created in migration 20260322100000_dca_schedule_day_columns.sql
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,   -- 'alert', 'dca_reminder', 'system'
  title       text not null,
  body        text,
  read        boolean not null default false,
  related_id  uuid,            -- FK to alert or dca_schedule triggering this
  created_at  timestamptz not null default now()
);
```

#### `portfolio_snapshots` — Should be written by Portfolio Snapshot cron

```sql
create table public.portfolio_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  portfolio_id    uuid not null references public.portfolios(id) on delete cascade,
  snapshot_date   date not null default current_date,
  total_value     numeric(20, 2) not null default 0,
  positions_data  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (portfolio_id, snapshot_date)  -- one snapshot per portfolio per day
);
```

#### `market_cache` — Written by Market Pre-fetch cron, cleaned by Cache Cleanup

```sql
create table public.market_cache (
  key          text primary key,
  data         jsonb not null,
  fetched_at   timestamptz not null default now(),
  ttl_seconds  int not null default 300
);
```

#### `api_request_counts` — Tracked by all crons that call external APIs

```sql
create table public.api_request_counts (
  provider       text not null,
  date_key       date not null default current_date,
  request_count  int not null default 0,
  primary key (provider, date_key)
);
```

#### `dca_schedules` — Read by DCA Reminders cron

```sql
create table public.dca_schedules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  portfolio_id      uuid not null references public.portfolios(id) on delete cascade,
  symbol            text not null,
  asset_type        text not null check (asset_type in ('ETF', 'Crypto')),
  amount            numeric not null check (amount > 0),
  frequency         text not null check (frequency in ('Daily', 'Weekly', 'Biweekly', 'Monthly')),
  day_of_week       int,          -- 0=Sun..6=Sat (for Weekly/Biweekly)
  day_of_month      int,          -- 1..28 (for Monthly)
  is_active         boolean not null default true,
  next_execution_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

---

## Migration Map

### Which Migrations Power Which Cron Jobs

| #   | Migration File                                    | Tables Created / Modified                                                                         |                    Used by Cron                    | New Migration Needed? |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | :------------------------------------------------: | :-------------------: |
| 1   | `20260320000000_initial_schema.sql`               | `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts` + RLS + triggers | ai-summary, alert-eval, dca-remind, portfolio-snap |          No           |
| 2   | `20260321000000_market_cache.sql`                 | `market_cache`, `api_request_counts`                                                              | market-prefetch, cache-cleanup, _(all indirectly)_ |          No           |
| 3   | `20260321100000_restrict_cache_rls.sql`           | RLS tightened: cache writes → service_role only                                                   |           market-prefetch, cache-cleanup           |          No           |
| 4   | `20260322000000_portfolio_snapshots.sql`          | `portfolio_snapshots`                                                                             |                   portfolio-snap                   |          No           |
| 5   | `20260322100000_dca_schedule_day_columns.sql`     | `dca_schedules` + `day_of_week`/`day_of_month`, `notifications` table                             |               dca-remind, alert-eval               |          No           |
| 6   | `20260323000000_ai_provider_and_summaries.sql`    | `ai_summaries`, `profiles.ai_provider`/`ai_model`                                                 |                     ai-summary                     |          No           |
| 7   | `20260325000000_alerts_status_and_indicators.sql` | `alerts.status`, `alerts.parameters`, indicator types                                             |                     alert-eval                     |          No           |
| 8   | `20260326000000_user_api_keys.sql`                | `user_api_keys`                                                                                   |              _(none — settings only)_              |          No           |

### New Migrations Required?

**None.** All tables needed by both existing and proposed cron jobs already exist. The schema is complete:

- `portfolio_snapshots` — created in migration #4, ready for the portfolio snapshot cron
- `market_cache` — created in migration #2, ready for the market pre-fetch cron
- `notifications` — created in migration #5, already used by alert-eval and dca-remind

The only potential addition would be a migration to enable `pg_cron` for database-level scheduling (Supabase hosted), but this is optional and doesn't require schema changes.

---

## User Value Map

### How Each Cron Job Benefits the User

#### AI Daily Summary → "What happened in the markets while I slept?"

| What the user sees                         | Where                                       | Without this cron                                            |
| ------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------ |
| Pre-generated market briefing card         | `/dashboard` home → `DashboardSummary`      | Empty card — user must manually click "Generate" in Insights |
| Cached AI summary available instantly      | `/dashboard/insights` → `MarketSummaryCard` | First visit triggers 30–60s AI generation wait               |
| Personalized per their AI model preference | Settings → AI Model selection respected     | —                                                            |

**User impact:** High. The morning summary is the first thing users see on their dashboard. Without the cron, the summary card is blank until the user navigates to Insights and manually triggers generation.

---

#### Alert Evaluation → "Did my assets hit my price targets?"

| What the user sees           | Where                                                        | Without this cron                                         |
| ---------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Real-time alert triggers     | `/dashboard/alerts` → `AlertsTable` shows "Triggered" status | Alerts stay "Active" forever, never fire                  |
| Push notifications           | `NotificationCenter` dropdown (bell icon)                    | No notifications appear                                   |
| Email alerts                 | Inbox (if enabled in Settings)                               | No emails sent                                            |
| Telegram alerts              | Telegram chat (if configured)                                | No messages sent                                          |
| RSI/MA/MVRV technical alerts | Advanced indicator alerts evaluate correctly                 | Only simple price alerts would work (if manually checked) |

**User impact:** Critical. This is the **only mechanism** that evaluates alert conditions. Without it, the entire alerts feature is non-functional — users set alerts that never trigger.

---

#### DCA Reminders → "Time to make my regular investment"

| What the user sees                  | Where                                                      | Without this cron                          |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| "Time to invest $X in VOO" reminder | `NotificationCenter` dropdown                              | No reminders — user must remember manually |
| Schedule adherence tracking         | `/dashboard/dca` → `SchedulesList` shows upcoming schedule | Schedules exist but never prompt action    |
| Consistent DCA discipline           | Behavioral nudge on investment days                        | User may forget or skip DCA buys           |

**User impact:** Medium. DCA is a behavioral strategy — the reminder is what turns a schedule into action. Without it, users define schedules but get no prompts.

---

#### Portfolio Snapshot ⚠️ → "How has my portfolio performed over time?"

| What the user sees                       | Where                                               | Without this cron                    |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| 30-day portfolio value trend             | `/dashboard` → `DashboardPerformance` area chart    | **Empty chart — no historical data** |
| Historical performance (1W/1M/3M/1Y/ALL) | `/dashboard/portfolio` → `PerformanceChart`         | **Empty chart**                      |
| Portfolio vs VOO benchmark               | `/dashboard/analytics` → `BenchmarkChart`           | **Empty chart**                      |
| Total return, TWRR% metrics              | `/dashboard/analytics` → `PerformanceSummary` cards | **Shows 0% or N/A**                  |
| Monthly/yearly return reports            | `/dashboard/analytics` → `AnalyticsReports`         | **No report data**                   |
| PDF export of performance report         | `/dashboard/analytics` → `PdfExportButton`          | **Empty PDF**                        |

**User impact:** Critical. This is the **most impactful missing cron**. Without daily snapshots, the entire analytics section has no data. Users cannot see how their portfolio has performed over any time period. The 30-day chart on the dashboard home is empty.

---

#### Market Pre-fetch ⚠️ → "Dashboard loads instantly"

| What the user sees                | Where                            | Without this cron                                    |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- |
| Instant page load with fresh data | All market-dependent pages       | First load after cache expiry: 1–3s delay            |
| Twelve Data API quota preserved   | Rate limit indicator stays green | More user-triggered API calls consume quota faster   |
| Consistent data freshness         | All price cards, charts          | Data may be up to 5 min stale depending on cache TTL |

**User impact:** Low-Medium. The app still works without this — the cache handles it. But the first page load after cache TTL expiry is noticeably slower.

---

#### Cache Cleanup ⚠️ → "Database stays lean"

| What the user sees             | Where                                        | Without this cron                                       |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| Nothing visible                | —                                            | —                                                       |
| Faster cache queries over time | Indirect: slightly faster page loads         | `market_cache` table grows unbounded, queries slow down |
| Clean notification list        | `NotificationCenter` shows recent items only | Old read notifications pile up forever                  |

**User impact:** Low. This is a hygiene task. Without it, the database works fine for months but gradually accumulates stale rows (~50 cache keys × 365 days = ~18K rows/year in `market_cache`, negligible for Postgres).

---

### Priority Summary

| Cron Job           | Status          | User Impact                             | Priority |
| ------------------ | --------------- | --------------------------------------- | -------- |
| Alert Evaluation   | ✅ Route exists | Critical — alerts don't fire without it | **P0**   |
| Portfolio Snapshot | ✅ Route exists | Critical — analytics empty without it   | **P0**   |
| AI Daily Summary   | ✅ Route exists | High — morning briefing is blank        | **P1**   |
| DCA Reminders      | ✅ Route exists | Medium — investment reminders           | **P1**   |
| Market Pre-fetch   | ✅ Route exists | Low-Medium — first load latency         | **P2**   |
| Cache Cleanup      | ✅ Route exists | Low — DB hygiene                        | **P3**   |

---

## External API Inventory

### Rate-Limited / Key-Required APIs

| Provider         | Base URL                              | Auth                       | Rate Limit                    | Key Env Var           |
| ---------------- | ------------------------------------- | -------------------------- | ----------------------------- | --------------------- |
| **Twelve Data**  | `https://api.twelvedata.com`          | API key (query param)      | 750 req/day (free), 8 req/min | `TWELVE_DATA_API_KEY` |
| **CoinGecko**    | `https://api.coingecko.com/api/v3`    | Optional demo key (header) | 10–30 req/min (free)          | `COINGECKO_API_KEY`   |
| **FRED**         | `https://api.stlouisfed.org/fred`     | API key (query param)      | 120 req/min                   | `FRED_API_KEY`        |
| **BCCR SDDE**    | `https://apim.bccr.fi.cr/SDDE/api`    | Bearer token               | Unknown (government API)      | `BCCR_SDDE_TOKEN`     |
| **OpenAI**       | `https://api.openai.com/v1`           | Bearer token               | Tier-dependent                | `OPENAI_API_KEY`      |
| **Resend**       | `https://api.resend.com`              | Bearer token               | 100 emails/day (free)         | `RESEND_API_KEY`      |
| **Telegram Bot** | `https://api.telegram.org/bot{token}` | Bot token in URL           | 30 msg/sec                    | `TELEGRAM_BOT_TOKEN`  |

### Public APIs (No Key)

| Provider           | Base URL                         | Used For                                                       |
| ------------------ | -------------------------------- | -------------------------------------------------------------- |
| **Alternative.me** | `https://api.alternative.me/fng` | Crypto Fear & Greed Index                                      |
| **Mempool.space**  | `https://mempool.space/api`      | Bitcoin on-chain (block height, hashrate, mempool, difficulty) |
| **Blockchain.com** | `https://api.blockchain.info`    | Full BTC price history (S2F, Rainbow, MVRV)                    |
| **Ollama** (local) | `http://localhost:11434`         | Local AI model inference                                       |

---

## Dashboard Data Dependencies

### Which cards/charts depend on which API, and how often they need fresh data:

#### Real-Time Data (5–15 min refresh)

| Component                  | Route                  | Type            | API Source                                   |
| -------------------------- | ---------------------- | --------------- | -------------------------------------------- |
| `DashboardMetricsCards`    | `/dashboard`           | 4× metric cards | Twelve Data + CoinGecko                      |
| `DashboardAllocationChart` | `/dashboard`           | Pie chart       | Twelve Data + CoinGecko                      |
| `PriceCards`               | `/dashboard/market`    | 3× price cards  | Twelve Data + CoinGecko                      |
| `TotalValueCard`           | `/dashboard/portfolio` | 4× metric cards | Twelve Data + CoinGecko                      |
| `AllocationChart`          | `/dashboard/portfolio` | Donut chart     | Twelve Data + CoinGecko                      |
| `PositionsTable`           | `/dashboard/portfolio` | Table           | Twelve Data + CoinGecko                      |
| `BitcoinMetricsLive`       | `/dashboard/bitcoin`   | 4× metric cards | Mempool.space (polled client-side every 60s) |
| `NetworkMetrics`           | `/dashboard/bitcoin`   | Cards           | Mempool.space                                |
| `HashrateSparkline`        | `/dashboard/bitcoin`   | Sparkline       | Mempool.space                                |

#### Hourly Data

| Component          | Route                | Type             | API Source                |
| ------------------ | -------------------- | ---------------- | ------------------------- |
| `FearGreedGauge`   | `/dashboard/market`  | Radial gauge     | Alternative.me            |
| `HalvingCountdown` | `/dashboard/bitcoin` | Card w/ progress | Derived from block height |
| `SupplyMetrics`    | `/dashboard/bitcoin` | Card w/ progress | Derived from block height |

#### Daily Data

| Component              | Route                  | Type            | API Source                          |
| ---------------------- | ---------------------- | --------------- | ----------------------------------- |
| `DashboardPerformance` | `/dashboard`           | Area chart      | Supabase snapshots (cron-generated) |
| `DashboardSummary`     | `/dashboard`           | Card            | AI cron → `ai_summaries` table      |
| `MacroIndicators`      | `/dashboard/market`    | Grid of cards   | FRED                                |
| `CrMacroIndicators`    | `/dashboard/market`    | Grid of cards   | BCCR                                |
| `ExchangeRateChart`    | `/dashboard/market`    | Area chart      | BCCR                                |
| `RainbowChart`         | `/dashboard/bitcoin`   | Log area chart  | Blockchain.com                      |
| `S2FChart`             | `/dashboard/bitcoin`   | Composed chart  | Blockchain.com                      |
| `MvrvChart`            | `/dashboard/bitcoin`   | Gauge + cards   | CoinGecko + Blockchain.com          |
| `PerformanceSummary`   | `/dashboard/analytics` | 4× metric cards | Supabase snapshots                  |
| `BenchmarkChart`       | `/dashboard/analytics` | Area chart      | Supabase snapshots + Twelve Data    |
| `PerAssetTable`        | `/dashboard/analytics` | Table           | Supabase + prices                   |
| `AnalyticsReports`     | `/dashboard/analytics` | Bar charts      | Supabase snapshots                  |
| `PerformanceChart`     | `/dashboard/portfolio` | Area chart      | Supabase snapshots                  |
| `DriftIndicator`       | `/dashboard/portfolio` | Bar chart       | Supabase position + prices          |
| `DcaSummaryCards`      | `/dashboard/dca`       | 4× metric cards | Supabase + live price               |
| `DcaHistoryChart`      | `/dashboard/dca`       | Composed chart  | Supabase DCA transactions           |
| `DcaVsLumpsum`         | `/dashboard/dca`       | Comparison card | Supabase computed                   |

#### On-Demand / Static

| Component           | Route                 | Type     | Notes                             |
| ------------------- | --------------------- | -------- | --------------------------------- |
| `MarketSummaryCard` | `/dashboard/insights` | Card     | Cached daily, user can regenerate |
| `PortfolioAnalysis` | `/dashboard/insights` | Chat     | Streams on mount                  |
| `LearningChat`      | `/dashboard/insights` | Chat     | User-initiated                    |
| `AlertsTable`       | `/dashboard/alerts`   | Table    | Supabase CRUD only                |
| `HalvingTimeline`   | `/dashboard/bitcoin`  | Timeline | Static constant data              |

---

## Cache Architecture

### Two-Tier Cache Flow

```
Request → Memory Map (instant)
            ↓ miss
        Supabase `market_cache` (~50ms)
            ↓ miss
        External API fetch
            ↓ success
        Store in Memory + Supabase
            ↓ failure
        Return stale Supabase data (graceful degradation)
```

### Cache TTL Configuration

Defined in `lib/market/cache.ts` → `CacheTTL`:

| Key              | TTL          | Used For                                                                            |
| ---------------- | ------------ | ----------------------------------------------------------------------------------- |
| `REALTIME_PRICE` | **5 min**    | Stock prices, BTC price, DXY, block height, mempool, difficulty, batch coin markets |
| `SENTIMENT`      | **1 hour**   | Fear & Greed index + history                                                        |
| `DAILY_HISTORY`  | **24 hours** | Price history, BTC history, S2F, Rainbow, MVRV, market charts                       |
| `MACRO`          | **24 hours** | FRED series, BCCR indicators, exchange rate history                                 |

### Cache Key Patterns

```
stock:price:{SYMBOL}                        # e.g., stock:price:VOO
stock:history:{SYMBOL}:{interval}:{size}    # e.g., stock:history:VOO:1day:30
crypto:bitcoin:price
crypto:bitcoin:history:{days}
crypto:{coinId}:historical:{date}
crypto:{coinId}:market_chart:{days}:{interval}
crypto:coins:markets:{ids}
sentiment:crypto:feargreed
sentiment:crypto:feargreed:history:{days}
macro:fred:{seriesId}:{limit}
macro:dxy
macro:inflation
bccr:indicator:{id}
bccr:exchange_rate_history:{days}
bitcoin:block:height
bitcoin:hashrate:30d
bitcoin:mempool
bitcoin:difficulty
bitcoin:mvrv:zscore
bitcoin:s2f:data
bitcoin:rainbow:data
bitcoin:price-history:full
exchange:usd_crc
```

### Rate Limit Protection (Twelve Data)

- Tracked in `api_request_counts` table (per provider, per day)
- Threshold: **750 requests/day**
- When near limit: `fetchPrice`/`fetchHistory` return stale cache instead of calling API
- `isUsingCachedData()` helper exposes this state to the UI

---

## Periodicity Reference

### Complete Cron Schedule

| Cron Job               | Cron Expression     | Schedule (UTC)                    | Costa Rica Time            | Status          |
| ---------------------- | ------------------- | --------------------------------- | -------------------------- | --------------- |
| **Market Pre-fetch**   | `*/15 9-21 * * 1-5` | Every 15 min, Mon–Fri 9 AM – 9 PM | 3 AM – 3 PM (market hours) | ✅ Route exists |
| **Alert Evaluation**   | `*/5 * * * *`       | Every 5 minutes                   | Every 5 minutes            | ✅ Route exists |
| **AI Daily Summary**   | `0 12 * * *`        | 12:00 PM UTC                      | 6:00 AM CR                 | ✅ Route exists |
| **DCA Reminders**      | `0 13 * * *`        | 1:00 PM UTC                       | 7:00 AM CR                 | ✅ Route exists |
| **Portfolio Snapshot** | `0 2 * * *`         | 2:00 AM UTC (next day)            | 8:00 PM CR                 | ✅ Route exists |
| **Cache Cleanup**      | `0 10 * * *`        | 10:00 AM UTC                      | 4:00 AM CR                 | ✅ Route exists |

### API Budget Analysis (Twelve Data — 750 req/day)

Assuming active cron jobs:

| Consumer                                              | Calls per Run | Runs per Day       | Daily Total        |
| ----------------------------------------------------- | ------------- | ------------------ | ------------------ |
| Market pre-fetch (VOO, QQQ)                           | 2             | ~30 (market hours) | **60**             |
| Alert evaluation (worst case: 5 unique stock symbols) | 5–10          | 288                | **1,440–2,880** ❌ |
| Alert evaluation (with cache hits at 5-min TTL)       | 0–2           | 288                | **~100** ✅        |
| AI summary (VOO, QQQ, DXY)                            | 3             | 1                  | **3**              |
| Portfolio snapshot (2 stock positions)                | 2             | 1                  | **2**              |
| User page loads (cache misses)                        | ~2            | ~20                | **~40**            |
| **Total (with caching)**                              |               |                    | **~205** ✅        |

The cache layer is critical — without it, alert evaluation alone would exceed the daily limit.

---

## Local Setup

### Prerequisites

```bash
# Supabase CLI (for local DB)
brew install supabase/tap/supabase

# Start local Supabase (Postgres + Auth + API)
supabase start
```

### Option A: curl-Based Manual Trigger

The simplest approach — call cron endpoints directly:

```bash
# Must match .env.local CRON_SECRET
export CRON_SECRET="$(grep CRON_SECRET .env.local | cut -d= -f2)"

# AI Daily Summary
curl -X POST http://localhost:3000/api/cron/ai-summary \
  -H "Authorization: Bearer $CRON_SECRET"

# Alert Evaluation
curl -X POST http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET"

# DCA Reminders
curl -X POST http://localhost:3000/api/cron/dca-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Option B: Watch Mode with `watch` (macOS)

```bash
# Install watch if not available
brew install watch

# Run alert evaluation every 5 minutes
watch -n 300 'curl -s -X POST http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET" | jq .'
```

### Option C: crontab (Persistent Local Scheduler)

```bash
# Edit crontab
crontab -e

# Add these entries (adjust paths and secrets):

# Alert Evaluation — every 5 min
*/5 * * * * curl -s -X POST http://localhost:3000/api/cron/alert-evaluation -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-alerts.log 2>&1

# AI Summary — daily at 6 AM local
0 6 * * * curl -s -X POST http://localhost:3000/api/cron/ai-summary -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-ai.log 2>&1

# DCA Reminders — daily at 7 AM local
0 7 * * * curl -s -X POST http://localhost:3000/api/cron/dca-reminders -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-dca.log 2>&1
```

### Option D: Node.js Script with `node-cron`

Create a standalone scheduler for development:

```bash
npm install -D node-cron
```

```typescript
// scripts/local-cron.ts
import cron from 'node-cron'

const BASE = 'http://localhost:3000/api/cron'
const SECRET = process.env.CRON_SECRET || 'local-dev-secret'
const headers = { Authorization: `Bearer ${SECRET}` }

// Alert evaluation — every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running alert-evaluation...`)
  const res = await fetch(`${BASE}/alert-evaluation`, { method: 'POST', headers })
  console.log(`  → ${res.status}`, await res.json())
})

// AI Summary — daily at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running ai-summary...`)
  const res = await fetch(`${BASE}/ai-summary`, { method: 'POST', headers })
  console.log(`  → ${res.status}`, await res.json())
})

// DCA Reminders — daily at 7 AM
cron.schedule('0 7 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running dca-reminders...`)
  const res = await fetch(`${BASE}/dca-reminders`, { method: 'POST', headers })
  console.log(`  → ${res.status}`, await res.json())
})

console.log('Local cron scheduler started. Press Ctrl+C to stop.')
```

```bash
# Run the scheduler alongside dev server
npx tsx scripts/local-cron.ts
```

### Option E: Supabase `pg_cron` (Database-Level)

For crons that only need DB operations (like portfolio snapshot or cache cleanup), `pg_cron` avoids the HTTP overhead:

```sql
-- Enable pg_cron (in supabase/config.toml, add to extensions)
-- Then in a migration:

-- Portfolio snapshot: daily at 2 AM UTC
SELECT cron.schedule(
  'portfolio-snapshot',
  '0 2 * * *',
  $$
  INSERT INTO portfolio_snapshots (user_id, date, total_value)
  SELECT p.user_id, current_date, SUM(p.shares * /* price lookup */)
  FROM positions p
  GROUP BY p.user_id
  ON CONFLICT (user_id, date) DO UPDATE SET total_value = EXCLUDED.total_value;
  $$
);

-- Cache cleanup: daily at 10 AM UTC
SELECT cron.schedule(
  'cache-cleanup',
  '0 10 * * *',
  $$
  DELETE FROM market_cache
  WHERE fetched_at + (ttl_seconds || ' seconds')::interval < now() - interval '7 days';

  DELETE FROM api_request_counts
  WHERE date_key < current_date - 30;
  $$
);
```

> **Note:** `pg_cron` is available in Supabase hosted. For local dev with `supabase start`, you need to enable it in `supabase/config.toml`:
>
> ```toml
> [db]
> extra_search_path = ["extensions"]
>
> [extensions]
> pg_cron = "enabled"
> ```

---

## Local Development Setup

For local development, cron jobs won't run automatically — you need to trigger them manually or set up a local scheduler.

### Quick: Manual Trigger via curl

With the dev server running (`npm run dev`), call any cron endpoint directly:

```bash
# Must match .env.local CRON_SECRET
export CRON_SECRET="$(grep CRON_SECRET .env.local | cut -d= -f2)"

# Portfolio Snapshot
curl -s http://localhost:3000/api/cron/portfolio-snapshot \
  -H "Authorization: Bearer $CRON_SECRET" | jq .

# Market Pre-fetch
curl -s http://localhost:3000/api/cron/market-prefetch \
  -H "Authorization: Bearer $CRON_SECRET" | jq .

# Cache Cleanup
curl -s http://localhost:3000/api/cron/cache-cleanup \
  -H "Authorization: Bearer $CRON_SECRET" | jq .

# Alert Evaluation
curl -s http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET" | jq .

# AI Daily Summary
curl -s http://localhost:3000/api/cron/ai-summary \
  -H "Authorization: Bearer $CRON_SECRET" | jq .

# DCA Reminders
curl -s http://localhost:3000/api/cron/dca-reminders \
  -H "Authorization: Bearer $CRON_SECRET" | jq .
```

### Repeated: Watch Mode

```bash
brew install watch

# Run alert evaluation every 5 minutes
watch -n 300 'curl -s http://localhost:3000/api/cron/alert-evaluation \
  -H "Authorization: Bearer $CRON_SECRET" | jq .'

# Run market pre-fetch every 5 minutes
watch -n 300 'curl -s http://localhost:3000/api/cron/market-prefetch \
  -H "Authorization: Bearer $CRON_SECRET" | jq .'
```

### Persistent: Local crontab

```bash
crontab -e
```

```cron
# Alert Evaluation — every 5 min
*/5 * * * * curl -s http://localhost:3000/api/cron/alert-evaluation -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-alerts.log 2>&1

# Market Pre-fetch — every 5 min
*/5 * * * * curl -s http://localhost:3000/api/cron/market-prefetch -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-prefetch.log 2>&1

# AI Summary — daily at 6 AM local
0 6 * * * curl -s http://localhost:3000/api/cron/ai-summary -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-ai.log 2>&1

# DCA Reminders — daily at 7 AM local
0 7 * * * curl -s http://localhost:3000/api/cron/dca-reminders -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-dca.log 2>&1

# Portfolio Snapshot — daily at 8 PM local
0 20 * * * curl -s http://localhost:3000/api/cron/portfolio-snapshot -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-snapshot.log 2>&1

# Cache Cleanup — daily at 9 PM local
0 21 * * * curl -s http://localhost:3000/api/cron/cache-cleanup -H "Authorization: Bearer $CRON_SECRET" >> /tmp/cron-cleanup.log 2>&1
```

### Scripted: Node.js Scheduler

Run all crons in a single process alongside the dev server:

```bash
npm install -D node-cron
```

```typescript
// scripts/local-cron.ts
import cron from 'node-cron'

const BASE = 'http://localhost:3000/api/cron'
const SECRET = process.env.CRON_SECRET || 'local-dev-secret'
const headers = { Authorization: `Bearer ${SECRET}` }

const jobs = [
  { name: 'alert-evaluation', schedule: '*/5 * * * *' },
  { name: 'market-prefetch', schedule: '*/5 * * * *' },
  { name: 'ai-summary', schedule: '0 6 * * *' },
  { name: 'dca-reminders', schedule: '0 7 * * *' },
  { name: 'portfolio-snapshot', schedule: '0 20 * * *' },
  { name: 'cache-cleanup', schedule: '0 21 * * *' },
]

for (const job of jobs) {
  cron.schedule(job.schedule, async () => {
    const ts = new Date().toISOString()
    try {
      const res = await fetch(`${BASE}/${job.name}`, { headers })
      console.log(`[${ts}] ${job.name} → ${res.status}`, await res.json())
    } catch (err) {
      console.error(`[${ts}] ${job.name} → FAILED`, err)
    }
  })
  console.log(`Scheduled: ${job.name} (${job.schedule})`)
}

console.log('\nLocal cron scheduler running. Ctrl+C to stop.')
```

```bash
npx tsx scripts/local-cron.ts
```

### Verify Cron Responses

All cron endpoints return JSON with a consistent shape:

| Endpoint             | Key Fields                                        |
| -------------------- | ------------------------------------------------- |
| `portfolio-snapshot` | `{ processed, snapshots, date }`                  |
| `market-prefetch`    | `{ prefetched, total, summary }`                  |
| `cache-cleanup`      | `{ cleaned, total, summary, cutoffs }`            |
| `alert-evaluation`   | `{ processed, triggered, notifications, errors }` |
| `ai-summary`         | `{ processed, generated, skipped, errors }`       |
| `dca-reminders`      | `{ processed, reminders }`                        |

---

## Vercel Production Setup

### `vercel.json` Configuration

Create `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/alert-evaluation",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/ai-summary",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/cron/dca-reminders",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/cron/portfolio-snapshot",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/market-prefetch",
      "schedule": "*/15 9-21 * * 1-5"
    },
    {
      "path": "/api/cron/cache-cleanup",
      "schedule": "0 10 * * *"
    }
  ]
}
```

> **Vercel cron limits:** Hobby plan = 2 crons (daily only), Pro plan = 40 crons (per-minute granularity). The alert evaluation (every 5 min) and market pre-fetch (every 15 min) require **Pro plan**.

### Vercel Cron Authentication

Vercel automatically sets the `CRON_SECRET` header for cron invocations. All existing cron routes already validate:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Set `CRON_SECRET` in Vercel project settings → Environment Variables.

---

## Environment Variables

All env vars required by cron jobs:

```bash
# Required for all crons
CRON_SECRET=                    # Bearer token for cron auth

# Market data (used by ai-summary, alert-evaluation, market-prefetch, portfolio-snapshot)
TWELVE_DATA_API_KEY=            # https://twelvedata.com/
COINGECKO_API_KEY=              # Optional — https://www.coingecko.com/en/api
FRED_API_KEY=                   # https://fred.stlouisfed.org/docs/api/
BCCR_SDDE_TOKEN=                # https://www.bccr.fi.cr/ (Costa Rica central bank)

# AI (used by ai-summary)
OPENAI_API_KEY=                 # https://platform.openai.com/
OLLAMA_BASE_URL=                # http://localhost:11434 (local dev)

# Notifications (used by alert-evaluation)
TELEGRAM_BOT_TOKEN=             # https://core.telegram.org/bots
RESEND_API_KEY=                 # https://resend.com/
RESEND_FROM_EMAIL=              # Verified sender email

# Supabase (used by all crons)
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=      # Service role key (for admin operations)
```
