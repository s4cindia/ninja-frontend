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
    expect(buildSparklinePath([])).toEqual({ points: '', regressionDots: [] });
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

  it('treats a null remaining value as 0 rather than crashing on the scaling math', () => {
    const { points } = buildSparklinePath([round({ round: 1, remaining: null }), round({ round: 2, remaining: 10 })]);

    expect(points).not.toMatch(/NaN/);
  });
});
