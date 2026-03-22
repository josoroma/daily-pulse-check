# Finance Dashboard — Project Instructions

> Source of truth: @SPECS.md
> Architecture: @.claude/README-ARCHITECTURE.md
> Spec → Code mapping: @.claude/README-SPECS.md

## Project Overview

Personal finance dashboard for a Costa Rica-based software developer tracking VOO, QQQ, and Bitcoin investments. Built with Next.js 15 App Router, TypeScript strict, Supabase, and Vercel AI SDK.

## Tech Stack

- **Framework**: Next.js 15 (App Router) — always use `app/` directory, never `pages/`
- **Language**: TypeScript strict — no `any`, no `@ts-ignore`, no `as unknown as`
- **Styling**: Tailwind CSS v4 — utility classes only, no custom CSS files
- **UI**: shadcn/ui — use existing components before building custom ones
- **State**: Jotai — atomic state per route segment, colocated `_atoms.ts`
- **Forms**: React Hook Form + `@hookform/resolvers` + Zod
- **Database & Auth**: Supabase (Postgres + Auth + RLS)
- **AI**: Vercel AI SDK (`ai` + `@ai-sdk/openai`) — use `generateText`/`streamText` for AI features
- **Charts**: Recharts for data visualization
- **Dates**: date-fns + @date-fns/tz — centralized in `lib/date/`, Costa Rica timezone explicit
- **Testing**: Vitest — colocated `__tests__/` directories within each route or lib module

## Architecture: Colocated Feature-Based

Every route segment is a self-contained feature boundary. All related logic lives **inside** the route folder.

### Route Segment Contract

```
app/<route>/
├── page.tsx              # Required — Server Component (entry point)
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
└── __tests__/            # Required — unit tests for logic in this route
    ├── _schema.test.ts
    ├── _actions.test.ts
    └── _utils.test.ts
```

### Naming Rules

| Convention       | Rule                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Route files      | Underscore prefix: `_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`, `_types.ts`, `_utils.ts`, `_constants.ts` |
| Component folder | `_components/` (underscore prefix, not a route segment)                                                             |
| Component files  | kebab-case: `positions-table.tsx`, `fear-greed-gauge.tsx`                                                           |
| Component names  | PascalCase: `PositionsTable`, `FearGreedGauge`                                                                      |
| Test folder      | `__tests__/` — mirrors the `_` file it tests                                                                        |
| Schema exports   | `export const <Name>Schema = z.object({...})` + `export type <Name> = z.infer<typeof <Name>Schema>`                 |
| Action exports   | `export async function <verbNoun>(...)` — e.g., `createPosition`, `updateProfile`                                   |

### Shared Code (`lib/`)

Cross-cutting concerns that serve **3+ route segments** live in `lib/`:

```
lib/
├── supabase/             # Supabase client, server, middleware helpers
│   ├── client.ts
│   ├── server.ts
│   ├── proxy.ts
│   └── database.types.ts
├── date/                 # Centralized date utilities (date-fns + @date-fns/tz)
│   ├── config.ts         # setDefaultOptions (locale, calendar) + CR_TIMEZONE
│   └── index.ts          # nowCR, todayCR, formatDateISO, daysAgoCR, etc.
├── market/               # External API integrations (reused across routes)
│   ├── stocks.ts         # Twelve Data
│   ├── crypto.ts         # CoinGecko
│   ├── sentiment.ts      # Alternative.me
│   └── macro.ts          # FRED
├── bitcoin/              # On-chain, valuation, halving calculations
│   ├── onchain.ts
│   ├── valuation.ts
│   └── halving.ts
├── indicators/           # RSI, moving averages
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

### Decision Tree: Colocate vs Shared

```
Is this code used by ONLY this route?
  YES → colocate in the route folder (_actions.ts, _schema.ts, etc.)
  NO  → Is it used by 2 routes?
    YES → colocate in the higher route, import from there
    NO (3+ routes) → move to lib/<domain>/
```

## Code Style

- 2-space indentation, single quotes, trailing commas, no semicolons
- Named exports only — `export default` allowed only for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- Path alias `@/` maps to project root — use `@/app/...`, `@/lib/...`
- File naming: kebab-case for component files, underscore prefix for route module files
- Prefer Server Components. Mark Client Components with `'use client'` only when needed
- Validation always happens in `_actions.ts` (server-side) — UI shows client-side hints only

## Database

- All tables must have RLS policies — users can only access their own data
- Supabase types generated via `supabase gen types typescript --local > lib/supabase/database.types.ts`
- Migrations in `supabase/migrations/` — never modify existing migrations, create new ones

## Testing

- Run tests: `npm test`
- Test files colocated in `__tests__/` within each route or lib module
- Test pure logic: Zod schemas, calculations, evaluators, parsers
- No mocking of Supabase — test pure functions only
- Naming: `_schema.test.ts`, `_actions.test.ts`, `_utils.test.ts`

## SPECS Workflow

This project uses a structured SPECS.md with Epics (E1–E10), User Stories (US-X.Y), and Tasks (T-X.Y.Z). Each user story includes Gherkin acceptance criteria.

- Reference items by ID: `E1`, `US-1.1`, `T-1.1.1`
- Each **Epic** maps to a route group or domain (see @.claude/README-SPECS.md)
- Each **User Story** maps to a route segment with its colocated files
- Each **Task** maps to specific files within that segment
- Update SPECS.md status markers: `[ ]` todo, `[~]` in progress, `[x]` completed, `[!]` blocked
- Update the Progress Summary table when story statuses change
- Always validate against Gherkin scenarios before marking a story complete

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
- `npm test` — run Vitest
- `supabase start` — local Supabase
- `supabase db push` — apply migrations
- `supabase gen types typescript --local > lib/supabase/database.types.ts` — regenerate types

## Git Conventions

- Commit format: `type(scope): description` — e.g., `feat(portfolio): add position CRUD`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- Scope matches the epic/domain: `setup`, `auth`, `portfolio`, `market`, `dca`, `alerts`, `insights`, `bitcoin`, `analytics`, `settings`
- One commit per task or logical unit — never commit half-done work
