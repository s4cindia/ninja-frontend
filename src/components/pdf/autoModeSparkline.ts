/**
 * Pure sparkline-scaling helper for AutoModeRoundHistory's chart view.
 * Kept in a non-component file so the react-refresh/only-export-components
 * rule (fast-refresh only works when a file exports components only) stays
 * clean — same convention as src/components/quickfix/templates/prh-cover-extract.ts.
 */

import type { AutoModeRound } from '@/hooks/useAutoMode';

/**
 * Scales each round's `remaining` count into an SVG polyline, plus marker
 * positions for rounds with regressions > 0 and for rounds whose `remaining`
 * is unavailable (null) — a missing sample is excluded from the line itself
 * (and from the min/max scale) rather than plotted at the zero baseline,
 * which would falsely read as "no issues remaining."
 */
export function buildSparklinePath(
  rounds: AutoModeRound[],
  width = 240,
  height = 60,
  padding = 8
): {
  points: string;
  regressionDots: Array<{ x: number; y: number }>;
  unavailableMarkers: Array<{ x: number }>;
} {
  if (rounds.length === 0) return { points: '', regressionDots: [], unavailableMarkers: [] };

  const knownValues = rounds.map(r => r.remaining).filter((v): v is number => v != null);
  const max = Math.max(...knownValues, 1);
  const min = Math.min(...knownValues, 0);
  const range = max - min || 1;
  const stepX = rounds.length > 1 ? (width - padding * 2) / (rounds.length - 1) : 0;
  const toX = (idx: number) => padding + idx * stepX;

  const plotted = rounds
    .map((r, idx) => ({
      x: toX(idx),
      value: r.remaining,
      regressions: r.regressions ?? 0,
    }))
    .filter((c): c is typeof c & { value: number } => c.value != null);

  return {
    points: plotted
      .map(c => `${c.x},${padding + (1 - (c.value - min) / range) * (height - padding * 2)}`)
      .join(' '),
    regressionDots: plotted
      .filter(c => c.regressions > 0)
      .map(c => ({ x: c.x, y: padding + (1 - (c.value - min) / range) * (height - padding * 2) })),
    unavailableMarkers: rounds
      .map((r, idx) => ({ x: toX(idx), remaining: r.remaining }))
      .filter(c => c.remaining == null)
      .map(({ x }) => ({ x })),
  };
}
