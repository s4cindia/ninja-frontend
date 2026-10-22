/**
 * Comparison Study "Auto Mode" — job-scoped hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';
import type { StartAutoModeOverrides } from '@/services/pdfAutoMode.service';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import { msBetween } from '@/utils/pdfPhaseStepper';
import type { RemediationHistoryRun, RemediationHistoryEvent } from '@/types/pdf-remediation.types';

export type { StartAutoModeOverrides };

const STATUS_KEY = (jobId: string) => ['pdf-auto-mode-status', jobId] as const;
const ROUND_HISTORY_KEY = (jobId: string) => ['auto-mode-round-history', jobId] as const;
const RAW_HISTORY_KEY = (jobId: string) => ['remediation-history-raw', jobId] as const;
const BUDGET_ESTIMATE_KEY = (jobId: string) => ['pdf-auto-mode-budget-estimate', jobId] as const;

/**
 * Suggested cost limit for this job, to seed AutoModeStartControl's popover
 * instead of its hardcoded $2 default. Requires the job's own audit to
 * already be complete -- the caller must pass `enabled: false` until then
 * (e.g. gated on its own auditResult), since this page can mount and poll
 * while the audit is still running, and this query has no refetchInterval
 * of its own to pick up a completion that happens later. Not polled
 * otherwise -- a one-time fetch is enough once enabled.
 */
export function useBudgetEstimate(jobId: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: BUDGET_ESTIMATE_KEY(jobId ?? ''),
    queryFn: () => pdfAutoModeService.getBudgetEstimate(jobId!),
    enabled: !!jobId && (opts?.enabled ?? true),
  });
}

/**
 * Raw, unfiltered remediation history (every action/source, not just
 * auto_loop rounds) — unlike useAutoModeRoundHistory above, which
 * transforms+filters the same endpoint down to auto-mode rounds only. Used
 * by PdfPhaseStepper to find the most recent completed ai_analysis/
 * apply_fixes/reaudit events for phase durations. Always enabled (not
 * gated on Auto Mode) and not polled — a manual refetch() after a
 * known state change is cheap enough and avoids yet another 5s interval.
 */
export function useRemediationHistory(jobId: string | undefined) {
  return useQuery({
    queryKey: RAW_HISTORY_KEY(jobId ?? ''),
    queryFn: (): Promise<RemediationHistoryRun[]> => pdfRemediationService.getRemediationHistory(jobId!),
    enabled: !!jobId,
  });
}

/**
 * Polls every 5s while autoStatus is 'running', and stops automatically
 * once the run concludes (or was never started) — same "don't poll once
 * there's nothing left to observe" principle as the remediation-cycle-lock
 * polling in PdfAuditResultsPage.
 */
export function useAutoModeStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: STATUS_KEY(jobId ?? ''),
    queryFn: () => pdfAutoModeService.getAutoModeStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.autoStatus === 'running' ? 5000 : false),
  });
}

export interface AutoModeRound {
  /**
   * 1-indexed position among this job's completed auto-loop rounds — NOT the
   * raw cycleNumber. cycleNumber is a job-wide monotonic counter shared with
   * any non-auto-mode remediation action and can have gaps (see
   * RemediationHistoryRun's own doc comment); RemediationHistoryCard already
   * labels its own "Run N" by array position for the same reason, so this
   * mirrors that convention instead of the plan's literal cycleNumber.
   */
  round: number;
  applied: number | null;
  failed: number | null;
  resolved: number | null;
  remaining: number | null;
  regressions: number | null;
  resolutionRate: number | null;
  completedAt: string | null;
  /** This round's own start — apply_fixes' startedAt, falling back to the reaudit's own startedAt when no apply_fixes event was logged. Optional so existing fixtures/callers that don't care about timing don't need to supply it. */
  startedAt?: string | null;
  /** msBetween(startedAt, completedAt) — undefined when either timestamp is missing. */
  durationMs?: number;
}

/**
 * Round-by-round trend for a Comparison Study Auto Mode run, derived from
 * the same GET /pdf/:jobId/remediation/history data RemediationHistoryCard
 * shows generically — filtered here to this job's auto_loop-sourced,
 * successfully-completed rounds only. A round with no *completed* auto_loop
 * reaudit event (no auto_loop reaudit at all, or one that failed) is
 * excluded entirely, not shown as a gap or a phantom dashes-only row.
 *
 * Pairing is NOT done by cycleNumber. Auto Mode's remediation-cycle lock is
 * held for a run's ENTIRE duration, not re-acquired per round (confirmed in
 * auto-remediation-loop.service.ts: cycleNumber is captured once before the
 * round while(true) loop and reused unchanged for every round within that
 * run) -- so one cycleNumber's events can contain several
 * ai_analysis/apply_fixes/reaudit triplets, one per round. Instead, this
 * flattens every auto_loop event across all runs, sorts chronologically by
 * startedAt, and walks the list: the most recent apply_fixes seen is paired
 * with the next COMPLETED reaudit to close out a round. A failed reaudit
 * closes nothing and produces no row.
 *
 * The history endpoint is job-wide, not scoped to "this Auto Mode
 * invocation" — if the operator starts a second run after a prior one
 * stopped, it still returns the earlier run's rounds too (under their own,
 * earlier cycleNumber). Since real time only moves forward, the current
 * run's own rounds are always the chronologically-last `completedRounds` of
 * them (autoRoundsCompleted from useAutoModeStatus), so trim to just those.
 */
export function useAutoModeRoundHistory(
  jobId: string | undefined,
  opts: { enabled: boolean; isRunning: boolean; completedRounds: number }
) {
  return useQuery({
    queryKey: ROUND_HISTORY_KEY(jobId ?? ''),
    queryFn: async (): Promise<AutoModeRound[]> => {
      const runs = await pdfRemediationService.getRemediationHistory(jobId!);

      const autoLoopEvents = runs
        .flatMap(run => run.events.filter(e => e.source === 'auto_loop'))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

      const allRounds: Omit<AutoModeRound, 'round'>[] = [];
      let pendingApply: RemediationHistoryEvent | undefined;

      for (const event of autoLoopEvents) {
        if (event.action === 'apply_fixes') {
          pendingApply = event;
        } else if (event.action === 'reaudit' && event.status === 'completed') {
          const startedAt = pendingApply?.startedAt ?? event.startedAt;
          allRounds.push({
            applied: pendingApply?.appliedCount ?? null,
            failed: pendingApply?.failedCount ?? null,
            resolved: event.resolvedCount ?? null,
            remaining: event.remainingCount ?? null,
            regressions: event.regressionCount ?? null,
            resolutionRate: event.resolutionRate ?? null,
            completedAt: event.completedAt ?? null,
            startedAt: startedAt ?? null,
            durationMs: msBetween(startedAt, event.completedAt),
          });
          pendingApply = undefined;
        }
      }

      // array.slice(-0) returns the WHOLE array in JS, not an empty one —
      // guard the 0 case explicitly rather than relying on slice's own
      // negative-index behavior.
      const currentRunRounds = opts.completedRounds > 0 ? allRounds.slice(-opts.completedRounds) : [];
      // Renumber 1..N within the current run only, now that any prior run's
      // rounds have been trimmed off.
      return currentRunRounds.map((r, idx) => ({ ...r, round: idx + 1 }));
    },
    enabled: !!jobId && opts.enabled,
    // Mirrors useAutoModeStatus's own "poll only while running" cadence —
    // driven from the caller's live status rather than this query's own
    // data (round history has no autoStatus field to self-check against).
    // The caller additionally refetches this query directly on the
    // running -> terminal transition (see PdfAuditResultsPage's
    // autoModeProgressKey effect) so the final round isn't missed if it
    // lands between this interval's own ticks.
    refetchInterval: opts.isRunning ? 5000 : false,
  });
}

export function useStartAutoMode(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides?: StartAutoModeOverrides) => pdfAutoModeService.startAutoMode(jobId!, overrides),
    onSuccess: () => {
      if (jobId) queryClient.invalidateQueries({ queryKey: STATUS_KEY(jobId) });
    },
  });
}

export function useStopAutoMode(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => pdfAutoModeService.stopAutoMode(jobId!),
    onSuccess: () => {
      // Cooperative stop — honored after the current round, not
      // immediately, so the status query keeps polling (autoStatus is
      // still 'running' right after this resolves) until it actually
      // reflects 'stopped'. Invalidating just forces one immediate re-check
      // rather than waiting for the next 5s tick.
      if (jobId) queryClient.invalidateQueries({ queryKey: STATUS_KEY(jobId) });
    },
  });
}
