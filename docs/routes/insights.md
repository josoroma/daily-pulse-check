# E6: AI-Powered Insights

> The Insights page is the AI hub of the Finance Dashboard. It delivers three AI-powered tools — a daily market summary, interactive portfolio analysis, and a learning assistant — all streamed via NDJSON with optional chain-of-thought reasoning display. Users choose between OpenAI and Ollama providers in Settings, and the selected model is used across all three features. Designed for a Costa Rica-based investor tracking VOO, QQQ, and Bitcoin.

---

## Table of Contents

- [Architecture](#architecture)
- [Pages & Navigation](#pages--navigation)
- [Why This Feature Exists — User Flows](#why-this-feature-exists--user-flows)
- [Models, Cron Jobs, Actions & API Routes](#models-cron-jobs-actions--api-routes)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [File Tree](#file-tree)
- [Known Limitations](#known-limitations)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                               │
│                                                                                 │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │ market-summary-    │  │ portfolio-            │  │ learning-chat.tsx      │   │
│  │ card.tsx            │  │ analysis.tsx          │  │ ('use client')         │   │
│  │ ('use client')      │  │ ('use client')        │  │                        │   │
│  └────────┬───────────┘  └──────────┬───────────┘  └──────────┬─────────────┘   │
│           │ fetch POST               │ fetch POST              │ fetch POST      │
│           ▼                          ▼                         ▼                 │
│  /api/ai/summary             /api/ai/portfolio          /api/ai/learn           │
└──────────┬──────────────────────────┬──────────────────────────┬────────────────┘
           │                          │                          │
┌──────────▼──────────────────────────▼──────────────────────────▼────────────────┐
│  Next.js Server (API Routes)                                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  Auth: createClient() → supabase.auth.getUser()                            │ │
│  │  Profile: profiles.select('ai_provider, ai_model, ...')                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│           │                          │                          │                │
│           ▼                          ▼                          ▼                │
│  ┌────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ market-        │  │ portfolio-            │  │ learning-assistant.ts        │ │
│  │ summary.ts     │  │ analysis.ts           │  │ isFinancialTopic() guard     │ │
│  │ buildPrompt()  │  │ buildSystem()         │  │ buildSystemPrompt()          │ │
│  └───────┬────────┘  └──────────┬───────────┘  └──────────────┬───────────────┘ │
│          │                      │                              │                 │
│          ▼                      ▼                              ▼                 │
│  ┌───────────────────────────────────────────────────────────────────────┐       │
│  │  lib/ai/provider.ts → getLanguageModel(provider, model)              │       │
│  │  ┌──────────────────────┐    ┌──────────────────────────────┐        │       │
│  │  │  OpenAI (cloud)      │    │  Ollama (local)              │        │       │
│  │  │  OPENAI_API_KEY      │    │  OLLAMA_BASE_URL/v1          │        │       │
│  │  │  gpt-4.1-mini        │    │  qwen3.5:9b (think: true)    │        │       │
│  │  └──────────────────────┘    └──────────────────────────────┘        │       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│          │                                                                       │
│          ▼                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐       │
│  │  lib/ai/stream.ts → createAiNdjsonStream(fullStream)                 │       │
│  │  Parses <think>...</think> → { type: 'reasoning', text }             │       │
│  │  Native reasoning-delta → { type: 'reasoning', text }               │       │
│  │  text-delta → { type: 'text', text }                                │       │
│  │  Error → { type: 'error', text }                                    │       │
│  └───────────────────────────────────────────────────────────────────────┘       │
│                                                                                  │
│  ── Market Summary also fetches live data ──                                     │
│  lib/market/stocks.ts  → Twelve Data API (VOO, QQQ prices)                      │
│  lib/market/crypto.ts  → CoinGecko API (BTC price)                              │
│  lib/market/sentiment.ts → Alternative.me API (Fear & Greed)                    │
│  lib/market/macro.ts   → FRED API (Fed Funds, 10Y Treasury, UNRATE, DXY, CPI)  │
│                                                                                  │
│  ── Portfolio Analysis also reads ──                                             │
│  Supabase: portfolios, positions (user holdings + current prices)                │
│  app/dashboard/portfolio/_utils.ts → calculateUnrealizedPnL()                   │
│                                                                                  │
│  ── Learning Assistant also reads ──                                             │
│  Supabase: positions (symbol list for context)                                   │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│  Cron Job: /api/cron/ai-summary (Vercel Cron)                                   │
│                                                                                  │
│  Auth: CRON_SECRET bearer token                                                  │
│  Uses: createAdminClient() (service role)                                        │
│  Iterates all profiles → generates summary per user → inserts ai_summaries       │
│  Uses generateMarketSummary() (non-streaming) from lib/ai/market-summary.ts      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                  | Component  | Type             | Description                                                   |
| --------------------- | ---------- | ---------------- | ------------------------------------------------------------- |
| `/dashboard/insights` | `page.tsx` | Server Component | Main insights page with three tabs: Summary, Portfolio, Learn |

**Loading state**: No `loading.tsx` — the page fetches `getTodaySummary()` and `getUserAiConfig()` server-side via `Promise.all`. Each tab's client component manages its own loading/streaming state internally.

**Auto-refresh**: No automatic polling. Users manually trigger generation via the Refresh button (summary) or by sending messages (portfolio/learn).

**Sub-navigation**: Three tabs using shadcn `Tabs` component:

- **Market Summary** (default) — `MarketSummaryCard`
- **Portfolio Analysis** — `PortfolioAnalysis`
- **Learn** — `LearningChat`

The page header displays the active AI provider and model via a `Badge` (e.g. `openai/gpt-4.1-mini`).

---

## Why This Feature Exists — User Flows

#### AI Provider Badge (`page.tsx`)

**What the user sees**: A badge in the top-right corner showing `{provider}/{model}` (e.g. `ollama/qwen3.5:9b`), with a Bot icon.

**What the user can do**: Read-only indicator. Provider/model is configured in `/dashboard/settings`.

**Data source**: `getUserAiConfig()` server action reads `profiles` table.

**Why it matters**: The user knows which AI model is producing the analysis — important for understanding output quality and cost.

---

#### Daily Market Summary (`_components/market-summary-card.tsx`)

**What the user sees**: A card with a Sparkles icon header, titled "Daily Market Summary". If a cached summary exists for today, it renders immediately. Otherwise, an empty state with a "No summary yet" message and a Refresh button.

**What the user can do**:

- **Click Refresh**: Triggers `POST /api/ai/summary`. The response streams as NDJSON. If the model is a reasoning model, a "Thinking…" indicator with a pulsing Brain icon appears, followed by a collapsible chain-of-thought section showing character count and scrollable reasoning text. Content text streams in word by word below.
- **Toggle reasoning**: Click the Brain/ChevronRight toggle to expand or collapse the chain-of-thought `<pre>` block (max 192px tall, scrollable).

**Data source**: `POST /api/ai/summary` → `gatherMarketContext()` fetches live prices from Twelve Data (VOO, QQQ), CoinGecko (BTC), Alternative.me (Fear & Greed), and FRED (Fed Funds, 10Y Treasury, Unemployment, DXY, Inflation). All data is injected into `buildMarketSummaryPrompt()`.

**Why it matters**: Provides a quick morning briefing without opening multiple tabs — covers stock trends, crypto, sentiment, and macro indicators with an actionable takeaway for long-term DCA investors.

**States**:

- Empty: Centered Sparkles icon with "No summary yet. Click Refresh to generate your daily briefing."
- Loading (no reasoning): Three `Skeleton` bars (full width, 5/6, 4/6)
- Loading (reasoning phase): Pulsing Brain icon with "Thinking…" text, reasoning text streams in a collapsible `<pre>` box
- Streaming text: Content appears progressively in a `whitespace-pre-wrap` block
- Error: Inline error message replaces summary text (e.g. "Failed to generate summary. Please try again.")

---

#### Portfolio Analysis (`_components/portfolio-analysis.tsx`)

**What the user sees**: A chat-style card with a Briefcase icon header, titled "Portfolio Analysis". On mount, an initial analysis message is automatically sent: "Analyze my portfolio. What are the key risks, opportunities, and rebalancing actions I should consider?"

**What the user can do**:

- **Read initial analysis**: The AI responds with a personalized breakdown of portfolio risk, allocation drift, and rebalancing suggestions based on actual positions, current prices, and target allocations.
- **Send follow-up questions**: Type in the input field and press Enter or click Send. Messages are displayed in a chat bubble layout — user messages on the right (primary color), assistant messages on the left (muted color with Bot icon).
- **Toggle per-message reasoning**: Each assistant message may show a Brain icon toggle if the model produced reasoning tokens. Click to expand the thinking process in a scrollable `<pre>` block (max 128px).

**Data source**: `POST /api/ai/portfolio` → `buildPortfolioContext()` reads `profiles` (risk_tolerance, country, base_currency), `portfolios` (target_allocations), and `positions` (holdings). Current prices fetched from Twelve Data / CoinGecko. P&L calculated via `calculateUnrealizedPnL()` from `app/dashboard/portfolio/_utils.ts`.

**Why it matters**: Provides personalized, context-aware analysis rather than generic advice. Identifies concentration risk (e.g. 70% tech), allocation drift from targets, and suggests specific rebalancing actions.

**States**:

- Loading (initial or follow-up): Pulsing Brain icon with "Analyzing…", two `Skeleton` bars
- Loading (reasoning streaming): "Thinking…" indicator with pulsing Brain icon
- Error: Rose-colored error banner below messages: "Failed to get analysis. Please try again."
- Disclaimer: Always visible below the input field

---

#### Learning Assistant (`_components/learning-chat.tsx`)

**What the user sees**: A card with a GraduationCap icon header, titled "Learning Assistant". When no messages exist, starter question buttons are displayed alongside a description text.

**What the user can do**:

- **Click a starter question**: One of 5 predefined buttons — "What is DCA?", "How do ETFs work?", "Explain Bitcoin halving", "What is the P/E ratio?", "Is DCA better than lump sum?" — sends the question immediately.
- **Type a custom question**: Free-text input for any investing or financial topic.
- **Toggle per-message reasoning**: Same as Portfolio Analysis — Brain icon toggle per assistant message.

**Data source**: `POST /api/ai/learn` → server-side topic guard (`isFinancialTopic()`) checks the latest user message against a list of ~80 financial keywords. If non-financial, returns `NON_FINANCIAL_RESPONSE` as a single NDJSON text event without calling the AI model. If financial, reads `profiles` (country, base_currency) and `positions` (symbol list for context summary), builds a system prompt via `buildLearningSystemPrompt()`, then streams from the selected model.

**Why it matters**: On-demand financial education without leaving the dashboard. Context-aware — answers consider the user's country (Costa Rica), currency (USD), and actual portfolio holdings.

**States**:

- Empty: Description text + 5 starter question buttons
- Loading: Pulsing Brain icon with "Thinking…", two `Skeleton` bars
- Error: Rose-colored error banner: "Something went wrong. Please try again."
- Non-financial rejection: Plain text response from `NON_FINANCIAL_RESPONSE` (parsed as fallback when JSON parsing fails)
- Disclaimer: Always visible below the input field

---

#### AI Disclaimer (`_components/ai-disclaimer.tsx`)

**What the user sees**: A small amber-bordered banner with an AlertTriangle icon: "AI-generated analysis. Not financial advice. Always do your own research."

**What the user can do**: Read-only.

**Data source**: None — static component.

**Why it matters**: Legal and ethical requirement for any AI-generated financial content.

**States**: Single state — always rendered below Portfolio Analysis and Learning Assistant chat areas.

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function            | Zod Schema | Tables Read    | Tables Written | Returns                                                                     |
| ------------------- | ---------- | -------------- | -------------- | --------------------------------------------------------------------------- |
| `getTodaySummary()` | None       | `ai_summaries` | None           | `{ content, created_at, model_used } \| null`                               |
| `getUserAiConfig()` | None       | `profiles`     | None           | `{ ai_provider, ai_model, risk_tolerance, country, base_currency } \| null` |

#### `getTodaySummary()`

- **Auth**: Calls `createClient()` → `supabase.auth.getUser()`. Returns `null` if unauthenticated.
- **Validation**: None (read-only).
- **DB operations**: `SELECT content, created_at, model_used FROM ai_summaries WHERE user_id = $1 AND summary_date = $today` (`.single()`).
- **Return shape**: `{ content: string, created_at: string, model_used: string } | null`

#### `getUserAiConfig()`

- **Auth**: Calls `createClient()` → `supabase.auth.getUser()`. Returns `null` if unauthenticated.
- **Validation**: None (read-only).
- **DB operations**: `SELECT ai_provider, ai_model, risk_tolerance, country, base_currency FROM profiles WHERE id = $user_id` (`.single()`).
- **Return shape**: `{ ai_provider: string, ai_model: string, risk_tolerance: string, country: string, base_currency: string } | null`

---

### API Routes (`app/api/ai/...`)

| Method | Path                | Auth | Request Body                      | Response          | External APIs                                               |
| ------ | ------------------- | ---- | --------------------------------- | ----------------- | ----------------------------------------------------------- |
| `POST` | `/api/ai/summary`   | Yes  | None                              | NDJSON stream     | Twelve Data, CoinGecko, Alternative.me, FRED, OpenAI/Ollama |
| `POST` | `/api/ai/portfolio` | Yes  | `{ messages: [{role, content}] }` | NDJSON stream     | Twelve Data, CoinGecko, OpenAI/Ollama                       |
| `POST` | `/api/ai/learn`     | Yes  | `{ messages: [{role, content}] }` | NDJSON stream     | OpenAI/Ollama                                               |
| `GET`  | `/api/ai/health`    | No   | None                              | `{ ok: boolean }` | Ollama (connectivity check)                                 |

#### `POST /api/ai/summary`

- **Auth**: `createClient()` → `supabase.auth.getUser()`. Returns 401 if unauthenticated.
- **Rate limiting**: None.
- **Cache behavior**: No caching in the API route. The cron job caches to `ai_summaries`. This endpoint always generates fresh.
- **Error response**: Plain text body with status 500 on AI failure.
- **Flow**: Reads user AI preferences from `profiles` → calls `gatherMarketContext()` (parallel `Promise.allSettled` for 9 market data points) → `buildMarketSummaryPrompt()` → `streamText()` with `maxOutputTokens: 500`, `temperature: 0.7` → `createAiNdjsonStream(result.fullStream)` → `ndjsonResponse()`.

#### `POST /api/ai/portfolio`

- **Auth**: `createClient()` → `supabase.auth.getUser()`. Returns 401 if unauthenticated.
- **Rate limiting**: None.
- **Cache behavior**: None.
- **Error response**: Plain text body with status 500 on AI failure.
- **Flow**: Reads AI preferences from `profiles` → `buildPortfolioContext(user.id)` reads `profiles`, `portfolios`, `positions`, fetches current prices → `buildPortfolioAnalysisSystem()` creates system prompt → `streamText()` with `system` + `messages`, `maxOutputTokens: 800`, `temperature: 0.7` → `createAiNdjsonStream()` → `ndjsonResponse()`.

#### `POST /api/ai/learn`

- **Auth**: `createClient()` → `supabase.auth.getUser()`. Returns 401 if unauthenticated.
- **Rate limiting**: None.
- **Cache behavior**: None.
- **Topic guard**: Extracts last user message → `isFinancialTopic()`. If non-financial, returns a single NDJSON event `{ type: 'text', text: NON_FINANCIAL_RESPONSE }` without calling the AI model.
- **Error response**: Plain text body with status 500 on AI failure.
- **Flow**: Reads AI preferences from `profiles` → reads `positions` for portfolio summary context → `buildLearningSystemPrompt()` → `streamText()` with `system` + `messages`, `maxOutputTokens: 600`, `temperature: 0.7` → `createAiNdjsonStream()` → `ndjsonResponse()`.

#### `GET /api/ai/health`

- **Auth**: None (public endpoint).
- **Flow**: Sends a GET request to `OLLAMA_BASE_URL` (default `http://localhost:11434`) with a 3-second timeout. Returns `{ ok: true }` if reachable, `{ ok: false }` otherwise.

---

### Cron Jobs (`app/api/cron/ai-summary/`)

| Schedule    | Route                  | What It Does                            | Tables Affected                                 | External APIs                                               |
| ----------- | ---------------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Vercel Cron | `/api/cron/ai-summary` | Generates daily market summary per user | `profiles` (read), `ai_summaries` (read/insert) | Twelve Data, CoinGecko, Alternative.me, FRED, OpenAI/Ollama |

#### `GET /api/cron/ai-summary`

- **Auth**: `authorization` header must equal `Bearer ${CRON_SECRET}`.
- **Runtime**: Edge (`export const runtime = 'edge'`).
- **Flow**:
  1. Reads all profiles via `createAdminClient()` (service role, bypasses RLS).
  2. Gathers market context once via `gatherMarketContext()` (same parallel fetch as the summary API route).
  3. Iterates each profile — skips if `ai_summaries` already has a row for that `user_id` + today's date.
  4. Calls `generateMarketSummary(provider, model, ctx)` (non-streaming `generateText`) per user.
  5. Inserts result into `ai_summaries` with `model_used` set to `{provider}/{model}`.
- **Response**: `{ processed: number, generated: number }`.

---

### External APIs

##### Twelve Data

| Detail                  | Value                                            |
| ----------------------- | ------------------------------------------------ |
| Base URL                | `https://api.twelvedata.com`                     |
| Auth                    | `TWELVE_DATA_API_KEY` via query param `apikey`   |
| Free tier limit         | 800 requests/day (internal threshold: 750)       |
| Cache TTL               | Via `lib/market/cache.ts` (in-memory + Supabase) |
| Fallback if unavailable | Stale data from `market_cache` Supabase table    |

**Endpoints called:**

| Endpoint     | Parameters         | Returns             | Used for        |
| ------------ | ------------------ | ------------------- | --------------- |
| `GET /price` | `symbol`, `apikey` | `{ price: number }` | VOO, QQQ prices |

##### CoinGecko

| Detail                  | Value                                         |
| ----------------------- | --------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`            |
| Auth                    | None (public API)                             |
| Free tier limit         | 10-30 calls/minute                            |
| Cache TTL               | Via `lib/market/cache.ts`                     |
| Fallback if unavailable | Stale data from `market_cache` Supabase table |

**Endpoints called:**

| Endpoint            | Parameters                           | Returns                                     | Used for  |
| ------------------- | ------------------------------------ | ------------------------------------------- | --------- |
| `GET /simple/price` | `ids=bitcoin`, `vs_currencies`, etc. | `{ bitcoin: { usd, usd_market_cap, ... } }` | BTC price |

##### Alternative.me (Fear & Greed Index)

| Detail                  | Value                                         |
| ----------------------- | --------------------------------------------- |
| Base URL                | `https://api.alternative.me/fng`              |
| Auth                    | None (public API)                             |
| Free tier limit         | Unlimited                                     |
| Cache TTL               | Via `lib/market/cache.ts`                     |
| Fallback if unavailable | Stale data from `market_cache` Supabase table |

**Endpoints called:**

| Endpoint | Parameters | Returns                                                  | Used for            |
| -------- | ---------- | -------------------------------------------------------- | ------------------- |
| `GET /`  | `limit=1`  | `{ data: [{ value, value_classification, timestamp }] }` | Crypto Fear & Greed |

##### FRED (Federal Reserve Economic Data)

| Detail                  | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| Base URL                | `https://api.stlouisfed.org/fred/series/observations` |
| Auth                    | `FRED_API_KEY` via query param `api_key`              |
| Free tier limit         | 120 requests/minute                                   |
| Cache TTL               | Via `lib/market/cache.ts`                             |
| Fallback if unavailable | Stale data from `market_cache` Supabase table         |

**Endpoints called:**

| Endpoint                        | Parameters                                      | Returns                             | Used for                      |
| ------------------------------- | ----------------------------------------------- | ----------------------------------- | ----------------------------- |
| `GET /fred/series/observations` | `series_id=FEDFUNDS`, `api_key`, `sort_order`   | `{ observations: [{date, value}] }` | Federal Funds Rate            |
| `GET /fred/series/observations` | `series_id=DGS10`                               | Same shape                          | 10-Year Treasury Yield        |
| `GET /fred/series/observations` | `series_id=UNRATE`                              | Same shape                          | Unemployment Rate             |
| `GET /fred/series/observations` | `series_id=DTWEXBGS` (via `fetchDXY`)           | Same shape                          | US Dollar Index (DXY)         |
| `GET /fred/series/observations` | `series_id=CPIAUCSL` (via `fetchInflationRate`) | Same shape                          | YoY Inflation Rate (computed) |

##### OpenAI

| Detail                  | Value                                 |
| ----------------------- | ------------------------------------- |
| Base URL                | OpenAI default (via `@ai-sdk/openai`) |
| Auth                    | `OPENAI_API_KEY` via SDK config       |
| Free tier limit         | Pay-per-token                         |
| Cache TTL               | None                                  |
| Fallback if unavailable | Error displayed in UI                 |

**Models used:** `gpt-4.1-mini`

##### Ollama (Local)

| Detail                  | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| Base URL                | `OLLAMA_BASE_URL` (default `http://localhost:11434/v1`)  |
| Auth                    | None (local)                                             |
| Free tier limit         | Unlimited (hardware-bound)                               |
| Cache TTL               | None                                                     |
| Fallback if unavailable | Warning via `/api/ai/health`: "Cannot connect to Ollama" |

**Models used:** `qwen3.5:9b` (with `think: true` injected via custom fetch, `max_tokens` stripped)

---

### NDJSON Streaming Protocol (`lib/ai/stream.ts`)

All three AI API routes use `createAiNdjsonStream()` which wraps Vercel AI SDK's `fullStream` into newline-delimited JSON:

| Event Type  | Source                                                                       | Content                         |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------- |
| `reasoning` | `reasoning-delta` part (native) or `<think>...</think>` tags in `text-delta` | Model's chain-of-thought tokens |
| `text`      | `text-delta` part (after `</think>`)                                         | Final response content          |
| `error`     | Caught exception in stream                                                   | Error message string            |

**`<think>` tag parsing**: When a model (e.g. `qwen3.5:9b` via Ollama) embeds thinking inside `<think>...</think>` tags within text deltas, `createAiNdjsonStream` parses them server-side into `reasoning` events. If the provider sends native `reasoning-delta` events (e.g. OpenAI o-series), those are forwarded directly and `<think>` parsing is skipped.

**Response helper**: `ndjsonResponse(stream)` wraps the `ReadableStream` in a `Response` with `Content-Type: application/x-ndjson; charset=utf-8`.

---

### Zod Schemas

The insights feature does not define its own `_schema.ts`. It relies on schemas from `lib/`:

##### `StockPriceSchema` → `type StockPrice` (from `lib/market/stocks.ts`)

| Field       | Type     | Constraints  | Description          |
| ----------- | -------- | ------------ | -------------------- |
| `symbol`    | `string` | —            | Ticker symbol        |
| `price`     | `number` | `positive()` | Current price in USD |
| `timestamp` | `string` | —            | Price timestamp      |
| `currency`  | `string` | `optional()` | Currency code        |

##### `BitcoinPriceSchema` → `type BitcoinPrice` (from `lib/market/crypto.ts`)

| Field              | Type             | Constraints             | Description              |
| ------------------ | ---------------- | ----------------------- | ------------------------ |
| `priceUsd`         | `number`         | `positive()`            | BTC price in USD         |
| `priceCrc`         | `number \| null` | `positive().nullable()` | BTC price in CRC         |
| `marketCap`        | `number`         | `positive()`            | Market capitalization    |
| `volume24h`        | `number`         | `nonnegative()`         | 24-hour trading volume   |
| `percentChange24h` | `number`         | —                       | 24h percent change       |
| `lastUpdated`      | `string`         | —                       | Timestamp of last update |

##### `FearGreedSchema` → `type FearGreed` (from `lib/market/sentiment.ts`)

| Field            | Type     | Constraints                     | Description                                         |
| ---------------- | -------- | ------------------------------- | --------------------------------------------------- |
| `value`          | `number` | `min(0).max(100)`               | Index value (0 = Extreme Fear, 100 = Extreme Greed) |
| `classification` | `string` | `enum(SentimentClassification)` | Human-readable label                                |
| `timestamp`      | `string` | —                               | Data timestamp                                      |

##### `MacroIndicatorSchema` → `type MacroIndicator` (from `lib/market/macro.ts`)

| Field   | Type     | Constraints | Description                                |
| ------- | -------- | ----------- | ------------------------------------------ |
| `name`  | `string` | —           | Indicator name (e.g. "Federal Funds Rate") |
| `value` | `number` | —           | Current value                              |
| `date`  | `string` | —           | Observation date                           |
| `unit`  | `string` | —           | Unit string (e.g. "%")                     |

---

## Database Schema

#### `ai_summaries`

**Created in**: `supabase/migrations/20260323000000_ai_provider_and_summaries.sql`

| Column         | Type          | Nullable | Default             | Description                                        |
| -------------- | ------------- | -------- | ------------------- | -------------------------------------------------- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | Primary key                                        |
| `user_id`      | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE            |
| `summary_date` | `date`        | No       | `current_date`      | Date of the summary                                |
| `content`      | `text`        | No       | —                   | AI-generated summary text                          |
| `model_used`   | `text`        | No       | —                   | Provider/model string (e.g. `openai/gpt-4.1-mini`) |
| `created_at`   | `timestamptz` | No       | `now()`             | Row creation timestamp                             |

**Unique constraint**: `(user_id, summary_date)` — one summary per user per day.

**RLS Policies:**

| Policy                         | Operation | Condition              |
| ------------------------------ | --------- | ---------------------- |
| Users can view own summaries   | SELECT    | `auth.uid() = user_id` |
| Users can insert own summaries | INSERT    | `auth.uid() = user_id` |
| Users can update own summaries | UPDATE    | `auth.uid() = user_id` |
| Users can delete own summaries | DELETE    | `auth.uid() = user_id` |

**Indexes**: None beyond the primary key and unique constraint.

**Triggers**: None.

**Written by**: `GET /api/cron/ai-summary` (via `createAdminClient()`)
**Read by**: `getTodaySummary()` in `_actions.ts`, `page.tsx`

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "summary_date": "2026-04-04",
  "content": "Markets showed mixed signals today. The S&P 500 (VOO) closed at $485.30, continuing its steady climb. The Nasdaq 100 (QQQ) held at $412.75. Bitcoin pulled back to $87,500 (-2.1% in 24h), with the Crypto Fear & Greed Index at 42 (Fear). The Fed Funds Rate remains at 4.25% with the 10-Year Treasury at 4.15%. For DCA investors, the fearful crypto sentiment could present an accumulation opportunity while equity markets remain constructive.",
  "model_used": "ollama/qwen3.5:9b",
  "created_at": "2026-04-04T14:00:00.000Z"
}
```

#### `profiles` (AI-related columns only)

**Modified in**: `supabase/migrations/20260323000000_ai_provider_and_summaries.sql`

| Column        | Type   | Nullable | Default          | Description                            |
| ------------- | ------ | -------- | ---------------- | -------------------------------------- |
| `ai_provider` | `text` | No       | `'openai'`       | AI provider (`'openai'` or `'ollama'`) |
| `ai_model`    | `text` | No       | `'gpt-4.1-mini'` | Model identifier string                |

**Check constraint**: `ai_provider IN ('openai', 'ollama')`

**Read by**: `getUserAiConfig()` in `_actions.ts`, all three AI API routes, `/api/cron/ai-summary`
**Written by**: `app/dashboard/settings/_actions.ts` (profile update)

---

### Relationships

```
auth.users(id)
    │
    ├──→ profiles.id (1:1)
    │       └── ai_provider, ai_model (used by all AI features)
    │
    ├──→ ai_summaries.user_id (1:many, unique per date)
    │
    ├──→ portfolios.user_id (1:many)
    │       └──→ positions.portfolio_id (1:many)
    │               └── Used by /api/ai/portfolio to build context
    │
    └──→ positions.user_id (1:many)
            └── Used by /api/ai/learn for portfolio summary context
```

---

## Testing

#### `lib/ai/__tests__/market-summary.test.ts`

| Describe Block             | Tests | Key Edge Cases                                                                             |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `buildMarketSummaryPrompt` | 8     | All data null (empty context), positive/negative BTC change, inflation rate present/absent |

#### `lib/ai/__tests__/learning-assistant.test.ts`

| Describe Block              | Tests | Key Edge Cases                                                  |
| --------------------------- | ----- | --------------------------------------------------------------- |
| `isFinancialTopic`          | 5     | Non-financial rejection ("Write me a poem"), case-insensitivity |
| `buildLearningSystemPrompt` | 4     | Portfolio summary present vs null, country/currency injection   |
| `STARTER_QUESTIONS`         | 2     | All starters pass the financial topic filter, minimum count     |

#### `lib/ai/__tests__/portfolio-analysis.test.ts`

| Describe Block                 | Tests | Key Edge Cases                                                                  |
| ------------------------------ | ----- | ------------------------------------------------------------------------------- |
| `buildPortfolioAnalysisSystem` | 6     | Empty positions, negative P&L sign formatting, target allocation present/absent |

#### `lib/ai/__tests__/provider.test.ts`

| Describe Block    | Tests | Key Edge Cases                                    |
| ----------------- | ----- | ------------------------------------------------- |
| `AI_PROVIDERS`    | 1     | Contains openai and ollama                        |
| `MODEL_REGISTRY`  | 2     | Maps correctly to model lists                     |
| `getDefaultModel` | 2     | Correct defaults per provider                     |
| `isValidModel`    | 4     | Cross-provider rejection (ollama model in openai) |

**Run this feature's tests:**

```bash
npm test -- lib/ai
```

**Test gaps**:

- No tests for `createAiNdjsonStream()` in `lib/ai/stream.ts` (`<think>` tag parsing, native reasoning forwarding, error handling)
- No tests for `ndjsonResponse()` helper
- No tests for API route handlers (`/api/ai/summary`, `/api/ai/portfolio`, `/api/ai/learn`)
- No tests for `_actions.ts` (`getTodaySummary`, `getUserAiConfig`) — pure Supabase reads, consistent with project convention of not mocking Supabase
- No tests for the cron job route (`/api/cron/ai-summary`)
- No tests for `isReasoningModel()` or `getOllamaBaseUrl()` in `provider.ts`
- No colocated `__tests__/` directory under `app/dashboard/insights/`

---

## File Tree

```
app/dashboard/insights/
├── page.tsx                        # Server Component — fetches summary + AI config, renders Tabs
├── _actions.ts                     # getTodaySummary(), getUserAiConfig()
└── _components/
    ├── market-summary-card.tsx     # Client — streaming summary with reasoning toggle
    ├── portfolio-analysis.tsx      # Client — chat interface for portfolio AI analysis
    ├── learning-chat.tsx           # Client — chat interface for financial education
    └── ai-disclaimer.tsx           # Server — static disclaimer banner

# AI API routes:
app/api/ai/
├── summary/
│   └── route.ts                    # POST — stream market summary
├── portfolio/
│   └── route.ts                    # POST — stream portfolio analysis chat
├── learn/
│   └── route.ts                    # POST — stream learning assistant chat
└── health/
    └── route.ts                    # GET — Ollama connectivity check

# Cron job:
app/api/cron/ai-summary/
└── route.ts                        # GET — daily summary generation for all users

# Shared AI library:
lib/ai/
├── provider.ts                     # Model registry, getLanguageModel(), reasoning model config
├── stream.ts                       # createAiNdjsonStream(), ndjsonResponse()
├── market-summary.ts               # buildMarketSummaryPrompt(), generateMarketSummary(), streamMarketSummary()
├── portfolio-analysis.ts           # buildPortfolioAnalysisSystem(), PortfolioContext types
├── learning-assistant.ts           # buildLearningSystemPrompt(), isFinancialTopic(), STARTER_QUESTIONS
└── __tests__/
    ├── market-summary.test.ts
    ├── portfolio-analysis.test.ts
    ├── learning-assistant.test.ts
    └── provider.test.ts

# Market data (used by summary + portfolio):
lib/market/
├── stocks.ts                       # fetchPrice() — Twelve Data
├── crypto.ts                       # fetchBitcoinPrice() — CoinGecko
├── sentiment.ts                    # fetchCryptoFearGreed() — Alternative.me
├── macro.ts                        # fetchLatestIndicator(), fetchDXY(), fetchInflationRate() — FRED
└── cache.ts                        # getCached(), getStaleFromSupabaseCache()

# Portfolio utils (used by /api/ai/portfolio):
app/dashboard/portfolio/
└── _utils.ts                       # calculateUnrealizedPnL()

# Database migration:
supabase/migrations/
└── 20260323000000_ai_provider_and_summaries.sql
```

---

## Known Limitations

- **No `loading.tsx`**: The insights route has no Suspense fallback. The server-side `Promise.all([getTodaySummary(), getUserAiConfig()])` blocks rendering until both resolve. If Supabase is slow, the page appears blank until data arrives.
- **No `error.tsx`**: No error boundary — if the server actions fail, the page will show the dashboard-level error boundary.
- **No rate limiting on AI API routes**: All three POST endpoints (`/api/ai/summary`, `/api/ai/portfolio`, `/api/ai/learn`) have no rate limiting. A user could spam requests and exhaust OpenAI credits or overwhelm the Ollama server.
- **Summary cron schedule not configured in codebase**: The `vercel.json` file does not exist. The cron schedule for `/api/cron/ai-summary` must be configured in the Vercel dashboard or via a `vercel.json` that hasn't been committed.
- **Limited model selection**: `OPENAI_MODELS` only includes `gpt-4.1-mini` and `OLLAMA_MODELS` only includes `qwen3.5:9b`. The SPECS Gherkin scenario mentions `gpt-4.1-nano`, `gpt-4.1`, and `o4-mini` for OpenAI, but these are not in the `MODEL_REGISTRY`.
- **No persistent chat history**: Portfolio Analysis and Learning Assistant chat messages are stored only in React state. Refreshing the page loses all conversation history.
- **Twelve Data rate limit**: Hardcoded threshold of 750 requests/day (out of 800 free tier). The portfolio API route fetches prices per position, so a user with many positions could consume multiple requests per AI interaction.
- **Topic guard keyword list**: `isFinancialTopic()` uses a static list of ~80 keywords. Questions that use uncommon financial terminology or are phrased without keywords may be incorrectly rejected.
- **No request body validation**: The `/api/ai/portfolio` and `/api/ai/learn` routes parse `req.json()` without Zod validation. Malformed `messages` arrays could cause runtime errors.
- **Single summary per day**: The `ai_summaries` unique constraint on `(user_id, summary_date)` means the manual Refresh button in the UI streams fresh content but does not persist it — only the cron job writes to the table. The cached summary shown on page load never updates from manual refreshes.
