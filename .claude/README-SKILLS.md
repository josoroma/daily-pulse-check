# Claude Configuration Reference

> All Claude-side automation for the Finance Dashboard: **rules**, **skills**, **agents**, **hooks**, and **plugins**.

---

## Concepts at a Glance

| Concept     | Where it lives                                                    | When it runs                                                                  | Modifies files?     |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------- |
| **Rules**   | `.claude/rules/*.md`                                              | Auto-loaded into context whenever you edit a file matching the rule's `paths` | Indirect (guidance) |
| **Skills**  | `.claude/skills/<name>/SKILL.md`                                  | Invoked explicitly by name (e.g. `/implement-item US-4.1`)                    | Yes                 |
| **Agents**  | `.claude/agents/<name>.md`                                        | Invoked explicitly by name; run with restricted tools and a fresh context     | Read-only or scoped |
| **Hooks**   | (Claude Code hooks: not configured) — git hooks live in `.husky/` | Local git lifecycle (`pre-commit`, `commit-msg`, `pre-push`)                  | Indirect (gates)    |
| **Plugins** | (none)                                                            | n/a — no Claude Code plugin manifest in this repo                             | n/a                 |

---

## Available Rules (`.claude/rules/`)

Rules are markdown files with a YAML frontmatter `paths:` glob. When you edit a matching file, the rule body is auto-loaded as context.

| Rule             | Applies to                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `code-style`     | `app/**/*.{ts,tsx}`, `lib/**/*.{ts,tsx}`                          |
| `database`       | `supabase/migrations/**`, `lib/supabase/**`, `app/**/_schema.ts`  |
| `dates`          | `app/**/*.{ts,tsx}`, `lib/**/*.{ts,tsx}`                          |
| `design`         | `app/**/*.tsx`, `app/**/_components/**`                           |
| `security`       | `lib/supabase/**`, `app/**/_actions.ts`, `app/api/**`, `proxy.ts` |
| `specs-workflow` | `SPECS.md`, `CLAUDE.md`                                           |
| `testing`        | `app/**/__tests__/**`, `app/**/*.test.ts`, `lib/**/__tests__/**`  |

---

## Available Skills

| Skill              | Purpose                                                          | Modifies Files?     |
| ------------------ | ---------------------------------------------------------------- | ------------------- |
| `/add-item`        | Add new epics, stories, or tasks to SPECS.md with 🎨 detection   | Yes (with approval) |
| `/implement-item`  | Implement an epic or user story end-to-end with 🎨 detection     | Yes                 |
| `/update-specs`    | Apply controlled updates to SPECS.md or CLAUDE.md                | Yes (with approval) |
| `/frontend-design` | Create distinctive UI components with project design system      | Yes                 |
| `/capture-prompts` | Capture, improve, and persist session prompts with derived tasks | Yes (append-only)   |

## Available Agents (`.claude/agents/`)

| Agent              | Purpose                                                             | Output                                                |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `plan-item`        | Plan an epic, story, task, or free-text scope from SPECS.md         | `docs/agents/item-implementation-plan-{timestamp}.md` |
| `review-item`      | Audit implementation vs SPECS + latest plan + CLAUDE.md conventions | `docs/agents/item-reviewed-{timestamp}.md`            |
| `document-feature` | Generate technical reference docs for a dashboard feature/route     | `docs/routes/{camelCaseName}.md`                      |
| `code-reviewer`    | Generic read-only reviewer used internally by `review-item`         | Inline findings                                       |

---

## Workflow: Implementing a Feature

```
1. plan-item US-4.1        → Writes docs/agents/item-implementation-plan-<ts>.md
2. /add-item               → Add missing stories or tasks discovered during planning
3. /implement-item US-4.1  → Reads latest matching plan + SPECS section, implements, updates SPECS.md
4. review-item US-4.1      → Reads latest matching plan + SPECS section, writes docs/agents/item-reviewed-<ts>.md
5. /update-specs           → Fix any status inconsistencies found in review
```

---

## Skill & Agent Details

### `plan-item` agent

**When to use**: Before starting any implementation work.

**Input**: Epic ID (`E1`), User Story ID (`US-1.1`), Task ID (`T-1.1.1`), or free-text initiative.

**Behavior**: Read-only. Loads SPECS.md + CLAUDE.md + architecture docs, then writes a timestamped plan to `docs/agents/item-implementation-plan-{YYYY-MM-DD-HH-MM-SS}.md`. Announces the file path before writing.

**Output**:

- Summary and current status
- Dependency analysis (internal + external)
- Ordered task list with readiness indicators (🟢 🟡 🔴)
- Complexity matrix (effort S/M/L/XL + risk Low/Med/High)
- Key architectural decisions
- Files to create/modify per the route segment contract
- Gherkin acceptance criteria checklist
- Open questions and suggested first action

**Example**: `plan-item US-4.1` → Writes `docs/agents/item-implementation-plan-2026-04-20-09-15-32.md` for the Position CRUD story.

---

### `/implement-item <ID>`

**When to use**: When ready to write code for one or more stories.

**Input**: Epic ID (`E1`) or User Story ID (`US-1.1`)

**🎨 detection**: Checks the story header for the `🎨` marker. If present, applies `/frontend-design` guidelines for all `.tsx` component work.

**Plan context**: Before Phase 1, locates the most recent matching `docs/agents/item-implementation-plan-*.md`. If found, follows it as the implementation contract and reports the plan path in the final summary. If no matching plan exists, implements from SPECS.md alone and says so.

**Phases**:

1. **Plan** — Read tasks, load matching plan if any, identify files, check dependencies, detect 🎨 marker
2. **Implement** — Write code per colocated architecture (+ design system if 🎨), update SPECS.md `[~]`
3. **Validate** — Run lint + tests, verify Gherkin criteria (+ design checklist if 🎨)
4. **Complete** — Mark tasks `[x]`, update Progress Summary, suggest commit

**Output**:

- Gherkin Validation Report (✅/❌ per scenario)
- Updated SPECS.md with correct status markers
- Conventional commit message
- Implementation summary (files created/modified, decisions, test coverage)

**Example**: `/implement-item US-4.1` → Implements Position CRUD in `app/portfolio/`

---

### `review-item` agent

**When to use**: After implementation, before merging.

**Input**: Epic ID (`E1`), User Story ID (`US-1.1`), Task ID (`T-1.1.1`), or free-text scope.

**Behavior**: Read-only. Loads SPECS.md + CLAUDE.md + architecture docs and the most recent matching `docs/agents/item-implementation-plan-*.md` (announces which plan it used, or that none was found). Writes a timestamped review to `docs/agents/item-reviewed-{YYYY-MM-DD-HH-MM-SS}.md`.

**Checklist**:

1. SPECS Compliance — Gherkin scenario-by-scenario verification with file:line evidence
2. Plan Adherence — Deviations from the selected implementation plan
3. Convention Compliance — Architecture, naming, imports, exports
4. Code Quality — Error handling, loading/empty states, type safety
5. Security Audit — RLS, auth, validation, no exposed secrets
6. Test Coverage — Tests exist, pass, cover edge cases
7. SPECS.md Consistency — Status markers match actual state
8. Frontend Design (only if 🎨) — palette, tabular numbers, states, responsive

**Severity**: 🔴 Critical, 🟠 Major, 🟡 Minor, 🔵 Info — every finding cites `path/to/file.ts:LN`.

**Output**: Verdict (✅ PASS / ⚠️ PASS WITH NOTES / ❌ NEEDS CHANGES) plus the review file path and the plan path it used.

**Example**: `review-item US-4.1` → Writes `docs/agents/item-reviewed-2026-04-20-10-42-11.md`.

---

### `document-feature` agent

**When to use**: When generating reference documentation for a dashboard feature/route.

**Input**: Feature name (e.g. `portfolio`, `bitcoin`, `dca`, `market`, `alerts`, `insights`, `analytics`, `settings`, `authentication`).

**Behavior**: Read-only on application code. Reads the route segment, related `app/api/` routes, `lib/` modules, `supabase/migrations/`, and `__tests__/`. Announces the output path before writing.

**Output**: `docs/routes/<camelCaseName>.md` with sections — Architecture, Pages & Navigation, User Flows, Models/Cron/Actions/APIs, Database Schema, Testing, File Tree, Known Limitations.

**Example**: `document-feature portfolio` → Writes `docs/routes/portfolio.md`.

---

### `/update-specs [description]`

**When to use**: When SPECS.md or CLAUDE.md needs changes.

**Input**: Optional description of what to update

**Workflow**:

1. Understand the change (status update, add content, fix inconsistencies)
2. Show diff preview
3. Request approval
4. Apply changes only after explicit approval

**Supported updates**:

- Status marker changes (`[ ]` → `[x]`)
- Progress Summary table recalculation
- New stories, tasks, or Gherkin scenarios
- Convention modifications in CLAUDE.md
- Inconsistency fixes

**Example**: `/update-specs mark E1 stories as completed` → Shows diff, waits for approval

---

### `/frontend-design <description>`

**When to use**: When building new pages, components, charts, or layouts for the dashboard.

**Input**: Description of the component or page to design (e.g., "portfolio metric cards", "Fear & Greed gauge", "DCA schedule table")

**Design process**:

1. **Design Thinking** — Purpose, tone, hierarchy, differentiation for this component
2. **Pattern Matching** — Map to project patterns: metric cards, chart containers, tables, forms, empty/loading states
3. **Implementation** — Generate production-ready code using shadcn/ui + Tailwind CSS v4 + Recharts
4. **Verification** — Check against design checklist (colors, numbers, responsive, states)

**Output**:

- Production-ready `.tsx` component files following kebab-case naming
- Consistent with project design system: dark-first, semantic colors, tabular numbers
- Loading state (Skeleton), empty state (CTA), error state (Alert)
- Responsive layout tested at mobile / tablet / desktop breakpoints

**Inspired by**: Anthropic's official [frontend-design plugin](https://github.com/anthropics/claude-code/tree/main/.claude/plugins/frontend-design) and [prompting for frontend aesthetics cookbook](https://github.com/anthropics/anthropic-cookbook/blob/main/misc/prompting_for_frontend_aesthetics.ipynb), adapted for this project's finance dashboard context.

**Example**: `/frontend-design portfolio allocation pie chart with VOO/QQQ/BTC breakdown`

---

### `/capture-prompts [category]`

**When to use**: At the end of a session or any time you want to persist and improve prompts from the current conversation.

**Input**: Optional category filter (`frontend`, `ai-agent`, `infra`, `docs`, etc.) or `all` (default)

**Phases**:

1. **Extract** — Collect all user prompts from the active chat session
2. **Improve** — Rewrite for clarity, precision, and professional tone while preserving intent
3. **Derive Tasks** — Generate atomic, implementation-ready tasks per prompt
4. **Categorize** — Tag each prompt (`setup`, `auth`, `portfolio`, `market`, `frontend`, `ai-agent`, `docs`, etc.)
5. **Persist** — Append to `README-PROMPTS.md` with idempotency checks

**Output**:

- Append-only entries in `README-PROMPTS.md` with: intent summary, improved prompt, and derived task list
- Summary: count of new prompts captured, duplicates skipped, categories breakdown

**Quality constraints**:

- No semantic drift — original intent preserved exactly
- No added assumptions or features not in the original prompt
- Terminology normalized to project conventions (shadcn/ui, Supabase, Next.js 16.2.1)

**Example**: `/capture-prompts all` → Captures all session prompts into README-PROMPTS.md

---

### `/add-item <description>`

**When to use**: When you need to add a new epic, user story, or task to SPECS.md.

**Input**: Description of what to add (e.g., "add epic E11 for notification history", "add US-4.5 CSV import to E4", "add task T-4.1.6 validate symbol format")

**Phases**:

1. **Parse** — Determine item type (epic, story, or task) and target parent
2. **Assign ID** — Auto-assign the next sequential ID, warn on conflicts
3. **Detect 🎨** — Auto-detect if the item requires `/frontend-design` based on UI involvement
4. **Generate** — Create formatted content (story format with Gherkin, or task line)
5. **Preview** — Show diff and wait for user approval
6. **Apply** — Edit SPECS.md and update Progress Summary table

**🎨 Auto-detection rules**:

- Tags with 🎨 if: involves `page.tsx`, `_components/`, charts, forms, tables, dashboards, visualizations
- No 🎨 if: pure API integration, migrations, cron jobs, config, or test-only work
- When in doubt, tags with 🎨 (better safe than generic UI)

**Output**:

- Updated SPECS.md with correctly formatted and placed new item
- Progress Summary table updated (for epics and stories)
- Confirmation: item ID, parent, 🎨 status with reason

**Example**: `/add-item add US-4.5 CSV position import to E4` → Adds a new story with Gherkin criteria, tasks, and 🎨 marker under E4

---

## Hooks

No Claude Code hooks (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, etc.) are configured for this repo.

Local **git hooks** are managed by `husky` and live in `.husky/`:

| Hook         | What it runs                                                                 |
| ------------ | ---------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged` — runs ESLint and Prettier on staged `*.{ts,tsx,md}` files     |
| `commit-msg` | `commitlint` against `commitlint.config.mjs` — enforces Conventional Commits |
| `pre-push`   | `npm test` — blocks pushes when Vitest fails                                 |

These gate code quality outside of any Claude session and are the primary safety net for commits and pushes.

---

## Plugins

No Claude Code plugin manifest (`.claude/plugins/` or marketplace install) is configured for this repo. The `frontend-design` skill is **inspired by** Anthropic's official frontend-design plugin but ships as a local skill, not as an installed plugin.

If plugins are added later, document them here with: source (marketplace name or URL), version pin, and which skills/agents they replace or augment.
