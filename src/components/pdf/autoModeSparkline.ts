/**
 * Pure sparkline-scaling helper for AutoModeRoundHistory's chart view.
 * Kept in a non-component file so the react-refresh/only-export-components
 * rule (fast-refresh only works when a file exports components only) stays
 * clean — same convention as src/components/quickfix/templates/prh-cover-extract.ts.
 */

import type { AutoModeRound } from '@/hooks/useAutoMode';

/**
 * Scales each round's `remaining` count into an SVG polyline, plus marker
 * positions for rounds with regressions > 0.
 */
export function buildSparklinePath(
  rounds: AutoModeRound[],
  width = 240,
  height = 60,
  padding = 8
): { points: string; regressionDots: Array<{ x: number; y: number }> } {
  if (rounds.length === 0) return { points: '', regressionDots: [] };

  const values = rounds.map(r => r.remaining ?? 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = rounds.length > 1 ? (width - padding * 2) / (rounds.length - 1) : 0;

  const coords = rounds.map((r, idx) => {
    const value = r.remaining ?? 0;
    return {
      x: padding + idx * stepX,
      y: padding + (1 - (value - min) / range) * (height - padding * 2),
      regressions: r.regressions ?? 0,
    };
  });

  return {
    points: coords.map(c => `${c.x},${c.y}`).join(' '),
    regressionDots: coords.filter(c => c.regressions > 0).map(({ x, y }) => ({ x, y })),
  };
}
