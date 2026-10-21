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

  const autoLoopEvents = flattenEvents(remediationHistory).filter(e => e.source === 'auto_loop');
  const latestCycleNumber = autoLoopEvents.reduce(
    (max, e) => Math.max(max, e.cycleNumber),
    -Infinity,
  );
  const currentCycleEvents = Number.isFinite(latestCycleNumber)
    ? autoLoopEvents.filter(e => e.cycleNumber === latestCycleNumber)
    : [];

  const reaudit = currentCycleEvents.find(e => e.action === 'reaudit');
  const applyFixes = currentCycleEvents.find(e => e.action === 'apply_fixes');
  const aiAnalysis = currentCycleEvents.find(e => e.action === 'ai_analysis' && e.status === 'completed');

  // Each event is only ever logged once its own phase has COMPLETED
  // (logEvent always stamps a fresh completedAt) -- so an apply_fixes
  // event's mere presence means apply_fixes already finished and
  // re-auditing is the phase actually running now, even though no
  // reaudit event has been logged yet.
  if (reaudit) {
    // Reaudit itself already completed too -- the round is essentially
    // over and about to roll into the next one on the next status poll.
    // Keep showing the last active phase rather than nothing.
    return { label: 'Re-auditing', since: applyFixes?.completedAt ?? reaudit.startedAt };
  }
  if (applyFixes) {
    return { label: 'Re-auditing', since: applyFixes.completedAt ?? applyFixes.startedAt };
  }
  if (aiAnalysis) {
    // Between analysis completing and the apply_fixes event being logged.
    return { label: 'Applying fixes', since: aiAnalysis.completedAt ?? roundStart };
  }
  return { label: 'Analyzing issues', since: roundStart };
}
