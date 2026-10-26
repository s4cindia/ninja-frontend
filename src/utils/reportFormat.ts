// Formatting helpers shared across the Operational Reports tabs (Group 1
// now, Groups 2-5 later -- see OPERATIONAL_REPORTS_DESIGN.md in ninja-backend).

// $0 is a legitimate cost (a run that converged with no AI calls needed) --
// kept visually distinct from '—' (no data at all).
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value !== 0 && Math.abs(value) < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

/** Format a Date as YYYY-MM-DD in local time, for <input type="date">. */
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

export interface SimpleDateRange {
  from: string;
  to: string;
}

/** { from: today - days, to: today }, inclusive, in YYYY-MM-DD. */
export function rangeLastNDays(days: number): SimpleDateRange {
  const today = new Date();
  return { from: toIsoDate(subtractDays(today, days)), to: toIsoDate(today) };
}

/** Default range matching the backend's own default (last 30 days). */
export function defaultReportRange(): SimpleDateRange {
  return rangeLastNDays(30);
}

/**
 * Clamp a range so neither endpoint is in the future and from <= to.
 * Pass `nowIso` to keep the function pure (and testable).
 */
export function clampDateRange(next: SimpleDateRange, nowIso: string): SimpleDateRange {
  const to = next.to > nowIso ? nowIso : next.to;
  const from = next.from > nowIso ? nowIso : next.from;
  return from > to ? { from, to: from } : { from, to };
}
