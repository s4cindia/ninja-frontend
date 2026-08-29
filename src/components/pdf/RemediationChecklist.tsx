/**
 * RemediationChecklist
 *
 * Soft-gated, 8-step guided checklist for the PDF Audit Results page.
 * Purely advisory — every existing action on the page stays fully clickable
 * regardless of checklist state. It only surfaces status badges and a
 * "recommended next" nudge, computed from data this page already fetches
 * (plus one job-flags lookup for step 7 and one trial lookup for step 8).
 *
 * Step 6 (re-run AI Analysis after re-audit) exists because some
 * fix-eligibility checks are gated on file state that only becomes true once
 * fixes have actually been applied (e.g. HEADING-SKIP's rule-based auto-fix
 * needs /MarkInfo /Marked, which isn't set until after the apply+re-audit
 * cycle) — so a second AI Analysis pass can surface newly-fixable issues that
 * the first pass legitimately couldn't have found.
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
  postRemediationAuditRunAt?: string | null;
  aiAnalyzedAt?: string | null;
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
  postRemediationAuditRunAt,
  aiAnalyzedAt,
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
      .catch(() => { /* non-fatal — step 8 just shows as not-started */ })
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
  const step3Done = step2Done && pendingFixable.length === 0;
  const step3Started = appliedFixableCount > 0;
  const step4FullyResolved = step2Done && pendingGuidance.length === 0;
  const step4Acknowledged = guidanceAcknowledgment != null;
  const step5Done = postRemediationStatus === 'complete';
  // Done once AI Analysis has been re-run at least once since the most
  // recent re-audit — a plain timestamp comparison, not a new poll.
  const reanalysisDone = step5Done && !!aiAnalyzedAt && !!postRemediationAuditRunAt
    && new Date(aiAnalyzedAt).getTime() > new Date(postRemediationAuditRunAt).getTime();
  const reanalysisInProgress = step5Done && aiAnalysisStatus === 'processing';
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
        status: step2Done ? 'done' : aiAnalysisStatus === 'processing' ? 'in-progress' : 'not-started',
      },
      {
        id: 3,
        label: 'Apply AI-suggested fixes',
        status: !step2Done ? 'not-started' : step3Done ? 'done' : step3Started ? 'in-progress' : 'not-started',
      },
      {
        id: 4,
        label: 'Resolve guidance-only items',
        status: !step2Done
          ? 'not-started'
          : step4FullyResolved
            ? 'done'
            : step4Acknowledged
              ? 'skipped'
              : 'not-started',
        detail: !step2Done || step4FullyResolved
          ? undefined
          : step4Acknowledged
            ? (
              <p className="text-xs text-amber-700">
                &ldquo;{guidanceAcknowledgment!.note}&rdquo; — {guidanceAcknowledgment!.remainingCount} item(s) left as-is,
                acknowledged {new Date(guidanceAcknowledgment!.acknowledgedAt).toLocaleString()}
              </p>
            )
            : (
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
            ),
      },
      {
        id: 5,
        label: 'Re-audit to verify',
        status: step5Done ? 'done' : postRemediationStatus === 'pending' ? 'in-progress' : 'not-started',
      },
      {
        id: 6,
        label: 'Re-run AI Analysis (final check)',
        status: !step5Done
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
        id: 7,
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
        id: 8,
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
    aiAnalysisStatus, step2Done, step3Done, step3Started, step4FullyResolved, step4Acknowledged, guidanceAcknowledgment,
    noteInput, isSubmittingAck, handleAcknowledge, pendingGuidance.length, pendingFixable.length,
    step5Done, postRemediationStatus, reanalysisDone, reanalysisInProgress, artifactsStepDone, acrGenerated, pacReportGenerated,
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
