import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAutoModeRoundHistory, useStartAutoMode, useBudgetEstimate, useRemediationHistory, useJobSettings, useUpdateJobSettings, useAutoModeStatus } from '../useAutoMode';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';
import type { RemediationHistoryRun, RemediationHistoryEvent } from '@/types/pdf-remediation.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { getRemediationHistory: vi.fn() },
}));

vi.mock('@/services/pdfAutoMode.service', () => ({
  pdfAutoModeService: {
    startAutoMode: vi.fn(),
    getAutoModeStatus: vi.fn(),
    stopAutoMode: vi.fn(),
    getBudgetEstimate: vi.fn(),
    getJobSettings: vi.fn(),
    updateJobSettings: vi.fn(),
  },
}));

const mockService = vi.mocked(pdfRemediationService);
const mockAutoModeService = vi.mocked(pdfAutoModeService);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function event(overrides: Partial<RemediationHistoryEvent> & Pick<RemediationHistoryEvent, 'action' | 'source'>): RemediationHistoryEvent {
  return {
    status: 'completed',
    appliedCount: null,
    failedCount: null,
    resolvedCount: null,
    remainingCount: null,
    regressionCount: null,
    resolutionRate: null,
    errorMessage: null,
    triggeredBy: null,
    startedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:05:00.000Z',
    ...overrides,
  };
}

function run(cycleNumber: number, events: RemediationHistoryEvent[]): RemediationHistoryRun {
  return { cycleNumber, events };
}

// jobId has no default — a JS default parameter also triggers on an
// explicitly-passed `undefined`, which would silently swallow the
// "jobId is undefined" test case below back into a hardcoded default.
function renderRoundHistory(opts: { enabled: boolean; isRunning: boolean; completedRounds: number }, jobId: string | undefined) {
  return renderHook(() => useAutoModeRoundHistory(jobId, opts), { wrapper: createWrapper() });
}

describe('useAutoModeRoundHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pairs each cycle\'s apply_fixes + reaudit auto_loop events into one AutoModeRound, with startedAt/durationMs from apply_fixes.startedAt through reaudit.completedAt', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [
        event({ action: 'apply_fixes', source: 'auto_loop', appliedCount: 12, failedCount: 1 }),
        event({ action: 'reaudit', source: 'auto_loop', resolvedCount: 10, remainingCount: 40, regressionCount: 0, resolutionRate: 20 }),
      ]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 1 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        round: 1,
        applied: 12,
        failed: 1,
        resolved: 10,
        remaining: 40,
        regressions: 0,
        resolutionRate: 20,
        completedAt: '2026-09-01T10:05:00.000Z',
        startedAt: '2026-09-01T10:00:00.000Z',
        durationMs: 5 * 60 * 1000,
      },
    ]);
  });

  it('falls back to the reaudit\'s own startedAt for round duration when no apply_fixes event was logged', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40, startedAt: '2026-09-01T10:03:00.000Z', completedAt: '2026-09-01T10:05:00.000Z' }),
      ]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 1 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]).toEqual(
      expect.objectContaining({ startedAt: '2026-09-01T10:03:00.000Z', durationMs: 2 * 60 * 1000 }),
    );
  });

  it('numbers rounds by position among auto_loop rounds, not by the raw cycleNumber (which can have gaps from non-auto-mode actions sharing the same counter)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      // cycleNumber 1 is a manual apply_single with no reaudit at all — excluded entirely.
      run(1, [event({ action: 'apply_fixes', source: 'apply_single', appliedCount: 3 })]),
      run(4, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 50, startedAt: '2026-09-01T10:00:00.000Z', completedAt: '2026-09-01T10:01:00.000Z' })]),
      run(7, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 30, startedAt: '2026-09-01T11:00:00.000Z', completedAt: '2026-09-01T11:01:00.000Z' })]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 2 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map(r => r.round)).toEqual([1, 2]);
    expect(result.current.data?.map(r => r.remaining)).toEqual([50, 30]);
  });

  it('skips a cycle with no auto_loop reaudit event (e.g. a manual re-audit that happened to run between auto-mode rounds)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40, startedAt: '2026-09-01T10:00:00.000Z', completedAt: '2026-09-01T10:01:00.000Z' })]),
      run(2, [event({ action: 'reaudit', source: 'reaudit_current_file', remainingCount: 39, startedAt: '2026-09-01T10:30:00.000Z', completedAt: '2026-09-01T10:31:00.000Z' })]),
      run(3, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 20, startedAt: '2026-09-01T11:00:00.000Z', completedAt: '2026-09-01T11:01:00.000Z' })]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 2 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.map(r => r.remaining)).toEqual([40, 20]);
  });

  it('sorts rounds chronologically by startedAt, not by the raw cycleNumber -- cycleNumber no longer reliably orders auto_loop rounds (see useAutoModeRoundHistory\'s own doc comment)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(5, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 10, startedAt: '2026-09-01T11:00:00.000Z', completedAt: '2026-09-01T11:01:00.000Z' })]),
      run(2, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 30, startedAt: '2026-09-01T10:00:00.000Z', completedAt: '2026-09-01T10:01:00.000Z' })]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 2 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map(r => r.remaining)).toEqual([30, 10]);
  });

  it('treats a missing apply_fixes event (round with nothing to apply) as null applied/failed, not a dropped round', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40 })]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 1 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({ round: 1, applied: null, failed: null, remaining: 40 }),
    ]);
  });

  it('regression: excludes a FAILED auto_loop reaudit from the round list, instead of showing a phantom dashes-only round', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', status: 'completed', remainingCount: 40 })]),
      run(2, [event({ action: 'reaudit', source: 'auto_loop', status: 'failed', remainingCount: null })]),
    ]);

    // Only 1 round actually completed successfully — matches autoRoundsCompleted.
    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 1 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].remaining).toBe(40);
  });

  it('regression: scopes history to the current Auto Mode run — an earlier run\'s rounds (still returned by the job-wide history endpoint) are trimmed off', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      // A prior Auto Mode run: 3 rounds, already finished. All 3 share ONE
      // cycleNumber -- the remediation-cycle lock is held for a run's
      // whole duration, not re-acquired per round (see useAutoModeRoundHistory's
      // own doc comment), so a real prior run looks like this, not 3 separate cycles.
      run(1, [
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 100, startedAt: '2026-09-01T09:00:00.000Z', completedAt: '2026-09-01T09:01:00.000Z' }),
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 80, startedAt: '2026-09-01T09:10:00.000Z', completedAt: '2026-09-01T09:11:00.000Z' }),
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 60, startedAt: '2026-09-01T09:20:00.000Z', completedAt: '2026-09-01T09:21:00.000Z' }),
      ]),
      // The operator started a second run (a fresh lock acquisition -- a
      // new cycleNumber) — 2 rounds so far.
      run(2, [
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 50, startedAt: '2026-09-01T10:00:00.000Z', completedAt: '2026-09-01T10:01:00.000Z' }),
        event({ action: 'reaudit', source: 'auto_loop', remainingCount: 45, startedAt: '2026-09-01T10:10:00.000Z', completedAt: '2026-09-01T10:11:00.000Z' }),
      ]),
    ]);

    // autoRoundsCompleted for the CURRENT run is 2, not 5.
    const { result } = renderRoundHistory({ enabled: true, isRunning: true, completedRounds: 2 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.map(r => r.round)).toEqual([1, 2]);
    expect(result.current.data?.map(r => r.remaining)).toEqual([50, 45]);
  });

  it('regression: real production data (Math_Olszewski_PDF.pdf, job 89re3fmGEiaXxRUXc5Mu9) -- 2 completed rounds sharing ONE cycleNumber must produce 2 rows, not 1', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      {
        cycleNumber: 1,
        events: [
          event({ action: 'ai_analysis', source: 'auto_loop', startedAt: '2026-10-21T19:48:42.469Z', completedAt: '2026-10-21T20:24:26.245Z' }),
          event({ action: 'apply_fixes', source: 'auto_loop', startedAt: '2026-10-21T20:24:26.305Z', completedAt: '2026-10-21T20:26:45.605Z', appliedCount: 954, failedCount: 77 }),
          event({ action: 'reaudit', source: 'auto_loop', startedAt: '2026-10-21T20:26:45.608Z', completedAt: '2026-10-21T20:35:31.758Z', resolvedCount: 1323, remainingCount: 489, regressionCount: 456, resolutionRate: 73.01 }),
          event({ action: 'ai_analysis', source: 'auto_loop', startedAt: '2026-10-21T20:35:31.796Z', completedAt: '2026-10-21T20:57:23.324Z' }),
          event({ action: 'apply_fixes', source: 'auto_loop', startedAt: '2026-10-21T20:57:23.356Z', completedAt: '2026-10-21T20:57:39.980Z', appliedCount: 466, failedCount: 83 }),
          event({ action: 'reaudit', source: 'auto_loop', startedAt: '2026-10-21T20:57:39.986Z', completedAt: '2026-10-21T21:06:33.818Z', resolvedCount: 107, remainingCount: 838, regressionCount: 28, resolutionRate: 11.32 }),
        ],
      },
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 2 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual([
      expect.objectContaining({ round: 1, applied: 954, failed: 77, resolved: 1323, remaining: 489, regressions: 456 }),
      expect.objectContaining({ round: 2, applied: 466, failed: 83, resolved: 107, remaining: 838, regressions: 28 }),
    ]);
  });

  it('regression: a completedRounds of 0 returns no rounds, not the entire history (array.slice(-0) is a JS footgun that returns everything)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40 })]),
    ]);

    const { result } = renderRoundHistory({ enabled: true, isRunning: true, completedRounds: 0 }, 'job-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when disabled', () => {
    renderRoundHistory({ enabled: false, isRunning: false, completedRounds: 0 }, 'job-1');

    expect(mockService.getRemediationHistory).not.toHaveBeenCalled();
  });

  it('does not fetch when jobId is undefined, even if enabled is true', () => {
    renderRoundHistory({ enabled: true, isRunning: false, completedRounds: 0 }, undefined);

    expect(mockService.getRemediationHistory).not.toHaveBeenCalled();
  });
});

describe('useStartAutoMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the service with no overrides when mutate is called with none (the trial-preconfigured-auto path)', async () => {
    mockAutoModeService.startAutoMode.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStartAutoMode('job-1'), { wrapper: createWrapper() });

    act(() => { result.current.mutate(undefined); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.startAutoMode).toHaveBeenCalledWith('job-1', undefined);
  });

  it('passes overrides through to the service unchanged (the regular-job path)', async () => {
    mockAutoModeService.startAutoMode.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStartAutoMode('job-1'), { wrapper: createWrapper() });

    const overrides = { autoMaxRounds: 5, autoCostLimitUsd: 1.5, autoColorContrastMode: 'disabled' as const };
    act(() => { result.current.mutate(overrides); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.startAutoMode).toHaveBeenCalledWith('job-1', overrides);
  });
});

describe('useBudgetEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled without a jobId', () => {
    const { result } = renderHook(() => useBudgetEstimate(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockAutoModeService.getBudgetEstimate).not.toHaveBeenCalled();
  });

  it('fetches the job-specific estimate once enabled', async () => {
    const estimate = { estimatedCostUsd: 5.0, confidence: 'high' as const, sampleSize: 25, basedOnIssueCount: 1812 };
    mockAutoModeService.getBudgetEstimate.mockResolvedValue(estimate);
    const { result } = renderHook(() => useBudgetEstimate('job-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.getBudgetEstimate).toHaveBeenCalledWith('job-1');
    expect(result.current.data).toEqual(estimate);
  });

  it('regression (CodeRabbit): stays disabled when opts.enabled is false, even with a jobId -- the caller gates this on the audit being complete, since this query has no refetchInterval to pick up a later completion on its own', () => {
    const { result } = renderHook(() => useBudgetEstimate('job-1', { enabled: false }), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockAutoModeService.getBudgetEstimate).not.toHaveBeenCalled();
  });

  it('fetches once opts.enabled flips true (the audit completing after this hook was already mounted)', async () => {
    const estimate = { estimatedCostUsd: 3.0, confidence: 'medium' as const, sampleSize: 6, basedOnIssueCount: 400 };
    mockAutoModeService.getBudgetEstimate.mockResolvedValue(estimate);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useBudgetEstimate('job-1', { enabled }),
      { wrapper: createWrapper(), initialProps: { enabled: false } }
    );
    expect(mockAutoModeService.getBudgetEstimate).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.getBudgetEstimate).toHaveBeenCalledWith('job-1');
  });
});

function statusResponse(overrides: Partial<AutoModeStatusResponse> = {}): AutoModeStatusResponse {
  return {
    mode: 'manual' as const,
    autoStatus: null,
    autoStopReason: null,
    autoRoundsCompleted: 0,
    autoMaxRounds: 10,
    autoCostSpentUsd: 0,
    autoCostLimitUsd: 2,
    autoColorContrastMode: 'guidance-only' as const,
    autoAltTextMode: null,
    ...overrides,
  };
}

describe('useAutoModeStatus polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not poll while autoStatus is null and pendingFullAutoMode is unset -- the ordinary manual-flow case, unaffected by the Full Auto Mode fix', async () => {
    vi.useFakeTimers();
    try {
      mockAutoModeService.getAutoModeStatus.mockResolvedValue(statusResponse());

      renderHook(() => useAutoModeStatus('job-1'), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still polls every 5s while autoStatus is \'running\' -- pre-existing behavior, unaffected by the pendingFullAutoMode addition', async () => {
    vi.useFakeTimers();
    try {
      mockAutoModeService.getAutoModeStatus.mockResolvedValue(
        statusResponse({ mode: 'auto', autoStatus: 'running', autoRoundsCompleted: 1, autoCostSpentUsd: 0.1 })
      );

      renderHook(() => useAutoModeStatus('job-1'), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('regression (ninja-backend#825): keeps polling every 5s while pendingFullAutoMode is true even though autoStatus is still null -- without this, a server-side Full Auto Mode trigger that fires after this hook\'s first fetch is never observed, and the page stays frozen on an idle button', async () => {
    vi.useFakeTimers();
    try {
      mockAutoModeService.getAutoModeStatus.mockResolvedValue(statusResponse({ pendingFullAutoMode: true }));

      renderHook(() => useAutoModeStatus('job-1'), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(2);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('regression: stops polling once a terminal state arrives with pendingFullAutoMode cleared -- a job whose trigger never fires (e.g. the tenant default flips off mid-wait) must not poll forever', async () => {
    vi.useFakeTimers();
    try {
      mockAutoModeService.getAutoModeStatus
        .mockResolvedValueOnce(statusResponse({ pendingFullAutoMode: true }))
        .mockResolvedValue(statusResponse());

      renderHook(() => useAutoModeStatus('job-1'), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(2);

      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mockAutoModeService.getAutoModeStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useJobSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function settings(overrides: { fullAutoMode?: Partial<{ override: boolean | null; tenantDefault: boolean; effective: boolean }>; autoEscalateOnStall?: Partial<{ override: boolean | null; tenantDefault: boolean; effective: boolean }> } = {}) {
    return {
      fullAutoMode: { override: null, tenantDefault: false, effective: false, ...overrides.fullAutoMode },
      autoEscalateOnStall: { override: null, tenantDefault: false, effective: false, ...overrides.autoEscalateOnStall },
    };
  }

  it('is disabled without a jobId', () => {
    const { result } = renderHook(() => useJobSettings(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockAutoModeService.getJobSettings).not.toHaveBeenCalled();
  });

  it('is disabled when opts.enabled is false, even with a jobId -- lets JobSettingsMenu defer the fetch until its popover actually opens', () => {
    const { result } = renderHook(() => useJobSettings('job-1', { enabled: false }), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockAutoModeService.getJobSettings).not.toHaveBeenCalled();
  });

  it('fetches once enabled and returns both overrides', async () => {
    mockAutoModeService.getJobSettings.mockResolvedValue(settings({ fullAutoMode: { override: true, effective: true } }));
    const { result } = renderHook(() => useJobSettings('job-1', { enabled: true }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.getJobSettings).toHaveBeenCalledWith('job-1');
    expect(result.current.data?.fullAutoMode).toEqual({ override: true, tenantDefault: false, effective: true });
  });

  it('fetches once opts.enabled flips true (the popover opening after this hook was already mounted)', async () => {
    mockAutoModeService.getJobSettings.mockResolvedValue(settings());
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useJobSettings('job-1', { enabled }),
      { wrapper: createWrapper(), initialProps: { enabled: false } }
    );
    expect(mockAutoModeService.getJobSettings).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.getJobSettings).toHaveBeenCalledWith('job-1');
  });
});

describe('useUpdateJobSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the service with the given partial update', async () => {
    const updated = {
      fullAutoMode: { override: true, tenantDefault: false, effective: true },
      autoEscalateOnStall: { override: null, tenantDefault: false, effective: false },
    };
    mockAutoModeService.updateJobSettings.mockResolvedValue(updated);
    const { result } = renderHook(() => useUpdateJobSettings('job-1'), { wrapper: createWrapper() });

    act(() => { result.current.mutate({ fullAutoMode: true }); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAutoModeService.updateJobSettings).toHaveBeenCalledWith('job-1', { fullAutoMode: true });
  });

  it('seeds useJobSettings\' own cache with the mutation result, so the menu reflects the change without a second fetch', async () => {
    const initial = {
      fullAutoMode: { override: null, tenantDefault: false, effective: false },
      autoEscalateOnStall: { override: null, tenantDefault: false, effective: false },
    };
    const updated = {
      fullAutoMode: { override: null, tenantDefault: false, effective: false },
      autoEscalateOnStall: { override: true, tenantDefault: false, effective: true },
    };
    mockAutoModeService.getJobSettings.mockResolvedValue(initial);
    mockAutoModeService.updateJobSettings.mockResolvedValue(updated);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const settingsHook = renderHook(() => useJobSettings('job-1'), { wrapper });
    await waitFor(() => expect(settingsHook.result.current.isSuccess).toBe(true));

    const updateHook = renderHook(() => useUpdateJobSettings('job-1'), { wrapper });
    act(() => { updateHook.result.current.mutate({ autoEscalateOnStall: true }); });
    await waitFor(() => expect(updateHook.result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['pdf-job-settings', 'job-1'])).toEqual(updated);
  });
});

describe('useRemediationHistory polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getRemediationHistory.mockResolvedValue([]);
  });

  it('polls every 5s when isRunning is true -- real staleness bug fix: without this, a round\'s own completed ai_analysis event could sit unfetched for the whole rest of that round', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useRemediationHistory('job-1', { isRunning: true }), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(2);

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not poll when isRunning is false or omitted -- a manual refetch() after a known state change is enough then', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useRemediationHistory('job-1'), { wrapper: createWrapper() });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
