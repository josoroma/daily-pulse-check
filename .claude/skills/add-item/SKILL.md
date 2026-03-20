---
name: add-item
description: Add a new epic, user story, or task to SPECS.md following existing conventions. Auto-detects if the item needs the 🎨 /frontend-design marker. Shows a diff preview before applying.
argument-hint: <item description e.g. "add epic E11 for notifications v2" or "add US-4.5 CSV import to E4" or "add task T-4.1.6 to US-4.1">
---

# Add Item: $ARGUMENTS

You are a senior developer adding new specification items to the Finance Dashboard project.

## Context

Read these files first:
- @SPECS.md — current project specifications with epics, user stories, tasks, and Gherkin criteria
- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @.claude/README-SPECS.md — how epics/stories/tasks map to route files
- @.claude/README-ARCHITECTURE.md — route segment contract and naming rules

## Phase 1: Parse the Request

Determine what the user wants to add from `$ARGUMENTS`:

| Adding a... | Detected by | Goes into |
|---|---|---|
| **Epic** | Mentions "epic" or "E{N}" | New `## E{N}:` section at the end of SPECS.md |
| **User Story** | Mentions "story", "US-{X.Y}", or describes a feature for an existing epic | New `### US-{X.Y}:` under the target epic |
| **Task** | Mentions "task", "T-{X.Y.Z}", or describes a subtask for a story | New `- [ ] T-{X.Y.Z}:` under the target story's `#### Tasks` |

If the target type is ambiguous, ask the user to clarify before proceeding.

## Phase 2: Assign the ID

### Epic IDs
- Find the highest existing epic number (e.g., E10) → assign the next (E11).
- If the user specifies an ID, use it — but warn if it conflicts with an existing epic.

### User Story IDs
- Find the parent epic (e.g., E4 for a portfolio story).
- Find the highest story number in that epic (e.g., US-4.4) → assign the next (US-4.5).
- If the user specifies an ID, use it — but warn if it conflicts.

### Task IDs
- Find the parent user story (e.g., US-4.1).
- Find the highest task number (e.g., T-4.1.5) → assign the next (T-4.1.6).
- If the user specifies an ID, use it — but warn if it conflicts.

## Phase 3: Detect 🎨 Frontend Design Requirement

Determine if the new item involves UI/frontend work. Apply the `🎨` marker if **any** of these are true:

### Automatic 🎨 — Always tag if the item involves:
- Creating or modifying a `page.tsx`, `layout.tsx`, or `loading.tsx`
- Creating components in `_components/`
- Building charts, gauges, visualizations (Recharts)
- Building forms, modals, dialogs, sheets
- Building tables, lists, or data display components
- Building dashboards, metric cards, or summary views
- Creating empty states, loading skeletons, or error boundaries
- Responsive layout work
- Theme or styling changes

### Automatic NO 🎨 — Never tag if the item is:
- Pure API integration (`lib/market/`, `lib/bitcoin/`)
- Database migrations or schema changes only
- Server-side logic in `_actions.ts` with no UI
- Cron jobs or background tasks (`app/api/cron/`)
- Configuration, environment variables, or tooling setup
- Test infrastructure only
- Package installation only

### Heuristic — Tag if the parent epic maps to a UI route:
- E2 (Auth), E4 (Portfolio), E5 (DCA), E8 (Bitcoin), E9 (Analytics), E10 (Settings) → likely 🎨
- E1 (Setup), E3 (Market Data Engine — API layer) → check case-by-case
- E6 (AI Insights), E7 (Alerts) → tag if it mentions UI components

When in doubt, tag with `🎨` — it's better to apply the design system unnecessarily than to produce inconsistent UI.

## Phase 4: Generate the Content

### For a new Epic

```markdown
## E{N}: {Title}

### US-{N.1}: {First Story Title} [ ] {🎨 if applicable}

**As a** {role}
**I want** {capability}
**So that** {benefit}

\```gherkin
Feature: {Feature Name}
  As a {role}
  I want {capability}
  So that {benefit}

  Scenario: {Scenario Name}
    Given {precondition}
    When {action}
    Then {expected result}
\```

#### Tasks

- [ ] T-{N.1.1}: {Task description}
- [ ] T-{N.1.2}: {Task description}

---
```

Also update the **Progress Summary** table with a new row:
```markdown
| E{N}: {Title} | 1 | 1 | 0 | 0 | 0 |
```

### For a new User Story

```markdown
### US-{X.Y}: {Title} [ ] {🎨 if applicable}

**As a** {role}
**I want** {capability}
**So that** {benefit}

\```gherkin
Feature: {Feature Name}
  As a {role}
  I want {capability}
  So that {benefit}

  Scenario: {Scenario Name}
    Given {precondition}
    When {action}
    Then {expected result}
\```

#### Tasks

- [ ] T-{X.Y.1}: {Task description}
- [ ] T-{X.Y.2}: {Task description}

---
```

Also update the **Progress Summary** table:
- Increment the `Stories` count for the parent epic
- Increment the `Todo` count for the parent epic

### For a new Task

```markdown
- [ ] T-{X.Y.Z}: {Task description}
```

Insert after the last existing task in the parent story's `#### Tasks` section.

## Phase 5: Quality Checks

Before presenting the diff, verify:

1. **ID uniqueness**: The new ID does not conflict with any existing ID in SPECS.md.
2. **Correct parent**: The new item is placed under the correct epic or story.
3. **Gherkin quality** (stories only): Scenarios are specific, testable, and use Given/When/Then correctly.
4. **Task granularity**: Tasks are atomic and implementation-ready (a single developer can complete one in < 4 hours).
5. **🎨 marker accuracy**: Frontend detection logic was applied correctly.
6. **Consistent formatting**: Follows existing SPECS.md conventions exactly (spacing, indentation, dash style).

## Phase 6: Preview and Apply

### Show a diff preview

```diff
+ ## E11: Notification History
+
+ ### US-11.1: Notification Log View [ ] 🎨
+ ...
```

### Wait for user approval

Ask: **"Apply this change to SPECS.md?"**

- On approval → apply the edit and confirm.
- On rejection → ask what to modify.

### After applying

Report:
```
Added: {item type} {ID} — {title}
Parent: {parent epic or story}
Frontend design: {🎨 Yes / No} — {reason}
Progress Summary: {updated / no change needed}
```

## Conventions Reference

These must be followed exactly:

| Element | Format |
|---|---|
| Epic header | `## E{N}: {Title}` |
| Story header | `### US-{X.Y}: {Title} [ ] {🎨}` |
| Story format | `**As a**` / `**I want**` / `**So that**` + gherkin + tasks |
| Task format | `- [ ] T-{X.Y.Z}: {Description}` |
| Section separator | `---` between stories |
| Status markers | `[ ]` todo, `[~]` in progress, `[x]` completed, `[!]` blocked |
| Design marker | `🎨` after status marker on story header (stories only, never on tasks or epics) |
