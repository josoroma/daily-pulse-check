# E8: Bitcoin On-Chain Analytics

> A dedicated Bitcoin analytics hub that surfaces network health metrics, halving countdown data, supply tracking, and three valuation models (MVRV Z-Score, Stock-to-Flow, Rainbow Price Band). Designed for a Costa Rica-based investor who holds BTC alongside VOO/QQQ and needs on-chain context beyond price to inform accumulation timing.

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
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Browser (Client)                                │
│                                                                             │
│  ┌──────────────────────────┐     ┌──────────────────────────────────────┐  │
│  │ BitcoinMetricsLive       │     │ MvrvChart / S2FChart / RainbowChart  │  │
│  │ ('use client')           │     │ ('use client')                       │  │
│  │                          │     │                                      │  │
│  │ useAutoRefresh (60s)     │     │ Recharts visualization               │  │
│  │  → fetch /api/market/    │     │                                      │  │
│  │    bitcoin/onchain       │     │                                      │  │
│  └─────────┬────────────────┘     └──────────────────────────────────────┘  │
│            │ polling                        ▲ props (server-rendered)        │
└────────────┼────────────────────────────────┼──────────────────────────────┘
             │                                │
┌────────────▼────────────────────────────────┼──────────────────────────────┐
│                         Next.js Server                                      │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ GET /api/market/bitcoin │  │ bitcoin/page.tsx (Server Component)      │  │
│  │     /onchain/route.ts   │  │  → fetchBlockHeight/Hashrate/Mempool/   │  │
│  │  Auth: Supabase session │  │    Difficulty via lib/bitcoin/onchain.ts │  │
│  │  → lib/bitcoin/onchain  │  │  → calculateHalvingCountdown/           │  │
│  └─────────┬───────────────┘  │    SupplyMetrics via lib/bitcoin/halving│  │
│            │                  └──────────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ GET /api/market/bitcoin │  │ bitcoin/valuation/page.tsx (Server Comp) │  │
│  │     /valuation/route.ts │  │  → fetchBtcPriceHistory (shared)        │  │
│  │  Auth: Supabase session │  │  → fetchMvrvZScore / fetchS2FData /     │  │
│  │  → lib/bitcoin/valuation│  │    fetchRainbowData                     │  │
│  └─────────┬───────────────┘  └──────────────────────────────────────────┘  │
│            │                                                                │
└────────────┼────────────────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────────────────┐
│                          Cache Layer (lib/market/cache.ts)                   │
│                                                                             │
│  1. In-memory Map (per-process)                                             │
│  2. Supabase `market_cache` table (JSONB, TTL-based)                        │
│  3. Stale fallback if fresh fetch fails                                     │
└────────────┬────────────────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────────────────┐
│                           External APIs                                     │
│                                                                             │
│  ┌─────────────────────────┐  ┌────────────────────────────────────────┐   │
│  │ Mempool.space API       │  │ CoinGecko API (v3)                     │   │
│  │ https://mempool.space/  │  │ https://api.coingecko.com/api/v3       │   │
│  │ api                     │  │                                        │   │
│  │ • /blocks/tip/height    │  │ • /coins/bitcoin (market data)         │   │
│  │ • /v1/mining/hashrate/  │  │ • /coins/bitcoin/market_chart (365d)   │   │
│  │   1m                    │  │                                        │   │
│  │ • /mempool              │  └────────────────────────────────────────┘   │
│  │ • /v1/fees/recommended  │  ┌────────────────────────────────────────┐   │
│  │ • /v1/difficulty-       │  │ Blockchain.com Charts API              │   │
│  │   adjustment            │  │ https://api.blockchain.info            │   │
│  └─────────────────────────┘  │ • /charts/market-price?timespan=all   │   │
│                               └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                           | Component            | Type             | Description                                                         |
| ------------------------------ | -------------------- | ---------------- | ------------------------------------------------------------------- |
| `/dashboard/bitcoin`           | `page.tsx`           | Server Component | Network metrics, halving countdown, supply metrics, halving history |
| `/dashboard/bitcoin/valuation` | `valuation/page.tsx` | Server Component | MVRV Z-Score, Stock-to-Flow, Rainbow Price Band charts              |

### `/dashboard/bitcoin`

- **Loading state**: `loading.tsx` renders skeleton cards for 4 metric cards, halving countdown, supply metrics, and halving history timeline
- **Auto-refresh**: `BitcoinMetricsLive` uses `useAutoRefresh` hook with 60-second interval, polling `GET /api/market/bitcoin/onchain`
- **Sub-navigation**: "Valuation Models →" button links to `/dashboard/bitcoin/valuation`

### `/dashboard/bitcoin/valuation`

- **Loading state**: `valuation/loading.tsx` renders skeleton cards for header, MVRV gauge, S2F chart area (300px), and Rainbow chart area (350px)
- **Auto-refresh**: None — valuation data is fetched server-side on page load (daily cache TTL)
- **Sub-navigation**: "← Network Metrics" button links back to `/dashboard/bitcoin`

---

## Why This Feature Exists — User Flows

### Main Bitcoin Page (`/dashboard/bitcoin`)

#### Network Metrics (`_components/network-metrics.tsx`)

**What the user sees**: A 4-column grid of metric cards showing Block Height, Network Hashrate, Mempool status, and Mining Difficulty. Each card has an icon, primary value, sub-text, and an InfoTooltip. The Hashrate card includes a 30-day sparkline chart. The Difficulty card shows a delta (%) with the estimated next retarget date.

**What the user can do**:

- Observe real-time network health — data auto-refreshes every 60 seconds via `BitcoinMetricsLive`
- Hover InfoTooltips for educational context on each metric

**Data source**: Server-side initial fetch via `lib/bitcoin/onchain.ts` functions; client-side polling via `GET /api/market/bitcoin/onchain`

**Why it matters**: Hashrate trends signal miner confidence (and network security). Mempool congestion affects transaction timing and fees. Difficulty adjustments indicate the competitive mining landscape. A BTC investor uses these to gauge whether network fundamentals support their investment thesis.

**States**:

- Empty: "—" displayed when a metric fails to load; individual API failures don't block other metrics (`Promise.allSettled`)
- Loading: Skeleton cards in `loading.tsx` (4 cards in a grid)
- Error: `ErrorToasts` component shows toast notifications for each failed API call

#### Halving Countdown (`_components/halving-countdown.tsx`)

**What the user sees**: A card with a large orange "blocks remaining" hero number, a progress bar showing current era completion percentage, and a 2×2 detail grid (Estimated Date, Days Remaining, Current Reward, Next Reward).

**What the user can do**:

- Track progress toward the next halving (block 1,050,000)
- See the estimated date and days remaining

**Data source**: `calculateHalvingCountdown()` from `lib/bitcoin/halving.ts` — pure calculation from current block height

**Why it matters**: Bitcoin halvings historically precede major price cycles. Knowing the countdown helps an investor plan accumulation strategy around supply reduction events.

**States**:

- Empty: Not applicable — always renders from block height (fallback: 890,000)
- Loading: Skeleton card with progress bar and 4 detail boxes
- Error: Falls back to `FALLBACK_BLOCK_HEIGHT` (890,000) if block height API fails

#### Supply Metrics (`_components/supply-metrics.tsx`)

**What the user sees**: A card with a supply progress bar (% of 21M mined), and a 2×2 grid showing Total Mined, Remaining, Mined Per Day, and Last BTC Year (~2141).

**What the user can do**:

- Visualize Bitcoin's scarcity — how much of the fixed 21M cap has been mined
- See daily issuance rate at current block reward

**Data source**: `calculateSupplyMetrics()` from `lib/bitcoin/halving.ts` — pure calculation from current block height

**Why it matters**: Understanding supply dynamics is central to the scarcity thesis. Seeing that >94% of Bitcoin has been mined reinforces the deflationary narrative.

**States**:

- Empty: Not applicable — always computable from block height
- Loading: Skeleton card with progress bar and 4 detail boxes
- Error: Uses fallback block height

#### Halving Timeline (`_components/halving-timeline.tsx`)

**What the user sees**: A vertical timeline with orange dots, showing all 4 past halvings. Each entry shows halving number, block height, date, block reward, and BTC price at the time. Between entries, a green percentage shows price growth from one halving to the next.

**What the user can do**:

- Review historical halving events and their price impact
- See the pattern of reward reductions (50 → 25 → 12.5 → 6.25 → 3.125 BTC)

**Data source**: `HALVING_HISTORY` constant from `lib/bitcoin/halving.ts` — static data array

**Why it matters**: Historical context helps an investor understand halving cycle patterns. Seeing +5,167% from halving #1 to #2, etc., contextualizes the potential impact of future halvings.

**States**:

- Empty: Not applicable — renders from static constant data
- Loading: Skeleton timeline (4 dot+text entries)
- Error: Cannot error — static data

#### Hashrate Sparkline (`_components/hashrate-sparkline.tsx`)

**What the user sees**: A small 40px-tall orange line chart embedded in the Hashrate metric card, showing 30-day hashrate trend.

**What the user can do**:

- Visually assess whether hashrate is trending up or down over the past month

**Data source**: `hashrate.hashrates` array from `fetchHashrate()` via `lib/bitcoin/onchain.ts`

**Why it matters**: A rising hashrate trend indicates growing miner investment and network security.

**States**:

- Empty: Returns `null` if fewer than 2 data points
- Loading: Part of the metric card skeleton
- Error: Not rendered if hashrate data fails

#### Metric Card (`_components/metric-card.tsx`)

**What the user sees**: A reusable card component with label, icon, primary value, optional sub-value, optional delta indicator (colored positive/negative), optional chart slot, and optional InfoTooltip.

**What the user can do**:

- Read the metric value and its context

**Data source**: Props passed from `NetworkMetrics` parent

**Why it matters**: Provides a consistent visual language for all Bitcoin network metrics.

**States**:

- Empty: "—" for null values
- Loading: Skeleton via `loading.tsx`
- Error: Handled at parent level

### Valuation Page (`/dashboard/bitcoin/valuation`)

#### MVRV Z-Score Chart (`_components/mvrv-chart.tsx`)

**What the user sees**: A card with a large colored Z-Score value (green/amber/orange/red based on zone), a horizontal gauge bar with 4 color-coded zones (Undervalued, Fair, Overvalued, Bubble), a white marker indicating current position, and a 2-column grid showing Market Cap and Realized Cap in trillions.

**What the user can do**:

- Assess whether Bitcoin is undervalued (Z < 0), fairly valued (0–3), overvalued (3–6), or in bubble territory (> 6)
- Compare market cap to realized cap

**Data source**: `fetchMvrvZScore()` from `lib/bitcoin/valuation.ts` — CoinGecko for market cap, Blockchain.com full history for realized cap estimation

**Why it matters**: MVRV Z-Score is a well-known on-chain indicator. A score below 0 has historically been a strong accumulation zone; above 6 signals distribution risk. Helps time BTC buy/sell decisions.

**States**:

- Empty: "MVRV data unavailable" centered in a 300px placeholder
- Loading: Skeleton card with gauge bar and 2 detail boxes
- Error: Falls back to stale Supabase cache; if no cache, shows empty state

#### Stock-to-Flow Chart (`_components/s2f-chart.tsx`)

**What the user sees**: A `ComposedChart` (Recharts) with logarithmic Y-axis showing two lines: green "S2F Model" price and orange "BTC Price" actual price. Halving events are marked with ⛏ pickaxe reference lines. Card description shows current S2F ratio and model price. Custom tooltip displays date, model price, and actual price.

**What the user can do**:

- Compare actual BTC price against PlanB's S2F model prediction over the full price history (2009–present)
- Identify halving events on the timeline
- Assess the model's accuracy and divergence

**Data source**: `fetchS2FData()` from `lib/bitcoin/valuation.ts` — uses shared `fetchBtcPriceHistory()` (Blockchain.com primary, CoinGecko 365d fallback)

**Why it matters**: S2F maps Bitcoin's scarcity to a price model. While it has diverged since 2021, it provides historical context for how scarcity-driven repricing has played out across halving cycles.

**States**:

- Empty: "S2F data unavailable" centered in a 300px placeholder
- Loading: Skeleton card with 300px chart area
- Error: Falls back to stale Supabase cache; if no cache, shows empty state

#### Rainbow Price Band Chart (`_components/rainbow-chart.tsx`)

**What the user sees**: An `AreaChart` (Recharts) with logarithmic Y-axis showing 9 color-coded bands from "Fire Sale" (deep blue) to "Maximum Bubble" (dark red), with BTC price line overlaid in orange. A badge in the card description shows the current band label in its corresponding color. Below the chart, a color legend labels all 9 bands.

**What the user can do**:

- See where the current BTC price sits within long-term logarithmic regression bands
- Identify accumulation zones (blue/green) vs distribution zones (orange/red)

**Data source**: `fetchRainbowData()` from `lib/bitcoin/valuation.ts` — uses shared `fetchBtcPriceHistory()`. Band calculations use `getRainbowBands()` with regression formula `log₁₀(price) = 5.84 × log₁₀(days) − 17.01`.

**Why it matters**: The Rainbow Chart provides a long-term perspective on BTC's position relative to its logarithmic growth trend. "Fire Sale" and "Buy" zones have historically been strong accumulation points.

**States**:

- Empty: "Rainbow data unavailable" centered in a 300px placeholder
- Loading: Skeleton card with 350px chart area
- Error: Falls back to stale Supabase cache; if no cache, shows empty state

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

None — the Bitcoin feature has no `_actions.ts` file. All data is read-only from external APIs; no user mutations.

### API Routes (`app/api/market/bitcoin/...`)

| Method | Path                            | Auth                   | Request Body                              | Response                                         | External APIs             |
| ------ | ------------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------------ | ------------------------- |
| `GET`  | `/api/market/bitcoin/onchain`   | Yes (Supabase session) | None                                      | `{ blockHeight, hashrate, mempool, difficulty }` | Mempool.space             |
| `GET`  | `/api/market/bitcoin/valuation` | Yes (Supabase session) | None (query: `?model=mvrv\|s2f\|rainbow`) | `{ mvrv, s2f, rainbow }` or single model         | CoinGecko, Blockchain.com |

#### `GET /api/market/bitcoin/onchain` (`app/api/market/bitcoin/onchain/route.ts`)

- **Auth**: Calls `createClient()` → `supabase.auth.getUser()`. Returns 401 if no user.
- **Rate limiting**: None (relies on Mempool.space being public and rate-limited at the cache layer).
- **Cache behavior**: Each sub-call uses `getCached()` with TTLs — `REALTIME_PRICE` (5 min) for block height, mempool, difficulty; `DAILY_HISTORY` (24h) for hashrate.
- **Error response**: `{ error: string }` with status 500. Individual metrics return `null` if their fetch fails (via `Promise.allSettled`).
- **Optimization**: `fetchHashrate()` result is shared with `fetchDifficulty()` to avoid a redundant Mempool.space call for `currentDifficulty`.

#### `GET /api/market/bitcoin/valuation` (`app/api/market/bitcoin/valuation/route.ts`)

- **Auth**: Calls `createClient()` → `supabase.auth.getUser()`. Returns 401 if no user.
- **Rate limiting**: None direct (relies on CoinGecko's free tier limits and cache layer).
- **Cache behavior**: Each model uses `getCached()` with `DAILY_HISTORY` (24h) TTL. Price history is fetched once and shared across all three models.
- **Query param**: `?model=mvrv|s2f|rainbow` returns a single model; omitted returns all three.
- **Error response**: `{ error: string }` with status 500. Individual models return `null` on failure (via `Promise.allSettled`).

### Cron Jobs

None — the Bitcoin feature does not have its own cron jobs. Data freshness is managed via the cache layer TTLs.

### External APIs

##### Mempool.space

| Detail                  | Value                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Base URL                | `https://mempool.space/api`                                                                  |
| Auth                    | None (public API)                                                                            |
| Free tier limit         | No official rate limit; self-hosted option available                                         |
| Cache TTL               | Block height, mempool, difficulty: 5 min (`REALTIME_PRICE`); Hashrate: 24h (`DAILY_HISTORY`) |
| Fallback if unavailable | Stale data from `market_cache` table via `getStaleFromSupabaseCache()`                       |

**Endpoints called:**

| Endpoint                        | Parameters | Returns                                                                              | Used for                                 |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| `GET /blocks/tip/height`        | None       | `number` (block height)                                                              | Current block height                     |
| `GET /v1/mining/hashrate/1m`    | None       | `{ currentHashrate, currentDifficulty, hashrates[] }`                                | 30-day hashrate data, current difficulty |
| `GET /mempool`                  | None       | `{ count, vsize }`                                                                   | Mempool transaction count and size       |
| `GET /v1/fees/recommended`      | None       | `{ fastestFee, halfHourFee, hourFee, economyFee, minimumFee }`                       | Recommended fee rates                    |
| `GET /v1/difficulty-adjustment` | None       | `{ progressPercent, difficultyChange, estimatedRetargetDate, remainingBlocks, ... }` | Difficulty adjustment prediction         |

##### CoinGecko

| Detail                  | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                          |
| Auth                    | Optional `COINGECKO_API_KEY` via `x-cg-demo-api-key` header |
| Free tier limit         | 30 calls/min (demo), 500 calls/day (no key)                 |
| Cache TTL               | 24h (`DAILY_HISTORY`)                                       |
| Fallback if unavailable | Stale data from `market_cache` table                        |

**Endpoints called:**

| Endpoint                          | Parameters                                                                   | Returns                                                        | Used for                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /coins/bitcoin`              | `localization=false&tickers=false&community_data=false&developer_data=false` | `{ market_data: { market_cap, total_supply, current_price } }` | MVRV: current market cap and supply                           |
| `GET /coins/bitcoin/market_chart` | `vs_currency=usd&days=365&interval=daily`                                    | `{ market_caps[], prices[] }`                                  | MVRV: 365-day std dev; Fallback price history for S2F/Rainbow |

##### Blockchain.com Charts API

| Detail                  | Value                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| Base URL                | `https://api.blockchain.info`                                           |
| Auth                    | None (public API, no key required)                                      |
| Free tier limit         | No documented limit                                                     |
| Cache TTL               | 24h (`DAILY_HISTORY`)                                                   |
| Fallback if unavailable | CoinGecko 365-day price history (`fetchBtcPriceHistoryFromCoinGecko()`) |

**Endpoints called:**

| Endpoint                   | Parameters                           | Returns                                              | Used for                                                                                                  |
| -------------------------- | ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /charts/market-price` | `timespan=all&format=json&cors=true` | `{ status, values: [{ x: unixSeconds, y: price }] }` | Full BTC/USD price history from genesis (2009–present) for S2F, Rainbow, and MVRV realized cap estimation |

### Zod Schemas

#### `lib/bitcoin/onchain.ts`

##### `BlockHeightSchema` → `type BlockHeight`

| Field         | Type     | Constraints            | Description            |
| ------------- | -------- | ---------------------- | ---------------------- |
| `height`      | `number` | `int(), nonnegative()` | Current block height   |
| `lastUpdated` | `string` | —                      | ISO timestamp of fetch |

**Example valid data:**

```typescript
const example: BlockHeight = {
  height: 890_000,
  lastUpdated: '2026-04-04T14:30:00Z',
}
```

##### `HashrateDataSchema` → `type HashrateData`

| Field               | Type                                                | Constraints     | Description                     |
| ------------------- | --------------------------------------------------- | --------------- | ------------------------------- |
| `currentHashrate`   | `number`                                            | `nonnegative()` | Current network hashrate in H/s |
| `currentDifficulty` | `number`                                            | `nonnegative()` | Current mining difficulty       |
| `hashrates`         | `Array<{ timestamp: number; avgHashrate: number }>` | —               | 30-day hashrate history         |
| `lastUpdated`       | `string`                                            | —               | ISO timestamp of fetch          |

**Example valid data:**

```typescript
const example: HashrateData = {
  currentHashrate: 750_000_000_000_000_000_000,
  currentDifficulty: 110_000_000_000_000,
  hashrates: [
    { timestamp: 1711324800, avgHashrate: 700_000_000_000_000_000_000 },
    { timestamp: 1711411200, avgHashrate: 720_000_000_000_000_000_000 },
  ],
  lastUpdated: '2026-04-04T14:30:00Z',
}
```

##### `MempoolDataSchema` → `type MempoolData`

| Field               | Type     | Constraints            | Description                        |
| ------------------- | -------- | ---------------------- | ---------------------------------- |
| `size`              | `number` | `int(), nonnegative()` | Number of unconfirmed transactions |
| `bytes`             | `number` | `int(), nonnegative()` | Mempool size in bytes (vsize)      |
| `feeRates`          | `object` | —                      | Recommended fee rates in sat/vB    |
| `feeRates.fastest`  | `number` | `nonnegative()`        | Fastest confirmation fee           |
| `feeRates.halfHour` | `number` | `nonnegative()`        | ~30 min confirmation fee           |
| `feeRates.hour`     | `number` | `nonnegative()`        | ~1 hour confirmation fee           |
| `feeRates.economy`  | `number` | `nonnegative()`        | Economy fee rate                   |
| `feeRates.minimum`  | `number` | `nonnegative()`        | Minimum relay fee                  |
| `lastUpdated`       | `string` | —                      | ISO timestamp of fetch             |

**Example valid data:**

```typescript
const example: MempoolData = {
  size: 45_000,
  bytes: 150_000_000,
  feeRates: {
    fastest: 25,
    halfHour: 18,
    hour: 12,
    economy: 6,
    minimum: 3,
  },
  lastUpdated: '2026-04-04T14:30:00Z',
}
```

##### `DifficultyDataSchema` → `type DifficultyData`

| Field                    | Type     | Constraints            | Description                                         |
| ------------------------ | -------- | ---------------------- | --------------------------------------------------- |
| `currentDifficulty`      | `number` | `positive()`           | Current mining difficulty                           |
| `progressPercent`        | `number` | —                      | Progress through current 2016-block retarget period |
| `remainingBlocks`        | `number` | `int(), nonnegative()` | Blocks until next retarget                          |
| `remainingTime`          | `number` | `nonnegative()`        | Seconds until next retarget                         |
| `estimatedRetargetDate`  | `string` | —                      | ISO date of next difficulty adjustment              |
| `nextDifficultyEstimate` | `number` | `positive()`           | Predicted next difficulty                           |
| `changePercent`          | `number` | —                      | Estimated % change at next retarget                 |
| `lastUpdated`            | `string` | —                      | ISO timestamp of fetch                              |

**Example valid data:**

```typescript
const example: DifficultyData = {
  currentDifficulty: 110_000_000_000_000,
  progressPercent: 45.5,
  remainingBlocks: 1100,
  remainingTime: 660_000,
  estimatedRetargetDate: '2026-04-15T00:00:00Z',
  nextDifficultyEstimate: 115_000_000_000_000,
  changePercent: 4.55,
  lastUpdated: '2026-04-04T14:30:00Z',
}
```

#### `lib/bitcoin/halving.ts`

##### `HalvingEventSchema` → `type HalvingEvent`

| Field            | Type             | Constraints            | Description                       |
| ---------------- | ---------------- | ---------------------- | --------------------------------- |
| `number`         | `number`         | `int(), positive()`    | Halving number (1-indexed)        |
| `blockHeight`    | `number`         | `int(), nonnegative()` | Block height at halving           |
| `reward`         | `number`         | `positive()`           | Block reward after halving        |
| `date`           | `string \| null` | `nullable()`           | Date of halving (ISO date string) |
| `priceAtHalving` | `number \| null` | `nullable()`           | BTC/USD price at halving          |

**Example valid data:**

```typescript
const example: HalvingEvent = {
  number: 4,
  blockHeight: 840_000,
  reward: 3.125,
  date: '2024-04-19',
  priceAtHalving: 63_846.0,
}
```

##### `HalvingCountdownSchema` → `type HalvingCountdown`

| Field                    | Type     | Constraints            | Description                     |
| ------------------------ | -------- | ---------------------- | ------------------------------- |
| `currentBlockHeight`     | `number` | `int(), nonnegative()` | Current block height            |
| `nextHalvingBlock`       | `number` | `int(), positive()`    | Target halving block            |
| `blocksRemaining`        | `number` | `int(), nonnegative()` | Blocks until halving            |
| `estimatedDate`          | `string` | —                      | ISO date of estimated halving   |
| `estimatedDaysRemaining` | `number` | `nonnegative()`        | Days until halving              |
| `currentReward`          | `number` | `positive()`           | Current block reward in BTC     |
| `nextReward`             | `number` | `positive()`           | Reward after halving in BTC     |
| `currentEra`             | `number` | `int(), positive()`    | Current halving era (1-indexed) |
| `percentComplete`        | `number` | `min(0), max(100)`     | Era completion percentage       |

**Example valid data:**

```typescript
const example: HalvingCountdown = {
  currentBlockHeight: 890_000,
  nextHalvingBlock: 1_050_000,
  blocksRemaining: 160_000,
  estimatedDate: '2028-04-15T00:00:00.000Z',
  estimatedDaysRemaining: 1111.1,
  currentReward: 3.125,
  nextReward: 1.5625,
  currentEra: 5,
  percentComplete: 23.81,
}
```

##### `SupplyMetricsSchema` → `type SupplyMetrics`

| Field                      | Type     | Constraints         | Description                  |
| -------------------------- | -------- | ------------------- | ---------------------------- |
| `totalMined`               | `number` | `nonnegative()`     | Total BTC mined to date      |
| `percentMined`             | `number` | `min(0), max(100)`  | Percentage of 21M mined      |
| `remainingSupply`          | `number` | `nonnegative()`     | BTC yet to be mined          |
| `currentBlockReward`       | `number` | `positive()`        | Current reward per block     |
| `blocksPerDay`             | `number` | `positive()`        | Blocks mined per day (144)   |
| `btcMinedPerDay`           | `number` | `positive()`        | BTC issued per day           |
| `estimatedLastBitcoinYear` | `number` | `int(), positive()` | Year of last satoshi (~2141) |

**Example valid data:**

```typescript
const example: SupplyMetrics = {
  totalMined: 19_921_875,
  percentMined: 94.87,
  remainingSupply: 1_078_125,
  currentBlockReward: 3.125,
  blocksPerDay: 144,
  btcMinedPerDay: 450,
  estimatedLastBitcoinYear: 2141,
}
```

#### `lib/bitcoin/valuation.ts`

##### `MvrvDataSchema` → `type MvrvData`

| Field         | Type     | Constraints  | Description                          |
| ------------- | -------- | ------------ | ------------------------------------ |
| `marketCap`   | `number` | `positive()` | Current BTC market cap in USD        |
| `realizedCap` | `number` | `positive()` | Estimated realized cap in USD        |
| `mvrvRatio`   | `number` | —            | Market cap / Realized cap            |
| `zScore`      | `number` | —            | (Market cap − Realized cap) / StdDev |
| `lastUpdated` | `string` | —            | ISO timestamp                        |

**Example valid data:**

```typescript
const example: MvrvData = {
  marketCap: 1_700_000_000_000,
  realizedCap: 1_133_000_000_000,
  mvrvRatio: 1.5,
  zScore: 1.25,
  lastUpdated: '2026-04-04T14:30:00Z',
}
```

##### `S2FPointSchema` → `type S2FPoint`

| Field           | Type     | Constraints     | Description                              |
| --------------- | -------- | --------------- | ---------------------------------------- |
| `timestamp`     | `number` | —               | Unix timestamp in milliseconds           |
| `price`         | `number` | `positive()`    | Actual BTC/USD price                     |
| `s2fModelPrice` | `number` | `positive()`    | S2F model predicted price                |
| `s2fRatio`      | `number` | `nonnegative()` | Stock-to-flow ratio at that block height |

##### `S2FDataSchema` → `type S2FData`

| Field               | Type                                       | Constraints     | Description                |
| ------------------- | ------------------------------------------ | --------------- | -------------------------- |
| `dataPoints`        | `S2FPoint[]`                               | —               | Historical S2F data points |
| `currentS2F`        | `number`                                   | `nonnegative()` | Current S2F ratio          |
| `currentModelPrice` | `number`                                   | `positive()`    | Current S2F model price    |
| `halvingEvents`     | `Array<{ timestamp, blockHeight, label }>` | —               | Halving markers for chart  |
| `lastUpdated`       | `string`                                   | —               | ISO timestamp              |

##### `RainbowBandSchema` → `type RainbowBand`

| Field   | Type     | Constraints | Description                          |
| ------- | -------- | ----------- | ------------------------------------ |
| `label` | `string` | —           | Band name (e.g. "Hold", "Fire Sale") |
| `color` | `string` | —           | HSL color string                     |
| `upper` | `number` | —           | Upper price boundary                 |
| `lower` | `number` | —           | Lower price boundary                 |

##### `RainbowDataSchema` → `type RainbowData`

| Field         | Type             | Constraints | Description                          |
| ------------- | ---------------- | ----------- | ------------------------------------ |
| `dataPoints`  | `RainbowPoint[]` | —           | Historical data with band boundaries |
| `currentBand` | `string`         | —           | Band label for current price         |
| `lastUpdated` | `string`         | —           | ISO timestamp                        |

---

## Database Schema

The Bitcoin feature does not have its own tables — it uses the shared caching infrastructure.

#### `market_cache`

**Created in**: `supabase/migrations/20260321000000_market_cache.sql`
**Updated in**: `supabase/migrations/20260321100000_restrict_cache_rls.sql`

| Column        | Type          | Nullable | Default | Description                       |
| ------------- | ------------- | -------- | ------- | --------------------------------- |
| `key`         | `text`        | No       | —       | Primary key, cache key identifier |
| `data`        | `jsonb`       | No       | —       | Cached API response payload       |
| `fetched_at`  | `timestamptz` | No       | `now()` | Timestamp when data was fetched   |
| `ttl_seconds` | `int`         | No       | `300`   | Cache time-to-live in seconds     |

**RLS Policies (after migration `20260321100000`):**

| Policy                                      | Operation | Role            | Condition |
| ------------------------------------------- | --------- | --------------- | --------- |
| `Authenticated users can read market cache` | SELECT    | `authenticated` | `true`    |
| `Service role can insert market cache`      | INSERT    | `service_role`  | `true`    |
| `Service role can update market cache`      | UPDATE    | `service_role`  | `true`    |
| `Service role can delete market cache`      | DELETE    | `service_role`  | `true`    |

**Indexes:**

- `idx_market_cache_fetched_at` on `fetched_at`

**Triggers:** None

**Cache keys used by Bitcoin feature:**

| Key                          | TTL   | Written by                                             | Read by                                               |
| ---------------------------- | ----- | ------------------------------------------------------ | ----------------------------------------------------- |
| `bitcoin:block:height`       | 5 min | `fetchBlockHeight()` in `lib/bitcoin/onchain.ts`       | `page.tsx`, `/api/market/bitcoin/onchain`             |
| `bitcoin:hashrate:30d`       | 24h   | `fetchHashrate()` in `lib/bitcoin/onchain.ts`          | `page.tsx`, `/api/market/bitcoin/onchain`             |
| `bitcoin:mempool`            | 5 min | `fetchMempool()` in `lib/bitcoin/onchain.ts`           | `page.tsx`, `/api/market/bitcoin/onchain`             |
| `bitcoin:difficulty`         | 5 min | `fetchDifficulty()` in `lib/bitcoin/onchain.ts`        | `page.tsx`, `/api/market/bitcoin/onchain`             |
| `bitcoin:price-history:full` | 24h   | `fetchBtcPriceHistory()` in `lib/bitcoin/valuation.ts` | `valuation/page.tsx`, `/api/market/bitcoin/valuation` |
| `bitcoin:mvrv:zscore`        | 24h   | `fetchMvrvZScore()` in `lib/bitcoin/valuation.ts`      | `valuation/page.tsx`, `/api/market/bitcoin/valuation` |
| `bitcoin:s2f:data`           | 24h   | `fetchS2FData()` in `lib/bitcoin/valuation.ts`         | `valuation/page.tsx`, `/api/market/bitcoin/valuation` |
| `bitcoin:rainbow:data`       | 24h   | `fetchRainbowData()` in `lib/bitcoin/valuation.ts`     | `valuation/page.tsx`, `/api/market/bitcoin/valuation` |

**Example row:**

```json
{
  "key": "bitcoin:block:height",
  "data": { "height": 890000, "lastUpdated": "2026-04-04T14:30:00Z" },
  "fetched_at": "2026-04-04T14:30:00+00:00",
  "ttl_seconds": 300
}
```

#### `api_request_counts`

**Created in**: `supabase/migrations/20260321000000_market_cache.sql`

| Column          | Type   | Nullable | Default        | Description                      |
| --------------- | ------ | -------- | -------------- | -------------------------------- |
| `provider`      | `text` | No       | —              | API provider name (composite PK) |
| `date_key`      | `date` | No       | `current_date` | Date of the count (composite PK) |
| `request_count` | `int`  | No       | `0`            | Number of requests made today    |

This table is not directly used by the Bitcoin feature (Bitcoin uses Mempool.space and Blockchain.com which have no strict rate limits), but the cache module (`lib/market/cache.ts`) that Bitcoin data flows through exposes `incrementRequestCount()` / `getRequestCount()` for CoinGecko rate tracking.

---

## Testing

#### `lib/bitcoin/__tests__/halving.test.ts`

| Describe Block                       | Tests | Key Edge Cases                                                                   |
| ------------------------------------ | ----- | -------------------------------------------------------------------------------- |
| `halving: getBlockReward`            | 5     | Era progression, halving across eras 1–10                                        |
| `halving: getHalvingEra`             | 5     | Genesis block (0), boundary (209,999 vs 210,000), current height (890,000)       |
| `halving: getNextHalvingBlock`       | 4     | Genesis, mid-era, boundary, current height                                       |
| `halving: getBlocksRemaining`        | 4     | Genesis, one block before halving, boundary, current height                      |
| `halving: estimateHalvingDate`       | 3     | Future date, timing accuracy within 1s, custom block time                        |
| `halving: calculateTotalMined`       | 6     | Block 0, block 1, era boundaries, MAX_SUPPLY cap, monotonic increase             |
| `halving: calculateHalvingCountdown` | 3     | Current height, near halving (99%+), just after halving (<1%)                    |
| `halving: calculateSupplyMetrics`    | 2     | Current height values, totalMined + remainingSupply = MAX_SUPPLY                 |
| `halving: HALVING_HISTORY`           | 5     | Length, block heights, reward halving, dates present, HALVING_INTERVAL multiples |
| `halving: constants`                 | 4     | HALVING_INTERVAL, MAX_SUPPLY, AVG_BLOCK_TIME_SECONDS, INITIAL_REWARD             |

#### `lib/bitcoin/__tests__/onchain.test.ts`

| Describe Block                  | Tests | Key Edge Cases                                                   |
| ------------------------------- | ----- | ---------------------------------------------------------------- |
| `onchain: BlockHeightSchema`    | 4     | Valid data, negative height, genesis (0), non-integer            |
| `onchain: HashrateDataSchema`   | 3     | Valid data, empty hashrates array, negative hashrate             |
| `onchain: MempoolDataSchema`    | 3     | Valid data, zero values (empty mempool), missing feeRates fields |
| `onchain: DifficultyDataSchema` | 3     | Valid data, negative changePercent, zero difficulty rejection    |

#### `lib/bitcoin/__tests__/valuation.test.ts`

| Describe Block                   | Tests | Key Edge Cases                                                                                    |
| -------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| `valuation: MvrvDataSchema`      | 3     | Valid data, zero marketCap rejection, negative zScore                                             |
| `valuation: calculateS2FRatio`   | 5     | Increasing across eras, doubling at halving, genesis (0), positive, era 5 (~120)                  |
| `valuation: s2fModelPrice`       | 4     | Zero S2F, positive, monotonic increase, logarithmic formula                                       |
| `valuation: S2FPointSchema`      | 2     | Valid data, negative price rejection                                                              |
| `valuation: rainbowBasePrice`    | 3     | Zero days, positive for positive days, logarithmic growth                                         |
| `valuation: getRainbowBands`     | 4     | 9 bands, ordering, lower < upper, adjacent bands touch                                            |
| `valuation: getCurrentBand`      | 3     | Fire Sale for very low, Maximum Bubble for very high, valid label for moderate                    |
| `valuation: RAINBOW_BANDS`       | 4     | 9 bands, first/last labels, HSL colors                                                            |
| `valuation: RainbowBandSchema`   | 1     | Valid band                                                                                        |
| `valuation: estimateRealizedCap` | 6     | Empty history, all-zero prices, single point, quadratic weighting, realistic MVRV, supply scaling |

#### `app/dashboard/bitcoin/__tests__/_hooks.test.ts`

| Describe Block                      | Tests | Key Edge Cases                                     |
| ----------------------------------- | ----- | -------------------------------------------------- |
| `useAutoRefresh`                    | 2     | Export check, function signature                   |
| `useAutoRefresh: interval behavior` | 3     | Interval calling, cleared interval, error handling |

**Run this feature's tests:**

```bash
npm test -- lib/bitcoin app/dashboard/bitcoin
```

**Test gaps:**

- No integration tests for the API routes (`/api/market/bitcoin/onchain`, `/api/market/bitcoin/valuation`)
- No tests for `fetchBlockHeight()`, `fetchHashrate()`, `fetchMempool()`, `fetchDifficulty()` fetch logic (only schema validation tested)
- No tests for `fetchMvrvZScore()`, `fetchS2FData()`, `fetchRainbowData()` fetch logic (would require mocking external APIs)
- No tests for `fetchBtcPriceHistory()` and its Blockchain.com → CoinGecko fallback
- `useAutoRefresh` tests simulate interval behavior without rendering the actual hook (no `@testing-library/react`)

---

## File Tree

```
app/dashboard/bitcoin/
├── page.tsx                          # Server Component — network metrics + halving
├── loading.tsx                       # Suspense fallback — skeleton cards
├── _hooks.ts                         # useAutoRefresh(fetcher, { intervalMs })
├── _components/
│   ├── bitcoin-metrics-live.tsx      # Client — polls /api/market/bitcoin/onchain every 60s
│   ├── halving-countdown.tsx         # Client — hero blocks remaining + progress bar
│   ├── halving-timeline.tsx          # Server — static historical halving events
│   ├── hashrate-sparkline.tsx        # Client — Recharts 30-day line chart
│   ├── metric-card.tsx               # Server — reusable card with icon/value/delta/chart
│   ├── mvrv-chart.tsx                # Client — MVRV Z-Score gauge + cap details
│   ├── network-metrics.tsx           # Server — 4-column metric grid
│   ├── rainbow-chart.tsx             # Client — Recharts AreaChart with 9 bands
│   ├── s2f-chart.tsx                 # Client — Recharts ComposedChart with log Y
│   └── supply-metrics.tsx            # Server — supply progress bar + metrics grid
├── valuation/
│   ├── page.tsx                      # Server Component — MVRV, S2F, Rainbow
│   └── loading.tsx                   # Suspense fallback — skeleton charts
└── __tests__/
    └── _hooks.test.ts                # useAutoRefresh behavior tests

# Related files outside the route:

lib/bitcoin/
├── halving.ts                        # Constants, schemas, pure calculation functions
├── onchain.ts                        # Mempool.space API integration + Zod schemas
├── valuation.ts                      # CoinGecko/Blockchain.com API + S2F/MVRV/Rainbow
├── rainbow-bands.ts                  # RAINBOW_BANDS constant (client-safe)
└── __tests__/
    ├── halving.test.ts               # 41 tests — pure calculation functions
    ├── onchain.test.ts               # 13 tests — Zod schema validation
    └── valuation.test.ts             # 35 tests — schemas + pure calculations

lib/market/
└── cache.ts                          # getCached(), memory + Supabase cache layer

app/api/market/bitcoin/
├── onchain/
│   └── route.ts                      # GET — on-chain metrics (auth required)
└── valuation/
    └── route.ts                      # GET — valuation models (auth required)

app/dashboard/_components/
└── error-toasts.tsx                  # Shared ErrorToasts component

components/
└── info-tooltip.tsx                  # Shared InfoTooltip component

supabase/migrations/
├── 20260321000000_market_cache.sql   # market_cache + api_request_counts tables
└── 20260321100000_restrict_cache_rls.sql  # Restrict write policies to service_role
```

---

## Known Limitations

- **Realized cap is an approximation**: `estimateRealizedCap()` uses a quadratic time-weighted average price model against Blockchain.com's full price history. True realized cap requires UTXO-set data from Glassnode or CoinMetrics (paid APIs). The estimate is within ~5% of on-chain reality for typical market conditions.
- **MVRV displayed as gauge, not time-series**: The MVRV Z-Score is shown as a single current-value gauge rather than a historical chart because historical Z-Score time-series data is not available from free APIs.
- **S2F model divergence**: The Stock-to-Flow model uses PlanB's 2019 regression coefficients (`ln(price) = 3.21 × ln(S2F) − 1.6`), which have increasingly diverged from spot price since the 2021 cycle. Displayed for educational context, not as a forecast.
- **CoinGecko free tier rate limits**: 30 calls/min (demo key) or 500 calls/day (no key). Mitigated by 24h cache TTL for valuation data.
- **No cron job for cache warming**: Bitcoin data relies entirely on on-demand caching. First request after cache expiry will be slower. No background job pre-populates the cache.
- **Fallback block height is hardcoded**: `FALLBACK_BLOCK_HEIGHT = 890_000` in `page.tsx`. This becomes increasingly stale over time and should ideally be updated or derived from a known date.
- **No auto-refresh on valuation page**: The valuation models page (`/dashboard/bitcoin/valuation`) fetches data only on server render. Unlike the main Bitcoin page, there is no client-side polling for updated valuation data.
- **Estimated halving date assumes 10-minute blocks**: `AVG_BLOCK_TIME_SECONDS = 600` is a constant. Actual block times fluctuate with hashrate changes, so the estimated halving date can shift.
- **`estimatedLastBitcoinYear` is hardcoded**: `2009 + 33 * 4 = 2141` is a simple arithmetic constant rather than a dynamic calculation.
- **Rainbow regression coefficients are fixed**: The logarithmic regression (`5.84 × log₁₀(days) − 17.01`) uses static coefficients — the model is not re-fitted against new data.
- **No error boundary**: Neither `bitcoin/error.tsx` nor `bitcoin/valuation/error.tsx` exists. Unhandled rendering errors will bubble up to the nearest parent error boundary.
