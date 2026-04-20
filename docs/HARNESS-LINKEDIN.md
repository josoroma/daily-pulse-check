# I built a Spec-Driven harness for Claude Code — here is what changed

_How a small `.claude/` folder, one `CLAUDE.md`, and a numbered `SPECS.md` turned my AI pair-programmer into a deterministic engineering partner._

---

We have all seen the demo: an AI agent writes a feature in 30 seconds. We have also all seen the next morning: the file lives in the wrong folder, the migration has no RLS policy, the dates are in UTC instead of Costa Rica time, and there is no test.

After shipping a personal finance dashboard end-to-end with Claude Code (Next.js 16.2.1, TypeScript strict, Supabase, Vercel AI SDK), I converged on a pattern that fixes this. I call it the **harness**. It is five small files that turn an LLM from a creative junior into a reliable senior engineer that never forgets the conventions.

Here is what it looks like.

---

## The problem with “just prompt better”

Prompting harder does not scale. Every new feature re-introduces the same risks:

- Files land in the wrong place.
- Naming drifts (`utils.ts`, `helpers.ts`, `lib.ts` — pick one).
- Security policies (RLS, input validation, secret handling) are forgotten.
- Acceptance criteria are reinterpreted on every run.
- There is no audit trail from “what we wanted” to “what got merged.”

The fix is not a longer prompt. The fix is a **spec-driven harness** that is loaded automatically and enforces the same rules every time.

---

## The five concepts

| Concept    | Where it lives    | When it runs                               | Modifies code? |
| ---------- | ----------------- | ------------------------------------------ | -------------- |
| **Rules**  | `.claude/rules/`  | Auto-loaded when files match a glob        | No (guidance)  |
| **Skills** | `.claude/skills/` | Invoked by name (`/implement-item US-4.1`) | Yes            |
| **Agents** | `.claude/agents/` | Invoked by name; restricted tools          | Read-only      |
| **Hooks**  | `.husky/`         | `pre-commit`, `commit-msg`, `pre-push`     | No (gates)     |
| **Specs**  | `SPECS.md`        | Single source of truth for the backlog     | Tracked        |

Together they form a chain:

```
Product Design → SPECS.md → CLAUDE.md → .claude/ → .husky/
   what & why     what to build   how to build    how the agent operates   what cannot reach origin
```

Upstream the `specs-workflow` rule blocks any code that does not trace to a `SPECS.md` ID. Downstream Husky hooks block any commit that fails lint, commitlint, typecheck, or tests. The agent operates inside that envelope.

---

## Rules — the boring win

Rules are tiny markdown files with a `paths:` glob. When the agent edits a matching file, the rule is auto-injected as context. They never modify code; they prevent the agent from forgetting policy.

Examples I rely on every day:

- **`code-style.md`** — 2-space indent, single quotes, no semicolons, named exports only, kebab-case components, underscore-prefixed route files.
- **`database.md`** — never modify existing migrations, RLS in the same migration as `CREATE TABLE`, separate `CreateXSchema` vs `UpdateXSchema`, never include `id` / `user_id` in Create inputs.
- **`dates.md`** — all dates go through `@/lib/date`, Costa Rica timezone explicit via `@date-fns/tz`, no `toISOString()` in app code.
- **`security.md`** — RLS on every table, `auth.uid()` server-side only, Zod validation in `_actions.ts`, `service_role` key never on the client.
- **`testing.md`** — Vitest only, colocated `__tests__/`, no Supabase mocking — pure functions only.

Result: the agent stops “rediscovering” the same conventions in every session.

---

## Skills — the named workflows

Skills are explicit, invokable recipes. The one that does most of the work is `/implement-item`, which runs four phases per User Story:

1. **Plan** — read the SPECS section, locate the matching plan in `docs/agents/`, identify the files to touch.
2. **Implement** — mark the task `[~]`, write the code under the route segment contract.
3. **Validate** — run `npm run lint` and `npm test`, walk every Gherkin scenario, cite a `file:LN` for each `Then` clause.
4. **Complete** — mark `[x]`, recompute the Progress Summary, propose a Conventional Commit.

Other skills in the harness:

- `/add-item` — append a new Epic, Story, or Task to SPECS.md with a diff preview.
- `/update-specs` — controlled SPECS edits with diff preview.
- `/frontend-design` — apply the design system (colors, states, shadcn/ui) for stories marked 🎨.
- `/capture-prompts` — extract, improve, and persist user prompts into a session log.

Every skill has an approval gate or a deterministic loop. No surprises.

---

## Agents — read-only specialists

Agents run with a fresh context window and a restricted toolset (`Read`, `Grep`, `Glob`, optionally `Write` for a single output document). They cannot edit application code.

- **`plan-item`** writes `docs/agents/item-implementation-plan-<timestamp>.md`.
- **`review-item`** writes `docs/agents/item-reviewed-<timestamp>.md` with a 🔴 / 🟠 / 🟡 / 🔵 severity ladder, every finding cited as `path/file.ts:LN`.
- **`document-feature`** writes `docs/routes/<feature>.md` from the real codebase, not from imagination.
- **`code-reviewer`** is the generic reviewer used internally by `review-item`.

Read-only specialists are the part of the harness that gives me the most confidence. They never destabilize a working tree.

---

## SPECS.md — the executable backlog

Every feature is declared once and traced forever:

```
Epic E4: Portfolio Management
  └─ US-4.1: Create position
       Acceptance criteria (Gherkin):
         Given a logged-in user
         When they submit a valid position
         Then it is persisted with auth.uid() and visible only to them
       └─ T-4.1.1: Schema in app/dashboard/portfolio/_schema.ts
       └─ T-4.1.2: Server action in app/dashboard/portfolio/_actions.ts
       └─ T-4.1.3: Form in app/dashboard/portfolio/_components/position-form.tsx
       └─ T-4.1.4: Tests in app/dashboard/portfolio/__tests__/
```

Status markers (`[ ]` `[~]` `[x]` `[!]`) and a Progress Summary table at the top are kept honest by `/update-specs`. A story is complete only when every task is `[x]` **and** every Gherkin scenario has a code citation in the review document.

This is what makes the harness _spec-driven_ and not _vibes-driven_.

---

## How a real ticket flows

```
plan-item US-4.5
   ↓ docs/agents/item-implementation-plan-<ts>.md
/implement-item US-4.5
   ↓ Plan → Implement → Validate → Complete
   ↓ updates SPECS.md + Progress Summary
   ↓ prints Gherkin Validation Report + suggested commit
review-item US-4.5
   ↓ docs/agents/item-reviewed-<ts>.md  → ✅ PASS / ⚠️ NOTES / ❌ NEEDS CHANGES
git commit && git push
   ↓ pre-commit (lint-staged)
   ↓ commit-msg (commitlint)
   ↓ pre-push (tsc --noEmit && vitest)
```

The agent does the work. The harness keeps it honest. The git hooks make sure nothing ambiguous reaches `origin`.

---

## What this maps to in Azure DevOps

If your team lives in ADO, the mapping is one-to-one:

| SPECS.md          | Azure DevOps                  |
| ----------------- | ----------------------------- |
| Epic (E1..E14)    | Epic                          |
| User Story (US-)  | User Story                    |
| Task (T-)         | Task                          |
| Gherkin block     | Acceptance Criteria field     |
| Status markers    | State (New / Active / Closed) |
| Progress Summary  | Dashboard query               |
| `review-item` doc | PR review attachment          |

You can paste `review-item` output straight into a pull request review. Every finding is already cited as `path/file.ts:LN`.

---

## What changed for me

Before the harness:

- I re-explained conventions every session.
- AI-generated PRs needed heavy human cleanup.
- Acceptance criteria drifted between “what we agreed” and “what got built.”
- I did not trust the agent with security-sensitive paths.

After the harness:

- Conventions are loaded automatically by file path.
- The agent picks up `US-4.5`, plans it, ships it, validates Gherkin, suggests a commit.
- Every change traces to a numbered spec and a code citation.
- The git hooks are the only thing standing between the agent and `main` — and that is enough.

---

## The takeaway

You do not need a bigger model. You need a smaller, sharper contract:

1. A numbered backlog (`SPECS.md`) with Gherkin acceptance criteria.
2. A conventions file (`CLAUDE.md`) the agent reads every session.
3. Path-scoped rules (`.claude/rules/`) that auto-load on file edits.
4. Named skills (`.claude/skills/`) that own the multi-step workflows.
5. Read-only agents (`.claude/agents/`) that audit, plan, and document.
6. Git hooks (`.husky/`) that refuse to push anything ambiguous.

Five small things. The result is an AI pair-programmer I can actually trust on a production codebase.

---

If you are building with Claude Code, Cursor, or any agentic IDE — try writing your `SPECS.md` first. Then write the rules that protect it. The model will meet you there.

_— Built while shipping a personal finance dashboard for VOO / QQQ / Bitcoin tracking. Stack: Next.js 16.2.1, TypeScript strict, Supabase, Vercel AI SDK, Tailwind v4, shadcn/ui._

#AI #SoftwareEngineering #ClaudeCode #SpecDrivenDevelopment #NextJS #TypeScript #DeveloperProductivity #LLM #AgenticAI
