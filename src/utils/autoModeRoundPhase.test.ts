import { describe, it, expect } from 'vitest';
import { deriveCurrentRoundPhase } from './autoModeRoundPhase';
import type { RemediationHistoryRun } from '@/types/pdf-remediation.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';
import type { AutoModeRound } from '@/hooks/useAutoMode';

function status(overrides?: Partial<AutoModeStatusResponse>): Pick<AutoModeStatusResponse, 'autoStatus' | 'autoRoundsCompleted' | 'autoStartedAt'> {
  return {
    autoStatus: 'running',
    autoRoundsCompleted: 0,
    autoStartedAt: '2026-10-22T10:00:00.000Z',
    ...overrides,
  };
}

describe('deriveCurrentRoundPhase', () => {
  it('returns null when Auto Mode is not running', () => {
    expect(deriveCurrentRoundPhase(status({ autoStatus: 'stopped' }), [], [])).toBeNull();
    expect(deriveCurrentRoundPhase(status({ autoStatus: null }), [], [])).toBeNull();
  });

  it('round 1, no events logged yet: Analyzing issues, anchored to autoStartedAt', () => {
    const result = deriveCurrentRoundPhase(status(), [], []);
    expect(result).toEqual({ label: 'Analyzing issues', since: '2026-10-22T10:00:00.000Z' });
  });

  it('after ai_analysis completes but before apply_fixes is logged: Applying fixes, anchored to ai_analysis.completedAt', () => {
    const history: RemediationHistoryRun[] = [
      {
        cycleNumber: 1,
        events: [
          { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:00:00.000Z', completedAt: '2026-10-22T10:02:00.000Z' },
        ],
      },
    ];
    const result = deriveCurrentRoundPhase(status(), history, []);
    expect(result).toEqual({ label: 'Applying fixes', since: '2026-10-22T10:02:00.000Z' });
  });

  it('the apply_fixes event is only ever logged once it has completed, so its mere presence means Re-auditing is the phase actually running now', () => {
    const history: RemediationHistoryRun[] = [
      {
        cycleNumber: 1,
        events: [
          { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:00:00.000Z', completedAt: '2026-10-22T10:02:00.000Z' },
          { action: 'apply_fixes', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:02:00.000Z', completedAt: '2026-10-22T10:05:00.000Z', appliedCount: 5, failedCount: 0 },
        ],
      },
    ];
    const result = deriveCurrentRoundPhase(status(), history, []);
    expect(result).toEqual({ label: 'Re-auditing', since: '2026-10-22T10:05:00.000Z' });
  });

  it('a logged reaudit event means the round is essentially done (about to roll over) -- still reports Re-auditing rather than nothing', () => {
    const history: RemediationHistoryRun[] = [
      {
        cycleNumber: 1,
        events: [
          { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:00:00.000Z', completedAt: '2026-10-22T10:02:00.000Z' },
          { action: 'apply_fixes', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:02:00.000Z', completedAt: '2026-10-22T10:05:00.000Z', appliedCount: 5, failedCount: 0 },
          { action: 'reaudit', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:05:00.000Z', completedAt: '2026-10-22T10:09:00.000Z', resolvedCount: 5, remainingCount: 5, regressionCount: 0, resolutionRate: 50 },
        ],
      },
    ];
    const result = deriveCurrentRoundPhase(status(), history, []);
    expect(result).toEqual({ label: 'Re-auditing', since: '2026-10-22T10:05:00.000Z' });
  });

  it('round 2+: anchors round start to the previous completed round, not autoStartedAt', () => {
    const completedRounds: AutoModeRound[] = [
      {
        round: 1, applied: 5, failed: 0, resolved: 5, remaining: 10, regressions: 0, resolutionRate: 33,
        completedAt: '2026-10-22T10:10:00.000Z', startedAt: '2026-10-22T10:00:00.000Z', durationMs: 600000,
      },
    ];
    const result = deriveCurrentRoundPhase(status({ autoRoundsCompleted: 1 }), [], completedRounds);
    expect(result).toEqual({ label: 'Analyzing issues', since: '2026-10-22T10:10:00.000Z' });
  });

  it('only looks at the latest auto_loop cycle, ignoring earlier completed rounds and non-auto_loop events in the same history', () => {
    const history: RemediationHistoryRun[] = [
      {
        cycleNumber: 1,
        events: [
          { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T09:00:00.000Z', completedAt: '2026-10-22T09:02:00.000Z' },
          { action: 'apply_fixes', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T09:02:00.000Z', completedAt: '2026-10-22T09:05:00.000Z', appliedCount: 5, failedCount: 0 },
          { action: 'reaudit', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T09:05:00.000Z', completedAt: '2026-10-22T09:10:00.000Z', resolvedCount: 5, remainingCount: 10, regressionCount: 0, resolutionRate: 33 },
        ],
      },
      {
        cycleNumber: 2,
        events: [
          { action: 'ai_analysis', source: 'auto_loop', status: 'completed', startedAt: '2026-10-22T10:10:00.000Z', completedAt: '2026-10-22T10:12:00.000Z' },
        ],
      },
    ];
    const completedRounds: AutoModeRound[] = [
      {
        round: 1, applied: 5, failed: 0, resolved: 5, remaining: 10, regressions: 0, resolutionRate: 33,
        completedAt: '2026-10-22T09:10:00.000Z', startedAt: '2026-10-22T09:02:00.000Z', durationMs: 480000,
      },
    ];
    const result = deriveCurrentRoundPhase(status({ autoRoundsCompleted: 1 }), history, completedRounds);
    expect(result).toEqual({ label: 'Applying fixes', since: '2026-10-22T10:12:00.000Z' });
  });
});
