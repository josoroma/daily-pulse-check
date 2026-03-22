---
name: capture-prompts
description: Capture all user prompts from the current chat session, improve their clarity and precision, derive actionable tasks, and append results to README-PROMPTS.md. Use at the end of a session or when the user wants to persist their prompts.
argument-hint: <optional category filter or "all" e.g. "frontend" or "all">
---

# Capture Prompts: $ARGUMENTS

You are a technical editor and task planner capturing all the prompts from start to finish ofthe current chat session for the Finance Dashboard project. We want to capture ALL prompts from this complete session including: /plan-item, implement-item, /review-item, and all the extra prompts that were part of the earlier conversation (before summarization).

## Context

Read these files first:

- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @README-PROMPTS.md — existing captured prompts (if the file exists) to avoid duplicates

## Phase 1: Extract Prompts

1. Review the entire current chat session from top to bottom.
2. Collect every **user message** that contains a request, instruction, or question.
3. Ignore assistant responses unless they are needed to disambiguate intent.
4. Skip trivial messages (e.g., "ok", "thanks", "yes") that carry no actionable content.
5. Number prompts sequentially, continuing from the last entry in README-PROMPTS.md if it exists.

## Phase 2: Improve Each Prompt

Rewrite each extracted prompt to:

- **Correct** grammar, spelling, and punctuation.
- **Improve** clarity, precision, and conciseness.
- **Preserve** the original intent exactly — no semantic drift, no added assumptions.
- **Upgrade** wording to professional, developer-grade English.
- **Normalize** project terminology (e.g., "shadcn" → "shadcn/ui", "supabase" → "Supabase", "next" → "Next.js 15").
- **Remove** filler phrases ("I want you to", "Can you please", "I think we should") — use direct imperative form.

**Quality constraints**:

- Do NOT introduce features or requirements not present in the original prompt.
- Do NOT remove important details or context.
- Do NOT merge separate prompts into one — keep them as distinct entries.
- Ensure technical accuracy and readability.

## Phase 3: Derive Tasks

For each improved prompt, generate a list of actionable tasks:

- Tasks must be **atomic** — one clear action per task.
- Tasks must be **implementation-ready** — a developer can act on them without further clarification.
- Tasks must be **unambiguous** — no vague verbs like "handle", "manage", "deal with".
- Use **imperative language**: "Create…", "Refactor…", "Validate…", "Add…", "Update…", "Configure…".
- Order tasks by logical execution sequence when dependencies exist.

## Phase 4: Categorize (Optional)

If the user provides a category filter via $ARGUMENTS (e.g., "frontend", "ai-agent", "infra"), only process prompts matching that category. If $ARGUMENTS is "all" or empty, process all prompts.

Assign one category tag to each prompt from this list:

- `setup` — project scaffolding, configuration, tooling
- `auth` — authentication, authorization, Supabase Auth
- `portfolio` — positions, transactions, cost basis
- `market` — market data, external APIs, caching
- `dca` — DCA schedules, reminders, automation
- `alerts` — price alerts, technical indicators, notifications
- `insights` — AI features, Vercel AI SDK, prompts
- `bitcoin` — on-chain analytics, valuation models
- `analytics` — performance metrics, reports, tax export
- `settings` — configuration, data management, profile
- `frontend` — UI components, design, styling, layout
- `infra` — deployment, CI/CD, environment, database migrations
- `ai-agent` — Claude configuration, skills, rules, agents
- `docs` — documentation, README files, PDD, SPECS

## Phase 5: Write to README-PROMPTS.md

### File behavior

- **Append only** — never overwrite or modify existing entries.
- **Idempotent** — before appending, check existing entries by comparing the improved prompt text. Skip any prompt that is already captured (fuzzy match on intent, not exact string).
- **Consistent formatting** — every entry follows the exact template below.

### If README-PROMPTS.md does not exist

Create it with this header:

```markdown
# Session Prompts

> Captured and improved prompts from chat sessions with derived tasks.

---
```

### Entry template

For each prompt, append:

```markdown
## Prompt N — `category`

**Intent**: One-sentence summary of what the user wanted to achieve.

**Prompt**

<rewritten prompt>

**Derived Tasks**

- Task 1
- Task 2
- Task 3

---
```

Where:

- `N` is the sequential prompt number (continuing from existing entries).
- `category` is the tag from Phase 4.
- **Intent** is a single-line summary (max 15 words).
- **Prompt** is the improved rewrite from Phase 2.
- **Derived Tasks** is the task list from Phase 3.

## Output

After appending to README-PROMPTS.md, provide a summary:

```
Captured: X new prompts (Y skipped as duplicates)
Categories: frontend (3), ai-agent (2), docs (1), ...
File: README-PROMPTS.md updated
```

## Example

Given a user message:

> "can u add dark mode toggle to the settings page, it should save to supabase and use jotai for the local state"

The output entry would be:

```markdown
## Prompt 12 — `settings`

**Intent**: Add a dark mode toggle to the settings page with persistent storage.

**Prompt**

Add a dark/light/system theme toggle to the settings page. Persist the selected theme to Supabase and manage local state with a Jotai atom for instant UI updates without page reload.

**Derived Tasks**

- Create a `theme` Jotai atom in `app/settings/_atoms.ts` with values `'dark' | 'light' | 'system'`
- Add a theme toggle component in `app/settings/_components/theme-toggle.tsx` using shadcn/ui `Select`
- Create a `updateTheme` server action in `app/settings/_actions.ts` to persist the selection to Supabase
- Add a `theme` column to the `profiles` table via a new Supabase migration
- Sync the Jotai atom with the Supabase value on page load via `_hooks.ts`
- Apply the theme class to `<html>` using Next.js `layout.tsx` with `next-themes` or manual logic

---
```
