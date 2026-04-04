# Spec → Code Mapping

> How SPECS.md epics, stories, and tasks map to the colocated route architecture.

---

## Epic → Route Mapping

| Epic                                  | Route / Domain | Primary Directory                                               |
| ------------------------------------- | -------------- | --------------------------------------------------------------- |
| **E1**: Project Setup                 | Infrastructure | Root config, `app/`, `lib/supabase/`                            |
| **E2**: Authentication & User Profile | Auth + Profile | `app/auth/`, `app/profile/`, `lib/supabase/`                    |
| **E3**: Market Data Engine            | Market Data    | `app/dashboard/market/`, `lib/market/`, `lib/indicators/`       |
| **E4**: Portfolio Tracker             | Portfolio      | `app/dashboard/portfolio/`, `app/portfolio/`                    |
| **E5**: DCA Automation                | DCA            | `app/dashboard/dca/`                                            |
| **E6**: AI-Powered Insights           | AI Insights    | `app/dashboard/insights/`, `app/dashboard/settings/`, `lib/ai/` |
| **E7**: Alerts & Notifications        | Alerts         | `app/dashboard/alerts/`, `lib/notifications/`                   |
| **E8**: Bitcoin On-Chain Analytics    | Bitcoin        | `app/dashboard/bitcoin/`, `lib/bitcoin/`                        |
| **E9**: Analytics & Reporting         | Analytics      | `app/dashboard/analytics/`                                      |
| **E10**: Settings & Data Management   | Settings       | `app/dashboard/settings/`                                       |
| **E11**: Dashboard Home               | Dashboard      | `app/dashboard/`                                                |
| **E12**: Luma Theme & Visual Polish   | Theme          | `app/globals.css`                                               |

---

## User Story → Route Segment

Each user story maps to a route segment with its colocated files:

| Story                                       | Route Segment                                    | Key Files                                                                                    |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **US-1.1**: Init Next.js                    | `app/`                                           | `page.tsx`, `dashboard/page.tsx`, config files                                               |
| **US-1.2**: Core Dependencies               | `lib/supabase/`                                  | `client.ts`, `server.ts`                                                                     |
| **US-1.3**: DB Schema & Testing             | `supabase/migrations/`                           | Migration files, `lib/supabase/database.types.ts`                                            |
| **US-1.4**: Git Hooks & Commit Quality      | Root config                                      | `commitlint.config.mjs`, `.husky/`                                                           |
| **US-1.5**: Dark Theme Mode                 | `app/`, `app/dashboard/_components/`             | `globals.css`, `layout.tsx`, `theme-toggle.tsx`                                              |
| **US-2.1**: Supabase Auth                   | `app/auth/login/`, `app/auth/signup/`            | `page.tsx`, `_actions.ts`, `_schema.ts`, `_components/`                                      |
| **US-2.2**: User Profile Setup              | `app/profile/`                                   | `page.tsx`, `_actions.ts`, `_schema.ts`, `_components/`                                      |
| **US-2.3**: Protected Dashboard Layout      | `app/dashboard/`                                 | `layout.tsx`, `proxy.ts`                                                                     |
| **US-3.1**: Stock & ETF Prices              | `lib/market/stocks.ts`                           | Twelve Data client                                                                           |
| **US-3.2**: Bitcoin Price & Market Data     | `lib/market/crypto.ts`                           | CoinGecko client                                                                             |
| **US-3.3**: Fear & Greed Indices            | `lib/market/sentiment.ts`                        | Alternative.me client, gauge component                                                       |
| **US-3.4**: Macro Economic Indicators       | `lib/market/macro.ts`                            | FRED client                                                                                  |
| **US-3.5**: CoinGecko Enhanced              | `lib/market/crypto.ts`, `app/api/market/crypto/` | Historical price, market chart, batch markets with sparklines                                |
| **US-3.6**: BCCR Macro Indicators           | `lib/market/bccr.ts`, `app/dashboard/market/`    | SDDE REST API client, `cr-macro-indicators.tsx`                                              |
| **US-3.7**: USD/CRC Exchange Rate Chart     | `app/dashboard/market/`                          | `exchange-rate-chart.tsx`, `lib/market/bccr.ts`                                              |
| **US-4.1**: Manual Position Entry           | `app/dashboard/portfolio/`                       | `_actions.ts`, `_schema.ts`, `_components/positions-table.tsx`                               |
| **US-4.2**: Portfolio Overview Dashboard    | `app/dashboard/portfolio/`                       | `page.tsx`, `_components/`                                                                   |
| **US-4.3**: Transaction History             | `app/dashboard/portfolio/`                       | `_components/`, `_actions.ts`                                                                |
| **US-4.4**: Target Allocation & Rebalancing | `app/dashboard/portfolio/`                       | `_components/allocation-chart.tsx`                                                           |
| **US-5.1**: DCA Schedule Configuration      | `app/dashboard/dca/`                             | `_actions.ts`, `_schema.ts`, `_components/`                                                  |
| **US-5.2**: DCA Reminder Notifications      | `app/dashboard/dca/`                             | `_utils.ts`, `lib/notifications/`                                                            |
| **US-5.3**: DCA Performance Analytics       | `app/dashboard/dca/`                             | `_components/comparison-chart.tsx`, `_utils.ts`                                              |
| **US-6.0**: AI Model Configuration          | `app/dashboard/settings/`                        | `ai-model-card.tsx`, `lib/ai/provider.ts`                                                    |
| **US-6.1**: Daily Market Summary            | `app/dashboard/insights/`                        | `_actions.ts`, `lib/ai/market-summary.ts`                                                    |
| **US-6.2**: Portfolio AI Analysis           | `app/dashboard/insights/`                        | `_actions.ts`, `lib/ai/portfolio-analysis.ts`                                                |
| **US-6.3**: Learning Assistant              | `app/dashboard/insights/`                        | `_components/chat.tsx`, `lib/ai/learning-assistant.ts`                                       |
| **US-6.4**: Chain of Thought Reasoning      | `app/dashboard/insights/`, `lib/ai/`             | NDJSON stream, reasoning toggles in all AI components                                        |
| **US-7.1**: Price Alerts                    | `app/dashboard/alerts/`                          | `_actions.ts`, `_schema.ts`, `_components/`                                                  |
| **US-7.2**: Technical Indicator Alerts      | `app/dashboard/alerts/`                          | `_utils.ts`, `__tests__/_utils.test.ts`                                                      |
| **US-7.3**: Notification Channels           | `lib/notifications/`                             | `dispatcher.ts`, `telegram.ts`, `email.ts`                                                   |
| **US-8.1**: Bitcoin Network Metrics         | `app/dashboard/bitcoin/`                         | `_components/`, `lib/bitcoin/onchain.ts`                                                     |
| **US-8.2**: Bitcoin Valuation Models        | `app/dashboard/bitcoin/valuation/`               | `page.tsx`, `lib/bitcoin/valuation.ts`, `_components/`                                       |
| **US-8.3**: Bitcoin Halving Countdown       | `app/dashboard/bitcoin/`                         | `_components/`, `lib/bitcoin/halving.ts`                                                     |
| **US-9.1**: Performance Metrics             | `app/dashboard/analytics/`                       | `_utils.ts`, `_components/`                                                                  |
| **US-9.2**: Monthly / Yearly Reports        | `app/dashboard/analytics/`                       | `_actions.ts`, `_components/`                                                                |
| **US-9.3**: Tax-Relevant Export             | `app/dashboard/analytics/`                       | `_utils.ts`, `_components/`                                                                  |
| **US-10.1**: Application Settings           | `app/dashboard/settings/`                        | `_actions.ts`, `_schema.ts`, `_components/`                                                  |
| **US-10.2**: Data Export & Account Mgmt     | `app/dashboard/settings/`                        | `_actions.ts`, `_components/`                                                                |
| **US-11.1**: Dashboard Metric Cards         | `app/dashboard/`                                 | `_actions.ts`, `_components/dashboard-metrics.tsx`                                           |
| **US-11.2**: Dashboard Charts & AI          | `app/dashboard/`                                 | `_components/dashboard-performance.tsx`, `dashboard-allocation.tsx`, `dashboard-summary.tsx` |
| **US-11.3**: Recent Activity Feed           | `app/dashboard/`                                 | `_components/dashboard-activity.tsx`, `page.tsx`                                             |
| **US-12.1**: Luma Theme & Visual Polish     | `app/`                                           | `globals.css` — CSS variables, radius, shadows                                               |

---

## Task → File Mapping Pattern

Each task type maps to a specific file within its route segment:

| Task Type              | Target File                 | Example                                                                                      |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| Schema/validation task | `_schema.ts`                | `T-4.1.1: Define PositionSchema` → `app/dashboard/portfolio/_schema.ts`                      |
| CRUD/mutation task     | `_actions.ts`               | `T-4.1.2: Implement position CRUD` → `app/dashboard/portfolio/_actions.ts`                   |
| UI component task      | `_components/<name>.tsx`    | `T-4.1.3: Build positions table` → `app/dashboard/portfolio/_components/positions-table.tsx` |
| Calculation/logic task | `_utils.ts`                 | `T-4.2.1: Calculate P&L` → `app/dashboard/portfolio/_utils.ts`                               |
| State management task  | `_atoms.ts`                 | `T-4.1.4: Add filter state` → `app/dashboard/portfolio/_atoms.ts`                            |
| Hook/form logic task   | `_hooks.ts`                 | `T-4.1.5: Position form hook` → `app/dashboard/portfolio/_hooks.ts`                          |
| Testing task           | `__tests__/<name>.test.ts`  | `T-4.2.2: Test P&L` → `app/dashboard/portfolio/__tests__/_utils.test.ts`                     |
| DB migration task      | `supabase/migrations/`      | `T-1.3.1: Create tables` → `supabase/migrations/...`                                         |
| External API task      | `lib/<domain>/<file>.ts`    | `T-3.1.1: Twelve Data client` → `lib/market/stocks.ts`                                       |
| AI prompt task         | `lib/ai/<file>.ts`          | `T-6.1.1: Market summary prompt` → `lib/ai/market-summary.ts`                                |
| API route task         | `app/api/<domain>/route.ts` | `T-3.6.3: BCCR API route` → `app/api/market/bccr/route.ts`                                   |
| CSS/theme task         | `app/globals.css`           | `T-12.1.1: Update dark mode CSS variables` → `app/globals.css`                               |

---

## Verification Checklist

When implementing a user story, verify:

1. ✅ All tasks create files in the correct route folder per this mapping
2. ✅ Route-specific logic stays colocated (not in `lib/`)
3. ✅ Shared utilities (3+ routes) are in `lib/<domain>/`
4. ✅ `__tests__/` exists with tests for `_schema.ts` and `_utils.ts`
5. ✅ Gherkin scenarios are satisfied before marking the story `[x]`
