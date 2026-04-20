---
marp: true
theme: uncover
class: invert
paginate: true
size: 16:9
header: 'Finance Dashboard · Claude Code Harness'
style: |
  :root {
    --bg: #0b0d12;
    --bg-2: #11141b;
    --fg: #e6e8ee;
    --muted: #9aa3b2;
    --accent: #34d399;   /* emerald */
    --accent-2: #f59e0b; /* amber */
    --danger: #f43f5e;   /* rose */
    --info: #38bdf8;     /* sky */
    --border: #1f2430;
    --code-bg: #0f1320;
  }
  section {
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;
    font-size: 26px;
    text-align: left;
    padding: 56px 72px;
    justify-content: flex-start;
  }
  section.lead {
    text-align: center;
    justify-content: center;
    background: radial-gradient(ellipse at top, #131826 0%, var(--bg) 60%);
  }
  section.lead h1 {
    font-size: 64px;
    letter-spacing: -1.5px;
    background: linear-gradient(135deg, #34d399 0%, #38bdf8 50%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h1, h2, h3 { color: var(--fg); letter-spacing: -0.5px; }
  h1 { font-size: 44px; border-bottom: 2px solid var(--border); padding-bottom: 12px; }
  h2 { font-size: 36px; }
  h3 { font-size: 26px; color: var(--accent); }
  strong { color: var(--accent); font-weight: 600; }
  em { color: var(--info); font-style: normal; }
  a { color: var(--info); text-decoration: none; border-bottom: 1px dotted var(--info); }
  blockquote {
    border-left: 3px solid var(--accent);
    background: var(--bg-2);
    color: var(--muted);
    padding: 12px 20px;
    margin: 16px 0;
    border-radius: 4px;
    font-size: 22px;
  }
  code {
    background: var(--code-bg);
    color: #fef3c7;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.9em;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 22px;
    font-size: 18px;
    line-height: 1.45;
  }
  pre code { background: transparent; padding: 0; color: #d6deeb; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 20px;
    margin: 12px 0;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: var(--bg-2);
    color: var(--accent);
    font-weight: 600;
  }
  tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  ul, ol { line-height: 1.55; }
  li { margin: 4px 0; }
  header, footer {
    color: var(--muted);
    font-size: 14px;
    font-weight: 400;
  }
  section::after {
    color: var(--muted);
    font-size: 14px;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .pill {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--bg-2);
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 18px;
    margin-right: 6px;
  }
  .pill-emerald { color: var(--accent); border-color: var(--accent); }
  .pill-amber   { color: var(--accent-2); border-color: var(--accent-2); }
  .pill-rose    { color: var(--danger); border-color: var(--danger); }
  .pill-sky     { color: var(--info); border-color: var(--info); }
---

<!-- _class: lead -->

# Claude Code Harness

### Spec-Driven Development for the Finance Dashboard

<br>

<span class="pill pill-emerald">Rules</span>
<span class="pill pill-sky">Skills</span>
<span class="pill pill-amber">Agents</span>
<span class="pill pill-rose">Hooks</span>

<br><br>

`docs/HARNESS.md` · April 2026

---

# Why a Harness?

Without structure, an LLM agent **drifts** — invents files, breaks conventions, skips tests, marks work done that isn't.

A _harness_ turns the agent into a **reliable contributor** by binding it to:

- A **single source of truth** for scope (`SPECS.md`)
- A **single source of truth** for conventions (`CLAUDE.md`)
- **Path-scoped guardrails** that auto-load (rules)
- **Named, file-modifying recipes** with phases (skills)
- **Read-only specialists** with restricted tools (agents)
- **Git gates** that block bad code from reaching `main`

> Result: _one prompt per story_ → audited, typed, tested, design-system-compliant change.

---

# The Five Concepts

| Concept     | Source            | When                                     | Modifies code? |
| ----------- | ----------------- | ---------------------------------------- | -------------- |
| **Rules**   | `.claude/rules/`  | Auto on file edit (glob match)           | No — guidance  |
| **Skills**  | `.claude/skills/` | Invoked: `/implement-item US-4.1`        | **Yes**        |
| **Agents**  | `.claude/agents/` | Invoked, fresh context, restricted tools | Read-only      |
| **Hooks**   | `.husky/` (git)   | `pre-commit`, `commit-msg`, `pre-push`   | No — gates     |
| **Plugins** | _(none)_          | n/a                                      | n/a            |

<br>

> Composable, file-grounded, auditable. No magic.

---

# The Document Chain

```
README-PRODUCT-DESIGN-DOCUMENT.md      ← what & why
              ▼
SPECS.md                               ← what to build, in what order
              ▼                          (E1..E14 · 46 stories · Gherkin)
CLAUDE.md                              ← how to build it
              ▼                          (stack, conventions, contracts)
.claude/                               ← how the agent operates
   ├─ README-ARCHITECTURE.md             route segment contract
   ├─ README-SPECS.md                    epic/story/task → file mapping
   ├─ rules/    (7)                      auto-loaded guardrails
   ├─ skills/   (5)                      file-modifying recipes
   └─ agents/   (4)                      read-only specialists
              ▼
.husky/                                ← what cannot reach origin
   pre-commit · commit-msg · pre-push
```

Upstream: `specs-workflow` rule. Downstream: git hooks. **Two-sided enforcement.**

---

# `.claude/` Anatomy

<div class="columns">

<div>

**Configuration**

- `README-ARCHITECTURE.md`
- `README-SPECS.md`
- `README-SKILLS.md`

**Rules** _(auto-loaded)_

- `code-style` · `database`
- `dates` · `design`
- `security` · `testing`
- `specs-workflow`

</div>

<div>

**Skills** _(invokable)_

- `/add-item`
- `/implement-item`
- `/update-specs`
- `/frontend-design`
- `/capture-prompts`

**Agents** _(read-only)_

- `plan-item`
- `review-item`
- `document-feature`
- `code-reviewer`

</div>

</div>

---

# Rules — Auto-Loaded Guardrails

YAML frontmatter `paths:` glob → body injected when matching files are edited.

| Rule             | Scope                                               |
| ---------------- | --------------------------------------------------- |
| `code-style`     | `app/**`, `lib/**` — naming, exports, aliases       |
| `database`       | `supabase/migrations/**`, `_schema.ts` — RLS, types |
| `dates`          | `app/**`, `lib/**` — `@/lib/date` only, CR timezone |
| `design`         | `app/**/*.tsx`, `_components/**` — palette, states  |
| `security`       | `_actions.ts`, `app/api/**`, `proxy.ts` — RLS, Zod  |
| `specs-workflow` | `SPECS.md`, `CLAUDE.md` — markers, Progress Summary |
| `testing`        | `__tests__/**` — Vitest, no Supabase mocks          |

> Rules are **non-negotiable defaults**. Change them in a separate PR.

---

# Skills — File-Modifying Recipes

| Skill              | Purpose                                            | Approval         |
| ------------------ | -------------------------------------------------- | ---------------- |
| `/add-item`        | Add Epic/Story/Task to SPECS.md, auto 🎨 detect    | Diff preview     |
| `/implement-item`  | End-to-end: plan → implement → validate → complete | Runs full loop   |
| `/update-specs`    | Status fixes, table recounts, content edits        | Diff preview     |
| `/frontend-design` | UI components against project design system        | Design checklist |
| `/capture-prompts` | Extract → improve → derive tasks from session      | Append-only      |

<br>

> Skills are **invoked by name**. They follow phased instructions inside `SKILL.md`.

---

# `/implement-item` — The Workhorse

Four phases per task:

1. **Plan** — Read SPECS section, locate latest matching plan in `docs/agents/`, identify files via `README-SPECS.md`, check 🎨 marker.

2. **Implement** — Mark `[~]`, write code under route segment contract (TS strict, `@/` aliases, `_actions.ts` / `_schema.ts` / `_components/`, RLS).

3. **Validate** — `npm run lint`, `npm test`, walk every Gherkin scenario, cite each `Then` clause with code evidence.

4. **Complete** — Mark `[x]`, roll up to story/epic, recompute Progress Summary, propose Conventional Commit.

> Always reports the plan path consumed (or "none — implemented from SPECS.md only").

---

# Agents — Read-Only Specialists

Restricted toolsets · fresh context · single output document.

| Agent              | Output                                         |
| ------------------ | ---------------------------------------------- |
| `plan-item`        | `docs/agents/item-implementation-plan-{ts}.md` |
| `review-item`      | `docs/agents/item-reviewed-{ts}.md`            |
| `document-feature` | `docs/routes/{camelCaseName}.md`               |
| `code-reviewer`    | Inline findings (used by `review-item`)        |

### Severity ladder

<span class="pill pill-rose">🔴 Critical</span> security · data loss · broken AC
<span class="pill pill-amber">🟠 Major</span> convention · missing tests
<span class="pill pill-emerald">🟡 Minor</span> polish · naming
<span class="pill pill-sky">🔵 Info</span> observations

> Every finding cites `path/to/file.ts:LN`. No claim without a citation.

---

# Hooks — Git-Level Gates

**No Claude Code hooks.** Only Husky git hooks gate the commit lifecycle.

| Hook                | Command                    | Blocks                           |
| ------------------- | -------------------------- | -------------------------------- |
| `.husky/pre-commit` | `npx lint-staged`          | ESLint / Prettier failures       |
| `.husky/commit-msg` | `commitlint --edit "$1"`   | Non-conventional commit messages |
| `.husky/pre-push`   | `tsc --noEmit && npm test` | Type errors · failing tests      |

Allowed scopes (from `commitlint.config.mjs`):

`setup` · `auth` · `portfolio` · `market` · `dca` · `alerts` · `insights` · `bitcoin` · `analytics` · `settings`

---

# CLAUDE.md — The Project Contract

Loaded on every session. Declares:

<div class="columns">

<div>

**Stack invariants**

- Next.js 16.2.1 App Router (no `pages/`)
- TypeScript strict (no `any`)
- Tailwind v4 utility-only
- shadcn/ui first
- Jotai colocated
- RHF + Zod
- Supabase + RLS
- Vercel AI SDK · Recharts
- Vitest

</div>

<div>

**Architectural contracts**

- **Route Segment Contract**
- **Naming Rules**
- **Colocate vs Shared** decision tree
- **AI Streaming** contract
- **Database** contract
- **Testing** contract

References:

- `@.claude/README-ARCHITECTURE.md`
- `@.claude/README-SPECS.md`
- `@SPECS.md`

</div>

</div>

---

# Route Segment Contract

Every `app/<route>/` is a **self-contained feature boundary**.

```
app/<route>/
├── page.tsx              ◇ required — Server Component entry
├── layout.tsx            ◇ optional — layout wrapper
├── loading.tsx           ◇ optional — Suspense fallback
├── error.tsx             ◇ optional — error boundary
├── _components/          ◇ required — kebab-case files
├── _actions.ts           ◇ required — Server Actions
├── _schema.ts            ◇ required — Zod schemas + types
├── _types.ts             ◇ optional — shared by 3+ files
├── _hooks.ts             ◇ optional — client hooks
├── _atoms.ts             ◇ optional — Jotai client state
├── _constants.ts         ◇ optional — static values
├── _utils.ts             ◇ optional — pure helpers
└── __tests__/            ◇ required — colocated Vitest
```

> Used by ONE route → colocate · 3+ routes → `lib/<domain>/`

---

# SPECS.md — Single Source of Truth

```
Epic (E1..E14)            ← route group / domain
  └─ User Story (US-X.Y)  ← route segment + Gherkin AC
       └─ Task (T-X.Y.Z)  ← single file in segment
```

**Status markers**

<span class="pill">[ ] todo</span>
<span class="pill pill-amber">[~] in progress</span>
<span class="pill pill-emerald">[x] completed</span>
<span class="pill pill-rose">[!] blocked</span>

**🎨 marker** → story requires `/frontend-design` skill

> A story is **complete** only when every task is `[x]` **AND** every Gherkin scenario is verified by `review-item` with `file:LN` evidence.

---

# Flow A — Implement Existing Story

```
plan-item US-4.1
   ↓ docs/agents/item-implementation-plan-<ts>.md

/implement-item US-4.1
   ↓ Phase 1 Plan → 2 Implement → 3 Validate → 4 Complete
   ↓ Gherkin Validation Report + commit suggestion

review-item US-4.1
   ↓ docs/agents/item-reviewed-<ts>.md
   ↓ ✅ PASS · ⚠️ PASS WITH NOTES · ❌ NEEDS CHANGES

/update-specs            (only on inconsistencies)

git commit && git push
   ↓ pre-commit · commit-msg · pre-push
```

---

# Flow B — Add Item Mid-Flight

```
/add-item add US-4.5 CSV position import to E4
   ↓ Parse → Assign ID → 🎨 detect → Generate
   ↓ Diff preview → Apply
   ↓ SPECS.md + Progress Summary updated

plan-item US-4.5
/implement-item US-4.5
review-item US-4.5
```

# Flow C — Document a Feature

```
document-feature portfolio
   ↓ reads app/, lib/, supabase/, __tests__/
   ↓ docs/routes/portfolio.md
     (Architecture · Pages · Flows · Models · DB · Tests · Tree · Limits)
```

---

# Why Plan-then-Implement?

`plan-item` runs in a **fresh context**, read-only, file-grounded. Produces:

- Dependency graph: 🟢 ready · 🟡 depends · 🔴 blocked
- Complexity matrix: **S/M/L/XL** × **Low/Med/High**
- Files to create/modify per route segment contract
- Gherkin → checklist conversion

`/implement-item` then **locates the most recent matching plan** and treats it as the **implementation contract**. Deviations are reported in `Plan Deviations`.

> Decouples _thinking_ from _doing_.
> Gives reviewers an artifact to compare against.
> Keeps the agent honest.

---

# SPECS.md ⇄ Azure DevOps

| SPECS.md         | ADO Work Item            | Identifier                       |
| ---------------- | ------------------------ | -------------------------------- |
| `E1..E14`        | **Epic**                 | `[E1]` · `SpecId = E1`           |
| _(grouping)_     | **Feature**              | `[E4-Portfolio Tracker]`         |
| `US-X.Y`         | **User Story** / PBI     | `[US-4.1]` · `SpecId = US-4.1`   |
| `T-X.Y.Z`        | **Task**                 | `[T-4.1.1]` · `SpecId = T-4.1.1` |
| Gherkin scenario | **Test Case** / AC field | one per `Scenario:`              |
| `[!]` blocked    | Tag `blocked` + comment  | —                                |
| 🎨 marker        | Tag `frontend-design`    | —                                |

> **`SpecId` (custom string field)** is the single linking key.
> The _only_ trustworthy correlator between ADO and the repo.

---

# ADO Status Mapping

| SPECS.md | Agile                | Scrum                   |
| -------- | -------------------- | ----------------------- |
| `[ ]`    | New / To Do          | New / Approved          |
| `[~]`    | Active               | Committed               |
| `[x]`    | Closed / Resolved    | Done                    |
| `[!]`    | Blocked tag + Active | Blocked tag + Committed |

### Recommended ADO Branch Policies

- ✅ Min 1 reviewer · pairs with `review-item` artifact
- ✅ Linked work item required · enforces `SpecId`
- ✅ Build pipeline green · catches what `tsc --noEmit` misses
- ✅ Comment resolution required · 🟠 Major findings get addressed
- ✅ Squash merge · one commit per Story = clean history

---

# Planning Loop with ADO

1. **PM grooms** Epic / Story in ADO with `SpecId` placeholders
2. `/add-item` **mirrors** to `SPECS.md` — same ID
3. `plan-item US-4.1` → plan file → attach URL to ADO Discussion
4. PR title: `feat(portfolio): US-4.1 manual position entry` + `AB#<id>`

# Code Review Loop with ADO

1. PR opens, links `AB#<id>`
2. `review-item US-4.1` → review file committed/attached
3. **Verdict gates merge**: ✅ approve · ⚠️ approve + new tasks · ❌ block
4. `pre-push` last gate before remote · build pipeline last gate before merge
5. On merge: ADO auto-closes · CI runs `/update-specs` (optional)

---

# Roles & RACI

| Activity          |  PM   | Tech Lead | Engineer | Reviewer |          Agent          |
| ----------------- | :---: | :-------: | :------: | :------: | :---------------------: |
| Define Epic/Story | **A** |     C     |    C     |    I     |            —            |
| Refine Gherkin AC | **A** |     R     |    C     |    C     |            —            |
| Generate plan     |   I   |     C     |    R     |    I     |    **R** `plan-item`    |
| Implement story   |   I   |     A     |  **R**   |    I     | **R** `/implement-item` |
| Lint + tests      |   —   |     A     |    R     |    I     |        R Phase 3        |
| Code review       |   I   |     A     |    C     |  **R**   |   **R** `review-item`   |
| Update SPECS.md   |   I   |     A     |    R     |    I     |        R Phase 4        |
| Sync ADO state    | **A** |     C     |    R     |    I     |            —            |
| Approve merge     |   I   |     A     |    I     |  **R**   |            —            |

> **R**esponsible · **A**ccountable · **C**onsulted · **I**nformed

---

# Day in the Life — `US-4.5`

```
1. PM creates ADO Story #1287, SpecId=US-4.5
2. /add-item → mirrored into SPECS.md
3. plan-item US-4.5
   → 4 tasks · 🎨 yes · risk Medium
4. /implement-item US-4.5
   → applies /frontend-design for dialog
   → lint ✓ vitest ✓ Gherkin ✓
   → suggests: feat(portfolio): US-4.5 CSV position import
5. review-item US-4.5
   → ⚠️ PASS WITH NOTES
   → 🟡 missing empty-state copy at csv-import-dialog.tsx:84
6. Engineer fixes, commits with (AB#1287)
   → pre-commit ✓ commit-msg ✓ pre-push ✓
7. PR merged · ADO auto-closes · SPECS US-4.5 = [x]
```

> **Trace**: ADO #1287 ↔ US-4.5 ↔ commit ↔ plan ↔ review

---

# Operational Checklist

<div class="columns">

<div>

**Repo health**

- [ ] Progress Summary matches markers
- [ ] Every story has Gherkin
- [ ] No orphan files vs contract
- [ ] RLS in every migration

**Harness wiring**

- [ ] Rule globs match real files
- [ ] Skills have name + hint
- [ ] Agents declare `tools`
- [ ] `.husky/*` executable

</div>

<div>

**SDD discipline**

- [ ] PR title cites `US-X.Y`
- [ ] Plan file exists for M+ stories
- [ ] Review file with verdict ≠ ❌
- [ ] Conventional commit scope ✓

**ADO bridge**

- [ ] `SpecId` on every work item
- [ ] Branch policies enforced
- [ ] PR template has `AB#` + `SpecId`

</div>

</div>

---

# What This Buys You

<br>

<div class="columns">

<div>

### For PM

- Backlog **always** matches code state
- Every PR traceable to a Story
- Verdict-gated merges
- Real progress, not vibes

### For Tech Lead

- Conventions enforced **automatically**
- Plan + review artifacts per change
- Severity-ranked findings
- Nothing reaches `main` untested

</div>

<div>

### For Engineer

- _One prompt per story_
- Pre-mapped files & dependencies
- Self-review before human review
- Conventional commit auto-suggested

### For Reviewer

- File-grounded findings only
- Plan as comparison baseline
- Severity ladder = clear priorities
- Less time chasing convention drift

</div>

</div>

---

<!-- _class: lead -->

# Spec → Plan → Code → Review → Ship

### Every line of code traces back to a numbered specification.

<br>

<span class="pill pill-emerald">SPECS.md</span>
<span class="pill pill-sky">CLAUDE.md</span>
<span class="pill pill-amber">.claude/</span>
<span class="pill pill-rose">.husky/</span>

<br><br>

**`docs/HARNESS.md`** — full reference
**`.claude/README-SKILLS.md`** — operator manual

<br>

_Questions?_
