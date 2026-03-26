# E8: Bitcoin On-Chain Analytics

> Technical documentation for the Bitcoin on-chain analytics feature — pages, APIs, charts, caching, and calculations.

---

## Why This Feature Exists

Bitcoin is more than a price chart. On-chain data — block production, hashrate trends, mempool congestion, difficulty adjustments — reveals the network's operational health in ways that price alone never can. Valuation models like MVRV Z-Score, Stock-to-Flow, and the Rainbow Price Band give a historical framework for assessing whether the current price is cheap, fair, or euphoric relative to prior cycles. The halving countdown tracks Bitcoin's hardcoded supply schedule — the single most predictable monetary event in crypto — so the user can contextualize where we are in the four-year cycle.

This feature is designed for a long-term, DCA-oriented investor (Costa Rica-based, holding VOO, QQQ, and BTC) who wants conviction signals beyond price action. Every metric shown is a decision input: "Should I accumulate more? Should I hold? Should I take profit?"

---

## Pages & Navigation

### `/dashboard/bitcoin` — Network Health

The main Bitcoin page is a Server Component that fetches four categories of on-chain data via `Promise.allSettled` (so a single failing API never breaks the entire page):

| Section           | Component                               | What the User Sees                                                                                                                  |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Live Metrics      | `BitcoinMetricsLive` → `NetworkMetrics` | Block height, hashrate (EH/s) with 30-day sparkline, mempool size (vBytes) with fee tiers, difficulty with next adjustment estimate |
| Halving Countdown | `HalvingCountdown`                      | Blocks remaining until next halving, estimated date, current reward (3.125 BTC), next reward (1.5625 BTC), progress bar             |
| Supply Metrics    | `SupplyMetrics`                         | Total BTC mined, percentage of 21M supply, daily issuance rate, estimated year of last Bitcoin                                      |
| Halving Timeline  | `HalvingTimeline`                       | Historical table of all four halvings — block height, date, reward, BTC price at each event                                         |

**Auto-refresh**: The `BitcoinMetricsLive` wrapper uses the `useAutoRefresh` hook to poll `/api/market/bitcoin/onchain` every 60 seconds, giving a near-real-time feel without WebSockets.

### `/dashboard/bitcoin/valuation` — Valuation Models

A separate Server Component that fetches the 365-day BTC price history once, then shares it across three model calculations (again via `Promise.allSettled`):

| Section            | Component      | What the User Sees                                                                                                                                                                           |
| ------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVRV Z-Score       | `MvrvChart`    | A color-coded gauge showing the current Z-Score — green (undervalued, Z < 0), amber (fair, 0–3), orange (overvalued, 3–6), red (bubble, > 6). Shows market cap, realized cap, and MVRV ratio |
| Stock-to-Flow      | `S2FChart`     | Dual-line `ComposedChart` — actual BTC price vs. S2F model price over 365 days. Halving events marked on the timeline                                                                        |
| Rainbow Price Band | `RainbowChart` | 9 stacked `Area` bands from "Fire Sale" (deep blue) to "Maximum Bubble" (red) with the current BTC price overlaid. Dynamic tooltip shows which band the price falls into                     |

---

## External APIs

### Mempool.space — Network Metrics

Base URL: `https://mempool.space/api`

| Endpoint                        | Data Returned                                                  | Cache TTL |
| ------------------------------- | -------------------------------------------------------------- | --------- |
| `GET /blocks/tip/height`        | Current block height (integer)                                 | 5 min     |
| `GET /v1/mining/hashrate/1m`    | Current hashrate, difficulty, 30-day hashrate history          | 24 h      |
| `GET /mempool`                  | Unconfirmed transaction count and total vBytes                 | 5 min     |
| `GET /v1/fees/recommended`      | Fee rates: fastest, half-hour, hour, economy, minimum (sat/vB) | 5 min     |
| `GET /v1/difficulty-adjustment` | Retarget progress %, estimated change %, time remaining        | 5 min     |

No API key required. Free, open-source.

### CoinGecko — Price History & Market Data

Base URL: `https://api.coingecko.com/api/v3`

| Endpoint                                                                                        | Data Returned                                   | Cache TTL |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| `GET /coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`                       | 365 daily price points `[timestamp, price][]`   | 24 h      |
| `GET /coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false` | Current market cap, total supply, current price | 24 h      |

Optional API key via `COINGECKO_API_KEY` environment variable (sent as `x-cg-demo-api-key` header). Free tier works without it but has stricter rate limits.

**Important**: `days=365` is used instead of `days=max` because `days=max` returns too much data for the free tier and causes timeouts. All three valuation models (MVRV, S2F, Rainbow) share a single `fetchBtcPriceHistory()` call to avoid redundant requests.

### Blockchain.info — Realized Cap Approximation

Base URL: `https://api.blockchain.info`

| Endpoint                                            | Data Returned                     | Cache TTL |
| --------------------------------------------------- | --------------------------------- | --------- |
| `GET /charts/market-cap?timespan=1days&format=json` | Approximate market capitalization | On-demand |

No API key required.

**Caveat**: True realized cap (the sum of each UTXO's value at the price when it last moved) requires paid APIs like Glassnode or CoinMetrics. The free-tier approximation applies a 65% discount to the market cap (`REALIZED_CAP_DISCOUNT = 0.65`). If the Blockchain.info call fails, a fallback heuristic of `0.7 × market cap` is used (`REALIZED_CAP_FALLBACK_MULT = 0.7`). Both approximation methods and their rationale are documented in JSDoc on `fetchRealizedCap()`.

---

## Valuation Model Calculations

### MVRV Z-Score

```
MVRV Ratio = Market Cap / Realized Cap
Z-Score = (Market Cap − Realized Cap) / StdDev(Market Caps over 365 days)
```

| Zone             | Z-Score | Color  | Interpretation                    |
| ---------------- | ------- | ------ | --------------------------------- |
| Undervalued      | < 0     | Green  | Historically strong buy zone      |
| Fair Value       | 0 – 3   | Amber  | Normal range                      |
| Overvalued       | 3 – 6   | Orange | Caution — late cycle              |
| Bubble Territory | > 6     | Red    | Historically preceded corrections |

### Stock-to-Flow (S2F)

```
S2F Ratio = Current Supply / Annual Flow
Annual Flow = Block Reward × (365.25 × 24 × 6)
Model Price = exp(3.21 × ln(S2F) − 1.6)
```

Based on PlanB's 2019 regression. The model has increasingly diverged from spot price since the 2021 cycle — this is noted in the UI via an InfoTooltip caveat.

### Rainbow Price Band

```
Base Price = 10^(5.84 × log₁₀(Days Since Genesis) − 17.01)
```

10 multipliers `[0.4, 0.5, 0.65, 0.85, 1.1, 1.5, 2.1, 3.0, 4.5, 7.0]` applied to the base create 9 bands:

| Band              | Color                             | Multiplier Range |
| ----------------- | --------------------------------- | ---------------- |
| Fire Sale         | Deep blue `hsl(240, 60%, 55%)`    | 0.4 – 0.5        |
| Buy               | Blue `hsl(210, 70%, 50%)`         | 0.5 – 0.65       |
| Accumulate        | Cyan `hsl(180, 60%, 45%)`         | 0.65 – 0.85      |
| Still Cheap       | Green `hsl(120, 60%, 45%)`        | 0.85 – 1.1       |
| Hold              | Yellow-green `hsl(60, 80%, 50%)`  | 1.1 – 1.5        |
| Is this a bubble? | Yellow-orange `hsl(45, 90%, 55%)` | 1.5 – 2.1        |
| FOMO              | Orange `hsl(30, 90%, 55%)`        | 2.1 – 3.0        |
| Sell              | Red-orange `hsl(15, 85%, 55%)`    | 3.0 – 4.5        |
| Maximum Bubble    | Red `hsl(0, 80%, 50%)`            | 4.5 – 7.0        |

### Halving Calculations

All pure functions — no external API calls. Computed from block height alone.

```
Halving Interval = 210,000 blocks
Block Reward = 50 / 2^(era)
Next Halving Block = (current_era + 1) × 210,000
Estimated Date = now + (blocks_remaining × 600 seconds)
Total Mined = Σ (reward_per_era × blocks_in_era)
```

| Halving | Block     | Date         | Reward             | Price at Halving |
| ------- | --------- | ------------ | ------------------ | ---------------- |
| 1st     | 210,000   | 2012-11-28   | 50 → 25 BTC        | $12.35           |
| 2nd     | 420,000   | 2016-07-09   | 25 → 12.5 BTC      | $650.63          |
| 3rd     | 630,000   | 2020-05-11   | 12.5 → 6.25 BTC    | $8,821.42        |
| 4th     | 840,000   | 2024-04-19   | 6.25 → 3.125 BTC   | $63,846.00       |
| 5th     | 1,050,000 | ~2028 (est.) | 3.125 → 1.5625 BTC | —                |

---

## Caching Strategy

### Two-Layer Cache

All external API calls go through `lib/market/cache.ts` which implements a two-layer caching strategy:

```
Request → Memory Cache (fast, per-process) → Supabase Cache (persistent) → External API → Store in both layers
```

On API failure, stale Supabase cache data is returned as a fallback (better stale data than no data).

### Database Table: `market_cache`

| Column        | Type          | Description                    |
| ------------- | ------------- | ------------------------------ |
| `key`         | `text` (PK)   | Unique cache key               |
| `data`        | `jsonb`       | Cached response payload        |
| `fetched_at`  | `timestamptz` | When the data was last fetched |
| `ttl_seconds` | `integer`     | Time-to-live in seconds        |

### Cache Keys

| Key                          | TTL   | Source                      |
| ---------------------------- | ----- | --------------------------- |
| `bitcoin:block:height`       | 5 min | Mempool.space               |
| `bitcoin:hashrate:30d`       | 24 h  | Mempool.space               |
| `bitcoin:mempool`            | 5 min | Mempool.space               |
| `bitcoin:difficulty`         | 5 min | Mempool.space               |
| `bitcoin:mvrv:zscore`        | 24 h  | CoinGecko + Blockchain.info |
| `bitcoin:s2f:data`           | 24 h  | CoinGecko                   |
| `bitcoin:rainbow:data`       | 24 h  | CoinGecko                   |
| `bitcoin:price-history:365d` | 24 h  | CoinGecko                   |

### RLS Policy

The `market_cache` table uses a service-role-only RLS policy — only server-side API routes can read/write cache entries. No client-side access is allowed.

---

## API Routes

### `GET /api/market/bitcoin/onchain`

Returns all four on-chain metric categories in a single response. Requires authenticated Supabase session (returns 401 otherwise).

```json
{
  "blockHeight": { "height": 890123, "lastUpdated": "2026-03-26T..." },
  "hashrate": { "currentHashrate": 725.3, "currentDifficulty": 1.13e14, "hashrates": [...] },
  "mempool": { "size": 45230, "bytes": 128000000, "feeRates": { "fastestFee": 12, "halfHourFee": 8, ... } },
  "difficulty": { "progressPercent": 67.2, "difficultyChange": -2.1, "estimatedRetargetDate": "..." }
}
```

### `GET /api/market/bitcoin/valuation`

Returns valuation model data. Supports selective fetching via `?model=` query parameter.

| Parameter        | Returns            |
| ---------------- | ------------------ |
| `?model=mvrv`    | MVRV Z-Score only  |
| `?model=s2f`     | Stock-to-Flow only |
| `?model=rainbow` | Rainbow bands only |
| (none)           | All three models   |

---

## File Inventory

### Library (`lib/bitcoin/`)

| File               | Purpose                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `onchain.ts`       | Mempool.space API integration — `fetchBlockHeight()`, `fetchHashrate()`, `fetchMempool()`, `fetchDifficulty()`                                |
| `valuation.ts`     | MVRV, S2F, Rainbow calculations — `fetchMvrvZScore()`, `fetchS2FData()`, `fetchRainbowData()`, `fetchBtcPriceHistory()`, `fetchRealizedCap()` |
| `halving.ts`       | Pure halving math — `calculateHalvingCountdown()`, `calculateSupplyMetrics()`, `getBlockReward()`, `estimateHalvingDate()`                    |
| `rainbow-bands.ts` | Band label/color constants (9 bands)                                                                                                          |

### Pages (`app/dashboard/bitcoin/`)

| File                 | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `page.tsx`           | Server Component — network metrics + halving |
| `valuation/page.tsx` | Server Component — MVRV + S2F + Rainbow      |
| `_hooks.ts`          | `useAutoRefresh<T>` — 60-second polling hook |
| `loading.tsx`        | Suspense skeleton (both routes)              |

### Components (`app/dashboard/bitcoin/_components/`)

| File                       | Chart Type                | Data                                    |
| -------------------------- | ------------------------- | --------------------------------------- |
| `bitcoin-metrics-live.tsx` | — (wrapper)               | Auto-refresh orchestrator               |
| `network-metrics.tsx`      | Card layout               | Four metric cards                       |
| `metric-card.tsx`          | Card + optional sparkline | Single metric display                   |
| `hashrate-sparkline.tsx`   | Recharts `LineChart`      | 30-day hashrate trend                   |
| `mvrv-chart.tsx`           | Custom gauge (CSS)        | Z-Score color zones                     |
| `s2f-chart.tsx`            | Recharts `ComposedChart`  | BTC price vs. model price (dual `Line`) |
| `rainbow-chart.tsx`        | Recharts `AreaChart`      | 9 stacked `Area` bands + price overlay  |
| `halving-countdown.tsx`    | Card + progress bar       | Blocks remaining, estimated date        |
| `halving-timeline.tsx`     | Card + timeline           | Historical halvings with prices         |
| `supply-metrics.tsx`       | Card + stats grid         | Mined supply, issuance rate             |

### Tests (`lib/bitcoin/__tests__/`)

| File                | Test Count | Covers                                                 |
| ------------------- | ---------- | ------------------------------------------------------ |
| `onchain.test.ts`   | ~25        | API response parsing, Zod validation, error handling   |
| `valuation.test.ts` | ~35        | MVRV, S2F, Rainbow math, edge cases, Zod schemas       |
| `halving.test.ts`   | ~28        | Block reward, era detection, countdown, supply metrics |

**Total: 88 tests passing.**

---

## Known Limitations

1. **Realized cap is approximate** — True realized cap requires UTXO-set traversal (Glassnode/CoinMetrics paid tier). Free-tier uses a 65% market cap discount heuristic.
2. **S2F model divergence** — PlanB's 2019 regression coefficients (`exp(3.21 × ln(S2F) − 1.6)`) have increasingly diverged from actual prices since the 2021 cycle. This is documented in the UI via InfoTooltip.
3. **Halving date estimation** — Assumes constant 10-minute average block time. Actual block times vary ±15% depending on hashrate changes between difficulty adjustments.
4. **CoinGecko free tier** — Rate-limited; `days=365` used instead of `days=max` to avoid timeouts. Shared `fetchBtcPriceHistory()` function prevents redundant API calls across valuation models.
5. **No WebSocket streaming** — Network metrics use 60-second polling via `useAutoRefresh` rather than live WebSocket feeds from Mempool.space.
