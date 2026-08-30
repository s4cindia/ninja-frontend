/**
 * RemediationChecklist
 *
 * Soft-gated, 9-step guided checklist for the PDF Audit Results page.
 * Purely advisory — every existing action on the page stays fully clickable
 * regardless of checklist state. It only surfaces status badges and a
 * "recommended next" nudge, computed from data this page already fetches
 * (plus one job-flags lookup for step 8 and one trial lookup for step 9).
 *
 * Re-audit and re-run-AI-analysis (steps 4-5) come BEFORE resolving
 * guidance-only items (step 6): a guidance-only issue can turn out to be
 * auto-fixable after all once the file's actually been through an
 * apply+re-audit cycle (e.g. HEADING-SKIP's rule-based auto-fix needs
 * /MarkInfo /Marked, which isn't set until partway through remediation) —
 * so resolving guidance manually first risks the operator doing in Acrobat
 * Pro what would've become auto-fixable for free with one more check.
 * Step 7 (a second re-audit) exists because guidance-only fixes happen
 * entirely outside Ninja — nothing on this page's automatic post-fix pass
 * ever observes them — so the only way to confirm they landed is another
 * explicit re-audit after they're done.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Circle, Loader2, AlertTriangle, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { api, getErrorMessage } from '@/services/api';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { AiAnalysis } from '@/components/remediation/IssueCard';
import type { ComparisonTrialWithJob } from '@/types/comparisonStudy.types';

export interface GuidanceAcknowledgment {
  note: string;
  remainingCount: number;
  acknowledgedAt: string;
  acknowledgedBy: string;
}

type StepStatus = 'not-started' | 'in-progress' | 'done' | 'skipped';

interface RemediationChecklistProps {
  jobId: string;
  aiAnalysisStatus: string | null;
  aiSuggestions: Map<string, AiAnalysis>;
  guidanceAcknowledgment: GuidanceAcknowledgment | null;
  onGuidanceAcknowledged: (ack: GuidanceAcknowledgment) => void;
  postRemediationStatus?: 'pending' | 'complete' | 'failed';
  lastVerifiedAt?: string | null;
  aiAnalyzedAt?: string | null;
  /** Latest manual-remediation-time log entry's timestamp, or null if none logged. */
  manualRemediationLastLoggedAt?: string | null;
  acrGenerated: boolean;
  pacReportGenerated: boolean;
  comparisonTrialId?: string | null;
  userRole?: string;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  done: 'Done',
  skipped: 'Acknowledged',
};

const STATUS_BADGE_VARIANT: Record<StepStatus, 'default' | 'success' | 'warning' | 'info'> = {
  'not-started': 'default',
  'in-progress': 'info',
  done: 'success',
  skipped: 'warning',
};

// ISO 8601 timestamps sort lexicographically in chronological order, so this
// avoids needing to parse dates just to find the most recent one.
function latestTimestamp(...timestamps: Array<string | null | undefined>): string | undefined {
  return timestamps.filter((t): t is string => !!t).sort().pop();
}

function isAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return new Date(a).getTime() > new Date(b).getTime();
}

function isAtOrAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return new Date(a).getTime() >= new Date(b).getTime();
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />;
    case 'in-progress':
      return <Loader2 className="h-4 w-4 text-blue-600 flex-shrink-0 animate-spin" />;
    case 'skipped':
      return <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />;
  }
}

interface Step {
  id: number;
  label: string;
  status: StepStatus;
  detail?: React.ReactNode;
}

function StepRow({ step, isRecommendedNext }: { step: Step; isRecommendedNext: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md px-3 py-2 border',
        isRecommendedNext ? 'border-blue-300 bg-blue-50/50' : 'border-transparent'
      )}
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={step.status} />
        <span className="text-sm text-gray-800 flex-1">
          {step.id}. {step.label}
        </span>
        {isRecommendedNext && (
          <Badge variant="info" size="sm">Recommended next</Badge>
        )}
        <Badge variant={STATUS_BADGE_VARIANT[step.status]} size="sm">
          {STATUS_LABEL[step.status]}
        </Badge>
      </div>
      {step.detail && <div className="mt-2 pl-6">{step.detail}</div>}
    </div>
  );
}

export function RemediationChecklist({
  jobId,
  aiAnalysisStatus,
  aiSuggestions,
  guidanceAcknowledgment,
  onGuidanceAcknowledged,
  postRemediationStatus,
  lastVerifiedAt,
  aiAnalyzedAt,
  manualRemediationLastLoggedAt,
  acrGenerated,
  pacReportGenerated,
  comparisonTrialId,
  userRole,
}: RemediationChecklistProps) {
  const [noteInput, setNoteInput] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const [trial, setTrial] = useState<ComparisonTrialWithJob | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [isValidatingTrial, setIsValidatingTrial] = useState(false);

  useEffect(() => {
    if (!comparisonTrialId) {
      setTrial(null);
      return;
    }
    let cancelled = false;
    setIsLoadingTrial(true);
    comparisonStudyService.getTrial(comparisonTrialId)
      .then((t) => { if (!cancelled) setTrial(t); })
      .catch(() => { /* non-fatal — step 9 just shows as not-started */ })
      .finally(() => { if (!cancelled) setIsLoadingTrial(false); });
    return () => { cancelled = true; };
  }, [comparisonTrialId]);

  const suggestions = useMemo(() => Array.from(aiSuggestions.values()), [aiSuggestions]);

  // 'approved' suggestions still need Apply Fixes/Apply All to actually touch
  // the PDF — the bulk-action eligibility count treats them the same way
  // (eligibleForApplyAll in PdfAuditResultsPage), so step 3 must too, or it
  // reports "done" the moment items are approved but before they're applied.
  const pendingFixable = useMemo(
    () => suggestions.filter(s =>
      (s.applyMode === 'apply-to-pdf' && (s.status === 'pending' || s.status === 'approved')) ||
      (s.applyMode === 'auto-resolve' && s.status === 'pending')
    ),
    [suggestions]
  );
  // Distinguishes "nothing applied yet" from "partway through" — without this,
  // step 3 reported "in progress" the instant AI Analysis finished, before the
  // operator had touched anything (pendingFixable is non-empty from the start).
  const eligibleFixable = useMemo(
    () => suggestions.filter(s => s.applyMode === 'apply-to-pdf' || s.applyMode === 'auto-resolve'),
    [suggestions]
  );
  const appliedFixableCount = useMemo(
    () => eligibleFixable.filter(s => s.status === 'applied').length,
    [eligibleFixable]
  );
  const pendingGuidance = useMemo(
    () => suggestions.filter(s => s.status === 'pending' && s.applyMode === 'guidance-only'),
    [suggestions]
  );

  const step2Done = aiAnalysisStatus === 'complete';

  // Step 4: first re-audit.
  const automatedVerificationDone = postRemediationStatus === 'complete';
  // A manual "Re-run Audit" click satisfies "verified" too — it never sets
  // postRemediationStatus (that's the automatic post-fix pass's field alone),
  // so without this OR, a manual-only verification could never mark step 4
  // done or unblock step 5 at all. An active automatic pass still wins for
  // *display* purposes below — a fresh "pending" shouldn't read as done just
  // because an older manual verification happened to precede it.
  const verificationDone = automatedVerificationDone || !!lastVerifiedAt;

  // aiAnalysisStatus is a single live flag shared by steps 2 AND 5 (there's
  // only one "is AI analysis running" signal — the remediation-cycle lock,
  // source: 'analyze_job') — the instant step 5 kicks off a re-run, it moves
  // away from 'complete', which would make step2Done (and anything derived
  // from it) regress back to not-started/in-progress even though the FIRST
  // analysis pass durably finished long ago. verificationDone can only be
  // true after a completed analysis pass produced suggestions that were
  // applied and then re-audited, so it's a reliable "this already happened"
  // signal that survives a later re-run's live status — use it to make
  // step 2/3 sticky. (Deliberately NOT folded into step2Done itself — step 6
  // below is intentionally gated on strict step2Done, not verificationDone.)
  const aiAnalysisEverCompleted = step2Done || verificationDone;
  const step3Done = aiAnalysisEverCompleted && pendingFixable.length === 0;
  // appliedFixableCount alone isn't reliable once a re-run has happened: a
  // fresh analysis pass can prune suggestion rows for issues that no longer
  // exist (because they were already fixed), silently resetting the current
  // snapshot's applied count to 0 even though real progress was verified
  // before. verificationDone catches that the same way it does for step 3's
  // "done" check above.
  const step3Started = appliedFixableCount > 0 || verificationDone;

  // Step 5: re-run AI Analysis (final check) — done once AI Analysis has
  // been re-run at least once since the most recent verification.
  const reanalysisDone = verificationDone && !!aiAnalyzedAt && isAfter(aiAnalyzedAt, lastVerifiedAt);
  // Treat 'pending' as active too, matching fetchAiSuggestions' own
  // pending-or-processing definition of "analysis is under way".
  const reanalysisInProgress = verificationDone && (aiAnalysisStatus === 'processing' || aiAnalysisStatus === 'pending');

  // Step 6: guidance-only items.
  const guidanceFullyResolved = step2Done && pendingGuidance.length === 0;
  // guidanceAcknowledgment never gets cleared server-side, including when a
  // later AI Analysis re-run introduces NEW pending guidance-only items the
  // operator never actually acknowledged. remainingCount is a snapshot of
  // how many were pending AT acknowledgment time — if the live count is now
  // higher, new items have appeared since, and the acknowledgment no longer
  // covers all of them, so it must not be trusted for "resolved" (step 6)
  // or as step 7's confirmation-audit anchor.
  const guidanceAcknowledgmentStale = guidanceAcknowledgment != null
    && pendingGuidance.length > guidanceAcknowledgment.remainingCount;
  const guidanceAcknowledgedFlag = guidanceAcknowledgment != null && !guidanceAcknowledgmentStale;
  const guidanceResolved = guidanceFullyResolved || guidanceAcknowledgedFlag;

  // Step 7: a second re-audit, to confirm guidance-only manual work actually
  // landed (nothing else on this page ever re-audits after that work, since
  // it all happens outside Ninja). Anchor to whichever timestamp signal
  // guidance resolution produced — an acknowledgment (only if still fresh —
  // see guidanceAcknowledgmentStale above), or the latest manual time log
  // entry.
  const guidanceResolutionSignal = latestTimestamp(
    guidanceAcknowledgedFlag ? guidanceAcknowledgment?.acknowledgedAt : undefined,
    manualRemediationLastLoggedAt
  );
  // Fallback for the case where the operator resolved every guidance item
  // by hand without ever using acknowledge-and-skip or the manual time
  // logger — no acknowledgment/manual-log timestamp exists to anchor to.
  // Verified resolution now goes through ninja-backend PR #500's pruning:
  // analyzeJob reads job.output.auditReport fresh at the top of every call
  // (no caching) and prunes stale AiAnalysis rows against that same read
  // before writing aiAnalysisStats.analyzedAt — so analyzedAt can never
  // reflect a state older than whatever postRemediationAudit.runAt was at
  // the moment that analysis pass started. That makes "was the AI Analysis
  // pass that found pendingGuidance === 0 itself informed by the latest
  // re-audit" (aiAnalyzedAt at-or-after lastVerifiedAt) the exact signal
  // for "this zero count reflects the verified post-fix state" — the same
  // shape as step 5's own reanalysisDone check, just reused here. No
  // separate "one more re-audit after resolution" is needed: the re-audit
  // that produced the fresh auditReport IS the confirmation, and requiring
  // another one afterward would be an unnecessary extra step for the
  // operator. (Earlier version of this fallback snapshotted lastVerifiedAt
  // at the moment resolution was first observed and required something
  // newer — an off-by-one-audit bug once this path became reachable.)
  const secondReauditDone = guidanceResolutionSignal
    ? isAfter(lastVerifiedAt, guidanceResolutionSignal)
    : guidanceFullyResolved && isAtOrAfter(aiAnalyzedAt, lastVerifiedAt);

  const artifactsStepDone = acrGenerated && pacReportGenerated;
  const trialStepApplicable = !!comparisonTrialId;
  const trialStepDone = trial?.status === 'validated';

  const canValidateTrial = userRole === 'ADMIN' || userRole === 'OPERATOR';
  // Mirrors the guard on ComparisonTrialWorkspacePage's own Validate button —
  // the backend requires pdfxt data logged first, and 'registered' means it
  // isn't yet.
  const needsPdfxtData = trial?.status === 'registered';

  const handleAcknowledge = useCallback(async () => {
    const note = noteInput.trim();
    if (!note || !jobId) return;
    setIsSubmittingAck(true);
    try {
      const res = await api.post(`/pdf/${encodeURIComponent(jobId)}/ai-analysis/guidance-acknowledgment`, { note });
      onGuidanceAcknowledged(res.data.data);
      setNoteInput('');
      toast.success('Guidance items acknowledged');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmittingAck(false);
    }
  }, [jobId, noteInput, onGuidanceAcknowledged]);

  const handleValidateTrial = useCallback(async () => {
    if (!comparisonTrialId) return;
    setIsValidatingTrial(true);
    try {
      const updated = await comparisonStudyService.validateTrial(comparisonTrialId);
      setTrial(prev => prev ? { ...prev, ...updated } : { ...updated, job: null });
      toast.success('Comparison trial marked complete');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsValidatingTrial(false);
    }
  }, [comparisonTrialId]);

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [
      { id: 1, label: 'Initial audit complete', status: 'done' },
      {
        id: 2,
        label: 'Run AI Analysis',
        // aiAnalysisEverCompleted (not step2Done) so this stays "Done" once
        // analysis has ever finished, instead of regressing to "In progress"
        // in lockstep with step 5 every time a re-run kicks off — the two
        // steps share one live status flag, but only step 5 should reflect
        // it once step 2 has genuinely already happened.
        status: aiAnalysisEverCompleted ? 'done' : aiAnalysisStatus === 'processing' ? 'in-progress' : 'not-started',
      },
      {
        id: 3,
        label: 'Apply AI-suggested fixes',
        status: !aiAnalysisEverCompleted ? 'not-started' : step3Done ? 'done' : step3Started ? 'in-progress' : 'not-started',
      },
      {
        id: 4,
        label: 'Re-audit to verify',
        // An active automatic pass always wins for display, even if an
        // earlier manual re-audit would otherwise already read "done".
        status: postRemediationStatus === 'pending' ? 'in-progress' : verificationDone ? 'done' : 'not-started',
      },
      {
        id: 5,
        label: 'Re-run AI Analysis (final check)',
        status: !verificationDone
          ? 'not-started'
          : reanalysisDone
            ? 'done'
            : reanalysisInProgress
              ? 'in-progress'
              : 'not-started',
        detail: reanalysisDone && pendingFixable.length > 0
          ? (
            <p className="text-xs text-blue-700">
              {pendingFixable.length} fixable suggestion(s) now available — consider revisiting step 3.
            </p>
          )
          : undefined,
      },
      {
        id: 6,
        label: 'Resolve guidance-only items',
        // Gated on step2Done (not verificationDone) — same condition as
        // before the reorder, just at a new position in the list.
        status: !step2Done
          ? 'not-started'
          : guidanceFullyResolved
            ? 'done'
            : guidanceAcknowledgedFlag
              ? 'skipped'
              : 'not-started',
        detail: !step2Done || guidanceFullyResolved
          ? undefined
          : guidanceAcknowledgedFlag
            ? (
              <p className="text-xs text-amber-700">
                &ldquo;{guidanceAcknowledgment!.note}&rdquo; — {guidanceAcknowledgment!.remainingCount} item(s) left as-is,
                acknowledged {new Date(guidanceAcknowledgment!.acknowledgedAt).toLocaleString()}
              </p>
            )
            : (
              <div className="space-y-1.5">
                {guidanceAcknowledgmentStale && (
                  <p className="text-xs text-amber-700">
                    New guidance-only item(s) appeared since the last acknowledgment — please review and acknowledge again.
                  </p>
                )}
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder={`${pendingGuidance.length} guidance-only item(s) remain — reason:`}
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    disabled={isSubmittingAck}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!noteInput.trim() || isSubmittingAck}
                    onClick={handleAcknowledge}
                  >
                    {isSubmittingAck ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Acknowledge & skip'}
                  </Button>
                </div>
              </div>
            ),
      },
      {
        id: 7,
        label: 'Re-audit again to confirm manual fixes',
        status: !guidanceResolved ? 'not-started' : secondReauditDone ? 'done' : 'not-started',
        detail: guidanceResolved && !secondReauditDone
          ? (
            <p className="text-xs text-gray-500">
              Guidance-only work is outside Ninja — re-run the audit to confirm it landed.
            </p>
          )
          : undefined,
      },
      {
        id: 8,
        label: 'Generate compliance artifacts',
        status: artifactsStepDone ? 'done' : (acrGenerated || pacReportGenerated) ? 'in-progress' : 'not-started',
        detail: !artifactsStepDone ? (
          <p className="text-xs text-gray-500">
            {acrGenerated ? 'ACR generated. ' : 'ACR not generated. '}
            {pacReportGenerated ? 'PAC report generated.' : 'PAC report not generated.'}
          </p>
        ) : undefined,
      },
    ];

    if (trialStepApplicable) {
      list.push({
        id: 9,
        label: 'Mark comparison trial complete',
        status: trialStepDone ? 'done' : isValidatingTrial ? 'in-progress' : 'not-started',
        detail: trialStepDone
          ? undefined
          : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoadingTrial || isValidatingTrial || !canValidateTrial || needsPdfxtData}
                title={needsPdfxtData ? 'Log pdfxt data first' : undefined}
                onClick={handleValidateTrial}
              >
                {isValidatingTrial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark trial complete'}
              </Button>
              {!canValidateTrial && (
                <span className="text-xs text-gray-500">Requires an Admin or Operator role.</span>
              )}
              {canValidateTrial && needsPdfxtData && (
                <span className="text-xs text-gray-500">Log pdfxt data first.</span>
              )}
            </div>
          ),
      });
    }

    return list;
  }, [
    aiAnalysisStatus, step2Done, aiAnalysisEverCompleted, step3Done, step3Started, guidanceFullyResolved, guidanceAcknowledgedFlag, guidanceAcknowledgmentStale, guidanceAcknowledgment,
    noteInput, isSubmittingAck, handleAcknowledge, pendingGuidance.length, pendingFixable.length,
    verificationDone, postRemediationStatus, reanalysisDone, reanalysisInProgress,
    guidanceResolved, secondReauditDone, artifactsStepDone, acrGenerated, pacReportGenerated,
    trialStepApplicable, trialStepDone, isValidatingTrial, isLoadingTrial, canValidateTrial, needsPdfxtData, handleValidateTrial,
  ]);

  const recommendedNextId = useMemo(
    () => steps.find(s => s.status !== 'done' && s.status !== 'skipped')?.id,
    [steps]
  );

  return (
    <Card className="mx-6 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gray-500" />
          Remediation Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {steps.map(step => (
          <StepRow key={step.id} step={step} isRecommendedNext={step.id === recommendedNextId} />
        ))}
      </CardContent>
    </Card>
  );
}
