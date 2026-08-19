import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRemediationTimer } from '../useRemediationTimer';
import { remediationSessionService } from '@/services/remediation-session.service';

vi.mock('@/services/remediation-session.service', () => ({
  remediationSessionService: {
    startSession: vi.fn(),
    endSession: vi.fn(),
  },
}));

const mockService = vi.mocked(remediationSessionService);

describe('useRemediationTimer', () => {
  beforeEach(() => {
    mockService.startSession.mockReset();
    mockService.endSession.mockReset();
    mockService.startSession.mockResolvedValue({ sessionId: 'session-1' });
    mockService.endSession.mockResolvedValue({ sessionId: 'session-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when jobId is falsy — no session start, no listeners', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const { unmount } = renderHook(() => useRemediationTimer(undefined));

    // Give any accidental async start a chance to fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockService.startSession).not.toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalledWith('visibilitychange', expect.anything());

    unmount();
    expect(mockService.endSession).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it('starts a backend session on mount when jobId is provided', async () => {
    renderHook(() => useRemediationTimer('job-123'));

    await waitFor(() => {
      expect(mockService.startSession).toHaveBeenCalledWith('job-123');
    });
  });

  it('sends the full counter set on stop/unmount', async () => {
    const { result, unmount } = renderHook(() => useRemediationTimer('job-123'));

    await waitFor(() => {
      expect(mockService.startSession).toHaveBeenCalled();
    });

    act(() => {
      result.current.recordApplied();
      result.current.recordApplied(2);
      result.current.recordSuggestionDecision('accepted');
      result.current.recordSuggestionDecision('rejected');
      result.current.recordSuggestionDecision('rejected');
    });

    unmount();

    expect(mockService.endSession).toHaveBeenCalledTimes(1);
    const [jobId, sessionId, body] = mockService.endSession.mock.calls[0];
    expect(jobId).toBe('job-123');
    expect(sessionId).toBe('session-1');
    expect(body).toMatchObject({
      issuesApplied: 3,
      suggestionsAccepted: 1,
      suggestionsRejected: 2,
      bulkApplyUsed: false,
    });
    expect(typeof body.activeMs).toBe('number');
    expect(typeof body.idleMs).toBe('number');
  });

  it('recordBulkApply flags bulkApplyUsed and adds to issuesApplied', async () => {
    const { result, unmount } = renderHook(() => useRemediationTimer('job-123'));

    await waitFor(() => {
      expect(mockService.startSession).toHaveBeenCalled();
    });

    act(() => {
      result.current.recordApplied();
      result.current.recordBulkApply(4);
    });

    unmount();

    const [, , body] = mockService.endSession.mock.calls[0];
    expect(body).toMatchObject({
      issuesApplied: 5,
      bulkApplyUsed: true,
    });
  });

  it('stop() is idempotent — only ends the session once', async () => {
    const { result, unmount } = renderHook(() => useRemediationTimer('job-123'));

    await waitFor(() => {
      expect(mockService.startSession).toHaveBeenCalled();
    });

    act(() => {
      result.current.stop();
      result.current.stop();
    });
    unmount();

    expect(mockService.endSession).toHaveBeenCalledTimes(1);
  });
});
