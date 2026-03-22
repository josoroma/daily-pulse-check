---
paths:
  - 'app/**/*.tsx'
  - 'app/**/_components/**'
---

# Design Rules: Finance Dashboard

## Color Semantics

Always use semantic colors, never raw Tailwind color names out of context:

- **Gains/positive**: `text-emerald-500`, `bg-emerald-500/10` — portfolio gains, positive deltas
- **Losses/negative**: `text-rose-500`, `bg-rose-500/10` — portfolio losses, negative deltas
- **Informational**: `text-sky-500`, `bg-sky-500/10` — neutral data points, links
- **Warnings**: `text-amber-500`, `bg-amber-500/10` — approaching thresholds, stale data

Never use `text-green-500` or `text-red-500` for financial data — use `emerald` and `rose`.

## Asset Colors

Consistent across all charts and badges:

- VOO: `hsl(220, 70%, 55%)` — blue
- QQQ: `hsl(280, 65%, 60%)` — purple
- BTC: `hsl(35, 95%, 55%)` — orange
- Cash: `hsl(160, 40%, 50%)` — teal

## Status Badge Mapping

- Active: `text-emerald-400`
- Paused: `text-amber-400`
- Triggered: `text-sky-400`
- Error: `text-rose-400`

## Financial Number Formatting

- All prices and currency values: `font-mono tabular-nums`
- USD amounts: `$` prefix, comma thousands separator, 2 decimal places
- BTC amounts: up to 8 decimal places
- Percentages: 2 decimal places with `%` suffix, `+` prefix for positive
- Deltas: `text-emerald-500` when >= 0, `text-rose-500` when < 0

## Component Preferences

1. Use shadcn/ui components before building custom ones
2. Use `Card`/`CardHeader`/`CardContent` for all data containers
3. Use `Table` for tabular data — numeric columns always `text-right`
4. Use `Skeleton` for loading states — must match final layout shape
5. Use `Badge` for status indicators with semantic color variants
6. Use `Button` with appropriate `variant` and `size` props
7. Use `Dialog` for forms and confirmations

## Chart Rules (Recharts)

1. Always wrap in `ResponsiveContainer` with explicit height
2. Use gradient fills for area charts (asset color → transparent)
3. Style tooltips with `bg-popover text-popover-foreground border rounded-lg shadow-lg p-3`
4. Grid lines: low opacity using `hsl(var(--border))`
5. Never use default Recharts colors — always customize to asset colors
6. Chart title goes in `CardHeader`, not inside the SVG

## Layout Grid

- Sections separated by `space-y-6`
- Cards in grids use `gap-4`
- Metric cards: `grid md:grid-cols-2 lg:grid-cols-4`
- Main + sidebar: `grid md:grid-cols-2 lg:grid-cols-7` with `col-span-4` / `col-span-3`
- Never center-align dashboard pages — left-aligned layout

## Responsive Breakpoints

- Mobile (`< 768px`): Single column, stacked cards, chart height 200px
- Tablet (`768px–1024px`): Two columns, chart height 250px
- Desktop (`> 1024px`): Three to four columns, chart height 300px, full sidebar

## Dark Mode First

- Default theme is dark (`bg-background` = zinc-950), managed by `next-themes` with `ThemeProvider`
- **CSS cascade**: In `globals.css`, `:root` (light) MUST come before `.dark` — equal specificity means last-in-source wins

## Date Formatting

- Never use `toLocaleDateString()` or `toLocaleString()` for rendering dates — causes hydration mismatches
- Always import date helpers from `@/lib/date` — `formatDateShort`, `formatMonthYear`, `formatDateISO`
- Costa Rica timezone is explicit via `@date-fns/tz`, not a hidden global default
- Theme options: `dark`, `light`, `system` — toggled via `ThemeToggle` component
- Use semantic CSS variables (`bg-background`, `bg-card`, `text-foreground`) — they adapt automatically
- Use `dark:` prefix only when semantic variables don't cover the case (e.g., `shadow-sm dark:shadow-none`)
- Cards use `border` in dark mode, subtle `shadow` in light mode
- Never apply gradient backgrounds to dashboard pages
- Depth: Page → Card → Popover/Dialog (each slightly lighter in dark)
- Always test components in both dark and light themes

## Required States

Every data-dependent component must implement:

1. **Loading**: `Skeleton` matching the exact content shape
2. **Empty**: Icon + heading + description + CTA button, centered in container
3. **Error**: `Alert` with destructive variant, retry action

## Forbidden Patterns

- No `style={{}}` except for dynamic chart dimensions
- No `.css` or `.module.css` files — Tailwind utilities only
- No `@apply` — use utility classes directly in JSX
- No raw HTML tables — use shadcn/ui `Table`
- No `text-green-500` / `text-red-500` for financial data
- No generic purple gradients or decorative-only animations
