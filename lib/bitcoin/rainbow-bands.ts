// --- Rainbow Price Band Constants ---
// Extracted to a separate file so client components can import
// without pulling in server-only dependencies (next/headers via cache.ts).

export const RAINBOW_BANDS = [
  { label: 'Maximum Bubble', color: 'hsl(0, 80%, 50%)' },
  { label: 'Sell', color: 'hsl(15, 85%, 55%)' },
  { label: 'FOMO', color: 'hsl(30, 90%, 55%)' },
  { label: 'Is this a bubble?', color: 'hsl(45, 90%, 55%)' },
  { label: 'Hold', color: 'hsl(60, 80%, 50%)' },
  { label: 'Still Cheap', color: 'hsl(120, 60%, 45%)' },
  { label: 'Accumulate', color: 'hsl(180, 60%, 45%)' },
  { label: 'Buy', color: 'hsl(210, 70%, 50%)' },
  { label: 'Fire Sale', color: 'hsl(240, 60%, 55%)' },
] as const
