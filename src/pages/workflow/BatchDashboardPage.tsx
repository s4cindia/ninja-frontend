import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PolicySummaryCard } from '@/components/workflow/PolicySummaryCard';
import { workflowService } from '@/services/workflowService';
import { useBatchSocket } from '@/hooks/useBatchSocket';

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
  const { progress: wsProgress } = useBatchSocket(batchId ?? null);

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

  // Prefer WebSocket data for live counts
  const completedCount = wsProgress?.completed ?? batch.metrics.completedCount;
  const failedCount = wsProgress?.failedCount ?? batch.metrics.failedCount;
  const totalFiles = batch.totalFiles;
  const progressPercent = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  const canPause = !['COMPLETED', 'CANCELLED', 'PAUSED'].includes(batch.status);
  const canResume = batch.status === 'PAUSED';
  const canRetry = failedCount > 0;

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

  // Stage breakdown from WebSocket or API
  const currentStages = wsProgress?.currentStages ?? batch.metrics.perStage;
  const activeStages = Object.entries(currentStages)
    .filter(([state]) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(state))
    .sort((a, b) => b[1] - a[1]);

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
          <Button variant="outline" onClick={() => navigate('/workflow/batch/new')}>
            + New Agentic Batch
          </Button>
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

          {/* Active stages breakdown */}
          {activeStages.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Current States</h3>
              <div className="space-y-2">
                {activeStages.map(([state, count]) => (
                  <div key={state} className="flex items-center gap-3">
                    <div className="w-40 text-sm text-gray-600 truncate">{state.replace(/_/g, ' ')}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full"
                        style={{ width: `${Math.round((count / totalFiles) * 100)}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-gray-700">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed workflow error details */}
          {batch.failedWorkflows && batch.failedWorkflows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-red-600" />
                <h3 className="text-base font-semibold text-red-900">Failed Workflows</h3>
              </div>
              <div className="space-y-2">
                {batch.failedWorkflows.map(wf => (
                  <div key={wf.id} className="text-sm">
                    <div className="font-medium text-red-800 truncate">{wf.filename}</div>
                    <div className="text-red-700 text-xs mt-0.5">
                      {wf.errorMessage ?? 'Unknown error'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed files — all artifacts per workflow */}
          {batch.completedWorkflows && batch.completedWorkflows.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h3 className="text-base font-semibold text-green-900">Completed Files</h3>
                <span className="ml-auto text-xs text-green-700">
                  {batch.completedWorkflows.length} file{batch.completedWorkflows.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {batch.completedWorkflows.map(wf => (
                  <div key={wf.workflowId} className="bg-white rounded-md border border-green-200 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">{wf.filename}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Audit results */}
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
                      {/* Remediation plan */}
                      {wf.jobId && (
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
                      {/* Remediated file download */}
                      {wf.remediatedFileName && wf.jobId && (
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
                      {/* ACR report */}
                      {wf.acrJobId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/acr/report/review/${wf.acrJobId}?batchId=${batchId}`)}
                          className="gap-1 text-xs border-green-400 text-green-800 hover:bg-green-100"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View ACR
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400 self-center">ACR generating…</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HITL gate queue — per-file review links */}
          {batch.hitlWaiting && batch.hitlWaiting.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-base font-semibold text-amber-900">HITL Gates Waiting</h3>
              </div>
              <div className="space-y-2">
                {batch.hitlWaiting.map(item => (
                  <div key={item.workflowId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                        {item.gate}
                      </div>
                      <div className="text-sm text-amber-900 truncate">{item.filename}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(item.reviewUrl)}
                      className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: policy card */}
        <div className="space-y-4">
          {batch.autoApprovalPolicy ? (
            <PolicySummaryCard policy={batch.autoApprovalPolicy} />
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
