/**
 * Shared formatting utilities.
 */

/**
 * Format a duration between two date strings as a human-readable string.
 * Returns null if either date is missing.
 */
export function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Escape a value for CSV export. Strips newlines, quotes double-quotes,
 * and prefixes formula-triggering characters (=, +, -, @) with a single quote
 * to prevent formula injection in Excel.
 */
export function csvSafeEscape(val: string): string {
  let safe = (val || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
  if (/^\s*[=+\-@]/.test(safe)) {
    safe = "'" + safe;
  }
  return `"${safe}"`;
}
