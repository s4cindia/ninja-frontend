export interface UploadProgressStats {
  loaded: number;
  total: number;
  remaining: number;
  percentage: number;
  elapsedMs: number;
  /** null until at least some bytes have transferred — rate is undefined at 0 loaded. */
  etaMs: number | null;
}

/**
 * Derives remaining-bytes and ETA from a raw loaded/total byte pair and how
 * long the upload has been running, assuming a constant transfer rate.
 */
export function computeUploadProgressStats(loaded: number, total: number, elapsedMs: number): UploadProgressStats {
  const safeTotal = Math.max(total, 0);
  const safeLoaded = Math.min(Math.max(loaded, 0), safeTotal > 0 ? safeTotal : loaded);
  const remaining = Math.max(safeTotal - safeLoaded, 0);
  const percentage = safeTotal > 0 ? Math.round((safeLoaded / safeTotal) * 100) : 0;
  const safeElapsedMs = Math.max(elapsedMs, 0);
  const etaMs = safeLoaded > 0 && safeElapsedMs > 0 ? (remaining * safeElapsedMs) / safeLoaded : null;

  return { loaded: safeLoaded, total: safeTotal, remaining, percentage, elapsedMs: safeElapsedMs, etaMs };
}

/** Formats a byte count as "B" / "KB" / "MB", one decimal place above 1KB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
