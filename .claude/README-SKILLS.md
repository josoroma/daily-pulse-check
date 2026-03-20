# Skills Reference

> How to use the 7 workflow skills for spec-driven development.

---

## Available Skills

| Skill | Purpose | Modifies Files? |
|---|---|---|
| `/plan-item` | Plan implementation before writing code | No (read-only) |
| `/add-item` | Add new epics, stories, or tasks to SPECS.md with 🎨 detection | Yes (with approval) |
| `/implement-item` | Implement an epic or user story end-to-end with 🎨 detection | Yes |
| `/review-item` | Code review against conventions and acceptance criteria | No (read-only) |
| `/update-specs` | Apply controlled updates to SPECS.md or CLAUDE.md | Yes (with approval) |
| `/frontend-design` | Create distinctive UI components with project design system | Yes |
| `/capture-prompts` | Capture, improve, and persist session prompts with derived tasks | Yes (append-only) |

---

## Workflow: Implementing a Feature

```
1. /plan-item US-4.1       → Understand scope, dependencies, file list
2. /add-item               → Add missing stories or tasks discovered during planning
3. /implement-item US-4.1  → Write code, run tests, update SPECS.md
4. /review-item US-4.1     → Audit against conventions and Gherkin criteria
5. /update-specs           → Fix any status inconsistencies found in review
```

---

## Skill Details

### `/plan-item <ID>`

**When to use**: Before starting any implementation work.

**Input**: Epic ID (`E1`) or User Story ID (`US-1.1`)

**Output**:
- Summary and current status
- Dependency analysis (internal + external)
- Ordered task list with readiness indicators (🟢 🟡 🔴)
- Complexity matrix (effort S/M/L/XL + risk Low/Med/High)
- Key architectural decisions
- Files to create/modify per the route segment contract
- Gherkin acceptance criteria checklist

**Example**: `/plan-item US-4.1` → Plans the Position CRUD story for `app/portfolio/`

---

### `/implement-item <ID>`

**When to use**: When ready to write code for one or more stories.

**Input**: Epic ID (`E1`) or User Story ID (`US-1.1`)

**🎨 detection**: Checks the story header for the `🎨` marker. If present, applies `/frontend-design` guidelines for all `.tsx` component work.

**Phases**:
1. **Plan** — Read tasks, identify files, check dependencies, detect 🎨 marker
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

### `/review-item <ID>`

**When to use**: After implementation, before merging.

**Input**: Epic ID (`E1`) or User Story ID (`US-1.1`)

**Runs as**: `code-reviewer` agent (read-only, forked context)

**Checklist**:
1. SPECS Compliance — Gherkin scenario-by-scenario verification
2. Convention Compliance — Architecture, naming, imports, exports
3. Code Quality — Error handling, loading/empty states, type safety
4. Security Audit — RLS, auth, validation, no exposed secrets
5. Test Coverage — Tests exist, pass, cover edge cases
6. SPECS.md Consistency — Status markers match actual state

**Output**: Verdict (✅ PASS / ⚠️ PASS WITH NOTES / ❌ NEEDS CHANGES) with file:line references

**Example**: `/review-item US-4.1` → Reviews the portfolio implementation

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
- Terminology normalized to project conventions (shadcn/ui, Supabase, Next.js 15)

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
