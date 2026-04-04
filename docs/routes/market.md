# E3: Market Data Engine

> The Market Data Engine aggregates real-time and historical financial data from five external APIs — Twelve Data (stocks/ETFs), CoinGecko (crypto), Alternative.me (sentiment), FRED (US macro), and BCCR (Costa Rica macro) — into a single dashboard page. It provides a Costa Rica-based VOO/QQQ/BTC investor with live asset prices, crypto Fear & Greed sentiment, US and Costa Rican macro indicators, and USD/CRC exchange rate trends, all backed by a two-tier cache (in-memory + Supabase) to minimize API calls and respect free-tier rate limits.

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
┌───────────────────────────────────────┐
│  /dashboard/market (Server Component) │
│  page.tsx                             │
│                                       │
│  fetchMarketData()  ───┐              │
│  fetchMacroData()  ────┤  Promise.all │
│  fetchCrMacroData() ───┘              │
└────────┬──────────────────────────────┘
         │ props
         ▼
┌───────────────────────────────────────────────────────┐
│  Client Components ('use client')                     │
│                                                       │
│  PriceCards ─────────── VOO, QQQ, BTC prices          │
│  FearGreedGauge ─────── Radial sentiment chart        │
│  MacroIndicators ────── FRED grid (rate, yield, etc.) │
│  CrMacroIndicators ──── BCCR grid (USD/CRC, TPM)      │
│  ExchangeRateChart ──── Recharts AreaChart (30d)      │
│  ErrorToasts ────────── Sonner toast for errors       │
└───────────────────────────────────────────────────────┘
         │ data fetched via
         ▼
┌───────────────────────────────────────────────────────────┐
│  lib/market/                                              │
│                                                           │
│  stocks.ts ──────▶ Twelve Data API                        │
│    fetchPrice()       https://api.twelvedata.com          │
│    fetchHistory()                                         │
│    isUsingCachedData()                                    │
│                                                           │
│  crypto.ts ──────▶ CoinGecko API                          │
│    fetchBitcoinPrice()  https://api.coingecko.com/api/v3  │
│    fetchBitcoinHistory()                                  │
│    fetchUsdCrcRate()                                      │
│    fetchCoinHistoricalPrice()                             │
│    fetchCoinMarketChart()                                 │
│    fetchCoinsMarkets()                                    │
│                                                           │
│  sentiment.ts ───▶ Alternative.me API                     │
│    fetchCryptoFearGreed()  https://api.alternative.me/fng │
│    fetchCryptoFearGreedHistory()                          │
│                                                           │
│  macro.ts ───────▶ FRED API + Twelve Data (DXY)           │
│    fetchFredSeries()  https://api.stlouisfed.org/fred     │
│    fetchLatestIndicator()                                 │
│    fetchDXY()        (via stocks.ts → Twelve Data)        │
│    fetchInflationRate()                                   │
│                                                           │
│  bccr.ts ────────▶ BCCR SDDE API                          │
│    fetchBccrIndicator()  https://apim.bccr.fi.cr/SDDE     │
│    fetchExchangeRateHistory()                             │
│                                                           │
│  cache.ts ───────▶ In-memory Map + Supabase               │
│    getCached()           market_cache table               │
│    getStaleFromSupabaseCache()                            │
│    incrementRequestCount() api_request_counts table       │
│    getRequestCount()                                      │
│                                                           │
│  sentiment-shared.ts  Pure client-safe helpers            │
│    classifySentiment()                                    │
│    getSentimentColor()                                    │
│    getSentimentBgColor()                                  │
│                                                           │
│  index.ts ───────  Barrel re-exports                      │
└───────────────────────────────────────────────────────────┘
         │ reads/writes
         ▼
┌───────────────────────────────────────────┐
│  Supabase (Postgres)                      │
│                                           │
│  market_cache ──── JSON cache with TTL    │
│  api_request_counts ── daily rate tracker │
└───────────────────────────────────────────┘
```

**Data flow summary:** `page.tsx` (Server Component) calls `lib/market/*` functions directly at render time. Each lib function checks the in-memory cache → Supabase `market_cache` → external API. Stale data is served as fallback on any error. Client components receive the resolved data as props.

---

## Pages & Navigation

| Path                | Component  | Type             | Description                                                                        |
| ------------------- | ---------- | ---------------- | ---------------------------------------------------------------------------------- |
| `/dashboard/market` | `page.tsx` | Server Component | Main market data page — fetches all data server-side and renders five cards/charts |

### Loading state

`loading.tsx` exists and renders a full skeleton layout: header skeleton, 3 price card skeletons (grid), a circular skeleton for the gauge, and a 2×2 grid of indicator skeletons.

### Auto-refresh

No client-side polling. The page relies on server-side rendering with fresh data on each navigation. Cron job `market-prefetch` warms the cache every 5 minutes.

### Sub-navigation

None. The market page is a single flat page with no tabs or nested routes.

---

## Why This Feature Exists — User Flows

#### Price Cards (`_components/price-cards.tsx`)

**What the user sees**: Three cards in a responsive grid (2-col on md, 3-col on lg). Each card shows the asset name, a color-coded badge (VOO=blue, QQQ=purple, BTC=orange), and the current price formatted in the user's base currency. The Bitcoin card additionally shows 24h percentage change (green/red), CRC conversion if available, market cap, and 24h volume. An amber "Using cached data" badge appears below all cards when the Twelve Data API is near its daily limit.

**What the user can do**:

- View current prices for VOO, QQQ, and BTC at a glance
- See the Bitcoin 24h price change to assess short-term momentum
- Hover the info tooltip for educational context about each asset

**Data source**: `fetchPrice('VOO')`, `fetchPrice('QQQ')`, `fetchBitcoinPrice()`, `isUsingCachedData()` called in `fetchMarketData()` in `page.tsx`

**Why it matters**: Immediate visibility into the three core investment assets without switching between brokerage apps. The CRC conversion helps a Costa Rican investor understand local purchasing power.

**States**:

- Empty: Individual cards are omitted if their fetch returned null (partial rendering)
- Loading: `PriceCardSkeleton` — card outlines with shimmer placeholders for price and badge
- Error: Toast notification via `ErrorToasts`; the card is simply absent

---

#### Crypto Fear & Greed Gauge (`_components/fear-greed-gauge.tsx`)

**What the user sees**: A card with a radial bar chart (Recharts `RadialBarChart`) showing the current Fear & Greed value (0–100) as a half-circle gauge. The numeric value is centered inside the gauge. A color-coded badge shows the classification text (Extreme Fear/Fear/Neutral/Greed/Extreme Greed). Colors range from rose (fear) through zinc (neutral) to emerald (greed).

**What the user can do**:

- Read the sentiment score to gauge whether crypto markets are fearful or greedy
- Hover the info tooltip for explanation of what the index measures and how to interpret it

**Data source**: `fetchCryptoFearGreed()` called in `fetchMarketData()` in `page.tsx`

**Why it matters**: Fear & Greed is a contrarian indicator — Extreme Fear often signals buying opportunities, Extreme Greed may indicate an overheated market. Helps time DCA increases or pauses.

**States**:

- Empty: "Sentiment data unavailable" centered text
- Loading: `FearGreedGaugeSkeleton` — circular shimmer placeholder
- Error: Toast notification; falls through to the empty state
- Cached: Optional `cacheAge` prop shows amber "Cached data (age)" text

---

#### Macro Indicators (`_components/macro-indicators.tsx`)

**What the user sees**: A card titled "Macro Indicators" with a 2×2 grid of indicator tiles. Each tile shows the indicator name, a bold numeric value with unit, the date of the most recent observation, and a trend icon (up/down/flat). Indicators displayed: Federal Funds Rate (%), 10-Year Treasury Yield (%), Unemployment Rate (%), US Dollar Index (DXY, index). A fifth highlighted tile (amber border) shows YoY Inflation calculated from 12 months of CPI data.

**What the user can do**:

- Monitor the macro environment affecting equity and crypto markets
- See the trend direction via up/down icons (red if rate >3%, green if <1%)
- Hover the info tooltip for explanation of each indicator's market impact

**Data source**: `fetchLatestIndicator('FEDFUNDS')`, `fetchLatestIndicator('DGS10')`, `fetchLatestIndicator('UNRATE')`, `fetchDXY()`, `fetchInflationRate()` called in `fetchMacroData()` in `page.tsx`

**Why it matters**: Rising rates and yields pressure equity valuations; a strong DXY can suppress Bitcoin prices; inflation trends affect purchasing power of CRC-denominated savings.

**States**:

- Empty: "Macro data unavailable" centered text
- Loading: `MacroIndicatorsSkeleton` — 5 shimmer tiles in a 2×2 grid
- Error: Toast notification only if ALL indicators failed (partial data still renders)

---

#### Costa Rican Macro Indicators (`_components/cr-macro-indicators.tsx`)

**What the user sees**: A card titled "Costa Rican Macro Indicators" with a 2×2 grid. Indicators: USD/CRC Sell Rate (₡), USD/CRC Buy Rate (₡), Monetary Policy Rate (TPM, %), Basic Passive Rate (TBP, %). Exchange rate tiles have a sky-blue highlight border. Each tile shows the name, formatted value, and date.

**What the user can do**:

- Track the official BCCR exchange rates to time colón ↔ dollar conversions
- Monitor Costa Rican interest rates that affect local savings and CRC deposit yields
- Hover the info tooltip for explanation of BCCR data sources

**Data source**: `fetchBccrIndicator(id)` for each of `USD_CRC_SELL`, `USD_CRC_BUY`, `TPM`, `TBP` called in `fetchCrMacroData()` in `page.tsx`

**Why it matters**: As a Costa Rica-based investor holding USD-denominated assets (VOO, QQQ, BTC), the exchange rate directly affects the real return when converting back to colones.

**States**:

- Empty: "BCCR data unavailable — check BCCR_SDDE_TOKEN env var" centered text
- Loading: `CrMacroSkeleton` — 4 shimmer tiles in a 2×2 grid
- Error: Toast notification if all indicators failed

---

#### USD/CRC Exchange Rate Chart (`_components/exchange-rate-chart.tsx`)

**What the user sees**: A card with a Recharts `AreaChart` plotting 30 days of USD/CRC buy and sell rates. The sell line (Venta) is solid amber; the buy line (Compra) is dashed blue. The header shows the current sell rate in large bold text and a trend badge with percentage change over the 30-day period (green = colón strengthening, rose = weakening). Below the chart: current buy rate, sell rate, and the spread between them.

**What the user can do**:

- Visually track the colón trend over the last month
- Hover data points to see exact buy/sell rates on specific dates via Recharts tooltip
- Read the spread to understand the cost of currency conversion

**Data source**: `fetchExchangeRateHistory(30)` called in `fetchCrMacroData()` in `page.tsx`

**Why it matters**: Timing currency conversions around favorable rate trends can save significant amounts on large investment transfers between CRC and USD.

**States**:

- Empty: "Exchange rate data unavailable — check BCCR_SDDE_TOKEN env var" centered text
- Loading: `ExchangeRateChartSkeleton` — header skeletons + 300px chart shimmer
- Error: Toast notification; falls through to empty state

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

None. The market route has no `_actions.ts` — all data is fetched at render time directly from `lib/market/*` functions in the Server Component.

### API Routes (`app/api/market/...`)

| Method | Path                            | Auth                 | Query Params                                                                                       | Response                                             | External APIs           |
| ------ | ------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| `GET`  | `/api/market/price/[symbol]`    | Supabase `getUser()` | —                                                                                                  | `{ symbol, price, timestamp, currency, cachedData }` | Twelve Data             |
| `GET`  | `/api/market/history/[symbol]`  | Supabase `getUser()` | `interval` (default `1day`), `outputsize` (default `30`)                                           | `{ symbol, values: OHLCVPoint[], cachedData }`       | Twelve Data             |
| `GET`  | `/api/market/crypto/[coinId]`   | Supabase `getUser()` | `type` (`price`/`markets`/`historical-price`/`market-chart`/`history`), `date`, `days`, `interval` | Varies by type                                       | CoinGecko               |
| `GET`  | `/api/market/sentiment`         | Supabase `getUser()` | `days` (if provided → history, else current)                                                       | `FearGreed` or `FearGreedHistory`                    | Alternative.me          |
| `GET`  | `/api/market/macro/[seriesId]`  | Supabase `getUser()` | —                                                                                                  | `FredSeries` or `MacroIndicator`                     | FRED, Twelve Data (DXY) |
| `GET`  | `/api/market/bccr`              | Supabase `getUser()` | `type` (`indicators`/`exchange-history`), `days` (1–365)                                           | `BccrIndicator[]` or `ExchangeRatePoint[]`           | BCCR SDDE               |
| `GET`  | `/api/market/exchange-rate`     | Supabase `getUser()` | —                                                                                                  | `{ rate: number }`                                   | CoinGecko (derived)     |
| `GET`  | `/api/market/bitcoin/onchain`   | Supabase `getUser()` | —                                                                                                  | `{ blockHeight, hashrate, mempool, difficulty }`     | mempool.space           |
| `GET`  | `/api/market/bitcoin/valuation` | Supabase `getUser()` | `model` (`mvrv`/`s2f`/`rainbow`, optional)                                                         | Valuation model data (single or all)                 | CoinGecko               |

All routes follow the same pattern:

- **Auth**: `createClient()` → `supabase.auth.getUser()` → 401 JSON if `!user`
- **Error response**: `{ error: string }` with status 400 (validation) or 500 (server)
- **Partial failure**: Routes with multiple fetches use `Promise.allSettled` and return `null` for failed sub-calls
- **No rate limiting**: Relies on cache TTLs and the Twelve Data request counter
- **No POST/PUT/DELETE**: All routes are read-only `GET`

#### Crypto Route Validation (`/api/market/crypto/[coinId]`)

- `ALLOWED_COIN_IDS`: `bitcoin`, `ethereum`, `solana`
- `type=historical-price` requires `date` in `yyyy-MM-dd` format (regex validated)
- `type=market-chart` requires `days` between 1 and 365
- `type=markets` splits `coinId` as comma-separated list, filters against allowlist

#### Macro Route Validation (`/api/market/macro/[seriesId]`)

- `VALID_SERIES`: `FEDFUNDS`, `DGS10`, `CPIAUCSL`, `UNRATE`, `DXY`
- Series ID is uppercased before validation

#### BCCR Route Validation (`/api/market/bccr`)

- `type` must be `indicators` or `exchange-history`
- `days` must be between 1 and 365 for exchange history

### Cron Jobs (`app/api/cron/...`)

| Schedule      | Route                       | What It Does                                                                        | Tables Affected                      | External APIs                          |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `*/5 * * * *` | `/api/cron/market-prefetch` | Warms cache by pre-fetching VOO, QQQ, BTC prices and Fear & Greed index             | `market_cache`, `api_request_counts` | Twelve Data, CoinGecko, Alternative.me |
| `0 3 * * *`   | `/api/cron/cache-cleanup`   | Deletes stale `market_cache` rows (>7 days) and old `api_request_counts` (>30 days) | `market_cache`, `api_request_counts` | None                                   |

Both cron routes:

- Use `runtime = 'edge'` and `dynamic = 'force-dynamic'`
- Authenticate via `Authorization: Bearer ${CRON_SECRET}` header
- Return a JSON summary of successes/failures
- Use `Promise.allSettled` for graceful partial failure

### External APIs

##### Twelve Data

| Detail                  | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Base URL                | `https://api.twelvedata.com`                       |
| Auth                    | `TWELVE_DATA_API_KEY` via `apikey` query parameter |
| Free tier limit         | 800 requests/day                                   |
| Cache TTL               | 5 min (real-time price), 24h (daily history)       |
| Fallback if unavailable | Stale data from `market_cache` Supabase table      |

**Endpoints called:**

| Endpoint           | Parameters                                   | Returns                                  | Used for                     |
| ------------------ | -------------------------------------------- | ---------------------------------------- | ---------------------------- |
| `GET /price`       | `symbol`, `apikey`                           | `{ symbol, price, timestamp, currency }` | VOO, QQQ, DXY current prices |
| `GET /time_series` | `symbol`, `interval`, `outputsize`, `apikey` | `{ meta: { symbol }, values: OHLCV[] }`  | Historical OHLCV data        |

**Rate limit handling:** A `RateLimitError` class is thrown on 429 responses. A daily request counter in `api_request_counts` table tracks usage; when count ≥ 750, cached data is served proactively. The `isUsingCachedData()` function exposes this state to the UI.

---

##### CoinGecko

| Detail                  | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                            |
| Auth                    | `COINGECKO_API_KEY` via `x-cg-demo-api-key` header (optional) |
| Free tier limit         | 10–30 requests/minute (demo key)                              |
| Cache TTL               | 5 min (real-time), 24h (history/charts)                       |
| Fallback if unavailable | Stale data from `market_cache` Supabase table                 |

**Endpoints called:**

| Endpoint                          | Parameters                                                       | Returns                                       | Used for                                         |
| --------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `GET /coins/markets`              | `vs_currency=usd`, `ids`, `sparkline`, `price_change_percentage` | `Array<{ current_price, market_cap, ... }>`   | Bitcoin price, batch market data with sparklines |
| `GET /coins/bitcoin/market_chart` | `vs_currency=usd`, `days`                                        | `{ prices, market_caps, total_volumes }`      | Bitcoin history chart                            |
| `GET /coins/{id}/history`         | `date` (dd-MM-yyyy), `localization=false`                        | `{ market_data: { current_price: { usd } } }` | Historical price for cost basis lookups          |
| `GET /coins/{id}/market_chart`    | `vs_currency=usd`, `days`, `interval`                            | `{ prices, market_caps, total_volumes }`      | Performance charts for any coin                  |
| `GET /simple/price`               | `ids=bitcoin`, `vs_currencies=usd` or `crc`                      | `{ bitcoin: { usd/crc: number } }`            | USD/CRC rate derivation                          |

---

##### Alternative.me (Fear & Greed)

| Detail                  | Value                                         |
| ----------------------- | --------------------------------------------- |
| Base URL                | `https://api.alternative.me/fng`              |
| Auth                    | None (public API)                             |
| Free tier limit         | No documented limit                           |
| Cache TTL               | 1 hour                                        |
| Fallback if unavailable | Stale data from `market_cache` Supabase table |

**Endpoints called:**

| Endpoint | Parameters             | Returns                                                  | Used for                                  |
| -------- | ---------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `GET /`  | `limit`, `format=json` | `{ data: [{ value, value_classification, timestamp }] }` | Current and historical Fear & Greed index |

---

##### FRED (Federal Reserve Economic Data)

| Detail                  | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| Base URL                | `https://api.stlouisfed.org/fred/series/observations` |
| Auth                    | `FRED_API_KEY` via `api_key` query parameter          |
| Free tier limit         | 120 requests/minute                                   |
| Cache TTL               | 24 hours                                              |
| Fallback if unavailable | Stale data from `market_cache` Supabase table         |

**Endpoints called:**

| Endpoint                        | Parameters                                                           | Returns                               | Used for                          |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------- | --------------------------------- |
| `GET /fred/series/observations` | `series_id`, `api_key`, `file_type=json`, `sort_order=desc`, `limit` | `{ observations: [{ date, value }] }` | FEDFUNDS, DGS10, CPIAUCSL, UNRATE |

**Series configuration:**

| Series ID  | Title                  | Unit  |
| ---------- | ---------------------- | ----- |
| `FEDFUNDS` | Federal Funds Rate     | %     |
| `DGS10`    | 10-Year Treasury Yield | %     |
| `CPIAUCSL` | Consumer Price Index   | index |
| `UNRATE`   | Unemployment Rate      | %     |

---

##### BCCR SDDE (Banco Central de Costa Rica)

| Detail                  | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| Base URL                | `https://apim.bccr.fi.cr/SDDE/api/Bccr.Ge.SDDE.Publico.Indicadores.API`  |
| Auth                    | `BCCR_SDDE_TOKEN` via `Authorization: Bearer` header                     |
| Free tier limit         | Not documented                                                           |
| Cache TTL               | 24 hours                                                                 |
| Fallback if unavailable | Empty indicator/chart state with "check BCCR_SDDE_TOKEN env var" message |

**Endpoints called:**

| Endpoint                                   | Parameters                             | Returns                                                             | Used for            |
| ------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| `GET /indicadoresEconomicos/{code}/series` | `fechaInicio`, `fechaFin`, `idioma=ES` | `{ estado, datos: [{ series: [{ fecha, valorDatoPorPeriodo }] }] }` | All BCCR indicators |

**Indicator codes:**

| Code | ID             | Name                     | Unit |
| ---- | -------------- | ------------------------ | ---- |
| 318  | `USD_CRC_SELL` | USD/CRC Sell Rate        | ₡    |
| 317  | `USD_CRC_BUY`  | USD/CRC Buy Rate         | ₡    |
| 3541 | `TPM`          | Monetary Policy Rate     | %    |
| 423  | `TBP`          | Basic Passive Rate (TBP) | %    |

### Zod Schemas

##### `StockPriceSchema` → `type StockPrice`

| Field       | Type     | Constraints   | Description                    |
| ----------- | -------- | ------------- | ------------------------------ |
| `symbol`    | `string` | required      | Ticker symbol (e.g., VOO, QQQ) |
| `price`     | `number` | `.positive()` | Current price in USD           |
| `timestamp` | `string` | required      | ISO timestamp of the price     |
| `currency`  | `string` | `.optional()` | Currency code (e.g., USD)      |

**Example valid data:**

```typescript
const example: StockPrice = {
  symbol: 'VOO',
  price: 485.32,
  timestamp: '2026-04-04T14:30:00Z',
  currency: 'USD',
}
```

---

##### `OHLCVPointSchema` → `type OHLCVPoint`

| Field      | Type     | Constraints | Description            |
| ---------- | -------- | ----------- | ---------------------- |
| `datetime` | `string` | required    | Date of the data point |
| `open`     | `number` | required    | Opening price          |
| `high`     | `number` | required    | Highest price          |
| `low`      | `number` | required    | Lowest price           |
| `close`    | `number` | required    | Closing price          |
| `volume`   | `number` | required    | Trading volume         |

---

##### `StockHistorySchema` → `type StockHistory`

| Field    | Type           | Constraints | Description                |
| -------- | -------------- | ----------- | -------------------------- |
| `symbol` | `string`       | required    | Ticker symbol              |
| `values` | `OHLCVPoint[]` | required    | Array of OHLCV data points |

---

##### `BitcoinPriceSchema` → `type BitcoinPrice`

| Field              | Type             | Constraints              | Description                    |
| ------------------ | ---------------- | ------------------------ | ------------------------------ |
| `priceUsd`         | `number`         | `.positive()`            | Current BTC price in USD       |
| `priceCrc`         | `number \| null` | `.positive().nullable()` | BTC price in CRC (best-effort) |
| `marketCap`        | `number`         | `.positive()`            | Total market capitalization    |
| `volume24h`        | `number`         | `.nonnegative()`         | 24-hour trading volume         |
| `percentChange24h` | `number`         | required                 | 24h price change percentage    |
| `lastUpdated`      | `string`         | required                 | ISO timestamp                  |

**Example valid data:**

```typescript
const example: BitcoinPrice = {
  priceUsd: 87500.5,
  priceCrc: 40687732.5,
  marketCap: 1720000000000,
  volume24h: 28500000000,
  percentChange24h: 2.35,
  lastUpdated: '2026-04-04T15:00:00Z',
}
```

---

##### `PricePointSchema` → `type PricePoint`

| Field       | Type     | Constraints | Description             |
| ----------- | -------- | ----------- | ----------------------- |
| `timestamp` | `number` | required    | Unix timestamp (ms)     |
| `price`     | `number` | required    | Price at that timestamp |

---

##### `BitcoinHistorySchema` → `type BitcoinHistory`

| Field    | Type           | Constraints | Description                    |
| -------- | -------------- | ----------- | ------------------------------ |
| `prices` | `PricePoint[]` | required    | Array of timestamp/price pairs |

---

##### `CoinHistoricalPriceSchema` → `type CoinHistoricalPrice`

| Field      | Type     | Constraints      | Description           |
| ---------- | -------- | ---------------- | --------------------- |
| `coinId`   | `string` | required         | CoinGecko coin ID     |
| `date`     | `string` | required         | ISO date (yyyy-MM-dd) |
| `priceUsd` | `number` | `.nonnegative()` | Price on that date    |

---

##### `CoinMarketChartSchema` → `type CoinMarketChart`

| Field        | Type           | Constraints | Description        |
| ------------ | -------------- | ----------- | ------------------ |
| `coinId`     | `string`       | required    | CoinGecko coin ID  |
| `prices`     | `PricePoint[]` | required    | Price history      |
| `marketCaps` | `PricePoint[]` | required    | Market cap history |
| `volumes`    | `PricePoint[]` | required    | Volume history     |

---

##### `CoinMarketDataSchema` → `type CoinMarketData`

| Field                      | Type               | Constraints   | Description                 |
| -------------------------- | ------------------ | ------------- | --------------------------- |
| `id`                       | `string`           | required      | CoinGecko coin ID           |
| `symbol`                   | `string`           | required      | Ticker symbol               |
| `name`                     | `string`           | required      | Display name                |
| `image`                    | `string`           | required      | Coin image URL              |
| `currentPrice`             | `number`           | required      | Current USD price           |
| `marketCap`                | `number`           | required      | Market cap                  |
| `marketCapRank`            | `number \| null`   | `.nullable()` | Rank by market cap          |
| `high24h`                  | `number \| null`   | `.nullable()` | 24h high                    |
| `low24h`                   | `number \| null`   | `.nullable()` | 24h low                     |
| `priceChange24h`           | `number \| null`   | `.nullable()` | Absolute 24h change         |
| `priceChangePercentage24h` | `number \| null`   | `.nullable()` | 24h change %                |
| `priceChangePercentage7d`  | `number \| null`   | `.nullable()` | 7d change %                 |
| `priceChangePercentage30d` | `number \| null`   | `.nullable()` | 30d change %                |
| `sparkline7d`              | `number[] \| null` | `.nullable()` | 7-day price sparkline array |

---

##### `FearGreedSchema` → `type FearGreed`

| Field            | Type     | Constraints                                                        | Description          |
| ---------------- | -------- | ------------------------------------------------------------------ | -------------------- |
| `value`          | `number` | `.min(0).max(100)`                                                 | Sentiment score      |
| `classification` | `enum`   | One of `Extreme Fear`, `Fear`, `Neutral`, `Greed`, `Extreme Greed` | Human-readable label |
| `timestamp`      | `string` | required                                                           | ISO timestamp        |

**Example valid data:**

```typescript
const example: FearGreed = {
  value: 25,
  classification: 'Fear',
  timestamp: '2026-04-04T00:00:00.000Z',
}
```

---

##### `FearGreedHistorySchema` → `type FearGreedHistory`

| Field  | Type          | Constraints | Description            |
| ------ | ------------- | ----------- | ---------------------- |
| `data` | `FearGreed[]` | required    | Array of daily entries |

---

##### `FredObservationSchema` → `type FredObservation`

| Field   | Type     | Constraints | Description       |
| ------- | -------- | ----------- | ----------------- |
| `date`  | `string` | required    | Observation date  |
| `value` | `number` | required    | Observation value |

---

##### `FredSeriesSchema` → `type FredSeries`

| Field          | Type                | Constraints | Description           |
| -------------- | ------------------- | ----------- | --------------------- |
| `seriesId`     | `string`            | required    | FRED series ID        |
| `title`        | `string`            | required    | Human-readable title  |
| `observations` | `FredObservation[]` | required    | Array of observations |

---

##### `MacroIndicatorSchema` → `type MacroIndicator`

| Field   | Type     | Constraints | Description         |
| ------- | -------- | ----------- | ------------------- |
| `name`  | `string` | required    | Display name        |
| `value` | `number` | required    | Indicator value     |
| `date`  | `string` | required    | Date of observation |
| `unit`  | `string` | required    | Unit: `%`, `index`  |

**Example valid data:**

```typescript
const example: MacroIndicator = {
  name: 'Federal Funds Rate',
  value: 4.5,
  date: '2026-03-01',
  unit: '%',
}
```

---

##### `SddeResponseSchema` (BCCR SDDE API envelope)

| Field     | Type                    | Constraints   | Description                   |
| --------- | ----------------------- | ------------- | ----------------------------- |
| `estado`  | `boolean`               | required      | Whether the request succeeded |
| `mensaje` | `string`                | `.optional()` | Error/success message         |
| `datos`   | `SddeIndicadorSchema[]` | required      | Array of indicator data       |

##### `SddeIndicadorSchema`

| Field             | Type                     | Constraints   | Description      |
| ----------------- | ------------------------ | ------------- | ---------------- |
| `codigoIndicador` | `string`                 | required      | Indicator code   |
| `nombreIndicador` | `string`                 | `.optional()` | Indicator name   |
| `series`          | `SddeSeriesItemSchema[]` | required      | Time series data |

##### `SddeSeriesItemSchema`

| Field                 | Type     | Constraints | Description       |
| --------------------- | -------- | ----------- | ----------------- |
| `fecha`               | `string` | required    | Observation date  |
| `valorDatoPorPeriodo` | `number` | required    | Observation value |

---

##### `BccrObservationSchema` → `type BccrObservation`

| Field   | Type     | Constraints | Description       |
| ------- | -------- | ----------- | ----------------- |
| `date`  | `string` | required    | ISO date          |
| `value` | `number` | required    | Observation value |

---

##### `BccrIndicatorSchema` → `type BccrIndicator`

| Field   | Type     | Constraints | Description                |
| ------- | -------- | ----------- | -------------------------- |
| `name`  | `string` | required    | Display name               |
| `value` | `number` | required    | Latest value               |
| `date`  | `string` | required    | Date of latest observation |
| `unit`  | `string` | required    | `₡` or `%`                 |

**Example valid data:**

```typescript
const example: BccrIndicator = {
  name: 'USD/CRC Sell Rate',
  value: 512.45,
  date: '2026-04-03',
  unit: '₡',
}
```

---

##### `ExchangeRatePointSchema` → `type ExchangeRatePoint`

| Field  | Type     | Constraints | Description       |
| ------ | -------- | ----------- | ----------------- |
| `date` | `string` | required    | ISO date          |
| `buy`  | `number` | required    | Buy rate (compra) |
| `sell` | `number` | required    | Sell rate (venta) |

**Example valid data:**

```typescript
const example: ExchangeRatePoint = {
  date: '2026-04-03',
  buy: 508.3,
  sell: 512.45,
}
```

---

## Database Schema

#### `market_cache`

**Created in**: `supabase/migrations/20260321000000_market_cache.sql`
**Modified in**: `supabase/migrations/20260321100000_restrict_cache_rls.sql`

| Column        | Type          | Nullable | Default | Description                                              |
| ------------- | ------------- | -------- | ------- | -------------------------------------------------------- |
| `key`         | `text`        | No       | —       | Primary key — cache key string (e.g., `stock:price:VOO`) |
| `data`        | `jsonb`       | No       | —       | Cached API response (Zod-validated data)                 |
| `fetched_at`  | `timestamptz` | No       | `now()` | When the data was fetched                                |
| `ttl_seconds` | `int`         | No       | `300`   | Time-to-live in seconds                                  |

**RLS Policies:**

| Policy                                      | Operation | Role            | Condition         |
| ------------------------------------------- | --------- | --------------- | ----------------- |
| `Authenticated users can read market cache` | SELECT    | `authenticated` | `true` (all rows) |
| `Service role can insert market cache`      | INSERT    | `service_role`  | `true`            |
| `Service role can update market cache`      | UPDATE    | `service_role`  | `true`            |
| `Service role can delete market cache`      | DELETE    | `service_role`  | `true`            |

**Indexes:**

- `idx_market_cache_fetched_at` on `fetched_at` (for cleanup queries)

**Triggers:** None

**Written by**: `setInSupabaseCache()` in `lib/market/cache.ts` (called from all `getCached()` flows), `/api/cron/cache-cleanup` (DELETE)
**Read by**: `getFromSupabaseCache()`, `getStaleFromSupabaseCache()` in `lib/market/cache.ts`

**Example row:**

```json
{
  "key": "stock:price:VOO",
  "data": {
    "symbol": "VOO",
    "price": 485.32,
    "timestamp": "2026-04-04T14:30:00Z",
    "currency": "USD"
  },
  "fetched_at": "2026-04-04T14:30:05.123Z",
  "ttl_seconds": 300
}
```

---

#### `api_request_counts`

**Created in**: `supabase/migrations/20260321000000_market_cache.sql`
**Modified in**: `supabase/migrations/20260321100000_restrict_cache_rls.sql`

| Column          | Type   | Nullable | Default        | Description                             |
| --------------- | ------ | -------- | -------------- | --------------------------------------- |
| `provider`      | `text` | No       | —              | API provider name (e.g., `twelve_data`) |
| `date_key`      | `date` | No       | `current_date` | Date of the count                       |
| `request_count` | `int`  | No       | `0`            | Number of requests made today           |

**Primary key**: `(provider, date_key)` — composite

**RLS Policies:**

| Policy                                        | Operation | Role            | Condition         |
| --------------------------------------------- | --------- | --------------- | ----------------- |
| `Authenticated users can read request counts` | SELECT    | `authenticated` | `true` (all rows) |
| `Service role can insert request counts`      | INSERT    | `service_role`  | `true`            |
| `Service role can update request counts`      | UPDATE    | `service_role`  | `true`            |

**Indexes:** None (primary key covers lookups)

**Triggers:** None

**Written by**: `incrementRequestCount()` in `lib/market/cache.ts`, `/api/cron/cache-cleanup` (DELETE)
**Read by**: `getRequestCount()` in `lib/market/cache.ts`

**Example row:**

```json
{
  "provider": "twelve_data",
  "date_key": "2026-04-04",
  "request_count": 142
}
```

### Relationships

```
market_cache (standalone — no FKs)
api_request_counts (standalone — no FKs)
```

Both tables are system-level data, not user-scoped. They have no `user_id` column or foreign keys.

---

## Testing

#### `lib/market/__tests__/stocks.test.ts`

| Describe Block               | Tests | Key Edge Cases                                                |
| ---------------------------- | ----- | ------------------------------------------------------------- |
| `stocks: StockPriceSchema`   | 5     | Rejects negative price, rejects zero price, optional currency |
| `stocks: OHLCVPointSchema`   | 2     | Valid point, missing fields                                   |
| `stocks: StockHistorySchema` | 2     | Valid history, empty values array                             |

#### `lib/market/__tests__/crypto.test.ts`

| Describe Block                      | Tests                                              | Key Edge Cases                                                                |
| ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `crypto: BitcoinPriceSchema`        | 5                                                  | Null priceCrc, negative priceUsd rejected, negative percentChange24h accepted |
| `crypto: PricePointSchema`          | 1                                                  | Valid price point                                                             |
| `crypto: BitcoinHistorySchema`      | 2                                                  | Valid history, empty prices array                                             |
| `crypto: convertUsdToCrc`           | 4                                                  | Zero amount, fractional, large BTC prices                                     |
| `crypto: formatDateForCoinGecko`    | 5                                                  | ISO to dd-MM-yyyy, boundaries, invalid format throws                          |
| `crypto: CoinHistoricalPriceSchema` | 3                                                  | Valid data, zero price accepted, negative rejected                            |
| `crypto: CoinMarketChartSchema`     | 2                                                  | Valid chart, empty arrays                                                     |
| `crypto: CoinMarketDataSchema`      | Tests for full data with sparkline, null sparkline |

#### `lib/market/__tests__/sentiment.test.ts`

| Describe Block                      | Tests | Key Edge Cases                                                           |
| ----------------------------------- | ----- | ------------------------------------------------------------------------ |
| `sentiment: classifySentiment`      | 5     | All five ranges (0-20, 21-40, 41-60, 61-80, 81-100)                      |
| `sentiment: getSentimentColor`      | 5     | All color classes mapped correctly                                       |
| `sentiment: getSentimentBgColor`    | 2     | Extreme Fear (rose), Extreme Greed (emerald)                             |
| `sentiment: FearGreedSchema`        | 4     | Valid data, below 0 rejected, above 100 rejected, invalid classification |
| `sentiment: FearGreedHistorySchema` | 2     | Valid history, empty data array                                          |

#### `lib/market/__tests__/macro.test.ts`

| Describe Block                 | Tests | Key Edge Cases                                                                               |
| ------------------------------ | ----- | -------------------------------------------------------------------------------------------- |
| `macro: FredObservationSchema` | 3     | Valid, missing date, missing value                                                           |
| `macro: FredSeriesSchema`      | 1     | Valid series                                                                                 |
| `macro: MacroIndicatorSchema`  | 1     | Valid indicator                                                                              |
| `macro: calculateYoYInflation` | 5     | Normal calculation, <12 observations → null, year-ago zero → null, deflation, zero inflation |
| `macro: FRED_SERIES config`    | 4     | All four series have correct title and unit                                                  |
| `macro: parseObservations`     | 4     | Valid data, filters dot values, empty input, all-dot input                                   |

#### `lib/market/__tests__/bccr.test.ts`

| Describe Block                  | Tests | Key Edge Cases                                                                                                                   |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `bccr: BccrObservationSchema`   | 3     | Valid, missing date, missing value                                                                                               |
| `bccr: SddeResponseSchema`      | 4     | Real SDDE response, empty series, non-object, missing estado                                                                     |
| `bccr: SddeSeriesItemSchema`    | 3     | Valid item, missing fecha, missing valorDatoPorPeriodo                                                                           |
| `bccr: BccrIndicatorSchema`     | 1     | Valid indicator                                                                                                                  |
| `bccr: ExchangeRatePointSchema` | 3     | Valid point, missing buy, missing sell                                                                                           |
| `bccr: BCCR_INDICATORS`         | 3     | All keys present, correct structure, correct codes                                                                               |
| `bccr: formatDateSdde`          | 4     | Standard date, single-digit pad, Dec 31, Jan 1                                                                                   |
| `bccr: normalizeDate`           | 5     | ISO datetime, timezone offset, yyyy/mm/dd, short segments, already normalized                                                    |
| `bccr: extractObservations`     | 7     | Real SDDE format, ISO normalization, empty series, empty datos, estado=false throws, unexpected format throws, percentage values |

#### `lib/market/__tests__/cache.test.ts`

| Describe Block           | Tests | Key Edge Cases                                                                                         |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------ |
| `cache: in-memory cache` | 6     | Missing key → null, store/retrieve, TTL=0 → expired, different data types, clearMemoryCache, overwrite |

#### `app/dashboard/market/__tests__/format-compact.test.ts`

| Describe Block               | Tests | Key Edge Cases                                                               |
| ---------------------------- | ----- | ---------------------------------------------------------------------------- |
| `price-cards: formatCompact` | 8     | Trillions, billions, millions, below 1M, exact boundaries (1T, 1B, 1M), zero |

**Run this feature's tests:**

```bash
npm test -- lib/market app/dashboard/market
```

### Test Gaps

- `fetchPrice()`, `fetchHistory()`, `fetchBitcoinPrice()`, `fetchBitcoinHistory()` and other async fetch functions in `lib/market/` are not unit tested (they call external APIs and Supabase). Only Zod schemas and pure helpers are tested.
- API route handlers in `app/api/market/` have no test files.
- Component rendering logic (e.g., `FearGreedGauge`, `ExchangeRateChart`, `PriceCards`) is not tested — only the `formatCompact` helper is extracted and tested.

---

## File Tree

```
app/dashboard/market/
├── page.tsx                          # Server Component — fetches all market data
├── loading.tsx                       # Suspense skeleton fallback
├── _components/
│   ├── price-cards.tsx               # VOO, QQQ, BTC price cards (client)
│   ├── fear-greed-gauge.tsx          # Radial gauge for sentiment (client)
│   ├── macro-indicators.tsx          # FRED macro grid (client)
│   ├── cr-macro-indicators.tsx       # BCCR Costa Rica indicators (client)
│   └── exchange-rate-chart.tsx       # USD/CRC 30-day AreaChart (client)
└── __tests__/
    └── format-compact.test.ts        # Tests for formatCompact helper

# Related files outside the route:

lib/market/
├── index.ts                          # Barrel re-exports
├── stocks.ts                         # Twelve Data integration (VOO, QQQ, DXY)
├── crypto.ts                         # CoinGecko integration (BTC, coins)
├── sentiment.ts                      # Alternative.me Fear & Greed
├── sentiment-shared.ts              # Pure client-safe sentiment helpers
├── macro.ts                          # FRED integration (rates, CPI, unemployment)
├── bccr.ts                           # BCCR SDDE integration (CR indicators)
├── cache.ts                          # Two-tier cache (memory + Supabase)
└── __tests__/
    ├── stocks.test.ts
    ├── crypto.test.ts
    ├── sentiment.test.ts
    ├── macro.test.ts
    ├── bccr.test.ts
    └── cache.test.ts

app/api/market/
├── price/
│   └── [symbol]/
│       └── route.ts                  # GET /api/market/price/:symbol
├── history/
│   └── [symbol]/
│       └── route.ts                  # GET /api/market/history/:symbol
├── crypto/
│   └── [coinId]/
│       └── route.ts                  # GET /api/market/crypto/:coinId
├── sentiment/
│   └── route.ts                      # GET /api/market/sentiment
├── macro/
│   └── [seriesId]/
│       └── route.ts                  # GET /api/market/macro/:seriesId
├── bccr/
│   └── route.ts                      # GET /api/market/bccr
├── exchange-rate/
│   └── route.ts                      # GET /api/market/exchange-rate
├── bitcoin/
│   ├── onchain/
│   │   └── route.ts                  # GET /api/market/bitcoin/onchain
│   └── valuation/
│       └── route.ts                  # GET /api/market/bitcoin/valuation

app/api/cron/
├── market-prefetch/
│   └── route.ts                      # Every 5 min — warm market cache
└── cache-cleanup/
    └── route.ts                      # Daily — delete stale cache rows

app/dashboard/_components/
└── error-toasts.tsx                  # Shared ErrorToasts component

app/dashboard/_hooks.ts               # useCurrency() — fetches exchange rate for CRC display

components/
└── info-tooltip.tsx                  # Shared tooltip used in all market cards

supabase/migrations/
├── 20260321000000_market_cache.sql   # Creates market_cache + api_request_counts
└── 20260321100000_restrict_cache_rls.sql  # Restricts write policies to service_role
```

---

## Known Limitations

- **No client-side auto-refresh**: The market page only refreshes data on navigation/page reload. There is no `useEffect` polling or WebSocket for live updates on the dashboard page itself. The cron `market-prefetch` warms cache every 5 minutes, so data staleness depends on how often the user navigates to the page.
- **Twelve Data free tier**: 800 requests/day with a proactive threshold at 750. Heavy usage or multiple users on the same deployment could exhaust the daily quota. The `isUsingCachedData()` indicator warns the user but does not degrade gracefully beyond showing stale prices.
- **CoinGecko rate limits**: The demo API key allows 10–30 requests/minute. No request counting is implemented for CoinGecko (unlike Twelve Data). Burst usage across multiple API routes could trigger 429 errors, which fall back to stale cache.
- **BCCR SDDE token expiry**: The `BCCR_SDDE_TOKEN` is a Bearer token that may expire. There is no token refresh mechanism. If expired, all Costa Rican indicators show the "check BCCR_SDDE_TOKEN env var" fallback.
- **No stock Fear & Greed index**: Only crypto Fear & Greed (Alternative.me) is implemented. SPECS mentions "Fear & Greed Index for both stocks and crypto" (US-3.3 Gherkin) but the stock sentiment index is not implemented.
- **DXY via Twelve Data**: The US Dollar Index is fetched through the same Twelve Data API as stocks, consuming from the same 800-request daily quota rather than a separate free source.
- **CRC exchange rate derivation**: The `fetchUsdCrcRate()` in `crypto.ts` derives USD/CRC by comparing BTC/USD and BTC/CRC from CoinGecko (indirect). The BCCR SDDE provides the official rate, but the CoinGecko-derived rate is used for the `useCurrency()` hook in `_hooks.ts`, which could diverge from the official BCCR rate shown in the market page.
- **Cache cleanup uses incorrect column names**: The `cache-cleanup` cron route references `updated_at` on `market_cache` (should be `fetched_at`) and `request_date` on `api_request_counts` (should be `date_key`). These mismatches would cause the cleanup queries to fail silently.
- **All SPECS tasks marked complete**: All E3 tasks (US-3.1 through US-3.7) are marked `[x]` in SPECS.md — no pending items.
