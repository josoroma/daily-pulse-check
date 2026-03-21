# E3: Market Data Engine

> Epic scope: Fetch, cache, and display real-time market data for VOO, QQQ, Bitcoin, sentiment indices, and macro economic indicators.

---

## Architecture Overview

```
External APIs ──► lib/market/*.ts ──► Two-tier cache ──► Server Component (page.tsx)
                                        │                        │
                                        ▼                        ▼
                                   ┌─────────┐          ┌──────────────┐
                                   │ In-memory│          │ UI Components│
                                   │   Map    │          │ (client)     │
                                   └─────────┘          └──────────────┘
                                        │
                                        ▼
                                   ┌─────────┐
                                   │ Supabase│
                                   │ (JSONB) │
                                   └─────────┘
```

The market page (`app/dashboard/market/page.tsx`) is a **Server Component** that calls lib functions directly — no client-side fetch needed for the initial render. Five API routes exist under `app/api/market/` for client-side refreshes or future use.

---

## External APIs Fetched

### 1. Twelve Data — Stock & ETF Prices + DXY

| Detail          | Value                             |
| --------------- | --------------------------------- |
| Base URL        | `https://api.twelvedata.com`      |
| Auth            | `TWELVE_DATA_API_KEY` query param |
| Free tier limit | 800 requests/day                  |
| Symbols fetched | **VOO**, **QQQ**, **DXY**         |

**Endpoints called:**

| Endpoint       | Parameters                         | Used for                                 |
| -------------- | ---------------------------------- | ---------------------------------------- |
| `/price`       | `symbol`                           | Current price for VOO, QQQ, DXY          |
| `/time_series` | `symbol`, `interval`, `outputsize` | Historical OHLCV data (30 daily candles) |

**Rate limiting:** Request count tracked per day in `api_request_counts` table. When count reaches 750 (of 800 limit), the system switches to cached data and shows an amber "Using cached data" badge.

---

### 2. CoinGecko — Bitcoin & CRC Exchange Rate

| Detail          | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Base URL        | `https://api.coingecko.com/api/v3`                          |
| Auth            | Optional `COINGECKO_API_KEY` via `x-cg-demo-api-key` header |
| Symbols fetched | **bitcoin**                                                 |

**Endpoints called:**

| Endpoint                      | Parameters                         | Used for                                            |
| ----------------------------- | ---------------------------------- | --------------------------------------------------- |
| `/coins/markets`              | `vs_currency=usd`, `ids=bitcoin`   | Current price, market cap, 24h volume, 24h % change |
| `/coins/bitcoin/market_chart` | `vs_currency=usd`, `days=90`       | 90-day price history chart                          |
| `/simple/price`               | `ids=bitcoin`, `vs_currencies=usd` | USD price (used to derive USD/CRC rate)             |
| `/simple/price`               | `ids=bitcoin`, `vs_currencies=crc` | CRC price (used to derive USD/CRC rate)             |

**CRC conversion:** The USD/CRC exchange rate is derived by dividing Bitcoin's CRC price by its USD price from CoinGecko. This allows displaying Bitcoin prices in Costa Rican colones (₡).

---

### 3. Alternative.me — Crypto Fear & Greed Index

| Detail   | Value                            |
| -------- | -------------------------------- |
| Base URL | `https://api.alternative.me/fng` |
| Auth     | None (public API)                |

**Endpoints called:**

| Endpoint | Parameters | Used for                           |
| -------- | ---------- | ---------------------------------- |
| `/fng`   | `limit=1`  | Current Fear & Greed value (0–100) |
| `/fng`   | `limit=30` | 30-day Fear & Greed history        |

**Classification mapping:**

| Value Range | Classification | Color         |
| ----------- | -------------- | ------------- |
| 0–20        | Extreme Fear   | `rose-500`    |
| 21–40       | Fear           | `amber-500`   |
| 41–60       | Neutral        | `zinc-400`    |
| 61–80       | Greed          | `emerald-400` |
| 81–100      | Extreme Greed  | `emerald-500` |

---

### 4. FRED (Federal Reserve Economic Data) — Macro Indicators

| Detail   | Value                                                 |
| -------- | ----------------------------------------------------- |
| Base URL | `https://api.stlouisfed.org/fred/series/observations` |
| Auth     | `FRED_API_KEY` query param                            |

**Series fetched:**

| Series ID  | Name                   | Unit  | Used for                             |
| ---------- | ---------------------- | ----- | ------------------------------------ |
| `FEDFUNDS` | Federal Funds Rate     | %     | Current Fed interest rate            |
| `DGS10`    | 10-Year Treasury Yield | %     | Bond market benchmark                |
| `CPIAUCSL` | Consumer Price Index   | index | Year-over-year inflation calculation |
| `UNRATE`   | Unemployment Rate      | %     | Labor market health                  |

**Inflation calculation:** Fetches 13 months of CPI data and computes YoY inflation as `(current - yearAgo) / yearAgo × 100`.

---

## Database Persistence

### Tables

#### `market_cache`

Stores cached API responses as JSONB to reduce external API calls.

| Column        | Type          | Description                         |
| ------------- | ------------- | ----------------------------------- |
| `key`         | `TEXT` (PK)   | Cache key (e.g., `stock:price:VOO`) |
| `data`        | `JSONB`       | Full API response, Zod-validated    |
| `fetched_at`  | `TIMESTAMPTZ` | When the data was fetched           |
| `ttl_seconds` | `INT`         | Cache lifetime in seconds           |

**RLS:** Authenticated users can read. Only `service_role` can write (insert/update/delete).

**Cache keys in use:**

| Key pattern                                 | TTL       | Source              |
| ------------------------------------------- | --------- | ------------------- |
| `stock:price:{SYMBOL}`                      | 5 minutes | Twelve Data         |
| `stock:history:{SYMBOL}:{interval}:{size}`  | 24 hours  | Twelve Data         |
| `crypto:bitcoin:price`                      | 5 minutes | CoinGecko           |
| `crypto:bitcoin:history:{days}`             | 24 hours  | CoinGecko           |
| `exchange:usd_crc`                          | 24 hours  | CoinGecko (derived) |
| `sentiment:crypto:feargreed`                | 1 hour    | Alternative.me      |
| `sentiment:crypto:feargreed:history:{days}` | 1 hour    | Alternative.me      |
| `macro:fred:{SERIES_ID}:{limit}`            | 24 hours  | FRED                |
| `macro:dxy`                                 | 5 minutes | Twelve Data         |

#### `api_request_counts`

Tracks daily API request counts per provider for rate limiting.

| Column          | Type      | Description                        |
| --------------- | --------- | ---------------------------------- |
| `provider`      | `TEXT`    | API provider (e.g., `twelve_data`) |
| `date_key`      | `DATE`    | Day of the count                   |
| `request_count` | `INT`     | Number of requests made today      |
| PK              | composite | `(provider, date_key)`             |

**RLS:** Authenticated users can read and upsert.

### Two-Tier Caching Strategy

1. **In-memory Map** (per-process) — fastest, checked first
2. **Supabase `market_cache` table** — persistent across restarts, checked second
3. **Fresh fetch** — only when both caches miss
4. **Stale fallback** — if the fresh fetch fails, expired Supabase data is returned with a warning

---

## Internal API Routes

All routes require authentication (`supabase.auth.getUser()` guard). Returns `401` if unauthenticated.

| Route                          | Method | Parameters                                        | Response                                   |
| ------------------------------ | ------ | ------------------------------------------------- | ------------------------------------------ |
| `/api/market/price/[symbol]`   | GET    | `symbol` (path)                                   | `{ symbol, price, timestamp, cachedData }` |
| `/api/market/history/[symbol]` | GET    | `symbol` (path), `interval`, `outputsize` (query) | `{ symbol, values: OHLCV[], cachedData }`  |
| `/api/market/crypto/[coinId]`  | GET    | `coinId` (path), `type`, `days` (query)           | Price or history depending on `type` param |
| `/api/market/sentiment`        | GET    | `days` (query, optional)                          | Current Fear & Greed or history array      |
| `/api/market/macro/[seriesId]` | GET    | `seriesId` (path)                                 | FRED series observations or DXY indicator  |

**Valid `seriesId` values:** `FEDFUNDS`, `DGS10`, `CPIAUCSL`, `UNRATE`, `DXY`

---

## What the User Sees

### Price Cards (top row — 3 columns)

| Card              | Data shown                                                 | Source      |
| ----------------- | ---------------------------------------------------------- | ----------- |
| **VOO**           | Current price in USD                                       | Twelve Data |
| **QQQ**           | Current price in USD                                       | Twelve Data |
| **Bitcoin (BTC)** | Price USD, price CRC (₡), 24h % change, market cap, volume | CoinGecko   |

- VOO badge: blue. QQQ badge: purple. BTC badge: orange.
- 24h change: emerald for gains, rose for losses.
- Amber "Using cached data" badge when Twelve Data requests approach limit (750/800).

### Fear & Greed Gauge (bottom-left)

- **Radial bar chart** (Recharts `RadialBarChart`) showing the 0–100 index value.
- Color-coded by sentiment level (rose → amber → zinc → emerald).
- Displays the classification label (e.g., "Extreme Fear", "Greed") and numeric value.
- Shows cache age if data was served from stale cache.
- Data source: Alternative.me crypto Fear & Greed index.

**Useful for:** Gauging market sentiment before buy/sell decisions — extreme fear often signals buying opportunities, extreme greed signals caution.

### Macro Indicators (bottom-right)

| Indicator              | What it shows                         | Source      |
| ---------------------- | ------------------------------------- | ----------- |
| Federal Funds Rate     | Current Fed interest rate (%)         | FRED        |
| 10-Year Treasury Yield | Bond yield benchmark (%)              | FRED        |
| Unemployment Rate      | US labor market health (%)            | FRED        |
| US Dollar Index (DXY)  | Dollar strength (index value)         | Twelve Data |
| YoY Inflation          | CPI-derived annual inflation rate (%) | FRED        |

**Useful for:** Understanding the broader economic environment — rising rates/yields impact equity valuations, high inflation erodes real returns, DXY strength affects international purchasing power.

---

## File Structure

```
lib/market/
├── cache.ts              # Two-tier cache (in-memory + Supabase)
├── stocks.ts             # Twelve Data client (VOO, QQQ, DXY)
├── crypto.ts             # CoinGecko client (Bitcoin, USD/CRC)
├── sentiment.ts          # Alternative.me Fear & Greed
├── sentiment-shared.ts   # Client-safe sentiment helpers (colors, classification)
├── macro.ts              # FRED API + DXY + inflation calculation
├── index.ts              # Barrel exports
└── __tests__/
    ├── cache.test.ts
    ├── stocks.test.ts
    ├── crypto.test.ts
    ├── sentiment.test.ts
    └── macro.test.ts

app/api/market/
├── price/[symbol]/route.ts
├── history/[symbol]/route.ts
├── crypto/[coinId]/route.ts
├── sentiment/route.ts
└── macro/[seriesId]/route.ts

app/dashboard/market/
├── page.tsx              # Server Component — fetches all data
├── loading.tsx           # Skeleton fallback
├── _components/
│   ├── price-cards.tsx   # VOO, QQQ, BTC price cards
│   ├── fear-greed-gauge.tsx  # Radial sentiment gauge
│   └── macro-indicators.tsx  # Macro data cards + inflation
└── __tests__/
    └── format-compact.test.ts

supabase/migrations/
├── 20260321000000_market_cache.sql        # market_cache + api_request_counts tables
└── 20260321100000_restrict_cache_rls.sql  # Restrict write policies to service_role
```

---

## Environment Variables Required

| Variable              | Required | Used by                     |
| --------------------- | -------- | --------------------------- |
| `TWELVE_DATA_API_KEY` | Yes      | Twelve Data (stocks, DXY)   |
| `COINGECKO_API_KEY`   | No       | CoinGecko (improves limits) |
| `FRED_API_KEY`        | Yes      | FRED (macro indicators)     |
