# E4: Portfolio Tracker

The Portfolio Tracker is the core feature of the finance dashboard. It lets you manually manage your VOO, QQQ, and Bitcoin investment positions, log buy/sell transactions, visualize allocation and performance over time, and get rebalancing suggestions when your portfolio drifts from target allocations.

## What It Does

- **Track positions** — Add ETF (VOO, QQQ) and crypto (BTC) positions with quantity, buy price, and notes
- **Log transactions** — Record Buy, Sell, and DCA transactions that automatically update position quantities and average cost basis
- **Live P&L** — Fetches real-time prices from Twelve Data (stocks) and CoinGecko (crypto) to calculate unrealized profit/loss
- **Allocation visualization** — Donut chart showing portfolio distribution by asset
- **Performance history** — Area chart of portfolio value over time with selectable ranges (1W, 1M, 3M, 6M, 1Y, ALL)
- **Target allocation & drift** — Set target percentages per asset and see when your portfolio needs rebalancing
- **Rebalancing suggestions** — Calculates exactly how many units to buy or sell to restore target allocations

## Architecture

The portfolio tracker follows the project's colocated feature-based architecture:

```
app/dashboard/portfolio/
├── page.tsx                    # Server Component — fetches all data, computes metrics
├── loading.tsx                 # Suspense fallback with skeleton cards and table
├── _actions.ts                 # Server Actions for all CRUD operations
├── _utils.ts                   # Pure functions: P&L, drift, formatting
├── _constants.ts               # Asset colors, time ranges, crypto coin IDs
├── _components/
│   ├── portfolio-tabs.tsx      # Main tabbed layout (Positions / Transactions / Allocation / Performance)
│   ├── total-value-card.tsx    # Summary cards: total value, 24h change, unrealized P&L, cost basis
│   ├── positions-table.tsx     # Sortable table with edit/delete actions
│   ├── add-position-modal.tsx  # Dialog to add new positions
│   ├── position-form.tsx       # React Hook Form + Zod for position CRUD
│   ├── transaction-form.tsx    # Dialog to log Buy/Sell/DCA transactions
│   ├── transactions-table.tsx  # Filterable transaction history
│   ├── allocation-chart.tsx    # Recharts donut chart with legend
│   ├── performance-chart.tsx   # Recharts area chart with time range selector
│   ├── target-allocation-form.tsx  # Set target percentages (must sum to 100%)
│   ├── drift-indicator.tsx     # Bar chart comparing actual vs target allocation
│   └── empty-state.tsx         # Shown when no positions exist
└── __tests__/
    └── _utils.test.ts          # Unit tests for all pure logic

app/portfolio/
├── _schema.ts                  # Zod schemas shared across portfolio features
└── __tests__/
    └── _schema.test.ts         # Schema validation tests
```

## How It Works

### Data Flow

```
User visits /dashboard/portfolio
        │
        ├── getOrCreatePortfolio()     → portfolios table
        ├── getPositions()             → positions table
        ├── getTransactions()          → transactions table (with position join)
        └── getPortfolioSnapshots()    → portfolio_snapshots table
                │
                ▼
        fetchCurrentPrices() for each unique asset
        ├── ETFs  → Twelve Data API (via lib/market/stocks.ts)
        └── Crypto → CoinGecko API (via lib/market/crypto.ts)
                │
                ▼
        Enrich positions with live P&L
        Calculate allocations, drift, rebalancing suggestions
                │
                ▼
        Render <PortfolioTabs /> with all computed data
```

### Server Actions (`_actions.ts`)

All mutations are Server Actions with auth checks and Zod validation:

| Action                                              | Purpose                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `getOrCreatePortfolio()`                            | Gets or creates the user's portfolio on first visit        |
| `getPositions()`                                    | Fetches all positions for the authenticated user           |
| `createPosition(formData)`                          | Adds a new position (validated via `CreatePositionSchema`) |
| `updatePosition(formData)`                          | Updates an existing position                               |
| `deletePosition(id)`                                | Removes a position                                         |
| `getTransactions(positionId?)`                      | Fetches transactions, optionally filtered by position      |
| `createTransaction(formData)`                       | Logs a transaction and updates the position accordingly    |
| `updateTargetAllocations(portfolioId, allocations)` | Sets target allocation percentages                         |
| `getPortfolioSnapshots(days)`                       | Fetches historical snapshots for the performance chart     |

### Transaction Logic

When a transaction is created:

- **Buy/DCA** — Recalculates weighted average cost basis and increases position quantity
- **Sell** — Validates against overselling, calculates realized P&L, decreases quantity (deletes position if fully sold)

```
Weighted Average = (existingQty × existingAvg + newQty × newPrice) / totalQty
Realized P&L = sellQty × (sellPrice - avgBuyPrice) - fee
```

### Drift & Rebalancing

1. User sets target allocations (e.g., VOO 50%, QQQ 30%, BTC 20%)
2. System calculates actual allocation from live portfolio values
3. Drift = actual percentage − target percentage
4. If any asset drifts > 5%, the "Rebalance Needed" badge appears
5. Rebalancing suggestions show exactly how many units to buy or sell

## Database Tables

Four tables with Row Level Security (users only access their own data):

| Table                 | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `portfolios`          | User portfolios with name and `target_allocations` (JSONB)               |
| `positions`           | Holdings: asset_type (ETF/Crypto), symbol, quantity, average_buy_price   |
| `transactions`        | Transaction log: type (Buy/Sell/DCA), quantity, price, fee, executed_at  |
| `portfolio_snapshots` | Daily value snapshots for performance charts (one per portfolio per day) |

## External APIs

### Twelve Data (ETF Prices)

- **Endpoint**: `https://api.twelvedata.com/price`
- **Used for**: Real-time VOO, QQQ prices
- **Rate limit**: 800 requests/day (free tier), cached with stale fallback
- **Env var**: `TWELVE_DATA_API_KEY`

### CoinGecko (Crypto Prices)

- **Endpoint**: `https://api.coingecko.com/api/v3/coins/markets`
- **Used for**: Real-time BTC price (USD + CRC conversion)
- **Rate limit**: Free tier, optional API key via `COINGECKO_API_KEY`
- **Also provides**: Historical price data, USD→CRC exchange rate

Both APIs use the shared caching layer in `lib/market/cache.ts` which stores results in the `market_cache` Supabase table with TTL-based invalidation and stale-cache fallback when rate limits are hit.

## Validation Schemas

All user input is validated server-side with Zod (`app/portfolio/_schema.ts`):

| Schema                    | Fields                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreatePositionSchema`    | portfolio_id (UUID), asset_type (ETF/Crypto), symbol (1-10 chars, uppercase), quantity (>0), average_buy_price (≥0), notes (optional, max 500) |
| `UpdatePositionSchema`    | id (UUID, required), all other fields optional                                                                                                 |
| `CreateTransactionSchema` | position_id (UUID), type (Buy/Sell/DCA), quantity (>0), price (≥0), fee (≥0, default 0), executed_at (Date), notes (optional)                  |

## Design System

The portfolio tracker follows the project's design conventions:

- **Asset colors**: VOO (blue), QQQ (purple), BTC (orange), Cash (teal)
- **P&L indicators**: Emerald for profit, rose for loss
- **Typography**: `font-mono tabular-nums` for all numeric values
- **Charts**: Recharts with theme-aware colors and custom tooltips
- **Date formatting**: Centralized via `lib/date/` with Costa Rica timezone

## Testing

Unit tests cover all pure logic in `__tests__/_utils.test.ts`:

- Unrealized P&L calculations (profit, loss, zero cost basis, fractional crypto)
- Weighted average cost basis
- Realized P&L on sell transactions
- Oversell prevention
- Allocation percentage calculations
- Drift detection and rebalancing suggestions
- USD/percentage/quantity formatting
- Time range day mapping

Run with:

```bash
npm test
```
