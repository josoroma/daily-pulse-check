# Spec → Code Mapping

> How SPECS.md epics, stories, and tasks map to the colocated route architecture.

---

## Epic → Route Mapping

| Epic                                  | Route / Domain | Primary Directory                               |
| ------------------------------------- | -------------- | ----------------------------------------------- |
| **E1**: Project Setup                 | Infrastructure | Root config, `app/`, `lib/supabase/`            |
| **E2**: Authentication & User Profile | Auth + Profile | `app/(auth)/`, `app/profile/`, `lib/supabase/`  |
| **E3**: Market Data Engine            | Market Data    | `app/market/`, `lib/market/`, `lib/indicators/` |
| **E4**: Portfolio Tracker             | Portfolio      | `app/portfolio/`, `app/dashboard/`              |
| **E5**: DCA Automation                | DCA            | `app/dca/`                                      |
| **E6**: AI-Powered Insights           | AI Insights    | `app/insights/`, `lib/ai/`                      |
| **E7**: Alerts & Notifications        | Alerts         | `app/alerts/`, `lib/notifications/`             |
| **E8**: Bitcoin On-Chain Analytics    | Bitcoin        | `app/bitcoin/`, `lib/bitcoin/`                  |
| **E9**: Analytics & Reporting         | Analytics      | `app/analytics/`                                |
| **E10**: Settings & Data Management   | Settings       | `app/settings/`                                 |

---

## User Story → Route Segment

Each user story maps to a route segment with its colocated files:

| Story                              | Route Segment                             | Key Files                                                      |
| ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| **US-1.1**: Init Next.js           | `app/`                                    | `page.tsx`, `dashboard/page.tsx`, config files                 |
| **US-1.2**: Core Dependencies      | `lib/supabase/`                           | `client.ts`, `server.ts`                                       |
| **US-1.3**: DB Schema & Testing    | `supabase/migrations/`                    | Migration files, `lib/supabase/database.types.ts`              |
| **US-1.4**: Portfolio Schema       | `app/portfolio/`                          | `_schema.ts`, `__tests__/_schema.test.ts`                      |
| **US-1.5**: Dark Theme Mode        | `app/`, `app/dashboard/_components/`      | `globals.css`, `layout.tsx`, `theme-toggle.tsx`                |
| **US-2.1**: Email/Password Auth    | `app/(auth)/login/`, `app/(auth)/signup/` | `page.tsx`, `_actions.ts`, `_schema.ts`, `_components/`        |
| **US-2.2**: Auth State Management  | `app/(auth)/`                             | `layout.tsx`, `proxy.ts`                                       |
| **US-2.3**: User Profile           | `app/profile/`                            | `page.tsx`, `_actions.ts`, `_schema.ts`, `_components/`        |
| **US-3.1**: Stock Prices           | `lib/market/stocks.ts`                    | Twelve Data client                                             |
| **US-3.2**: Crypto Prices          | `lib/market/crypto.ts`                    | CoinGecko client                                               |
| **US-3.3**: Market Sentiment       | `lib/market/sentiment.ts`, `app/market/`  | Alternative.me client, gauge component                         |
| **US-3.4**: Macro Indicators       | `lib/market/macro.ts`                     | FRED client                                                    |
| **US-4.1**: Position CRUD          | `app/portfolio/`                          | `_actions.ts`, `_schema.ts`, `_components/positions-table.tsx` |
| **US-4.2**: P&L Calculations       | `app/portfolio/`                          | `_utils.ts`, `__tests__/_utils.test.ts`                        |
| **US-4.3**: Dashboard Overview     | `app/dashboard/`                          | `page.tsx`, `_components/`                                     |
| **US-4.4**: Asset Allocation       | `app/portfolio/`                          | `_components/allocation-chart.tsx`                             |
| **US-5.1**: DCA Plan CRUD          | `app/dca/`                                | `_actions.ts`, `_schema.ts`, `_components/`                    |
| **US-5.2**: DCA Returns Calc       | `app/dca/`                                | `_utils.ts`, `__tests__/_utils.test.ts`                        |
| **US-5.3**: DCA vs Lump Sum        | `app/dca/`                                | `_components/comparison-chart.tsx`                             |
| **US-6.1**: Market Summary         | `app/insights/`                           | `_actions.ts`, `lib/ai/market-summary.ts`                      |
| **US-6.2**: Portfolio Analysis     | `app/insights/`                           | `_actions.ts`, `lib/ai/portfolio-analysis.ts`                  |
| **US-6.3**: Learning Assistant     | `app/insights/`                           | `_components/chat.tsx`, `lib/ai/learning-assistant.ts`         |
| **US-7.1**: Alert Rules            | `app/alerts/`                             | `_actions.ts`, `_schema.ts`, `_components/`                    |
| **US-7.2**: Alert Evaluation       | `app/alerts/`                             | `_utils.ts`, `__tests__/_utils.test.ts`                        |
| **US-7.3**: Telegram Notifications | `lib/notifications/`                      | `dispatcher.ts`, `telegram.ts`                                 |
| **US-8.1**: On-Chain Metrics       | `app/bitcoin/`                            | `_components/`, `lib/bitcoin/onchain.ts`                       |
| **US-8.2**: Valuation Models       | `app/bitcoin/`                            | `_components/`, `lib/bitcoin/valuation.ts`                     |
| **US-8.3**: Halving Cycle          | `app/bitcoin/`                            | `_components/`, `lib/bitcoin/halving.ts`                       |
| **US-9.1**: Performance Metrics    | `app/analytics/`                          | `_utils.ts`, `_components/`                                    |
| **US-9.2**: Monthly Reports        | `app/analytics/`                          | `_actions.ts`, `_components/`                                  |
| **US-9.3**: Tax Estimation         | `app/analytics/`                          | `_utils.ts`, `_components/`                                    |
| **US-10.1**: User Preferences      | `app/settings/`                           | `_actions.ts`, `_schema.ts`, `_components/`                    |
| **US-10.2**: Data Export/Import    | `app/settings/`                           | `_actions.ts`, `_components/`                                  |

---

## Task → File Mapping Pattern

Each task type maps to a specific file within its route segment:

| Task Type              | Target File                | Example                                                                            |
| ---------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| Schema/validation task | `_schema.ts`               | `T-4.1.1: Define PositionSchema` → `app/portfolio/_schema.ts`                      |
| CRUD/mutation task     | `_actions.ts`              | `T-4.1.2: Implement position CRUD` → `app/portfolio/_actions.ts`                   |
| UI component task      | `_components/<name>.tsx`   | `T-4.1.3: Build positions table` → `app/portfolio/_components/positions-table.tsx` |
| Calculation/logic task | `_utils.ts`                | `T-4.2.1: Calculate P&L` → `app/portfolio/_utils.ts`                               |
| State management task  | `_atoms.ts`                | `T-4.1.4: Add filter state` → `app/portfolio/_atoms.ts`                            |
| Hook/form logic task   | `_hooks.ts`                | `T-4.1.5: Position form hook` → `app/portfolio/_hooks.ts`                          |
| Testing task           | `__tests__/<name>.test.ts` | `T-4.2.2: Test P&L` → `app/portfolio/__tests__/_utils.test.ts`                     |
| DB migration task      | `supabase/migrations/`     | `T-1.3.1: Create tables` → `supabase/migrations/...`                               |
| External API task      | `lib/<domain>/<file>.ts`   | `T-3.1.1: Twelve Data client` → `lib/market/stocks.ts`                             |
| AI prompt task         | `lib/ai/<file>.ts`         | `T-6.1.1: Market summary prompt` → `lib/ai/market-summary.ts`                      |

---

## Verification Checklist

When implementing a user story, verify:

1. ✅ All tasks create files in the correct route folder per this mapping
2. ✅ Route-specific logic stays colocated (not in `lib/`)
3. ✅ Shared utilities (3+ routes) are in `lib/<domain>/`
4. ✅ `__tests__/` exists with tests for `_schema.ts` and `_utils.ts`
5. ✅ Gherkin scenarios are satisfied before marking the story `[x]`
