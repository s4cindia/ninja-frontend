import { describe, it, expect } from 'vitest';
import { buildSparklinePath } from './autoModeSparkline';
import type { AutoModeRound } from '@/hooks/useAutoMode';

function round(overrides: Partial<AutoModeRound> & { round: number }): AutoModeRound {
  return {
    applied: null,
    failed: null,
    resolved: null,
    remaining: null,
    regressions: null,
    resolutionRate: null,
    completedAt: null,
    ...overrides,
  };
}

describe('buildSparklinePath', () => {
  it('returns empty output for zero rounds', () => {
    expect(buildSparklinePath([])).toEqual({ points: '', regressionDots: [], unavailableMarkers: [] });
  });

  it('produces one coordinate pair per round', () => {
    const rounds = [
      round({ round: 1, remaining: 40 }),
      round({ round: 2, remaining: 20 }),
      round({ round: 3, remaining: 10 }),
    ];

    const { points } = buildSparklinePath(rounds);

    expect(points.trim().split(/\s+/)).toHaveLength(3);
  });

  it('a single round does not divide by zero / produce NaN coordinates', () => {
    const { points } = buildSparklinePath([round({ round: 1, remaining: 10 })]);

    expect(points).not.toMatch(/NaN/);
  });

  it('marks regression dots only for rounds with regressions > 0, at that round\'s own coordinate', () => {
    const rounds = [
      round({ round: 1, remaining: 40, regressions: 0 }),
      round({ round: 2, remaining: 20, regressions: 5 }),
    ];

    const { regressionDots } = buildSparklinePath(rounds);

    expect(regressionDots).toHaveLength(1);
  });

  it('does not crash on the scaling math when a remaining value is null', () => {
    const { points } = buildSparklinePath([round({ round: 1, remaining: null }), round({ round: 2, remaining: 10 })]);

    expect(points).not.toMatch(/NaN/);
  });

  it('regression: does NOT plot an unavailable (null) remaining count at the zero baseline — excludes it from the line and the min/max scale instead', () => {
    const rounds = [
      round({ round: 1, remaining: 40 }),
      round({ round: 2, remaining: null }),
      round({ round: 3, remaining: 35 }),
    ];

    const { points, unavailableMarkers } = buildSparklinePath(rounds, 240, 60, 8);

    // Only the 2 known-value rounds are plotted on the line.
    expect(points.trim().split(/\s+/)).toHaveLength(2);
    // The null round is marked as unavailable, not silently dropped without a trace.
    expect(unavailableMarkers).toHaveLength(1);
    // If null had been treated as 0, it would have pulled min down to 0 and
    // pushed round 1/3's points toward the top of the range; with it
    // properly excluded, the scale is based only on 40 and 35.
    const [round1Y, round3Y] = points.trim().split(/\s+/).map(p => Number(p.split(',')[1]));
    expect(round1Y).not.toBe(round3Y);
  });

  it('regression: an unavailable marker sits at the missing round\'s own x position, not merged into an adjacent round', () => {
    const rounds = [
      round({ round: 1, remaining: 40 }),
      round({ round: 2, remaining: null }),
    ];

    const { unavailableMarkers } = buildSparklinePath(rounds, 240, 60, 8);

    // Round 2 is the last of 2 rounds, so its x should be at the right edge (width - padding).
    expect(unavailableMarkers[0].x).toBe(240 - 8);
  });
});
