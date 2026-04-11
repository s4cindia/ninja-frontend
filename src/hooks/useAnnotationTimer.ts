import { useEffect, useRef, useCallback, useState } from 'react';
import { annotationReportService } from '@/services/annotation-report.service';

interface SessionSegment {
  openedAt: string;
  closedAt: string;
  activeMs: number;
  idleMs: number;
  /** Page number the annotator was looking at during this segment (nullable for backward compat). */
  pageNumber?: number | null;
}

interface TimerState {
  activeMs: number;
  idleMs: number;
  sessionLog: SessionSegment[];
  stopped: boolean;
  zonesReviewed: number;
  zonesConfirmed: number;
  zonesCorrected: number;
  zonesRejected: number;
  /** Current page the annotator is viewing — captured into each new segment. */
  currentPage: number | null;
}

const IDLE_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Tracks annotation session time for the Zone Review workspace.
 *
 * On mount: starts a backend session via startSession().
 * On unmount/stop: ends the session via endSession() with counters.
 * Idle detection: pauses after 2 minutes of no activity.
 * Visibility tracking: pauses when tab is hidden.
 */
export function useAnnotationTimer(runId: string) {
  const stateRef = useRef<TimerState>({
    activeMs: 0,
    idleMs: 0,
    sessionLog: [],
    stopped: false,
    zonesReviewed: 0,
    zonesConfirmed: 0,
    zonesCorrected: 0,
    zonesRejected: 0,
    currentPage: null,
  });

  const sessionIdRef = useRef<string | null>(null);
  const segmentStartRef = useRef<number | null>(null);
  const segmentOpenedAtRef = useRef<string | null>(null);
  const segmentPageRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);

  const startSegment = useCallback(() => {
    if (segmentStartRef.current !== null) return;
    segmentStartRef.current = Date.now();
    segmentOpenedAtRef.current = new Date().toISOString();
    segmentPageRef.current = stateRef.current.currentPage;
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
      pageNumber: segmentPageRef.current,
    });

    segmentStartRef.current = null;
    segmentOpenedAtRef.current = null;
    segmentPageRef.current = null;
  }, []);

  /**
   * Update the current page being viewed. Closes the current timing segment and
   * opens a new one so per-page effort can be aggregated from sessionLog.
   */
  const setCurrentPage = useCallback(
    (pageNumber: number) => {
      if (stateRef.current.currentPage === pageNumber) return;
      const wasOpen = segmentStartRef.current !== null;
      if (wasOpen) closeSegment();
      stateRef.current.currentPage = pageNumber;
      if (wasOpen && !stateRef.current.stopped && !document.hidden && !isIdleRef.current) {
        startSegment();
      }
    },
    [closeSegment, startSegment],
  );

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
    if (sid && runId) {
      const s = stateRef.current;
      annotationReportService.endSession(runId, sid, {
        activeMs: s.activeMs,
        idleMs: s.idleMs,
        zonesReviewed: s.zonesReviewed,
        zonesConfirmed: s.zonesConfirmed,
        zonesCorrected: s.zonesCorrected,
        zonesRejected: s.zonesRejected,
        sessionLog: s.sessionLog,
      }).catch(() => {
        // non-blocking — metrics never break the review flow
      });
    }
  }, [closeSegment, runId]);

  const recordDecision = useCallback((type: 'confirm' | 'correct' | 'reject') => {
    stateRef.current.zonesReviewed++;
    if (type === 'confirm') stateRef.current.zonesConfirmed++;
    else if (type === 'correct') stateRef.current.zonesCorrected++;
    else if (type === 'reject') stateRef.current.zonesRejected++;
  }, []);

  /** Batch-increment counters for bulk operations (e.g., Confirm All Green). */
  const recordBulkDecision = useCallback((count: number, type: 'confirm' | 'correct' | 'reject') => {
    if (count <= 0) return;
    stateRef.current.zonesReviewed += count;
    if (type === 'confirm') stateRef.current.zonesConfirmed += count;
    else if (type === 'correct') stateRef.current.zonesCorrected += count;
    else if (type === 'reject') stateRef.current.zonesRejected += count;
  }, []);

  // Mount / unmount
  useEffect(() => {
    if (!runId) return;
    let mounted = true;

    (async () => {
      // Start backend session
      try {
        const result = await annotationReportService.startSession(runId);
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
    activityEvents.forEach(ev => document.addEventListener(ev, resetIdleTimer, { passive: true }));

    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(ev => document.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return {
    activeMs: stateRef.current.activeMs,
    idleMs: stateRef.current.idleMs,
    isIdle,
    recordDecision,
    recordBulkDecision,
    setCurrentPage,
    stop,
  };
}
