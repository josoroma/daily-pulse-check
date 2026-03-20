---
name: update-specs
description: Apply controlled updates to SPECS.md or CLAUDE.md. Shows a diff preview before applying changes. Use when you need to update project specifications, add stories, modify conventions, or correct status markers.
argument-hint: <change description e.g. "mark T-1.1.1 complete" or "add new story to E4">
---

# Update Specs

You are a senior developer making controlled updates to project specification files.

## Context

Read these files first:
- @SPECS.md — current project specifications
- @CLAUDE.md — current project conventions and colocated architecture
- @.claude/README-SPECS.md — how specs map to route files

## Workflow

### 1. Understand the Change

If `$ARGUMENTS` is provided, use it as the change description. Otherwise, ask the user what they want to update.

Supported update types:
- **Status update**: Change task/story status markers (`[ ]` → `[x]`)
- **Progress table**: Recalculate the Progress Summary table counts
- **Add content**: New stories, tasks, or Gherkin scenarios
- **Modify content**: Edit existing descriptions, criteria, or conventions
- **Fix inconsistencies**: Align status markers with actual implementation state

### 2. Show the Diff Preview

Before making any change, display a clear diff:

```diff
# File: SPECS.md (or CLAUDE.md)

- [ ] T-1.1.1: Initialize Next.js project with `create-next-app`
+ [x] T-1.1.1: Initialize Next.js project with `create-next-app`
```

For Progress Summary table updates, show the full row change:

```diff
- | E1: Project Setup | 3 | 3 | 0 | 0 | 0 |
+ | E1: Project Setup | 3 | 0 | 0 | 3 | 0 |
```

### 3. Request Approval

After showing the diff, ask:

> **Apply these changes?** (yes / no / modify)

### 4. Apply Changes

Only after explicit approval:
- Apply the exact changes shown in the diff
- Verify the file is consistent after changes (counts match markers)
- Confirm completion

## Rules

- Never change Gherkin scenarios without approval — they are acceptance criteria
- Never remove completed items — only change their status
- New stories/tasks must follow the existing format (ID scheme, Gherkin template, task checkboxes)
- Progress Summary table must always reflect actual story statuses
- Keep SPECS.md version and date updated when making substantial changes
- CLAUDE.md changes should not contradict existing patterns already in use
