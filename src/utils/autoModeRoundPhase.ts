/**
 * autoModeRoundPhase — current-round sub-phase derivation
 *
 * AutoModeStatusCard's static "round N in progress" line doesn't say what's
 * actually happening right now or how long it's been running. The backend
 * already logs each sub-phase of a round as it completes (ai_analysis ->
 * apply_fixes -> reaudit, each with its own startedAt/completedAt) via
 * remediationCycleHistoryService.logEvent — this derives a live label +
 * anchor timestamp from that same history data useRemediationHistory
 * already fetches, so AutoModeStatusCard can show a real per-second timer.
 *
 * Pure and timer-free, same split as pdfPhaseStepper.ts's derivePhases: this
 * returns an anchor, the caller owns the actual ticking re-render.
 */

import type { RemediationHistoryRun } from '@/types/pdf-remediation.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';
import type { AutoModeRound } from '@/hooks/useAutoMode';
import { flattenEvents } from '@/utils/pdfPhaseStepper';

export interface CurrentRoundPhase {
  /** "Analyzing issues" | "Applying fixes" | "Re-auditing" */
  label: string;
  /** ISO timestamp this sub-phase started — the caller ticks elapsed time from here. */
  since: string;
}

export function deriveCurrentRoundPhase(
  autoModeStatus: Pick<AutoModeStatusResponse, 'autoStatus' | 'autoRoundsCompleted' | 'autoStartedAt'>,
  remediationHistory: RemediationHistoryRun[],
  completedRounds: AutoModeRound[],
): CurrentRoundPhase | null {
  if (autoModeStatus.autoStatus !== 'running') return null;

  const roundNumber = autoModeStatus.autoRoundsCompleted + 1;
  const roundStart = roundNumber === 1
    ? autoModeStatus.autoStartedAt
    : completedRounds[completedRounds.length - 1]?.completedAt ?? autoModeStatus.autoStartedAt;
  if (!roundStart) return null;

  // Auto Mode's remediation-cycle lock is acquired ONCE for a run's entire
  // duration, not re-acquired per round (confirmed in
  // auto-remediation-loop.service.ts: cycleNumber is captured once before
  // the round while(true) loop and passed unchanged into every runRound
  // call) -- so a single cycleNumber's events can contain several
  // ai_analysis/apply_fixes/reaudit triplets, one per round, all under the
  // SAME cycleNumber. Taking the chronologically LATEST event (not the
  // first match of each type) is what makes this track whichever round is
  // actually current, instead of permanently locking onto round 1's phase
  // the moment its reaudit is logged.
  const autoLoopEvents = flattenEvents(remediationHistory).filter(e => e.source === 'auto_loop');
  const latestCycleNumber = autoLoopEvents.reduce(
    (max, e) => Math.max(max, e.cycleNumber),
    -Infinity,
  );
  const currentCycleEvents = Number.isFinite(latestCycleNumber)
    ? autoLoopEvents.filter(e => e.cycleNumber === latestCycleNumber)
    : [];
  const latestEvent = [...currentCycleEvents].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).pop();

  if (!latestEvent) {
    return { label: 'Analyzing issues', since: roundStart };
  }
  // Each event is only ever logged once its own phase has COMPLETED
  // (logEvent always stamps a fresh completedAt) -- so the latest event's
  // mere presence means that phase already finished and the NEXT phase is
  // the one actually running now.
  if (latestEvent.action === 'ai_analysis' && latestEvent.status === 'completed') {
    return { label: 'Applying fixes', since: latestEvent.completedAt ?? roundStart };
  }
  if (latestEvent.action === 'apply_fixes') {
    return { label: 'Re-auditing', since: latestEvent.completedAt ?? latestEvent.startedAt };
  }
  if (latestEvent.action === 'reaudit') {
    // This round just finished and is about to roll over into the next one
    // on the next status poll -- anchor to the apply_fixes event that
    // preceded it rather than showing a phase with no real start to tick
    // from.
    const precedingApply = [...currentCycleEvents]
      .filter(e => e.action === 'apply_fixes' && e.startedAt <= latestEvent.startedAt)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .pop();
    return { label: 'Re-auditing', since: precedingApply?.completedAt ?? latestEvent.startedAt };
  }
  // A failed ai_analysis, or any other unexpected state -- nothing
  // meaningful to anchor to beyond the round's own start.
  return { label: 'Analyzing issues', since: roundStart };
}
