---
name: document-feature
description: Generate a structured technical documentation file for a dashboard feature/route. Reads the actual codebase (routes, actions, schemas, components, APIs, migrations, tests) and produces a comprehensive doc in docs/routes/ with camelCase filename. Use when documenting a feature like "portfolio", "alerts", "bitcoin", etc.
argument-hint: <feature-name e.g. "portfolio", "alerts", "bitcoin", "dca", "market", "insights", "analytics", "settings", "authentication">
---

# Document Feature: $ARGUMENTS

You are a senior technical writer generating reference documentation for the **$ARGUMENTS** feature of the Finance Dashboard project.

## Context

Read these files first:

- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @SPECS.md — epics, user stories, tasks, and Gherkin acceptance criteria

## Your Task

Generate a comprehensive technical documentation file for the **$ARGUMENTS** feature and save it to:

```
docs/routes/<camelCaseName>.md
```

**Filename rule**: Convert the feature name to camelCase. Examples:

- `portfolio` → `docs/routes/portfolio.md`
- `bitcoin` → `docs/routes/bitcoin.md`
- `dca` → `docs/routes/dca.md`
- `market` → `docs/routes/market.md`
- `alerts` → `docs/routes/alerts.md`
- `insights` → `docs/routes/insights.md`
- `analytics` → `docs/routes/analytics.md`
- `settings` → `docs/routes/settings.md`
- `authentication` → `docs/routes/authentication.md`
- `bitcoin valuation` → `docs/routes/bitcoinValuation.md`
- `analytics tax` → `docs/routes/analyticsTax.md`

## Research Phase — Read the Actual Code

Before writing a single line of documentation, read ALL of these source files for the **$ARGUMENTS** feature:

### 1. Route Segment

- `app/dashboard/<route>/page.tsx` — Server Component entry point
- `app/dashboard/<route>/layout.tsx` — layout wrapper (if exists)
- `app/dashboard/<route>/loading.tsx` — Suspense fallback (if exists)
- `app/dashboard/<route>/error.tsx` — error boundary (if exists)
- `app/dashboard/<route>/_actions.ts` — Server Actions
- `app/dashboard/<route>/_schema.ts` — Zod schemas
- `app/dashboard/<route>/_utils.ts` — utility functions
- `app/dashboard/<route>/_constants.ts` — constants and enums
- `app/dashboard/<route>/_hooks.ts` — client-side hooks
- `app/dashboard/<route>/_atoms.ts` — Jotai atoms
- `app/dashboard/<route>/_types.ts` — shared types
- Every file in `app/dashboard/<route>/_components/`
- Every file in sub-routes: `app/dashboard/<route>/<sub>/page.tsx`, etc.

### 2. Related Files

- `app/api/` routes that serve this feature (e.g. `app/api/market/`, `app/api/ai/`, `app/api/cron/`)
- `lib/` modules this feature imports (e.g. `lib/market/`, `lib/ai/`, `lib/bitcoin/`, `lib/indicators/`, `lib/notifications/`)
- `supabase/migrations/` — SQL files that create/alter tables used by this feature
- `lib/supabase/database.types.ts` — generated types for the tables
- Test files in `__tests__/` directories

### 3. Cross-Reference

- `app/portfolio/_schema.ts` or other shared schemas if imported
- `app/profile/_actions.ts` if the feature reads profile data
- Dashboard layout components if they interact with this feature (e.g. NotificationCenter)

**CRITICAL**: Do NOT guess or copy from existing docs. Read every file above and extract facts from the actual source code. If a file doesn't exist, skip it. If a function name differs from what you'd expect, use the real name.

## Document Structure

The output file MUST follow this exact structure:

```markdown
# E{N}: {Epic Title}

> {One-paragraph summary: what this feature delivers, who it's for, and the core value proposition.}

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
```

---

### Section 1: Architecture

Produce an ASCII diagram showing the complete data flow:

```
User action → UI Component → Server Action / API Route → lib/ function → External API / Supabase → Response → UI update
```

Requirements:

- Name every file in the flow with its actual filename
- Show which components are Server vs Client (`'use client'`)
- Show external API calls with their base URLs
- Show Supabase table reads/writes
- Show cron job triggers if applicable
- Show cache layers (in-memory, `market_cache` table) if applicable

---

### Section 2: Pages & Navigation

Create a table for every route this feature owns:

| Path                       | Component        | Type             | Description |
| -------------------------- | ---------------- | ---------------- | ----------- |
| `/dashboard/<route>`       | `page.tsx`       | Server Component | ...         |
| `/dashboard/<route>/<sub>` | `<sub>/page.tsx` | Server Component | ...         |

For each page, document:

- **Loading state**: Does `loading.tsx` exist? What skeleton does it render?
- **Auto-refresh**: Any polling? What hook? What interval? What endpoint?
- **Sub-navigation**: Tabs, nested routes, or conditional renders

---

### Section 3: Why This Feature Exists — User Flows

For **every tab, card, form, listing, chart, modal, dialog, dropdown, or subpage** the user interacts with:

```markdown
#### {Component Display Name} (`_components/{filename}.tsx`)

**What the user sees**: {Describe the visual: cards, table, chart type, form fields, etc.}

**What the user can do**:

- {Action 1}: {What happens — which server action or API is called}
- {Action 2}: ...

**Data source**: {Server action or API route that provides the data}

**Why it matters**: {What decision or understanding this enables for a VOO/QQQ/BTC investor}

**States**:

- Empty: {What shows when no data exists}
- Loading: {Skeleton or spinner description}
- Error: {How errors are displayed}
```

Cover the complete user journey — from landing on the page, through every interaction, to the outcome.

---

### Section 4: Models, Cron Jobs, Actions & API Routes

#### Server Actions (`_actions.ts`)

| Function         | Zod Schema   | Tables Read        | Tables Written | Returns                 |
| ---------------- | ------------ | ------------------ | -------------- | ----------------------- |
| `functionName()` | `SchemaName` | `table1`, `table2` | `table3`       | `{ data } \| { error }` |

For each function, document:

- Auth requirement (does it call `createClient()` and check `getUser()`?)
- Validation: which Zod schema, what fields
- DB operations: SELECT/INSERT/UPDATE/DELETE with conditions
- Return shape with TypeScript type

#### API Routes (`app/api/...`)

| Method | Path              | Auth | Request Body          | Response      | External APIs  |
| ------ | ----------------- | ---- | --------------------- | ------------- | -------------- |
| `POST` | `/api/ai/summary` | Yes  | `{ model, provider }` | NDJSON stream | OpenAI, Ollama |

For each route, document:

- Auth check mechanism
- Rate limiting (if any)
- Cache behavior
- Error response shape

#### Cron Jobs (`app/api/cron/...`)

| Schedule        | Route           | What It Does | Tables Affected | External APIs |
| --------------- | --------------- | ------------ | --------------- | ------------- |
| `0 */5 * * * *` | `/api/cron/...` | ...          | ...             | ...           |

#### External APIs

For **each** external service this feature calls:

```markdown
##### {Service Name}

| Detail                  | Value                                     |
| ----------------------- | ----------------------------------------- |
| Base URL                | `https://...`                             |
| Auth                    | `{ENV_VAR_NAME}` via {header/query param} |
| Free tier limit         | {N requests/day or /month}                |
| Cache TTL               | {duration}                                |
| Fallback if unavailable | {what happens}                            |

**Endpoints called:**

| Endpoint    | Parameters    | Returns     | Used for  |
| ----------- | ------------- | ----------- | --------- |
| `GET /path` | `param=value` | `{ shape }` | {purpose} |
```

#### Zod Schemas (`_schema.ts`)

For each exported schema:

````markdown
##### `{SchemaName}` → `type {TypeName}`

| Field       | Type     | Constraints        | Description |
| ----------- | -------- | ------------------ | ----------- |
| `fieldName` | `string` | `min(1), max(100)` | ...         |

**Example valid data:**

```typescript
const example: TypeName = {
  fieldName: 'realistic value',
}
```
````

````

---

### Section 5: Database Schema

For **each table** this feature reads or writes:

```markdown
#### `{table_name}`

**Created in**: `supabase/migrations/{filename}.sql`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | No | — | FK → `auth.users(id)` ON DELETE CASCADE |

**RLS Policies:**
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `Users can view own rows` | SELECT | `auth.uid() = user_id` |

**Indexes:**
- `idx_{table}_{column}` on `{column}` {partial condition if any}

**Triggers:**
- `{trigger_name}` → calls `{function_name}()` on {INSERT/UPDATE}

**Written by**: `createFoo()` in `_actions.ts`, `/api/cron/...`
**Read by**: `getFoo()` in `_actions.ts`, `page.tsx`

**Example row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-...",
  "column": "realistic value"
}
````

````

Include a **relationships** section showing FK arrows between tables if multiple tables are involved.

---

### Section 6: Testing

List every test file:

```markdown
#### `__tests__/{filename}.test.ts`

| Describe Block | Tests | Key Edge Cases |
|---------------|-------|----------------|
| `{describe name}` | {count} | {notable cases} |

**Run this feature's tests:**
```bash
npm test -- app/dashboard/{route}
````

```

Note any **test gaps** — logic that exists in `_utils.ts` or `_actions.ts` but has no corresponding test.

---

### Section 7: File Tree

Complete tree of every file this feature owns, plus dependencies:

```

app/dashboard/{route}/
├── page.tsx
├── loading.tsx
├── \_actions.ts
├── \_schema.ts
├── \_utils.ts
├── \_constants.ts
├── \_components/
│ ├── component-one.tsx
│ └── component-two.tsx
├── sub-route/
│ ├── page.tsx
│ └── \_components/
│ └── sub-component.tsx
└── **tests**/
└── \_utils.test.ts

# Related files outside the route:

lib/{domain}/
├── module-one.ts
└── module-two.ts

app/api/{related}/
└── route.ts

supabase/migrations/
└── {relevant-migration}.sql

```

---

### Section 8: Known Limitations

Document factually from the code — do NOT invent issues:

- **Missing features**: Tasks in SPECS.md marked `[ ]` or `[!]` for this epic
- **API rate limits**: External API free tier limits and what happens when hit
- **Hardcoded values**: Magic numbers or strings that should be configurable
- **Edge cases not handled**: Uncaught error paths, missing validation
- **`// TODO` comments**: Any TODO, FIXME, or HACK comments found in the code
- **Test gaps**: Functions or branches without test coverage
- **Stale data**: Cache durations that might show outdated info

---

## Output Rules

1. **Source of truth is the code** — if the code says one thing and SPECS.md says another, document the code and note the discrepancy
2. **Every name must be verified** — function names, component names, schema names, table names, column names, env var names must match the actual source
3. **No filler or marketing language** — technical reference tone throughout
4. **Use actual TypeScript types** from `database.types.ts` for column types
5. **Include realistic example data** — not `"foo"` or `"test"`, but values a Costa Rica-based VOO/QQQ/BTC investor would actually have
6. **If a section has nothing to document** (e.g. no cron jobs for this feature), include the heading with "None" rather than omitting it

## Final Checklist

Before saving the file, verify:

- [ ] Every section heading matches the TOC exactly
- [ ] Every file referenced actually exists in the codebase
- [ ] Every function name matches the export in the source file
- [ ] Every table and column matches the migration SQL or `database.types.ts`
- [ ] Every external API endpoint matches the actual fetch call in `lib/`
- [ ] Example data is realistic and consistent across sections
- [ ] No placeholder text like `...`, `TODO`, or `TBD` remains
- [ ] The file is saved to `docs/routes/<camelCaseName>.md`
```
