import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Loader2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  Clock,
  FileText,
  ExternalLink,
  Search,
  Wrench,
  Download,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PolicySummaryCard, GateLiveStatus } from '@/components/workflow/PolicySummaryCard';
import { workflowService } from '@/services/workflowService';
import { useBatchSocket } from '@/hooks/useBatchSocket';

// ── Pipeline phase definitions ────────────────────────────────────────────────
const PIPELINE_PHASES = [
  { key: 'ingest',      label: 'Ingest',      states: ['UPLOAD_RECEIVED', 'PREPROCESSING'],                                            hitlStates: [] as string[] },
  { key: 'audit',       label: 'Audit',        states: ['RUNNING_EPUBCHECK', 'RUNNING_ACE', 'RUNNING_AI_ANALYSIS', 'AWAITING_AI_REVIEW'], hitlStates: ['AWAITING_AI_REVIEW'] },
  { key: 'remediation', label: 'Remediation',  states: ['AUTO_REMEDIATION', 'AWAITING_REMEDIATION_REVIEW'],                             hitlStates: ['AWAITING_REMEDIATION_REVIEW'] },
  { key: 'verify',      label: 'Verify',       states: ['VERIFICATION_AUDIT', 'CONFORMANCE_MAPPING', 'AWAITING_CONFORMANCE_REVIEW'],     hitlStates: ['AWAITING_CONFORMANCE_REVIEW'] },
  { key: 'certify',     label: 'Certify',      states: ['ACR_GENERATION', 'AWAITING_ACR_SIGNOFF'],                                      hitlStates: ['AWAITING_ACR_SIGNOFF'] },
  { key: 'done',        label: 'Done',         states: ['COMPLETED'],                                                                   hitlStates: [] as string[] },
];

// States that come after each HITL gate (used to compute passedCount)
const STATES_AFTER: Record<string, string[]> = {
  AI_REVIEW: ['AUTO_REMEDIATION', 'AWAITING_REMEDIATION_REVIEW', 'VERIFICATION_AUDIT', 'CONFORMANCE_MAPPING', 'AWAITING_CONFORMANCE_REVIEW', 'ACR_GENERATION', 'AWAITING_ACR_SIGNOFF', 'COMPLETED'],
  REMEDIATION_REVIEW: ['VERIFICATION_AUDIT', 'CONFORMANCE_MAPPING', 'AWAITING_CONFORMANCE_REVIEW', 'ACR_GENERATION', 'AWAITING_ACR_SIGNOFF', 'COMPLETED'],
  CONFORMANCE_REVIEW: ['ACR_GENERATION', 'AWAITING_ACR_SIGNOFF', 'COMPLETED'],
  ACR_SIGNOFF: ['COMPLETED'],
};
const GATE_WAITING_STATE: Record<string, string> = {
  AI_REVIEW: 'AWAITING_AI_REVIEW',
  REMEDIATION_REVIEW: 'AWAITING_REMEDIATION_REVIEW',
  CONFORMANCE_REVIEW: 'AWAITING_CONFORMANCE_REVIEW',
  ACR_SIGNOFF: 'AWAITING_ACR_SIGNOFF',
};

const STATE_LABELS: Record<string, string> = {
  UPLOAD_RECEIVED: 'Uploading',
  PREPROCESSING: 'Processing',
  RUNNING_EPUBCHECK: 'Auditing',
  RUNNING_ACE: 'Auditing',
  RUNNING_AI_ANALYSIS: 'AI Analysis',
  AWAITING_AI_REVIEW: 'AI Review ⏸',
  AUTO_REMEDIATION: 'Remediating',
  AWAITING_REMEDIATION_REVIEW: 'Remediation Review ⏸',
  VERIFICATION_AUDIT: 'Verifying',
  CONFORMANCE_MAPPING: 'Conformance Mapping',
  AWAITING_CONFORMANCE_REVIEW: 'Conformance Review ⏸',
  ACR_GENERATION: 'Generating ACR',
  AWAITING_ACR_SIGNOFF: 'ACR Sign-off ⏸',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const PAST_REMEDIATION = new Set([
  'AWAITING_REMEDIATION_REVIEW',
  'VERIFICATION_AUDIT',
  'CONFORMANCE_MAPPING',
  'AWAITING_CONFORMANCE_REVIEW',
  'ACR_GENERATION',
  'AWAITING_ACR_SIGNOFF',
  'COMPLETED',
]);

function countStates(perStage: Record<string, number>, states: string[]): number {
  return states.reduce((sum, s) => sum + (perStage[s] ?? 0), 0);
}

// ── Batch pipeline stepper ────────────────────────────────────────────────────
type PhaseStatus = 'completed' | 'active' | 'pending';

function BatchPipelineStepper({
  perStage,
  totalFiles,
}: {
  perStage: Record<string, number>;
  totalFiles: number;
}) {
  const phases = PIPELINE_PHASES.map(phase => {
    const inPhase  = countStates(perStage, [...phase.states]);
    const hitlWaiting = countStates(perStage, phase.hitlStates);
    // Count files that are in states AFTER this phase (i.e. have passed it)
    const phaseIdx  = PIPELINE_PHASES.findIndex(p => p.key === phase.key);
    const laterStates = PIPELINE_PHASES.slice(phaseIdx + 1).flatMap(p => [...p.states]);
    const pastPhase = countStates(perStage, laterStates);

    let status: PhaseStatus;
    if (pastPhase === totalFiles || (phase.key === 'done' && (perStage['COMPLETED'] ?? 0) === totalFiles)) {
      status = 'completed';
    } else if (inPhase > 0 || (phase.key === 'done' && (perStage['COMPLETED'] ?? 0) > 0)) {
      status = 'active';
    } else {
      status = 'pending';
    }

    return { ...phase, inPhase, hitlWaiting, pastPhase, status };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Pipeline Progress</h3>
      <div className="flex items-start">
        {phases.map((phase, idx) => {
          const isLast = idx === phases.length - 1;
          const isHitlWaiting = phase.status === 'active' && phase.hitlWaiting > 0;
          const dotColor =
            phase.status === 'completed' ? 'bg-green-500 border-green-500' :
            isHitlWaiting                ? 'bg-amber-500 border-amber-500 ring-4 ring-amber-100' :
            phase.status === 'active'    ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100' :
                                           'bg-white border-gray-300';
          const labelColor =
            phase.status === 'completed' ? 'text-green-700' :
            isHitlWaiting                ? 'text-amber-700 font-semibold' :
            phase.status === 'active'    ? 'text-blue-700 font-semibold' :
                                           'text-gray-400';
          const lineColor =
            phase.status === 'completed' || phases[idx + 1]?.status !== 'pending'
              ? 'bg-green-200' : 'bg-gray-200';

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute top-3 left-1/2 w-full h-0.5 z-0">
                  <div className={`h-full ${lineColor} transition-colors`} />
                </div>
              )}
              {/* Dot */}
              <div className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${dotColor}`}>
                {phase.status === 'completed' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                )}
                {isHitlWaiting && (
                  <Pause className="w-3 h-3 text-white" strokeWidth={3} />
                )}
                {phase.status === 'active' && !isHitlWaiting && (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                )}
              </div>
              {/* Label */}
              <div className={`mt-2 text-xs text-center ${labelColor}`}>{phase.label}</div>
              {/* File count badges — show both waiting and actively-processing counts */}
              {(() => {
                const processing = phase.inPhase - phase.hitlWaiting;
                return (
                  <>
                    {phase.hitlWaiting > 0 && (
                      <div className="mt-0.5 text-xs text-amber-600 font-medium">
                        {phase.hitlWaiting} waiting
                      </div>
                    )}
                    {processing > 0 && (
                      <div className="mt-0.5 text-xs text-blue-600 font-medium">
                        {processing} {phase.hitlWaiting > 0 ? 'processing' : `file${processing !== 1 ? 's' : ''}`}
                      </div>
                    )}
                  </>
                );
              })()}
              {phase.status === 'completed' && phase.key !== 'done' && (
                <div className="mt-0.5 text-xs text-green-600">✓ all</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-green-700 bg-green-50 border-green-200',
  FAILED: 'text-red-700 bg-red-50 border-red-200',
  CANCELLED: 'text-gray-600 bg-gray-50 border-gray-200',
  PAUSED: 'text-amber-700 bg-amber-50 border-amber-200',
  PROCESSING: 'text-blue-700 bg-blue-50 border-blue-200',
  PENDING: 'text-gray-600 bg-gray-50 border-gray-200',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'text-gray-600 bg-gray-50 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status}
    </span>
  );
}

export function BatchDashboardPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['agentic-batch', batchId],
    queryFn: () => workflowService.getAgenticBatchDashboard(batchId!),
    refetchInterval: 10_000,
    enabled: !!batchId,
  });

  // WebSocket real-time progress
  // We subscribe but use it only to trigger refetches — perStage must come from REST
  // to stay accurate (WS snapshots can be emitted before all workflows are committed to DB)
  const { progress: wsProgress } = useBatchSocket(batchId ?? null);

  useEffect(() => {
    if (wsProgress) {
      // Drive UI off authoritative REST data; WS event is just the trigger
      queryClient.invalidateQueries({ queryKey: ['agentic-batch', batchId] });
    }
  }, [wsProgress, batchId, queryClient]);

  const pauseMutation = useMutation({
    mutationFn: () => workflowService.pauseBatch(batchId!),
    onSuccess: (data) => {
      toast.success(`Paused ${data.pausedCount} workflows`);
      queryClient.invalidateQueries({ queryKey: ['agentic-batch', batchId] });
    },
    onError: () => toast.error('Failed to pause batch'),
  });

  const resumeMutation = useMutation({
    mutationFn: () => workflowService.resumeBatch(batchId!),
    onSuccess: (data) => {
      toast.success(`Resumed ${data.resumedCount} workflows`);
      queryClient.invalidateQueries({ queryKey: ['agentic-batch', batchId] });
    },
    onError: () => toast.error('Failed to resume batch'),
  });

  const retryMutation = useMutation({
    mutationFn: () => workflowService.retryFailedBatch(batchId!),
    onSuccess: (data) => {
      if (data.retriedCount === 0) {
        toast('No failed workflows to retry', { icon: 'ℹ️' });
      } else {
        toast.success(`Retrying ${data.retriedCount} failed workflows`);
      }
      queryClient.invalidateQueries({ queryKey: ['agentic-batch', batchId] });
    },
    onError: () => toast.error('Failed to retry workflows'),
  });

  const restartStuckMutation = useMutation({
    mutationFn: () => workflowService.restartStuckBatch(batchId!),
    onSuccess: (data) => {
      if (data.restartedCount === 0) {
        toast('No stuck workflows found', { icon: 'ℹ️' });
      } else {
        toast.success(`Requeued ${data.restartedCount} stuck workflow${data.restartedCount !== 1 ? 's' : ''}`);
      }
      queryClient.invalidateQueries({ queryKey: ['agentic-batch', batchId] });
    },
    onError: () => toast.error('Failed to restart stuck workflows'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch not found</h2>
          <p className="text-gray-600 mb-4">The batch dashboard could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // Prefer WebSocket data for live summary counts (ok to be slightly stale)
  const completedCount = wsProgress?.completed ?? batch.metrics.completedCount;
  const failedCount = wsProgress?.failedCount ?? batch.metrics.failedCount;
  const totalFiles = batch.totalFiles;
  const progressPercent = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  const canPause = !['COMPLETED', 'CANCELLED', 'PAUSED'].includes(batch.status);
  const canResume = batch.status === 'PAUSED';
  const canRetry = failedCount > 0;
  const canRestartStuck = !['COMPLETED', 'CANCELLED'].includes(batch.status);

  const handleAction = (action: string) => {
    if (confirmAction === action) {
      setConfirmAction(null);
      if (action === 'pause') pauseMutation.mutate();
      else if (action === 'resume') resumeMutation.mutate();
      else if (action === 'retry') retryMutation.mutate();
    } else {
      setConfirmAction(action);
      // Auto-clear confirm after 3 seconds
      setTimeout(() => setConfirmAction(null), 3000);
    }
  };

  // Always use REST perStage for the stepper — WebSocket snapshots can be taken before all
  // workflows exist in the DB, causing some files to appear missing from phase counts.
  const currentStages = batch.metrics.perStage;

  // ── Compute live HITL gate status for the policy card ────────────────────
  const gateStatus = Object.fromEntries(
    Object.entries(GATE_WAITING_STATE).map(([gate, waitingState]) => {
      const waitingCount = currentStages[waitingState] ?? 0;
      const passedCount  = countStates(currentStages, STATES_AFTER[gate] ?? []);
      const gatePolicy   = batch.autoApprovalPolicy?.gates?.[gate as keyof typeof batch.autoApprovalPolicy.gates];
      const isAutoAccept = gatePolicy === 'auto-accept' || (typeof gatePolicy === 'object' && gatePolicy?.mode === 'auto-accept');

      let status: GateLiveStatus['status'];
      if (waitingCount > 0) {
        status = 'active';
      } else if (passedCount > 0 && isAutoAccept) {
        status = 'skipped';
      } else if (passedCount > 0) {
        status = 'completed';
      } else {
        status = 'pending';
      }

      return [gate, { status, waitingCount, passedCount } satisfies GateLiveStatus];
    })
  ) as Record<string, GateLiveStatus>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Link
              to={`/workflow/batch/${batchId}/time-report`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <BarChart2 className="h-4 w-4" />
              Time Report
            </Link>
            <Button variant="outline" onClick={() => navigate('/workflow/batch/new')}>
              + New Agentic Batch
            </Button>
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{batch.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={batch.status} />
              <span className="text-sm text-gray-500">{totalFiles} files</span>
              <span className="text-sm text-gray-500">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Started {new Date(batch.startedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {canPause && (
              <Button
                variant={confirmAction === 'pause' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => handleAction('pause')}
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4 mr-1" />
                )}
                {confirmAction === 'pause' ? 'Confirm pause?' : 'Pause'}
              </Button>
            )}
            {canResume && (
              <Button
                variant={confirmAction === 'resume' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleAction('resume')}
                disabled={resumeMutation.isPending}
              >
                {resumeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {confirmAction === 'resume' ? 'Confirm resume?' : 'Resume'}
              </Button>
            )}
            {canRetry && (
              <Button
                variant={confirmAction === 'retry' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleAction('retry')}
                disabled={retryMutation.isPending}
              >
                {retryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                {confirmAction === 'retry' ? `Confirm retry ${failedCount}?` : `Retry failed (${failedCount})`}
              </Button>
            )}
            {canRestartStuck && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => restartStuckMutation.mutate()}
                disabled={restartStuckMutation.isPending}
                title="Re-queue any workflows stuck in a processing state for more than 5 minutes"
              >
                {restartStuckMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-1" />
                )}
                Restart stuck
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: progress + stages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Overall Progress</h3>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {completedCount} / {totalFiles} files processed
                </span>
                <span className="text-sm font-medium text-gray-900">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-700">{completedCount}</div>
                <div className="text-xs text-green-600">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-red-700">{failedCount}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-700">
                  {Math.max(0, totalFiles - completedCount - failedCount)}
                </div>
                <div className="text-xs text-blue-600">In Progress</div>
              </div>
            </div>
          </div>

          {/* Pipeline stepper — replaces raw "Current States" */}
          <BatchPipelineStepper perStage={currentStages} totalFiles={totalFiles} />

          {/* Files — unified progressive artifact disclosure */}
          {batch.allWorkflows && batch.allWorkflows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">Files</h3>
                <span className="ml-auto text-xs text-gray-500">
                  {batch.allWorkflows.length} file{batch.allWorkflows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {batch.allWorkflows.map(wf => {
                  const badgeColor =
                    wf.currentState === 'COMPLETED'          ? 'text-green-700 bg-green-50 border-green-200' :
                    wf.currentState === 'FAILED'             ? 'text-red-700 bg-red-50 border-red-200' :
                    wf.currentState.startsWith('AWAITING_')  ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                                               'text-blue-700 bg-blue-50 border-blue-200';
                  const stateLabel = STATE_LABELS[wf.currentState] ?? wf.currentState;
                  const showRemediation = wf.jobId != null && PAST_REMEDIATION.has(wf.currentState);
                  return (
                    <div key={wf.workflowId} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate flex-1">{wf.filename}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badgeColor}`}>
                          {stateLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/workflow/${wf.workflowId}`)}
                          className="gap-1 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                        {wf.jobId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(
                              `/jobs/${wf.jobId}?batchId=${batchId}&filename=${encodeURIComponent(wf.filename)}`
                            )}
                            className="gap-1 text-xs"
                          >
                            <Search className="h-3 w-3" />
                            Audit Results
                          </Button>
                        )}
                        {showRemediation && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(
                              wf.fileType === 'pdf'
                                ? `/pdf/${wf.jobId}/remediation?batchId=${batchId}&filename=${encodeURIComponent(wf.filename)}`
                                : `/epub/remediate/${wf.jobId}?batchId=${batchId}&filename=${encodeURIComponent(wf.filename)}`
                            )}
                            className="gap-1 text-xs"
                          >
                            <Wrench className="h-3 w-3" />
                            Remediation
                          </Button>
                        )}
                        {wf.remediatedFileName && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(
                              `/api/v1/workflows/${wf.workflowId}/download`,
                              '_blank',
                              'noopener,noreferrer'
                            )}
                            className="gap-1 text-xs"
                          >
                            <Download className="h-3 w-3" />
                            Download Remediated
                          </Button>
                        )}
                        {wf.acrJobId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/acr/report/review/${wf.acrJobId}?batchId=${batchId}`)}
                            className="gap-1 text-xs border-green-400 text-green-800 hover:bg-green-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View ACR
                          </Button>
                        )}
                      </div>
                      {wf.currentState === 'FAILED' && wf.errorMessage && (
                        <p className="mt-2 text-xs text-red-600">{wf.errorMessage}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HITL gate queue — grouped by gate with batch review option */}
          {batch.hitlWaiting && batch.hitlWaiting.length > 0 && (() => {
            // Group waiting items by gate slug (extracted from reviewUrl)
            const byGate = new Map<string, typeof batch.hitlWaiting>();
            for (const item of batch.hitlWaiting) {
              const slug = item.reviewUrl.split('/hitl/')[1] ?? 'ai-review';
              if (!byGate.has(slug)) byGate.set(slug, []);
              byGate.get(slug)!.push(item);
            }

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-base font-semibold text-amber-900">HITL Gates Waiting</h3>
                  <span className="ml-auto text-xs text-amber-700">
                    {batch.hitlWaiting.length} file{batch.hitlWaiting.length !== 1 ? 's' : ''} pending
                  </span>
                </div>

                {Array.from(byGate.entries()).map(([slug, items]) => (
                  <div key={slug} className="bg-white border border-amber-200 rounded-md p-3 space-y-2">
                    {/* Gate header with batch review button */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                          {items[0].gate}
                        </div>
                        <div className="text-xs text-amber-600 mt-0.5">
                          {items.length} file{items.length !== 1 ? 's' : ''} waiting
                        </div>
                      </div>
                      {items.length > 1 ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/workflow/batch/${batchId}/hitl/${slug}`)}
                          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0"
                        >
                          Review as Batch
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`${items[0].reviewUrl}?batchId=${batchId}`)}
                          className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                        >
                          Review
                        </Button>
                      )}
                    </div>

                    {/* File list */}
                    <div className="space-y-1 border-t border-amber-100 pt-2">
                      {items.map(item => (
                        <div key={item.workflowId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-amber-900 truncate">{item.filename}</span>
                          <button
                            onClick={() => navigate(`${item.reviewUrl}?batchId=${batchId}`)}
                            className="shrink-0 text-xs text-amber-600 hover:text-amber-800 underline"
                          >
                            Review individually
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Right column: policy card */}
        <div className="space-y-4">
          {batch.autoApprovalPolicy ? (
            <PolicySummaryCard
              policy={batch.autoApprovalPolicy}
              gateStatus={gateStatus}
              totalFiles={totalFiles}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Review Mode</h3>
              <p className="text-sm text-gray-600">
                This batch uses the standard manual review workflow. All HITL gates require human approval.
              </p>
            </div>
          )}

          {/* Completion info */}
          {batch.completedAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Batch completed</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                {new Date(batch.completedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
