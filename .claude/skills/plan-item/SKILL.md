---
name: plan-item
description: Plan an epic or user story before implementation. Analyzes SPECS.md, breaks down work, identifies dependencies, estimates complexity, and produces an implementation plan. Use when planning work on an epic (E1) or user story (US-1.1).
argument-hint: <epic-or-story-id e.g. "E1" or "US-1.1">
---

# Plan Item: $ARGUMENTS

You are a senior developer planning implementation work for the Finance Dashboard project.

## Context

Read these files first:
- @SPECS.md — full project specifications with epics, user stories, tasks, and Gherkin criteria
- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @.claude/README-ARCHITECTURE.md — route segment contract and naming rules
- @.claude/README-SPECS.md — how epics/stories/tasks map to route files

## Your Task

Plan the item `$ARGUMENTS` from SPECS.md. Determine whether it is an **Epic** (e.g. `E1`) or a **User Story** (e.g. `US-1.1`) and adjust scope accordingly.

## Planning Steps

### 1. Extract the Item

Find `$ARGUMENTS` in SPECS.md. Extract:
- Title and description
- All user stories (if epic) or all tasks (if user story)
- Gherkin acceptance criteria for each story
- Current status markers (`[ ]`, `[~]`, `[x]`, `[!]`)

### 2. Dependency Analysis

For each task/story, identify:
- **Internal dependencies**: Which tasks must be done before others?
- **External dependencies**: APIs, packages, database tables, other epics that must exist first
- **Shared concerns**: Components, schemas, or utilities that multiple tasks will use

### 3. Implementation Order

Produce a numbered, ordered list of tasks to execute. Group by story if planning an epic. Mark:
- 🟢 Ready to start (no blockers)
- 🟡 Depends on earlier task in this plan
- 🔴 Blocked by external dependency (another epic, external service, etc.)

### 4. Complexity Assessment

For each task, rate:
- **Effort**: S (< 30 min), M (30 min–2 hrs), L (2–4 hrs), XL (4+ hrs)
- **Risk**: Low / Medium / High — based on unknowns, external API integration, or complex logic

### 5. Key Decisions

List any architectural or technical decisions that should be made before starting:
- Choice of library or pattern
- Database schema design considerations
- API integration approach
- Component structure

### 6. Files to Create or Modify

List every file that will be created or modified, organized by task. Follow the colocated route segment contract:
- Route-specific logic → `app/<route>/_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`, `_components/`
- Route tests → `app/<route>/__tests__/`
- Shared utilities (3+ routes) → `lib/<domain>/`
- Database migrations → `supabase/migrations/`

## Output Format

Present the plan in this structure:

```markdown
# Plan: [Item ID] — [Title]

## Summary
[1-2 sentence overview]

## Status
[Current status of all sub-items]

## Dependencies
[External and internal dependencies]

## Implementation Order
[Numbered task list with status indicators]

## Complexity Matrix
| Task | Effort | Risk | Notes |
|------|--------|------|-------|

## Key Decisions
[Bulleted list]

## Files Affected
[Grouped by task]

## Acceptance Criteria Checklist
[Gherkin scenarios as a checklist]
```

Do NOT modify any files. This skill is read-only planning.
