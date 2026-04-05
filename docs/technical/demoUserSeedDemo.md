# Plan: Demo User Seed for Stakeholder Demo

## Summary

Create a demo user `pablo+demo@josoroma.com` (password: `Demosthenes.579`) with 15 days of realistic historical data across all features — portfolio, transactions, DCA schedules, alerts, AI summaries, portfolio snapshots, and notifications — to showcase the full dashboard for stakeholders.

## Architecture

**File created:**

| File                | Purpose                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `supabase/seed.sql` | SQL seed script (already expected by `config.toml`) — creates the demo user in `auth.users`, then populates all tables |

## What Gets Seeded (15 days: March 20 – April 3, 2026)

### 1. Auth User + Profile

- **Email**: `pablo+demo@josoroma.com`, **Password**: `Demosthenes.579` (bcrypt hash)
- **Profile**: `display_name = 'Pablo Demo'`, `base_currency = 'USD'`, `country = 'CR'`, `risk_tolerance = 'Medium-High'`, `ai_provider = 'openai'`, `ai_model = 'gpt-4.1-mini'`, `notification_email_enabled = true`

### 2. Portfolio

- **1 portfolio**: "Main Portfolio" with `target_allocations = { VOO: 40, QQQ: 30, BTC: 30 }`

### 3. Positions (3 holdings)

| Symbol | Type   | Quantity | Avg Buy Price | Notes                 |
| ------ | ------ | -------- | ------------- | --------------------- |
| VOO    | ETF    | 15       | $480.25       | Core S&P 500 index    |
| QQQ    | ETF    | 10       | $495.50       | Nasdaq 100 tech heavy |
| BTC    | Crypto | 0.15     | $68,500.00    | Long-term HODL        |

### 4. Transactions (12–15 entries spanning 15 days)

Mix of Buy, DCA, and a small Sell to populate the activity feed:

- 3 initial Buy transactions (day 1 — position opening)
- 9 DCA transactions (3 per week across VOO/QQQ/BTC)
- 1 small Sell (BTC partial take-profit on day 10)
- Realistic fees ($0–$1 for ETFs, $0.50–$2 for crypto)

### 5. DCA Schedules (3 active)

| Symbol | Type   | Amount | Frequency | Day           |
| ------ | ------ | ------ | --------- | ------------- |
| VOO    | ETF    | $200   | Weekly    | Monday (1)    |
| QQQ    | ETF    | $150   | Weekly    | Wednesday (3) |
| BTC    | Crypto | $100   | Weekly    | Friday (5)    |

### 6. Alerts (6 — mix of active + triggered)

| Symbol | Condition  | Threshold | Status    | Notes                                 |
| ------ | ---------- | --------- | --------- | ------------------------------------- |
| BTC    | above      | 95,000    | active    | Breakout watch                        |
| BTC    | below      | 60,000    | active    | Crash protection                      |
| VOO    | above      | 520       | active    | Take-profit target                    |
| QQQ    | rsi_above  | 70        | active    | Overbought alert (period=14)          |
| BTC    | mvrv_above | 3.5       | active    | Cycle top indicator                   |
| VOO    | below      | 450       | triggered | Historical — was triggered 5 days ago |

### 7. Portfolio Snapshots (15 daily entries)

Simulated daily portfolio values with realistic variance (±1–3% daily fluctuation):

| Date Range   | Pattern                                    |
| ------------ | ------------------------------------------ |
| Mar 20–24    | Gradual growth (~$17,200 → $17,800)        |
| Mar 25–28    | Small dip (~$17,800 → $17,400)             |
| Mar 29–Apr 1 | Recovery and new high (~$17,400 → $18,100) |
| Apr 2–3      | Slight pullback (~$18,100 → $17,950)       |

Each snapshot includes `positions_data` JSONB with per-asset breakdown.

### 8. AI Summaries (15 daily entries)

Pre-generated market summary content for each day — realistic markdown text covering:

- Market overview (S&P 500, Nasdaq, BTC movements)
- Key macro indicators (Fed Funds, 10Y yield, DXY)
- Fear & Greed index reading
- Portfolio-specific insights
- `model_used = 'openai/gpt-4.1-mini'`

### 9. Notifications (10+ entries)

Mix of types to populate the notifications panel:

- 3 `dca_reminder` notifications (from weekly DCA runs)
- 1 `price_alert` notification (the triggered VOO alert)
- 2 `system` notifications (welcome message, weekly digest)
- All spread across the 15-day window, some read, some unread

### 10. Market Cache (warm cache entries)

Pre-populate `market_cache` with recent price data so the dashboard loads instantly even without live API calls:

- `stock:VOO:price`, `stock:QQQ:price`, `crypto:bitcoin:price`
- `sentiment:fear-greed`
- TTL set to current time so they appear fresh

## Key Decisions

1. **User creation approach**: Insert directly into `auth.users` with a bcrypt-hashed password. The trigger `handle_new_user()` will auto-create the profile row, but we UPDATE it immediately after to set the full preferences.

2. **Deterministic UUIDs**: Use fixed UUIDs for all seeded entities so the seed is idempotent and can be re-run after `supabase db reset`.

3. **Realistic AI summaries**: Hardcode 15 realistic markdown summaries rather than calling an LLM at seed time. Each varies day-to-day to look authentic.

4. **Snapshot price simulation**: Use realistic price ranges based on actual April 2026 vicinity prices (VOO ~$500, QQQ ~$510, BTC ~$83K) with ±2% daily noise.

5. **RLS bypass**: The seed runs as superuser/service_role, so RLS policies don't block inserts.

## Implementation Order

1. Create `supabase/seed.sql` with all the above data
2. Test with `supabase db reset` to verify clean seeding
3. Verify dashboard loads with demo data by logging in as demo user

## Complexity

| Component                            | Effort | Risk                                  |
| ------------------------------------ | ------ | ------------------------------------- |
| Auth user + profile                  | S      | Low                                   |
| Portfolio + positions + transactions | M      | Low                                   |
| DCA schedules                        | S      | Low                                   |
| Alerts (active + triggered)          | S      | Low                                   |
| Portfolio snapshots (15 days)        | M      | Low — realistic price variance needed |
| AI summaries (15 days)               | L      | Low — longest to write but no risk    |
| Notifications                        | S      | Low                                   |
| Market cache                         | S      | Low                                   |
| **Total**                            | **L**  | **Low**                               |

## Acceptance Criteria

- [ ] `pablo+demo@josoroma.com` / `Demosthenes.579` can log in successfully
- [ ] Dashboard shows portfolio value, allocations pie chart, 15-day performance chart
- [ ] Portfolio page shows 3 positions with unrealized P&L
- [ ] Transaction history shows 13+ entries
- [ ] DCA page shows 3 active weekly schedules
- [ ] Alerts page shows 5 active + 1 triggered alert
- [ ] AI summary appears on dashboard for today
- [ ] Notifications panel shows mix of read/unread items
- [ ] `supabase db reset` cleanly re-seeds without errors
