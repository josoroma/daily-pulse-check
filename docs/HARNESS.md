# HARNESS.md — Claude Code Harness for the Finance Dashboard

> Audience: Engineering Manager / PM / Senior Engineer onboarding to this repo.
> Scope: How `.claude/`, [CLAUDE.md](../CLAUDE.md), and [SPECS.md](../SPECS.md) compose into a deterministic, auditable Spec-Driven Development (SDD) loop — and how that loop maps cleanly to Azure DevOps (ADO) for planning, traceability, and code review.

> Note on missing reference: the user prompt mentioned `CLAUDE-HELP.md` but that file does not exist in this repo. The Spec-Driven Development flows documented below are derived from [CLAUDE.md](../CLAUDE.md), [.claude/README-SKILLS.md](../.claude/README-SKILLS.md), [.claude/README-SPECS.md](../.claude/README-SPECS.md), and [.claude/README-ARCHITECTURE.md](../.claude/README-ARCHITECTURE.md), which together act as the harness contract.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Document Chain (PDD → SPECS → CLAUDE → .claude/)](#2-the-document-chain)
3. [The `.claude/` Harness — Anatomy](#3-the-claude-harness--anatomy)
4. [Rules — Auto-Loaded Path-Scoped Guardrails](#4-rules)
5. [Skills — Explicit, File-Modifying Workflows](#5-skills)
6. [Agents — Read-Only, Tool-Restricted Specialists](#6-agents)
7. [Hooks — Git-Level Quality Gates](#7-hooks)
8. [CLAUDE.md and Its Nested Contracts](#8-claudemd-and-its-nested-contracts)
9. [SPECS.md as the Single Source of Truth](#9-specsmd-as-the-single-source-of-truth)
10. [Spec-Driven Development Flows](#10-spec-driven-development-flows)
11. [SPECS.md ⇄ Azure DevOps Mapping](#11-specsmd--azure-devops-mapping)
12. [Roles, Responsibilities, RACI](#12-roles-responsibilities-raci)
13. [Day-in-the-Life Walkthrough](#13-day-in-the-life-walkthrough)
14. [Operational Checklist](#14-operational-checklist)

---

## 1. Executive Summary

The Finance Dashboard runs on a **Spec-Driven Development (SDD)** harness where every line of code traces back to a numbered specification. The harness is built from five composable concepts:

| Concept     | Source                                        | When it runs                                         | Modifies code? |
| ----------- | --------------------------------------------- | ---------------------------------------------------- | -------------- |
| **Rules**   | [.claude/rules/](../.claude/rules/)           | Auto-loaded when editing files matching glob `paths` | No (guidance)  |
| **Skills**  | [.claude/skills/](../.claude/skills/)         | Invoked by name (`/implement-item US-4.1`)           | Yes            |
| **Agents**  | [.claude/agents/](../.claude/agents/)         | Invoked by name; restricted tools, fresh context     | Read-only      |
| **Hooks**   | [.husky/](../.husky/) (git, not Claude hooks) | `pre-commit`, `commit-msg`, `pre-push`               | No (gates)     |
| **Plugins** | none                                          | n/a                                                  | n/a            |

The result: an LLM agent can pick up `US-4.1`, plan it, implement it under the colocated route contract, run lint+tests, validate Gherkin scenarios, update [SPECS.md](../SPECS.md) status markers, and propose a Conventional Commit — without re-reading the entire codebase.

---

## 2. The Document Chain

The harness is a directed chain. Each artifact narrows the previous one until the agent has a single executable task.

```
README-PRODUCT-DESIGN-DOCUMENT.md     ← "what & why" (product owner output)
                │
                ▼
SPECS.md                              ← "what to build, in what order"
   └─ E1..E14 Epics                       (14 epics, 46 user stories)
   └─ US-X.Y User Stories with Gherkin
   └─ T-X.Y.Z Tasks
                │
                ▼
CLAUDE.md                             ← "how to build it" (conventions, stack)
   └─ Colocated feature-based architecture
   └─ Naming, code style, AI streaming, DB, testing rules
                │
                ▼
.claude/                              ← "how the agent operates"
   ├─ README-ARCHITECTURE.md          ← Route segment contract
   ├─ README-SPECS.md                 ← Epic/Story/Task → File mapping
   ├─ README-SKILLS.md                ← Operator's manual for harness
   ├─ rules/        (7 files)         ← Path-scoped auto-loaded guardrails
   ├─ skills/       (5 workflows)     ← Named, file-modifying recipes
   └─ agents/       (4 specialists)   ← Named, read-only auditors
                │
                ▼
.husky/                               ← "what cannot reach origin"
   ├─ pre-commit  → lint-staged
   ├─ commit-msg  → commitlint
   └─ pre-push    → tsc --noEmit && npm test
```

The chain is enforced on both ends: **upstream** by `specs-workflow` rule (no code without a SPECS item), **downstream** by git hooks (no commit without lint+commitlint, no push without typecheck+tests).

---

## 3. The `.claude/` Harness — Anatomy

```
.claude/
├── README-ARCHITECTURE.md   ← Route segment contract — required/optional files per route
├── README-SKILLS.md         ← Operator manual — when to use which skill/agent
├── README-SPECS.md          ← Spec → Code mapping — Epic/Story/Task → File paths
├── rules/                   ← 7 path-scoped, auto-loaded markdown rules
│   ├── code-style.md            applies to: app/**/*.{ts,tsx}, lib/**/*.{ts,tsx}
│   ├── database.md              applies to: supabase/migrations/**, lib/supabase/**, app/**/_schema.ts
│   ├── dates.md                 applies to: app/**/*.{ts,tsx}, lib/**/*.{ts,tsx}
│   ├── design.md                applies to: app/**/*.tsx, app/**/_components/**
│   ├── security.md              applies to: lib/supabase/**, app/**/_actions.ts, app/api/**, proxy.ts
│   ├── specs-workflow.md        applies to: SPECS.md, CLAUDE.md
│   └── testing.md               applies to: app/**/__tests__/**, app/**/*.test.ts, lib/**/**/*.test.ts
├── skills/                  ← 5 invokable workflows (modify files, with approval gates)
│   ├── add-item/SKILL.md
│   ├── implement-item/SKILL.md
│   ├── update-specs/SKILL.md
│   ├── frontend-design/SKILL.md
│   └── capture-prompts/SKILL.md
└── agents/                  ← 4 read-only specialists (Read, Grep, Glob, Write only)
    ├── plan-item.md
    ├── review-item.md
    ├── document-feature.md
    └── code-reviewer.md
```

---

## 4. Rules

Rules are markdown files with YAML frontmatter `paths:` globs. When a matching file is opened or edited, the rule body is auto-injected as context. Rules **never modify files** — they are the agent's persistent memory of project policy.

| Rule                                                    | Enforces                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [code-style.md](../.claude/rules/code-style.md)         | 2-space indent, single quotes, no semicolons, named exports only (except `page.tsx`/`layout.tsx`/`route.ts`), `@/` aliases, underscore-prefixed route files, kebab-case components, schema/action naming.     |
| [database.md](../.claude/rules/database.md)             | Never modify existing migrations; RLS in same migration as `CREATE TABLE`; regenerate types after schema changes; separate `Create*Schema` vs `Update*Schema`; never include `id`/`user_id` in Create inputs. |
| [dates.md](../.claude/rules/dates.md)                   | All date display via `@/lib/date`; Costa Rica timezone explicit via `@date-fns/tz`; forbid `toISOString()`, `toLocaleDateString()`, manual date arithmetic in app code.                                       |
| [design.md](../.claude/rules/design.md)                 | `emerald`/`rose` for gains/losses, asset colors (VOO blue, QQQ purple, BTC orange, Cash teal), `tabular-nums font-mono` for prices, shadcn/ui first, Loading/Empty/Error states required, dark-first theme.   |
| [security.md](../.claude/rules/security.md)             | RLS on every table; `auth.uid()` server-side only; Zod validation in `_actions.ts`; `service_role` key never on client; encrypt user-stored API keys.                                                         |
| [specs-workflow.md](../.claude/rules/specs-workflow.md) | SPECS.md is the single source of truth; reference items by ID; status markers `[ ]` `[~]` `[x]` `[!]`; update Progress Summary on status change; story complete only when all tasks `[x]` AND Gherkin passes. |
| [testing.md](../.claude/rules/testing.md)               | Vitest only; no Supabase mocking; tests colocated in `__tests__/`; mirror `_` file names; cover edge cases, both Zod pass + fail.                                                                             |

**Operator implication**: rules are non-negotiable defaults. To change policy, edit the rule file in a separate PR — not inside a feature change.

---

## 5. Skills

Skills are explicit, named workflows that **do** modify files. They are loaded by reading their `SKILL.md` and following the phased instructions inside.

| Skill                                                            | Purpose                                                                                        | Approval Gate         | Output                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| [`/add-item`](../.claude/skills/add-item/SKILL.md)               | Add a new Epic / User Story / Task to SPECS.md with auto 🎨 detection                          | Yes — diff preview    | Updated SPECS.md + Progress Summary row                 |
| [`/implement-item`](../.claude/skills/implement-item/SKILL.md)   | Implement an Epic or User Story end-to-end through 4 phases (Plan/Implement/Validate/Complete) | No — runs full loop   | Code, tests, SPECS.md status updates, commit suggestion |
| [`/update-specs`](../.claude/skills/update-specs/SKILL.md)       | Controlled SPECS.md / CLAUDE.md edits (status fixes, table recounts, content changes)          | Yes — diff preview    | Updated SPECS.md or CLAUDE.md                           |
| [`/frontend-design`](../.claude/skills/frontend-design/SKILL.md) | Design + implement UI components against the project design system                             | No — design checklist | Production `.tsx` files (kebab-case, shadcn/ui, states) |
| [`/capture-prompts`](../.claude/skills/capture-prompts/SKILL.md) | Extract → improve → derive tasks → categorize session prompts; idempotent append               | No — append-only      | `README-PROMPTS.md` (created if missing)                |

### `/implement-item` — the workhorse

Four phases per task:

1. **Plan** — Read SPECS section for the target ID, locate latest matching `docs/agents/item-implementation-plan-*.md`, identify files per [README-SPECS.md](../.claude/README-SPECS.md), check 🎨 marker.
2. **Implement** — Mark task `[~]`, write code under the route segment contract (TS strict, `@/` aliases, `_actions.ts` / `_schema.ts` / `_components/`, RLS), apply `/frontend-design` if 🎨.
3. **Validate** — `npm run lint`, `npm test`, walk every Gherkin scenario, verify each `Then` clause has a code citation.
4. **Complete** — Mark `[x]`, roll up to story/epic, recompute Progress Summary, propose Conventional Commit `type(scope): description`.

Output always includes a Gherkin Validation Report, an Implementation Summary, and the path of the plan file consumed (or "none — implemented from SPECS.md only").

---

## 6. Agents

Agents are read-only specialists with restricted toolsets (`Read`, `Grep`, `Glob`, optionally `Write` for their single output document). They run with a **fresh context window** — they do not see the main chat history, only the files they read.

| Agent                                                       | Purpose                                                                                  | Output Path                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`plan-item`](../.claude/agents/plan-item.md)               | Plan an Epic / Story / Task / free-text scope: dependencies, ordering, complexity, files | `docs/agents/item-implementation-plan-{YYYY-MM-DD-HH-MM-SS}.md` |
| [`review-item`](../.claude/agents/review-item.md)           | Audit implementation vs SPECS Gherkin + latest plan + CLAUDE.md conventions              | `docs/agents/item-reviewed-{YYYY-MM-DD-HH-MM-SS}.md`            |
| [`document-feature`](../.claude/agents/document-feature.md) | Generate a complete technical reference doc for a route/feature, citing real files only  | `docs/routes/{camelCaseName}.md`                                |
| [`code-reviewer`](../.claude/agents/code-reviewer.md)       | Generic read-only reviewer used internally by `review-item`                              | Inline findings (no file)                                       |

### Severity ladder used by `review-item` and `code-reviewer`

- 🔴 **Critical** — security, data loss, broken acceptance criteria
- 🟠 **Major** — convention violation that blocks merge, missing tests for new logic
- 🟡 **Minor** — polish, naming, small refactors
- 🔵 **Info** — observations and suggestions

Every finding cites `path/to/file.ts:LN`. No claim without a citation.

---

## 7. Hooks

**No Claude Code hooks** (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, etc.) are configured. The only lifecycle gates are local **git hooks** managed by Husky:

| Hook                                      | Command                              | What it blocks                                                                                        |
| ----------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [.husky/pre-commit](../.husky/pre-commit) | `npx lint-staged`                    | ESLint or Prettier failures on staged files                                                           |
| [.husky/commit-msg](../.husky/commit-msg) | `npx --no -- commitlint --edit "$1"` | Commit messages that violate Conventional Commits ([commitlint.config.mjs](../commitlint.config.mjs)) |
| [.husky/pre-push](../.husky/pre-push)     | `npx tsc --noEmit && npm test`       | Type errors or any failing Vitest test                                                                |

Allowed commit scopes (from `commitlint.config.mjs`): `setup`, `auth`, `portfolio`, `market`, `dca`, `alerts`, `insights`, `bitcoin`, `analytics`, `settings`.

---

## 8. CLAUDE.md and Its Nested Contracts

[CLAUDE.md](../CLAUDE.md) is the project instructions file the agent loads on every session. It declares:

- **Tech stack invariants** — Next.js 16.2.1 App Router (never `pages/`), TypeScript strict (no `any`/`@ts-ignore`/`as unknown as`), Tailwind v4 (utility-only), shadcn/ui first, Jotai colocated, RHF + Zod, Supabase + RLS, Vercel AI SDK, Recharts, date-fns + `@date-fns/tz`, Vitest.
- **The Route Segment Contract** — the canonical folder shape for every `app/<route>/`:
  - Required: `page.tsx`, `_actions.ts`, `_schema.ts`, `_components/`, `__tests__/`
  - Optional: `layout.tsx`, `loading.tsx`, `error.tsx`, `_types.ts`, `_hooks.ts`, `_atoms.ts`, `_constants.ts`, `_utils.ts`
- **Naming Rules** — underscore-prefixed route files, kebab-case component files, PascalCase component names, `<Name>Schema` + `<Name>` type exports, `verbNoun` action exports.
- **Decision Tree: Colocate vs Shared** — used by ONE route → colocate; 2 routes → colocate in higher route; 3+ routes → `lib/<domain>/`.
- **AI Streaming contract** — all AI routes use `createAiNdjsonStream()`, `<think>...</think>` tags parsed server-side, model lists in `lib/ai/provider.ts` are the single source of truth.
- **Database contract** — RLS on every table, types regenerated via `supabase gen types`, never modify existing migrations.
- **Testing contract** — Vitest only, colocated `__tests__/`, no Supabase mocking, pure-function focus.

CLAUDE.md references three nested artifacts:

| Reference                                                            | Role                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [@.claude/README-ARCHITECTURE.md](../.claude/README-ARCHITECTURE.md) | Authoritative route segment contract + canonical Portfolio example                            |
| [@.claude/README-SPECS.md](../.claude/README-SPECS.md)               | Epic → Route, Story → Segment, Task → File mapping (used by `plan-item` and `implement-item`) |
| [@SPECS.md](../SPECS.md)                                             | The executable backlog                                                                        |

---

## 9. SPECS.md as the Single Source of Truth

[SPECS.md](../SPECS.md) defines the **entire** product backlog as a hierarchy:

```
Epic (E1..E14)            ← maps to a route group or domain
  └─ User Story (US-X.Y)  ← maps to a route segment, has Gherkin acceptance criteria
       └─ Task (T-X.Y.Z)  ← maps to a specific file within that segment
```

Status markers: `[ ]` todo · `[~]` in progress · `[x]` completed · `[!]` blocked.
Stories may carry `🎨` to indicate the `/frontend-design` skill must be applied.

The **Progress Summary** table at the top must always reflect actual statuses; `/update-specs` is the supported way to recompute it.

A user story is complete only when:

1. Every task is `[x]`, **AND**
2. Every Gherkin scenario is verified by `review-item` against real `file:LN` evidence.

---

## 10. Spec-Driven Development Flows

Three canonical flows. Each is reproducible by any team member or any agent.

### 10.1 Flow A — Implement an existing User Story

```
plan-item US-4.1
   ↓ writes docs/agents/item-implementation-plan-<ts>.md
/implement-item US-4.1
   ↓ reads latest matching plan + SPECS section
   ↓ Phase 1 Plan → Phase 2 Implement → Phase 3 Validate → Phase 4 Complete
   ↓ updates SPECS.md status markers + Progress Summary
   ↓ prints Gherkin Validation Report + Conventional Commit
review-item US-4.1
   ↓ writes docs/agents/item-reviewed-<ts>.md
   ↓ verdict: ✅ PASS | ⚠️ PASS WITH NOTES | ❌ NEEDS CHANGES
/update-specs (only if review found inconsistencies)
git commit -m "feat(portfolio): ..." && git push
   ↓ pre-commit (lint-staged) → commit-msg (commitlint) → pre-push (tsc + vitest)
```

### 10.2 Flow B — Add a new item discovered mid-flight

```
/add-item add US-4.5 CSV position import to E4
   ↓ Parse → Assign ID → 🎨 detect → Generate → Preview diff → Apply
   ↓ updates SPECS.md + Progress Summary row for E4
plan-item US-4.5
/implement-item US-4.5
review-item US-4.5
```

### 10.3 Flow C — Document an existing feature

```
document-feature portfolio
   ↓ reads app/dashboard/portfolio/, lib/, supabase/migrations/, __tests__/
   ↓ writes docs/routes/portfolio.md (Architecture, Pages, Flows, Models, DB, Tests, File Tree, Limits)
```

### Why the plan-then-implement pattern matters

`plan-item` runs in a **fresh context** with read-only tools. It produces a timestamped, file-grounded plan: dependencies (🟢/🟡/🔴), complexity matrix (S/M/L/XL × Low/Med/High), files to touch, and a Gherkin checklist. `/implement-item` then locates the **most recent matching** plan and treats it as the implementation contract. Any deviation is reported in the Implementation Summary's `Plan Deviations` section.

This decouples _thinking_ from _doing_, gives reviewers an artifact to compare against, and keeps the agent honest.

---

## 11. SPECS.md ⇄ Azure DevOps Mapping

The harness is intentionally tool-agnostic, but the SPECS hierarchy maps cleanly onto Azure DevOps Boards work item types — useful when stakeholders live in ADO and engineering lives in this repo.

### 11.1 Work item type mapping

| SPECS.md element             | ADO work item type                                        | Identifier convention                           | Acceptance gate                                                                |
| ---------------------------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Epic (`E1..E14`)             | **Epic**                                                  | Title prefix `[E1]`, custom field `SpecId = E1` | All child Features `Done`                                                      |
| (logical grouping, optional) | **Feature**                                               | `[E4-Portfolio Tracker]`                        | All child User Stories `Done`                                                  |
| User Story (`US-X.Y`)        | **User Story** (Agile) / **Product Backlog Item** (Scrum) | Title prefix `[US-4.1]`, `SpecId = US-4.1`      | All child Tasks closed, Gherkin verified by `review-item` PASS                 |
| Task (`T-X.Y.Z`)             | **Task**                                                  | Title prefix `[T-4.1.1]`, `SpecId = T-4.1.1`    | Status `[x]` in SPECS.md, code merged                                          |
| Gherkin scenario             | **Test Case** (Test Plans) or `Acceptance Criteria` field | One Test Case per `Scenario:`                   | Linked to parent User Story; pass before story closes                          |
| `[!]` blocked                | Tag `blocked` + Discussion comment with the blocker       | —                                               | Cleared when SPECS.md flips back to `[ ]` or `[~]`                             |
| 🎨 marker                    | Tag `frontend-design`                                     | —                                               | Reviewer applies design checklist from [design.md](../.claude/rules/design.md) |

Custom field `SpecId` (string) is the single linking key. It is the **only** trustworthy correlator between ADO and this repo.

### 11.2 Status mapping

| SPECS.md | ADO state (Agile)      | ADO state (Scrum)         |
| -------- | ---------------------- | ------------------------- |
| `[ ]`    | New / To Do            | New / Approved            |
| `[~]`    | Active                 | Committed                 |
| `[x]`    | Closed / Resolved      | Done                      |
| `[!]`    | Blocked (tag) + Active | Blocked (tag) + Committed |

### 11.3 Planning loop with ADO

1. **PM grooms backlog in ADO** — creates Epic / Feature / User Story with `SpecId` placeholders.
2. `/add-item` **mirrors** each new ADO Story/Task into [SPECS.md](../SPECS.md) with the same ID. The `SpecId` field is the contract.
3. `plan-item US-4.1` produces `docs/agents/item-implementation-plan-<ts>.md`. Attach this file URL (or commit SHA + path) to the ADO Story's Discussion or Attachments.
4. PR description references the ADO Story by `AB#<id>` so ADO auto-links the PR. Conventional Commit message references `US-4.1` for SPECS traceability — both stay in sync via `SpecId`.

### 11.4 Code review loop with ADO

1. PR opens against `main` with title `feat(portfolio): US-4.1 manual position entry` and links `AB#<id>`.
2. `review-item US-4.1` runs locally or in CI; the resulting `docs/agents/item-reviewed-<ts>.md` is committed to the PR branch (or attached as a CI artifact).
3. **Verdict gates merge**:
   - ✅ PASS → reviewer approves in ADO Repos / GitHub.
   - ⚠️ PASS WITH NOTES → reviewer approves; minor findings tracked as new ADO Tasks under the same Story.
   - ❌ NEEDS CHANGES → reviewer requests changes; critical/major findings block the PR.
4. Pre-push hook (`tsc --noEmit && npm test`) is the **last** gate before code reaches the remote — branch policies in ADO Repos should additionally require the Build pipeline to pass.
5. On merge, ADO Story auto-closes; CI runs `/update-specs` (optional) to recompute the Progress Summary and commits to `main`.

### 11.5 Recommended ADO branch policies

| Policy                                | Why                                                         |
| ------------------------------------- | ----------------------------------------------------------- |
| Require minimum 1 reviewer            | Pairs with `review-item` artifact                           |
| Require linked work item              | Enforces `SpecId` traceability                              |
| Require build (`npm run build`) green | Catches App Router / type issues missed by `tsc --noEmit`   |
| Require comment resolution            | Forces 🟠 Major findings from `review-item` to be addressed |
| Limit merge type to Squash            | One commit per Story = clean SPECS history                  |

---

## 12. Roles, Responsibilities, RACI

| Activity                              | PM  | Tech Lead | Engineer | Reviewer | Agent (`plan-item` / `implement-item` / `review-item`) |
| ------------------------------------- | --- | --------- | -------- | -------- | ------------------------------------------------------ |
| Define Epic / Story in PDD + SPECS.md | A   | C         | C        | I        | —                                                      |
| Refine Gherkin acceptance criteria    | A   | R         | C        | C        | —                                                      |
| Generate implementation plan          | I   | C         | R        | I        | R (`plan-item`)                                        |
| Implement story                       | I   | A         | R        | I        | R (`/implement-item`)                                  |
| Run `npm test` + `tsc --noEmit`       | —   | A         | R        | I        | R (Phase 3)                                            |
| Code review against SPECS + plan      | I   | A         | C        | R        | R (`review-item`)                                      |
| Update SPECS.md status                | I   | A         | R        | I        | R (`/implement-item` Phase 4 / `/update-specs`)        |
| Sync ADO state                        | A   | C         | R        | I        | — (manual or CI hook)                                  |
| Approve merge                         | I   | A         | I        | R        | —                                                      |

R = Responsible, A = Accountable, C = Consulted, I = Informed.

---

## 13. Day-in-the-Life Walkthrough

A senior engineer is assigned `US-4.5: CSV position import` (newly added by PM in ADO).

```
1. PM creates ADO Story #1287 with SpecId=US-4.5, attaches CSV format spec.
2. Engineer mirrors into SPECS.md:
     /add-item add US-4.5 CSV position import to E4
   → diff preview, approve, SPECS.md + Progress Summary updated.

3. Engineer plans:
     plan-item US-4.5
   → docs/agents/item-implementation-plan-2026-04-20-09-15-32.md
     • 4 tasks ordered 🟢🟡🟡🟢
     • Files: app/dashboard/portfolio/_actions.ts (modify),
              app/dashboard/portfolio/_components/csv-import-dialog.tsx (create),
              app/dashboard/portfolio/__tests__/_utils.test.ts (modify),
              app/dashboard/portfolio/_utils.ts (modify — add CSV parser)
     • Risk: Medium (file parsing edge cases)
     • 🎨 yes (dialog UI)

4. Engineer implements:
     /implement-item US-4.5
   → Phase 1 reads plan, Phase 2 writes code (applies /frontend-design for dialog),
     Phase 3 runs lint+vitest, walks Gherkin scenarios,
     Phase 4 marks tasks [x], proposes:
       feat(portfolio): US-4.5 CSV position import

5. Engineer self-reviews:
     review-item US-4.5
   → docs/agents/item-reviewed-2026-04-20-10-42-11.md
     • Verdict: ⚠️ PASS WITH NOTES
     • 🟡 Minor: missing empty-state copy in csv-import-dialog.tsx:84
     • 🔵 Info: consider streaming parse for >5MB files

6. Engineer addresses 🟡 finding, commits:
     git commit -m "feat(portfolio): US-4.5 CSV position import (AB#1287)"
   → pre-commit (lint-staged) ✓
   → commit-msg (commitlint) ✓
   → git push
   → pre-push (tsc + vitest) ✓

7. PR opens, links AB#1287, attaches review file. Reviewer approves. Merge squashed.
   ADO Story #1287 auto-closes. SPECS.md US-4.5 = [x]. Progress Summary updated.
```

End-to-end traceability: **ADO #1287 ↔ US-4.5 ↔ commit ↔ plan file ↔ review file**.

---

## 14. Operational Checklist

Use this list when introducing a new contributor or auditing the harness.

**Repo health**

- [ ] [SPECS.md](../SPECS.md) Progress Summary matches actual status markers (run `/update-specs` if drift)
- [ ] Every story has at least one Gherkin scenario
- [ ] No orphan files in `app/dashboard/<route>/` violating the route segment contract
- [ ] Every table in `supabase/migrations/` has RLS enabled in the same migration

**Harness wiring**

- [ ] Each rule's `paths:` glob matches files that exist in the tree
- [ ] Every skill's `SKILL.md` has a `name`, `description`, and `argument-hint`
- [ ] Every agent's frontmatter declares `tools` (read-only ones use `Read, Grep, Glob, Write` only)
- [ ] `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push` are executable

**SDD discipline**

- [ ] Every PR title references a SPECS ID (`US-X.Y` or `T-X.Y.Z`)
- [ ] Every PR has a corresponding `docs/agents/item-implementation-plan-*.md` for Stories of size M+
- [ ] Every PR has a corresponding `docs/agents/item-reviewed-*.md` with verdict ≠ ❌
- [ ] Conventional Commit `scope` is one of the allowed scopes in [commitlint.config.mjs](../commitlint.config.mjs)

**ADO bridge (if used)**

- [ ] Every ADO work item carries a `SpecId` custom field
- [ ] Branch policy requires linked work item + reviewer + build pass
- [ ] PR template includes `AB#<id>` and `SpecId` placeholders

---

> When this harness is followed end-to-end, the cost of producing a correctly-architected, secure, tested, design-system-compliant change drops to roughly _one prompt per story_ — and every change is auditable from the PM's backlog item down to a `file.ts:LN` citation in the review document.
