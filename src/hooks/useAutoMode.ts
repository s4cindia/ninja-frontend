/**
 * Comparison Study "Auto Mode" — job-scoped hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';
import { pdfRemediationService } from '@/services/pdf-remediation.service';

const STATUS_KEY = (jobId: string) => ['pdf-auto-mode-status', jobId] as const;
const ROUND_HISTORY_KEY = (jobId: string) => ['auto-mode-round-history', jobId] as const;

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
}

/**
 * Round-by-round trend for a Comparison Study Auto Mode run, derived from
 * the same GET /pdf/:jobId/remediation/history data RemediationHistoryCard
 * shows generically — filtered here to this job's auto_loop-sourced,
 * successfully-completed rounds only (pairing each round's apply_fixes and
 * reaudit events by cycleNumber). A round with no *completed* auto_loop
 * reaudit event (no auto_loop reaudit at all, or one that failed) is
 * excluded entirely, not shown as a gap or a phantom dashes-only row.
 *
 * The history endpoint is job-wide, not scoped to "this Auto Mode
 * invocation" — if the operator starts a second run after a prior one
 * stopped, it still returns the earlier run's rounds too. Since cycleNumber
 * only increases over time, the current run's own rounds are always the
 * chronologically-last `completedRounds` of them (autoRoundsCompleted from
 * useAutoModeStatus), so trim to just those.
 */
export function useAutoModeRoundHistory(
  jobId: string | undefined,
  opts: { enabled: boolean; isRunning: boolean; completedRounds: number }
) {
  return useQuery({
    queryKey: ROUND_HISTORY_KEY(jobId ?? ''),
    queryFn: async (): Promise<AutoModeRound[]> => {
      const runs = await pdfRemediationService.getRemediationHistory(jobId!);
      const isCompletedAutoLoopReaudit = (e: { action: string; source: string; status: string }) =>
        e.action === 'reaudit' && e.source === 'auto_loop' && e.status === 'completed';

      const allRounds = runs
        .filter(run => run.events.some(isCompletedAutoLoopReaudit))
        .sort((a, b) => a.cycleNumber - b.cycleNumber)
        .map((run, idx): AutoModeRound => {
          const reaudit = run.events.find(isCompletedAutoLoopReaudit)!;
          const apply = run.events.find(e => e.action === 'apply_fixes' && e.source === 'auto_loop');
          return {
            round: idx + 1,
            applied: apply?.appliedCount ?? null,
            failed: apply?.failedCount ?? null,
            resolved: reaudit.resolvedCount ?? null,
            remaining: reaudit.remainingCount ?? null,
            regressions: reaudit.regressionCount ?? null,
            resolutionRate: reaudit.resolutionRate ?? null,
            completedAt: reaudit.completedAt ?? null,
          };
        });

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
    mutationFn: () => pdfAutoModeService.startAutoMode(jobId!),
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
