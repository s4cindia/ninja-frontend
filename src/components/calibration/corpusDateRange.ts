import type { DateRange } from '@/types/corpus-summary.types';

// Helpers for building and clamping DateRange values used across the corpus
// summary components. Kept separate from the component file so React Fast
// Refresh can handle the component file cleanly.

/** Format a Date as YYYY-MM-DD in local time. */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function subtractDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - days);
  return copy;
}

/** Return { from: today - days, to: today } inclusive, in YYYY-MM-DD. */
export function rangeLastNDays(days: number): DateRange {
  const today = new Date();
  return { from: toIsoDate(subtractDays(today, days)), to: toIsoDate(today) };
}

/** Default range used when ?from / ?to are absent from the URL. */
export function defaultRange(): DateRange {
  return rangeLastNDays(30);
}

/** Range from the start of the current calendar quarter through today. */
export function rangeThisQuarter(): DateRange {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStartMonth, 1);
  return { from: toIsoDate(start), to: toIsoDate(now) };
}

/**
 * Clamp a DateRange so that:
 *   - neither endpoint is in the future
 *   - `from <= to` (if not, snap `to` to `from`)
 * Pass `nowIso` (the ISO date representing "today") to keep the function pure.
 */
export function clampDateRange(next: DateRange, nowIso: string): DateRange {
  const to = next.to > nowIso ? nowIso : next.to;
  const from = next.from > nowIso ? nowIso : next.from;
  return from > to ? { from, to: from } : { from, to };
}
