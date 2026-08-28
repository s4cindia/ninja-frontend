/**
 * RemediationChecklist
 *
 * Soft-gated, 7-step guided checklist for the PDF Audit Results page.
 * Purely advisory — every existing action on the page stays fully clickable
 * regardless of checklist state. It only surfaces status badges and a
 * "recommended next" nudge, computed from data this page already fetches
 * (plus one job-flags lookup for step 6 and one trial lookup for step 7).
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
      .catch(() => { /* non-fatal — step 7 just shows as not-started */ })
      .finally(() => { if (!cancelled) setIsLoadingTrial(false); });
    return () => { cancelled = true; };
  }, [comparisonTrialId]);

  const suggestions = useMemo(() => Array.from(aiSuggestions.values()), [aiSuggestions]);

  const pendingFixable = useMemo(
    () => suggestions.filter(s => s.status === 'pending' && (s.applyMode === 'apply-to-pdf' || s.applyMode === 'auto-resolve')),
    [suggestions]
  );
  const pendingGuidance = useMemo(
    () => suggestions.filter(s => s.status === 'pending' && s.applyMode === 'guidance-only'),
    [suggestions]
  );

  const step2Done = aiAnalysisStatus === 'complete';
  const step3Done = step2Done && pendingFixable.length === 0;
  const step4FullyResolved = step2Done && pendingGuidance.length === 0;
  const step4Acknowledged = guidanceAcknowledgment != null;
  const step5Done = postRemediationStatus === 'complete';
  const step6Done = acrGenerated && pacReportGenerated;
  const step7Applicable = !!comparisonTrialId;
  const step7Done = trial?.status === 'validated';

  const canValidateTrial = userRole === 'ADMIN' || userRole === 'OPERATOR';

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
        status: !step2Done ? 'not-started' : step3Done ? 'done' : 'in-progress',
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
              : 'in-progress',
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
        label: 'Generate compliance artifacts',
        status: step6Done ? 'done' : (acrGenerated || pacReportGenerated) ? 'in-progress' : 'not-started',
        detail: !step6Done ? (
          <p className="text-xs text-gray-500">
            {acrGenerated ? 'ACR generated. ' : 'ACR not generated. '}
            {pacReportGenerated ? 'PAC report generated.' : 'PAC report not generated.'}
          </p>
        ) : undefined,
      },
    ];

    if (step7Applicable) {
      list.push({
        id: 7,
        label: 'Mark comparison trial complete',
        status: step7Done ? 'done' : isValidatingTrial ? 'in-progress' : 'not-started',
        detail: step7Done
          ? undefined
          : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoadingTrial || isValidatingTrial || !canValidateTrial}
                onClick={handleValidateTrial}
              >
                {isValidatingTrial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark trial complete'}
              </Button>
              {!canValidateTrial && (
                <span className="text-xs text-gray-500">Requires an Admin or Operator role.</span>
              )}
            </div>
          ),
      });
    }

    return list;
  }, [
    aiAnalysisStatus, step2Done, step3Done, step4FullyResolved, step4Acknowledged, guidanceAcknowledgment,
    noteInput, isSubmittingAck, handleAcknowledge, pendingGuidance.length,
    step5Done, postRemediationStatus, step6Done, acrGenerated, pacReportGenerated,
    step7Applicable, step7Done, isValidatingTrial, isLoadingTrial, canValidateTrial, handleValidateTrial,
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
