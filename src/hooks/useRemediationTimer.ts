import { useEffect, useRef, useCallback, useState } from 'react';
import { remediationSessionService } from '@/services/remediation-session.service';

interface SessionSegment {
  openedAt: string;
  closedAt: string;
  activeMs: number;
  idleMs: number;
}

interface TimerState {
  activeMs: number;
  idleMs: number;
  sessionLog: SessionSegment[];
  stopped: boolean;
  issuesApplied: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  bulkApplyUsed: boolean;
}

const IDLE_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Tracks remediation session time for the Comparison Study workflow — mirrors
 * useAnnotationTimer's pattern (activity listeners, tab-visibility pausing,
 * segment-based ms accumulation) against a remediation session instead of an
 * annotation run.
 *
 * On mount: starts a backend session via POST .../remediation-session/start.
 * On unmount/stop: ends the session via POST .../remediation-session/:id/end.
 * Idle detection: pauses after 2 minutes of no activity.
 * Visibility tracking: pauses when tab is hidden.
 *
 * Pass a falsy jobId to no-op entirely — used to keep the idle-listener and
 * session overhead off every regular remediation visit, only paying for it
 * when the operator arrived via a Comparison Study trial.
 */
export function useRemediationTimer(jobId: string | undefined) {
  const stateRef = useRef<TimerState>({
    activeMs: 0,
    idleMs: 0,
    sessionLog: [],
    stopped: false,
    issuesApplied: 0,
    suggestionsAccepted: 0,
    suggestionsRejected: 0,
    bulkApplyUsed: false,
  });

  const sessionIdRef = useRef<string | null>(null);
  const segmentStartRef = useRef<number | null>(null);
  const segmentOpenedAtRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);

  const startSegment = useCallback(() => {
    if (segmentStartRef.current !== null) return;
    segmentStartRef.current = Date.now();
    segmentOpenedAtRef.current = new Date().toISOString();
  }, []);

  const closeSegment = useCallback(() => {
    if (segmentStartRef.current === null) return;
    const now = Date.now();
    const segActiveMs = now - segmentStartRef.current;
    const openedAt = segmentOpenedAtRef.current!;
    const closedAt = new Date().toISOString();
    const segIdleMs = new Date(closedAt).getTime() - new Date(openedAt).getTime() - segActiveMs;

    stateRef.current.activeMs += segActiveMs;
    stateRef.current.idleMs += Math.max(0, segIdleMs);
    stateRef.current.sessionLog.push({
      openedAt,
      closedAt,
      activeMs: segActiveMs,
      idleMs: Math.max(0, segIdleMs),
    });

    segmentStartRef.current = null;
    segmentOpenedAtRef.current = null;
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (stateRef.current.stopped) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      if (!document.hidden) startSegment();
    }

    idleTimerRef.current = setTimeout(() => {
      if (!stateRef.current.stopped && !document.hidden) {
        closeSegment();
        isIdleRef.current = true;
        setIsIdle(true);
      }
    }, IDLE_THRESHOLD_MS);
  }, [startSegment, closeSegment]);

  const handleVisibilityChange = useCallback(() => {
    if (stateRef.current.stopped) return;
    if (document.hidden) {
      closeSegment();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    } else {
      if (!isIdleRef.current) startSegment();
      resetIdleTimer();
    }
  }, [closeSegment, startSegment, resetIdleTimer]);

  const stop = useCallback(() => {
    if (stateRef.current.stopped) return;
    closeSegment();
    stateRef.current.stopped = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // End session on backend (fire-and-forget)
    const sid = sessionIdRef.current;
    if (sid && jobId) {
      const s = stateRef.current;
      remediationSessionService
        .endSession(jobId, sid, {
          activeMs: s.activeMs,
          idleMs: s.idleMs,
          issuesApplied: s.issuesApplied,
          suggestionsAccepted: s.suggestionsAccepted,
          suggestionsRejected: s.suggestionsRejected,
          bulkApplyUsed: s.bulkApplyUsed,
          sessionLog: s.sessionLog,
        })
        .catch(() => {
          // non-blocking — metrics never break the remediation flow
        });
    }
  }, [closeSegment, jobId]);

  const recordApplied = useCallback((count = 1) => {
    if (count <= 0) return;
    stateRef.current.issuesApplied += count;
  }, []);

  const recordSuggestionDecision = useCallback((decision: 'accepted' | 'rejected') => {
    if (decision === 'accepted') stateRef.current.suggestionsAccepted++;
    else stateRef.current.suggestionsRejected++;
  }, []);

  /** Batch-increment issuesApplied and flag bulkApplyUsed for a bulk "Apply All" action. */
  const recordBulkApply = useCallback((count: number) => {
    if (count <= 0) return;
    stateRef.current.bulkApplyUsed = true;
    stateRef.current.issuesApplied += count;
  }, []);

  // Mount / unmount
  useEffect(() => {
    if (!jobId) return;
    let mounted = true;

    (async () => {
      // Start backend session
      try {
        const result = await remediationSessionService.startSession(jobId);
        if (mounted && result?.sessionId) {
          sessionIdRef.current = result.sessionId;
        }
      } catch {
        // non-blocking
      }

      if (!mounted) return;

      // Start first segment if tab is visible
      if (!document.hidden) startSegment();
      resetIdleTimer();
    })();

    // Attach event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click'] as const;
    activityEvents.forEach((ev) => document.addEventListener(ev, resetIdleTimer, { passive: true }));

    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach((ev) => document.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return {
    activeMs: stateRef.current.activeMs,
    idleMs: stateRef.current.idleMs,
    isIdle,
    recordApplied,
    recordSuggestionDecision,
    recordBulkApply,
    stop,
  };
}
