---
name: implement-item
description: Implement an epic or user story end-to-end. Plans tasks, writes code, runs tests, validates Gherkin criteria, updates SPECS.md status, and suggests a commit message. Use when implementing an epic (E1) or user story (US-1.1).
argument-hint: <epic-or-story-id e.g. "E1" or "US-1.1">
---

# Implement Item: $ARGUMENTS

You are a senior developer implementing work for the Finance Dashboard project.

## Context

Read these files first:

- @SPECS.md — extract only the section for `$ARGUMENTS` (epic, user story, or task) plus its Gherkin criteria; do not load unrelated sections
- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @.claude/README-ARCHITECTURE.md — route segment contract and naming rules
- @.claude/README-SPECS.md — how epics/stories/tasks map to route files

### Plan Context (required when available)

Look in `docs/agents/` for files matching `item-implementation-plan-*.md`:

1. Pick the most recent file (highest `YYYY-MM-DD-HH-MM-SS` timestamp) whose body targets `$ARGUMENTS` (matches the item ID or free-text title).
2. If a matching plan exists, read it in full and treat it as the authoritative implementation contract — file list, ordering, key decisions, and acceptance checklist.
3. If no relevant plan exists, proceed using SPECS.md alone and note that no plan was used.
4. Before starting Phase 1, tell the user:
   - Which plan file you are using (full path), **or**
   - That no matching plan was found and you are implementing from SPECS.md only.

## Your Task

Implement `$ARGUMENTS` from SPECS.md (and the selected plan, if any). Determine whether it is an **Epic** (e.g. `E1`), a **User Story** (e.g. `US-1.1`), a **Task** (e.g. `T-1.1.1`), or a free-text scope.

- **Epic**: Implement all user stories and their tasks in order.
- **User Story**: Implement all tasks for that story.

### Frontend Design Requirement

Check if the user story header contains the `🎨` marker (e.g. `### US-4.2: Portfolio Overview Dashboard [ ] 🎨`).

If `🎨` is present, this story requires the `/frontend-design` skill for all UI component work:

- **Before** creating any `.tsx` component file, apply the `/frontend-design` skill guidelines — design thinking, project color palette, metric card patterns, chart containers, table conventions, loading/empty/error states, responsive breakpoints, and the implementation checklist.
- Use the design system defined in the skill: emerald/rose for gains/losses, asset-specific colors (VOO=blue, QQQ=purple, BTC=orange, Cash=teal), `tabular-nums font-mono` for financial numbers, shadcn/ui components, dark-first theme.
- Every component must pass the `/frontend-design` implementation checklist before the task is marked complete.
  f a plan file was selected, follow its `Files Affected`, `Implementation Order`, and `Key Decisions` sections; deviations must be called out in the final summary

3. Identify which files to create or modify (use the architecture in CLAUDE.md)
   4f `🎨` is **not** present, the story is backend/infrastructure only — skip design system concerns.

## Implementation Workflow

For each task, follow this cycle:

### Phase 1: Plan

1. Read the task description and its parent user story's Gherkin scenarios
2. Identify which files to create or modify (use the architecture in CLAUDE.md)
3. Check for dependencies — ensure prerequisite tasks/stories are complete

### Phase 2: Implement

4. Update SPECS.md: mark the task `[~]` (in progress)
5. Write the code following project conventions:
   - TypeScript strict, no `any`
   - Use `@/` path aliases (`@/app/...`, `@/lib/...`)
   - Route module files use underscore prefix: `_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`
   - Zod schemas in `_schema.ts` — export `Schema` + inferred `Type`
   - Server Actions in `_actions.ts` — export `async function verbNoun(...)`
   - UI components in `_components/` — kebab-case files, PascalCase names
   - shadcn/ui for UI components
   - Server Components by default, `'use client'` only when needed
   - RLS policies on all tables
   - Shared code in `lib/` only if used by 3+ routes
6. Create or update all required files per the route segment contract

### Phase 3: Validate

7. Run `npm run lint` — fix any lint errors
8. Run `npm test` — fix any test failures
9. If the task includes writing tests, ensure they pass
10. Review the parent story's Gherkin scenarios — verify each `Then` clause is satisfied by the implementation

### Phase 4: Complete

11. Update SPECS.md: mark the task `[x]` (completed)
12. If all tasks in a user story are `[x]`, mark the story `[x]`
13. If all stories in an epic are `[x]`, update the Progress Summary table

## After All Tasks Complete

### Gherkin Validation Report

For each Gherkin scenario in the implemented stories, produce:

```
✅ Scenario: [name]
   Given [condition] → [how it's satisfied]
   When [action] → [where in code]
   Then [expected] → [how verified]
```

Or:

```
❌ Scenario: [name]
   Missing: [what's not yet implemented]
```

### SPECS.md Update

Update the Progress Summary table with new counts:

- Recalculate Todo, In Progress, Completed, Blocked for affected epics

### Commit Message

Suggest a conventional commit message:

```
type(scope): description

- Task T-X.Y.Z: what was done
- Task T-X.Y.Z: what was done
```

### Implementation Summary

, and explicitly restate which plan file (if any) was used as context:

```markdown
## Implementation Summary: [Item ID]

### Plan Used

- docs/agents/item-implementation-plan-<timestamp>.md ← exact path, or "none — implemented from SPECS.md only"

### Files Created

- path/to/file.ts — purpose

### Files Modified

- path/to/file.ts — what changed

### Plan Deviations

- <Any file, ordering, or decision that diverged from the plan, with rationale> ← omit section if no plan was used

### Key Decisions Made

- Decision and rationale

### Test Coverage

- What was tested and results

### Remaining Work

- Any follow-up tasks or known issues
```

After printing the summary, send a short chat-level confirmation to the user stating the plan path that was consumed (or that none was used).ny follow-up tasks or known issues

```

```
