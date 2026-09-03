import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAutoModeRoundHistory } from '../useAutoMode';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { RemediationHistoryRun, RemediationHistoryEvent } from '@/types/pdf-remediation.types';

vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { getRemediationHistory: vi.fn() },
}));

const mockService = vi.mocked(pdfRemediationService);

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

describe('useAutoModeRoundHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pairs each cycle\'s apply_fixes + reaudit auto_loop events into one AutoModeRound', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [
        event({ action: 'apply_fixes', source: 'auto_loop', appliedCount: 12, failedCount: 1 }),
        event({ action: 'reaudit', source: 'auto_loop', resolvedCount: 10, remainingCount: 40, regressionCount: 0, resolutionRate: 20 }),
      ]),
    ]);

    const { result } = renderHook(() => useAutoModeRoundHistory('job-1', { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

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
      },
    ]);
  });

  it('numbers rounds by position among auto_loop rounds, not by the raw cycleNumber (which can have gaps from non-auto-mode actions sharing the same counter)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      // cycleNumber 1 is a manual apply_single with no reaudit at all — excluded entirely.
      run(1, [event({ action: 'apply_fixes', source: 'apply_single', appliedCount: 3 })]),
      run(4, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 50 })]),
      run(7, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 30 })]),
    ]);

    const { result } = renderHook(() => useAutoModeRoundHistory('job-1', { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map(r => r.round)).toEqual([1, 2]);
    expect(result.current.data?.map(r => r.remaining)).toEqual([50, 30]);
  });

  it('skips a cycle with no auto_loop reaudit event (e.g. a manual re-audit that happened to run between auto-mode rounds)', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40 })]),
      run(2, [event({ action: 'reaudit', source: 'reaudit_current_file', remainingCount: 39 })]),
      run(3, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 20 })]),
    ]);

    const { result } = renderHook(() => useAutoModeRoundHistory('job-1', { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.map(r => r.remaining)).toEqual([40, 20]);
  });

  it('sorts rounds ascending by cycleNumber regardless of the order the backend returns them in', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(5, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 10 })]),
      run(2, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 30 })]),
    ]);

    const { result } = renderHook(() => useAutoModeRoundHistory('job-1', { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map(r => r.remaining)).toEqual([30, 10]);
  });

  it('treats a missing apply_fixes event (round with nothing to apply) as null applied/failed, not a dropped round', async () => {
    mockService.getRemediationHistory.mockResolvedValue([
      run(1, [event({ action: 'reaudit', source: 'auto_loop', remainingCount: 40 })]),
    ]);

    const { result } = renderHook(() => useAutoModeRoundHistory('job-1', { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({ round: 1, applied: null, failed: null, remaining: 40 }),
    ]);
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useAutoModeRoundHistory('job-1', { enabled: false, isRunning: false }), {
      wrapper: createWrapper(),
    });

    expect(mockService.getRemediationHistory).not.toHaveBeenCalled();
  });

  it('does not fetch when jobId is undefined, even if enabled is true', () => {
    renderHook(() => useAutoModeRoundHistory(undefined, { enabled: true, isRunning: false }), {
      wrapper: createWrapper(),
    });

    expect(mockService.getRemediationHistory).not.toHaveBeenCalled();
  });
});
