# Architecture Contract

> Colocated Feature-Based Architecture for the Finance Dashboard

## Principle

Every route segment is a **self-contained feature boundary**. Route-specific logic lives inside the route folder. Shared code (3+ routes) lives in `lib/`.

---

## Route Segment Contract

Every route folder **must** follow this structure:

```
app/<route>/
├── page.tsx              # Required — Server Component entry point
├── layout.tsx            # Optional — layout wrapper
├── loading.tsx           # Optional — Suspense fallback
├── error.tsx             # Optional — error boundary
├── _components/          # Required — UI components for this route
│   ├── <name>.tsx        #   PascalCase component name, kebab-case file
│   └── ...
├── _actions.ts           # Required — Server Actions (mutations)
├── _schema.ts            # Required — Zod schemas (validation + types)
├── _types.ts             # Optional — types used by 3+ files in this route
├── _hooks.ts             # Optional — client-side hooks
├── _atoms.ts             # Optional — Jotai atoms for client state
├── _constants.ts         # Optional — static values, enums
├── _utils.ts             # Optional — pure helper functions
└── __tests__/            # Required — unit tests for this route's logic
    ├── _schema.test.ts
    ├── _actions.test.ts
    └── _utils.test.ts
```

### Required Files

| File | Purpose | Convention |
|---|---|---|
| `page.tsx` | Server Component entry point | `export default` allowed |
| `_actions.ts` | Server Actions (mutations & queries) | `export async function verbNoun(...)` |
| `_schema.ts` | Zod schemas + inferred types | `export const XSchema = z.object({...})` + `export type X = z.infer<typeof XSchema>` |
| `_components/` | Route UI components | Folder with kebab-case files, PascalCase exports |
| `__tests__/` | Unit tests | Mirror `_` files: `_schema.test.ts`, `_actions.test.ts` |

### Optional Files

| File | When to Add |
|---|---|
| `layout.tsx` | Route needs persistent UI wrapper |
| `loading.tsx` | Route has async data loading |
| `error.tsx` | Route needs custom error boundary |
| `_types.ts` | 3+ files in this route share types |
| `_hooks.ts` | Client-side hooks (form logic, event handlers) |
| `_atoms.ts` | Route needs Jotai atoms for client state |
| `_constants.ts` | Static values, enums, config options |
| `_utils.ts` | Pure helper functions for this route |

---

## Naming Rules

| Element | Convention | Example |
|---|---|---|
| Route module files | Underscore prefix | `_actions.ts`, `_schema.ts`, `_hooks.ts` |
| Component folder | Underscore prefix | `_components/` |
| Component files | kebab-case | `positions-table.tsx`, `fear-greed-gauge.tsx` |
| Component names | PascalCase | `PositionsTable`, `FearGreedGauge` |
| Test folder | Double underscore | `__tests__/` |
| Test files | Mirror source prefix | `_schema.test.ts`, `_utils.test.ts` |
| Schema exports | `<Name>Schema` + `<Name>` type | `export const PositionSchema = ...` |
| Action exports | `verbNoun` async function | `createPosition`, `updateProfile` |

---

## Shared Code (`lib/`)

Cross-cutting concerns that serve **3+ route segments**:

```
lib/
├── supabase/             # DB client, server helpers, middleware, types
│   ├── client.ts
│   ├── server.ts
│   ├── middleware.ts
│   └── database.types.ts
├── market/               # External API clients (Twelve Data, CoinGecko, FRED, Alternative.me)
│   ├── stocks.ts
│   ├── crypto.ts
│   ├── sentiment.ts
│   └── macro.ts
├── bitcoin/              # On-chain analytics, valuation models, halving
│   ├── onchain.ts
│   ├── valuation.ts
│   └── halving.ts
├── indicators/           # Technical indicators (RSI, moving averages)
│   ├── rsi.ts
│   └── moving-average.ts
├── ai/                   # Vercel AI SDK prompt templates
│   ├── market-summary.ts
│   ├── portfolio-analysis.ts
│   └── learning-assistant.ts
├── notifications/        # Multi-channel dispatcher
│   ├── dispatcher.ts
│   └── telegram.ts
└── utils/                # Generic helpers (formatting, dates, currency)
    └── index.ts
```

---

## Decision Tree: Colocate vs Shared

```
Is this code used by ONLY this route?
  YES → colocate in the route folder (_actions.ts, _schema.ts, etc.)
  NO  → Is it used by 2 routes?
    YES → colocate in the higher-level route, import from there
    NO (3+ routes) → move to lib/<domain>/
```

---

## Server / Client Boundary

| Layer | Runs on | Convention |
|---|---|---|
| `page.tsx` | Server | Async data fetching, pass props to client components |
| `_actions.ts` | Server | `'use server'` — mutations, Zod validation, Supabase calls |
| `_schema.ts` | Shared | Importable on both server and client |
| `_components/*.tsx` | Client (if interactive) | `'use client'` only if needed (hooks, events, browser APIs) |
| `_hooks.ts` | Client | `'use client'` — form logic, event handlers |
| `_atoms.ts` | Client | Jotai atoms — client state management |
| `lib/**` | Server | External API calls, DB helpers — never imported by client |

---

## Validation Flow

```
Client (_components/)          Server (_actions.ts)
  ┌─────────────┐               ┌─────────────────┐
  │ RHF + Zod   │  formData →   │ Zod.parse()     │
  │ (UI hints)  │ ──────────→   │ (authoritative) │
  │ client-side │               │ + Supabase call  │
  └─────────────┘               └─────────────────┘

- Client: shows inline hints, prevents bad UX
- Server: authoritative validation in _actions.ts — never trust client
```

---

## Canonical Example: Portfolio Route

```
app/portfolio/
├── page.tsx                    # SSR: fetch positions → render table
├── loading.tsx                 # Skeleton loader
├── _components/
│   ├── positions-table.tsx     # 'use client' — interactive data table
│   ├── add-position-form.tsx   # 'use client' — RHF form
│   └── portfolio-summary.tsx   # Server component — totals card
├── _actions.ts                 # createPosition, updatePosition, deletePosition
├── _schema.ts                  # PositionSchema, CreatePositionSchema
├── _hooks.ts                   # usePositionForm (RHF setup)
├── _atoms.ts                   # selectedPositionAtom, filterAtom
├── _types.ts                   # PositionWithPnL, PortfolioSummary
├── _utils.ts                   # calculatePnL, calculateCostBasis
└── __tests__/
    ├── _schema.test.ts         # Zod validation: valid + invalid inputs
    └── _utils.test.ts          # P&L calculations, edge cases
```
