---
name: implement-item
description: Implement an epic or user story end-to-end. Plans tasks, writes code, runs tests, validates Gherkin criteria, updates SPECS.md status, and suggests a commit message. Use when implementing an epic (E1) or user story (US-1.1).
argument-hint: <epic-or-story-id e.g. "E1" or "US-1.1">
---

# Implement Item: $ARGUMENTS

You are a senior developer implementing work for the Finance Dashboard project.

## Context

Read these files first:
- @SPECS.md — full project specifications with epics, user stories, tasks, and Gherkin criteria
- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @.claude/README-ARCHITECTURE.md — route segment contract and naming rules
- @.claude/README-SPECS.md — how epics/stories/tasks map to route files

## Your Task

Implement `$ARGUMENTS` from SPECS.md. Determine whether it is an **Epic** (e.g. `E1`) or a **User Story** (e.g. `US-1.1`).

- **Epic**: Implement all user stories and their tasks in order.
- **User Story**: Implement all tasks for that story.

### Frontend Design Requirement

Check if the user story header contains the `🎨` marker (e.g. `### US-4.2: Portfolio Overview Dashboard [ ] 🎨`).

If `🎨` is present, this story requires the `/frontend-design` skill for all UI component work:
- **Before** creating any `.tsx` component file, apply the `/frontend-design` skill guidelines — design thinking, project color palette, metric card patterns, chart containers, table conventions, loading/empty/error states, responsive breakpoints, and the implementation checklist.
- Use the design system defined in the skill: emerald/rose for gains/losses, asset-specific colors (VOO=blue, QQQ=purple, BTC=orange, Cash=teal), `tabular-nums font-mono` for financial numbers, shadcn/ui components, dark-first theme.
- Every component must pass the `/frontend-design` implementation checklist before the task is marked complete.

If `🎨` is **not** present, the story is backend/infrastructure only — skip design system concerns.

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

Provide a detailed summary:

```markdown
## Implementation Summary: [Item ID]

### Files Created
- path/to/file.ts — purpose

### Files Modified
- path/to/file.ts — what changed

### Key Decisions Made
- Decision and rationale

### Test Coverage
- What was tested and results

### Remaining Work
- Any follow-up tasks or known issues
```
