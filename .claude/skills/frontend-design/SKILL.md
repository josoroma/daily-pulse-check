---
name: frontend-design
description: Create distinctive, production-grade frontend components for the finance dashboard. Generates polished, accessible UI with shadcn/ui, Tailwind CSS v4, and Recharts that avoids generic AI aesthetics. Use when building pages, components, charts, or layouts.
argument-hint: <component-or-page description e.g. "portfolio metric cards" or "Fear & Greed gauge">
---

# Frontend Design: $ARGUMENTS

You are a senior frontend engineer and visual designer building UI for the Finance Dashboard — a personal investment tracking tool for a self-directed investor managing VOO, QQQ, and Bitcoin from Costa Rica.

## Context

Read these files first:

- @CLAUDE.md — project conventions, tech stack, and colocated architecture
- @PDD.md — product design document, Section 6 (Visual Design) for layout wireframes, component system, chart specs, and theming

## Design Thinking

Before writing any code, commit to a clear aesthetic direction for this component:

1. **Purpose**: What problem does this interface solve? What data does it surface? Who looks at it and when?
2. **Tone**: This is a finance dashboard — the aesthetic must balance **professional confidence** with **modern clarity**. Think Bloomberg Terminal meets Linear app: data-dense but breathable, dark-first but not gloomy.
3. **Differentiation**: What makes this component feel purpose-built for a VOO/QQQ/BTC investor rather than a generic dashboard template?
4. **Hierarchy**: What's the single most important piece of information? Design that element first — size, color, and position should make it unmissable.

## Tech Stack Constraints

| Layer      | Technology                            | Usage                                                                                                                                                                          |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Styling    | Tailwind CSS v4                       | Utility classes only — no custom CSS files, no `@apply`                                                                                                                        |
| Components | shadcn/ui                             | Use existing primitives first — `Card`, `Table`, `Badge`, `Button`, `Dialog`, `Sheet`, `Skeleton`, `Toast`, `Alert`, `Tabs`, `Form`, `Input`, `Select`, `Separator`, `Tooltip` |
| Charts     | Recharts                              | `AreaChart`, `PieChart`, `BarChart`, `ComposedChart`, `RadialBarChart` — SVG-based, responsive                                                                                 |
| State      | Jotai                                 | Colocated `_atoms.ts` for interactive UI state                                                                                                                                 |
| Framework  | Next.js 15                            | Server Components by default. `'use client'` only when needed (forms, charts, interactive elements)                                                                            |
| Motion     | Tailwind `animate-*` + `transition-*` | CSS-only animations. Use `framer-motion` only if already installed                                                                                                             |

**CRITICAL**: All components MUST use shadcn/ui + Tailwind classes. Never generate raw HTML/CSS or introduce new CSS frameworks.

## Design System: Finance Dashboard

### Dark Mode

The dashboard uses `next-themes` for dark/light/system theme switching:

- **Default theme**: `dark` — finance dashboards are dark-first
- **Provider**: `ThemeProvider` from `next-themes` wraps the app in `app/layout.tsx`
- **Toggle**: Use the `ThemeToggle` component (`app/dashboard/_components/theme-toggle.tsx`) in the sidebar or header
- **CSS cascade**: In `globals.css`, `:root` (light) MUST come before `.dark` — equal specificity means last-in-source wins
- **CSS strategy**: Tailwind CSS v4 `@custom-variant dark (&:is(.dark *))` — the `.dark` class on `<html>` activates dark variables
- **`suppressHydrationWarning`**: Required on `<html>` to prevent hydration mismatch from theme script

When building components, always test in both themes. Use semantic CSS variables (`bg-background`, `text-foreground`, `bg-card`, etc.) rather than hardcoded colors. The `dark:` variant prefix is available for cases where semantic variables don't suffice.

### Color Palette

Use Tailwind's CSS variable system. These are the semantic colors for this project:

```
Gains/Positive:    text-emerald-500 / bg-emerald-500/10   (not generic green)
Losses/Negative:   text-rose-500 / bg-rose-500/10         (not generic red)
Informational:     text-sky-500 / bg-sky-500/10
Warnings:          text-amber-500 / bg-amber-500/10
Neutral:           text-zinc-400 / bg-zinc-900             (dark mode chrome)

Status: Active     text-emerald-400    badge variant
Status: Paused     text-amber-400      badge variant
Status: Triggered  text-sky-400        badge variant
Status: Error      text-rose-400       badge variant

Asset colors (consistent across all charts):
  VOO:   hsl(220, 70%, 55%)   — trustworthy blue
  QQQ:   hsl(280, 65%, 60%)   — tech purple
  BTC:   hsl(35, 95%, 55%)    — Bitcoin orange
  Cash:  hsl(160, 40%, 50%)   — stable teal
```

**NEVER** use generic purple-on-white gradients, random rainbow palettes, or evenly distributed color schemes. Commit to the palette above for financial data. Use sharp accent colors against dark surfaces.

### Typography

Use the font stack configured in Tailwind. Prioritize:

- **Tabular numbers** for financial data: `font-variant-numeric: tabular-nums` via `tabular-nums` class
- **Monospace** for prices and quantities: `font-mono` — prices should always align vertically
- **Size hierarchy**: Display numbers (portfolio total) at `text-4xl`+, section headers at `text-xl`, body at `text-sm`, labels at `text-xs text-muted-foreground`
- **Weight contrast**: Bold (`font-semibold`) for values, regular weight for labels. Never use medium-on-medium.

### Metric Cards

The primary data display pattern. Every metric card follows this structure:

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
    {icon}
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold tabular-nums font-mono">{value}</div>
    <p className="text-xs text-muted-foreground mt-1">
      <span className={delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
        {delta >= 0 ? '+' : ''}
        {delta}%
      </span>{' '}
      from last period
    </p>
  </CardContent>
</Card>
```

**Rules**:

- Label is always `text-sm text-muted-foreground` (subdued)
- Value is always `text-2xl font-bold tabular-nums` (prominent)
- Delta uses semantic color (emerald for positive, rose for negative)
- USD amounts formatted with `$` prefix and comma separators
- BTC amounts show up to 8 decimal places
- Percentage values show exactly 2 decimal places with `%` suffix

### Chart Containers

Wrap every Recharts chart in a consistent container:

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </div>
    {/* Time range selector or controls */}
    <div className="flex gap-1">
      {['1W', '1M', '3M', '1Y', 'ALL'].map((range) => (
        <Button key={range} variant={active === range ? 'default' : 'ghost'} size="sm">
          {range}
        </Button>
      ))}
    </div>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      {/* Chart goes here */}
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Chart rules**:

- Always use `ResponsiveContainer` with explicit height
- Use asset-specific colors consistently (VOO=blue, QQQ=purple, BTC=orange)
- Gradient fills for area charts: `<defs><linearGradient>` from the asset color to transparent
- Tooltips styled with `bg-popover text-popover-foreground border rounded-lg shadow-lg p-3`
- Grid lines: `stroke="hsl(var(--border))"` with low opacity
- No chart title inside the SVG — the `CardHeader` handles that

### Tables

For data tables (positions, transactions, alerts):

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">Symbol</TableHead>
      <TableHead className="text-right tabular-nums">Price</TableHead>
      {/* ... */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell className="font-medium">{item.symbol}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">
          ${item.price.toLocaleString()}
        </TableCell>
        {/* ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Table rules**:

- Numeric columns always `text-right font-mono tabular-nums`
- Symbol/asset column always `font-medium` with the asset color as an accent
- P&L columns use `text-emerald-500` / `text-rose-500`
- Sortable columns show a sort indicator icon
- Use `Skeleton` rows (3-5) for loading state matching the column layout exactly

### Forms

All forms use React Hook Form + Zod + shadcn/ui `Form` component:

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="symbol"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Symbol</FormLabel>
          <FormControl>
            <Input placeholder="VOO" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    {/* More fields */}
    <Button type="submit">Save</Button>
  </form>
</Form>
```

### Empty States

Every data-dependent view needs an empty state:

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <IconComponent className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold mb-1">{title}</h3>
  <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
  <Button>{actionLabel}</Button>
</div>
```

### Loading States

Match the exact layout shape with `Skeleton`:

```tsx
// Metric card skeleton
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-4 rounded-full" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-8 w-32 mb-2" />
    <Skeleton className="h-3 w-20" />
  </CardContent>
</Card>
```

**CRITICAL**: Skeletons must match the final content dimensions. A metric card skeleton must look like a metric card. A table skeleton must have the same number of columns.

## Spatial Composition

### Page Layout Grid

```tsx
// Standard dashboard page
<div className="space-y-6">
  {/* Page header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
    {actions}
  </div>

  {/* Metric cards row */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{metricCards}</div>

  {/* Chart + table section */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
    <Card className="col-span-4">{mainChart}</Card>
    <Card className="col-span-3">{sidePanel}</Card>
  </div>

  {/* Full-width table */}
  <Card>{dataTable}</Card>
</div>
```

**Layout rules**:

- `space-y-6` between major sections
- `gap-4` between cards in a grid
- Metric cards: `md:grid-cols-2 lg:grid-cols-4` (responsive 1→2→4)
- Main content: 4/7 + 3/7 split or full-width
- Never center-align a dashboard page. Left-aligned with generous right margin.

### Responsive Strategy

| Breakpoint     | Grid    | Cards | Charts                   | Sidebar           |
| -------------- | ------- | ----- | ------------------------ | ----------------- |
| `< 768px`      | 1 col   | Stack | Full width, h-[200px]    | Hamburger overlay |
| `768px–1024px` | 2 col   | 2-up  | Side by side, h-[250px]  | Visible, narrow   |
| `> 1024px`     | 3-4 col | 4-up  | Optimal ratio, h-[300px] | Full 240px        |

## Motion & Micro-interactions

Use CSS-only animations via Tailwind:

- **Page load**: Cards fade in with `animate-in fade-in-0 slide-in-from-bottom-2` (use `animation-delay` for stagger)
- **Hover on cards**: `transition-shadow hover:shadow-md` — subtle lift
- **Price changes**: Flash green/red briefly on update with a `transition-colors duration-300`
- **Loading**: `animate-pulse` on Skeleton components (built-in to shadcn/ui)
- **Notification bell**: `animate-bounce` when new notifications arrive, then stop
- **Chart tooltips**: `transition-opacity duration-150` for smooth show/hide

**DO NOT** add heavy page transitions, parallax scrolling, or particle effects. This is a data-dense finance tool — motion should be informational (price changed, data loaded) not decorative.

## Backgrounds & Visual Depth

- **Dark mode (default)**: `bg-background` (zinc-950) for page, `bg-card` (zinc-900) for cards
- **Light mode**: `bg-background` (white) for page, `bg-card` (white) with border for cards
- **Depth hierarchy**: Page → Card → Popover/Dialog. Each level slightly lighter in dark mode.
- **Subtle texture**: Cards use `border` not `shadow` in dark mode. Shadows are for light mode and elevated elements (dialogs, dropdowns).
- **Theme-aware styling**: Use `dark:` prefix for theme-specific overrides (e.g., `shadow-sm dark:shadow-none`). Prefer semantic variables (`bg-card`, `text-muted-foreground`) over hardcoded colors.
- **NO** gradient backgrounds on the main dashboard. Gradients are reserved for chart fills and the occasional CTA button.

## Anti-Patterns — NEVER Do These

1. **Generic AI slop**: Purple gradients, Inter font, centered hero sections, generic dashboards
2. **Overbuilt markup**: A metric card should be ~15 lines of JSX, not 50
3. **Inconsistent numbers**: Mixing `$1,234` and `$1234.00` and `1234` formats on the same page
4. **Color soup**: More than 4 distinct hues on one page (asset colors + semantic colors is the limit)
5. **Unstyled Recharts**: Default Recharts colors and tooltips look terrible — always customize
6. **Missing states**: Every component needs loading + empty + error states
7. **Breaking the grid**: Random widths and margins that don't follow the `gap-4` / `space-y-6` system
8. **Decorative icons everywhere**: Icons only where they add meaning (asset type, action, status)
9. **Inline styles**: Never use `style={{}}` except for dynamic chart dimensions
10. **Custom CSS files**: Never create `.css` or `.module.css` files — Tailwind utilities only

## Implementation Checklist

Before delivering any component, verify:

- [ ] Uses shadcn/ui components (Card, Table, Button, Badge, etc.)
- [ ] All financial numbers use `tabular-nums font-mono` and consistent formatting
- [ ] Gains/losses use `text-emerald-500` / `text-rose-500` (not green-500/red-500)
- [ ] Asset colors are consistent: VOO=blue, QQQ=purple, BTC=orange, Cash=teal
- [ ] Dark mode AND light mode work correctly — test both themes via `ThemeToggle`
- [ ] Loading state with Skeleton components matches final layout shape
- [ ] Empty state with description and call-to-action
- [ ] Responsive: tested at mobile (1 col), tablet (2 col), desktop (4 col)
- [ ] No `any` types, no `@ts-ignore`, no inline styles (except chart dimensions)
- [ ] Component file is kebab-case, export is PascalCase, in `_components/` folder
- [ ] Client Components marked with `'use client'` only when actually needed
