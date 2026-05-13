import type { MAPSnapshot } from '../../services/metrics.service';

// Must match C1_RECENT_RUN_WINDOW in
// ninja-backend src/services/metrics/phase-gate.service.ts. Keeping this
// constant aligned with the backend ensures the Zone Detection Accuracy
// panel selects the same run that drives the C1 phase-gate criterion,
// so the gauge above and the breakdown below tell a coherent story.
export const RECENT_RUN_WINDOW = 14;

/**
 * Pick the run with the highest overallMAP among the N most-recent
 * snapshots (matching the backend's C1 logic). Returns undefined when
 * history is empty. Assumes input is ordered completedAt-asc as
 * returned by GET /ml-metrics/map-history.
 */
export function pickBestInWindow(
  history: readonly MAPSnapshot[] | undefined,
  windowSize: number = RECENT_RUN_WINDOW,
): MAPSnapshot | undefined {
  if (!history || history.length === 0) return undefined;
  const recent = history.slice(-windowSize);
  return recent.reduce((best, snap) =>
    snap.overallMAP > best.overallMAP ? snap : best,
  );
}
