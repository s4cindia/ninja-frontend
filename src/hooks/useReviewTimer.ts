import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { tenantConfigService } from '@/services/tenant-config.service';

export interface SessionSegment {
  openedAt: string;
  closedAt: string;
  activeMs: number;
  idleMs: number;
}

interface TimerState {
  activeMs: number;
  sessionLog: SessionSegment[];
  stopped: boolean;
}

/**
 * Tracks human active review time for HITL metrics.
 *
 * On mount:
 *  - Fetches idleThresholdMinutes from tenant config
 *  - POSTs review-started to the backend
 *
 * Tracks active time by pausing when:
 *  - The document tab is hidden (visibilitychange)
 *  - The user has been idle longer than idleThresholdMinutes
 *
 * Returns { activeMs, sessionLog, stop } where stop() seals the current
 * session so callers can read final values before submitting.
 */
export function useReviewTimer(workflowId: string, gate: string) {
  const stateRef = useRef<TimerState>({ activeMs: 0, sessionLog: [], stopped: false });

  // Timing refs — segment start/end tracking
  const segmentStartRef = useRef<number | null>(null);
  const segmentOpenedAtRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleThresholdMsRef = useRef<number>(2 * 60 * 1000); // default 2 min
  const isIdleRef = useRef(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  const startSegment = useCallback(() => {
    if (segmentStartRef.current !== null) return; // already running
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
    stateRef.current.sessionLog.push({
      openedAt,
      closedAt,
      activeMs: segActiveMs,
      idleMs: Math.max(0, segIdleMs),
    });

    segmentStartRef.current = null;
    segmentOpenedAtRef.current = null;
  }, []);

  // ── idle detection ────────────────────────────────────────────────────────

  const resetIdleTimer = useCallback(() => {
    if (stateRef.current.stopped) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // If we were idle, resume the segment
    if (isIdleRef.current) {
      isIdleRef.current = false;
      if (!document.hidden) startSegment();
    }

    idleTimerRef.current = setTimeout(() => {
      if (!stateRef.current.stopped && !document.hidden) {
        closeSegment();
        isIdleRef.current = true;
      }
    }, idleThresholdMsRef.current);
  }, [startSegment, closeSegment]);

  // ── visibility change ─────────────────────────────────────────────────────

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

  // ── stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (stateRef.current.stopped) return;
    closeSegment();
    stateRef.current.stopped = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, [closeSegment]);

  // ── getters (snapshot at call time) ──────────────────────────────────────

  const getActiveMs = useCallback(() => stateRef.current.activeMs, []);
  const getSessionLog = useCallback(() => stateRef.current.sessionLog, []);

  // ── mount / unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1. Fetch tenant idle threshold
      try {
        const config = await tenantConfigService.getTimeMetricsConfig();
        if (mounted) {
          idleThresholdMsRef.current = config.idleThresholdMinutes * 60 * 1000;
        }
      } catch {
        // keep default
      }

      if (!mounted) return;

      // 2. Notify backend that review has started
      try {
        await api.post(`/workflows/${workflowId}/metrics/review-started`, { gate });
      } catch {
        // non-blocking — metrics never break the review flow
      }

      if (!mounted) return;

      // 3. Start first segment if tab is visible
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
  }, [workflowId, gate]);

  return { getActiveMs, getSessionLog, stop };
}
