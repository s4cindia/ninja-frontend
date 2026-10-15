/**
 * PdfPhaseStepper — phase derivation
 *
 * Consolidates RemediationChecklist's 9-step model into 5 top-level phases
 * for an at-a-glance horizontal header stepper: Audit -> AI Analysis ->
 * Remediation -> Verification -> Compliance. This is deliberately a
 * coarser, independent approximation, not a byte-for-byte reuse of
 * RemediationChecklist's own edge-case-tuned step logic (see that file's
 * extensive doc comments) — the checklist stays the precise, advisory
 * source of truth; this just gives a quick glance at which phase is
 * running and how long it took/has taken.
 *
 * Pure and timer-free by design: a phase that's currently running gets a
 * `liveSince` anchor instead of a ticking value, so the caller (the
 * presentational PdfPhaseStepper component) owns the actual per-second
 * re-render via its own interval, and this function stays trivially
 * testable with fixed inputs.
 */

import type { RemediationHistoryRun } from '@/types/pdf-remediation.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';
import type { RemediationCycleSource } from '@/services/api';
import type { GuidanceAcknowledgment } from '@/components/pdf/RemediationChecklist';

export type PhaseId = 'audit' | 'ai-analysis' | 'remediation' | 'verification' | 'compliance';
export type PhaseStatus = 'not-started' | 'in-progress' | 'done';

export interface Phase {
  id: PhaseId;
  label: string;
  status: PhaseStatus;
  /** Extra short detail text, e.g. "Round 3" or "2 rounds". */
  detail?: string;
  /** Completed-phase duration in ms, when a clean start+end pair was found. */
  durationMs?: number;
  /** In-progress-phase start anchor, for the caller's own live ticker. */
  liveSince?: string;
}

export interface DerivePhasesInput {
  auditResult: { createdAt: string; completedAt?: string | null } | null;
  aiAnalysisStatus: string | null;
  aiAnalyzedAt?: string | null;
  remediationHistory: RemediationHistoryRun[];
  autoModeStatus?: Pick<AutoModeStatusResponse, 'autoStatus' | 'autoRoundsCompleted' | 'autoStartedAt'>;
  remediationCycleActive: boolean;
  remediationCycleSource: RemediationCycleSource | null;
  postRemediationStatus?: 'pending' | 'complete' | 'failed';
  lastVerifiedAt?: string | null;
  pendingGuidanceCount: number;
  guidanceAcknowledgment: GuidanceAcknowledgment | null;
  acrGenerated: boolean;
  pacReportGenerated: boolean;
}

function msBetween(start: string | null | undefined, end: string | null | undefined): number | undefined {
  if (!start || !end) return undefined;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return undefined;
  return endMs - startMs;
}

function isAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return new Date(a).getTime() > new Date(b).getTime();
}

function flattenEvents(runs: RemediationHistoryRun[]) {
  return runs.flatMap(run => run.events.map(event => ({ ...event, cycleNumber: run.cycleNumber })));
}

/** Most recent completed ai_analysis event (any source), by startedAt. */
function latestCompletedAiAnalysis(runs: RemediationHistoryRun[]) {
  return flattenEvents(runs)
    .filter(e => e.action === 'ai_analysis' && e.status === 'completed')
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .pop();
}

/**
 * Most recent manually-triggered (non-auto_loop) remediation cycle with a
 * completed reaudit — Auto Mode's own rounds are reported separately by
 * useAutoModeRoundHistory/AutoModeStatusCard, so they're excluded here to
 * avoid double-reporting the same work under two different UI elements.
 */
function latestManualCycle(runs: RemediationHistoryRun[]) {
  const manualRuns = runs
    .filter(run => run.events.some(e => e.action === 'reaudit' && e.status === 'completed' && e.source !== 'auto_loop'))
    .sort((a, b) => a.cycleNumber - b.cycleNumber);
  const run = manualRuns.pop();
  if (!run) return undefined;
  const reaudit = run.events.find(e => e.action === 'reaudit' && e.status === 'completed' && e.source !== 'auto_loop')!;
  const apply = run.events.find(e => e.action === 'apply_fixes' && e.source !== 'auto_loop');
  return { start: apply?.startedAt ?? reaudit.startedAt, end: reaudit.completedAt };
}

const REMEDIATION_LOCK_SOURCES: RemediationCycleSource[] = [
  'apply_all', 'apply_single', 'reaudit_pdf_upload', 'reaudit_current_file',
];

export function derivePhases(input: DerivePhasesInput): Phase[] {
  const aiAnalysisEverCompleted = input.aiAnalysisStatus === 'complete' || !!input.aiAnalyzedAt;

  // --- Audit ---
  const audit: Phase = input.auditResult
    ? {
      id: 'audit',
      label: 'Audit',
      status: 'done',
      durationMs: msBetween(input.auditResult.createdAt, input.auditResult.completedAt),
    }
    : { id: 'audit', label: 'Audit', status: 'not-started' };

  // --- AI Analysis ---
  const latestAnalysis = latestCompletedAiAnalysis(input.remediationHistory);
  const aiAnalysis: Phase = {
    id: 'ai-analysis',
    label: 'AI Analysis',
    status: aiAnalysisEverCompleted
      ? 'done'
      : input.aiAnalysisStatus === 'processing' || input.aiAnalysisStatus === 'pending'
        ? 'in-progress'
        : 'not-started',
    durationMs: aiAnalysisEverCompleted ? msBetween(latestAnalysis?.startedAt, latestAnalysis?.completedAt) : undefined,
  };

  // --- Remediation (the apply/re-audit loop — Auto Mode's own rounds, or a manual cycle) ---
  let remediation: Phase;
  const autoStatus = input.autoModeStatus?.autoStatus;
  if (autoStatus === 'running') {
    remediation = {
      id: 'remediation',
      label: 'Remediation',
      status: 'in-progress',
      detail: `Round ${input.autoModeStatus!.autoRoundsCompleted + 1}`,
      liveSince: input.autoModeStatus?.autoStartedAt ?? undefined,
    };
  } else if (autoStatus === 'stopped') {
    const rounds = input.autoModeStatus!.autoRoundsCompleted;
    remediation = {
      id: 'remediation',
      label: 'Remediation',
      status: 'done',
      detail: `${rounds} round${rounds === 1 ? '' : 's'}`,
    };
  } else {
    const manualInProgress = (
      input.remediationCycleActive
      && !!input.remediationCycleSource
      && (REMEDIATION_LOCK_SOURCES as string[]).includes(input.remediationCycleSource)
    ) || input.postRemediationStatus === 'pending';
    const manualCycle = latestManualCycle(input.remediationHistory);
    const manualDone = !!manualCycle || input.postRemediationStatus === 'complete' || !!input.lastVerifiedAt;
    remediation = {
      id: 'remediation',
      label: 'Remediation',
      status: manualInProgress ? 'in-progress' : manualDone ? 'done' : 'not-started',
      durationMs: manualDone ? msBetween(manualCycle?.start, manualCycle?.end) : undefined,
    };
  }

  // --- Verification (final re-analysis + guidance-only resolution + confirmation re-audit) ---
  const verificationStarted = input.postRemediationStatus === 'complete' || !!input.lastVerifiedAt;
  const reanalysisDone = verificationStarted && !!input.aiAnalyzedAt && isAfter(input.aiAnalyzedAt, input.lastVerifiedAt);
  const guidanceResolved = input.pendingGuidanceCount === 0 || input.guidanceAcknowledgment != null;
  const verification: Phase = {
    id: 'verification',
    label: 'Verification',
    status: !verificationStarted
      ? 'not-started'
      : reanalysisDone && guidanceResolved
        ? 'done'
        : 'in-progress',
  };

  // --- Compliance ---
  const compliance: Phase = {
    id: 'compliance',
    label: 'Compliance',
    status: input.acrGenerated && input.pacReportGenerated
      ? 'done'
      : (input.acrGenerated || input.pacReportGenerated)
        ? 'in-progress'
        : 'not-started',
  };

  return [audit, aiAnalysis, remediation, verification, compliance];
}
