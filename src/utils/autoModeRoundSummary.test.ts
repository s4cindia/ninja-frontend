import { describe, it, expect } from 'vitest';
import { summarizeRound } from './autoModeRoundSummary';
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

describe('summarizeRound', () => {
  it('states applied/resolved/regressions and the net effect for a normal round', () => {
    const previous = round({ round: 3, remaining: 750 });
    const current = round({ round: 4, applied: 370, resolved: 28, regressions: 48, remaining: 758 });

    const summary = summarizeRound(current, previous);

    expect(summary).toContain('370 fixes applied this round');
    expect(summary).toContain('the re-audit confirmed 28 are now resolved');
    expect(summary).toContain('48 previously-fixed issues reappeared');
    expect(summary).toContain('Net effect: 8 more open issues than last round, despite the fixes applied.');
  });

  it('reports fewer open issues when remaining actually decreased', () => {
    const previous = round({ round: 4, remaining: 758 });
    const current = round({ round: 5, applied: 403, resolved: 50, regressions: 20, remaining: 756 });

    const summary = summarizeRound(current, previous);

    expect(summary).toContain('Net effect: 2 fewer open issues than last round.');
  });

  it('reports no change when remaining is identical to the previous round', () => {
    const previous = round({ round: 1, remaining: 100 });
    const current = round({ round: 2, applied: 10, resolved: 5, regressions: 5, remaining: 100 });

    expect(summarizeRound(current, previous)).toContain('Net effect: open issue count unchanged.');
  });

  it('omits the net-effect sentence when there is no previous round (first round)', () => {
    const current = round({ round: 1, applied: 50, resolved: 10, regressions: 2, remaining: 40 });

    const summary = summarizeRound(current, null);

    expect(summary).not.toContain('Net effect');
    expect(summary).toContain('50 fixes applied this round');
  });

  it('uses positive, singular-aware phrasing when a count is zero or exactly one', () => {
    const summary = summarizeRound(
      round({ round: 1, applied: 0, resolved: 0, regressions: 1, remaining: 10 }),
      null
    );

    expect(summary).toContain('No fixes were applied this round');
    expect(summary).toContain('the re-audit confirmed none are resolved yet');
    expect(summary).toContain('1 previously-fixed issue reappeared');
  });

  it('treats null applied/resolved/regressions as zero rather than rendering "null"', () => {
    const summary = summarizeRound(round({ round: 1 }), null);

    expect(summary).not.toContain('null');
    expect(summary).toContain('No fixes were applied this round');
    expect(summary).toContain('no previously-fixed issues reappeared');
  });

  it('omits the net-effect sentence when remaining is unavailable on either round', () => {
    const previous = round({ round: 1, remaining: null });
    const current = round({ round: 2, applied: 5, resolved: 2, regressions: 0, remaining: 30 });

    expect(summarizeRound(current, previous)).not.toContain('Net effect');
  });
});
