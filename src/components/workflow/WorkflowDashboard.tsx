import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pause, Play, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { workflowService, WorkflowStatus } from '@/services/workflowService';
import { useWorkflowSocket } from '@/hooks/useWorkflowSocket';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/services/api';

interface WorkflowDashboardProps {
  workflowId: string;
}

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const AUTO_STATES = new Set([
  'UPLOAD_RECEIVED',
  'PREPROCESSING',
  'RUNNING_EPUBCHECK',
  'RUNNING_ACE',
  'RUNNING_AI_ANALYSIS',
  'AUTO_REMEDIATION',
  'VERIFICATION_AUDIT',
  'CONFORMANCE_MAPPING',
  'ACR_GENERATION',
]);

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

// Gate → HITL page path mapping
const GATE_ROUTES: Record<string, string> = {
  'ai-review': '/workflow/hitl/ai-review',
  'remediation-review': '/workflow/hitl/remediation',
  'conformance-review': '/workflow/hitl/conformance',
  'acr-signoff': '/workflow/hitl/acr-signoff',
};

export function WorkflowDashboard({ workflowId }: WorkflowDashboardProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hitlBanner, setHitlBanner] = useState<{ gate: string; deepLink: string } | null>(null);

  const { stateChange, hitlRequired, workflowError } = useWorkflowSocket(workflowId);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    workflowService
      .getWorkflowStatus(workflowId)
      .then(data => {
        if (!cancelled) {
          setStatus(data);
          setFetchError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setFetchError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  // Socket: state change
  useEffect(() => {
    if (!stateChange) return;
    setStatus(prev =>
      prev
        ? {
            ...prev,
            currentState: stateChange.to,
            phase: stateChange.phase,
          }
        : prev
    );
  }, [stateChange]);

  // Socket: HITL required
  useEffect(() => {
    if (!hitlRequired) return;
    setHitlBanner({ gate: hitlRequired.gate, deepLink: hitlRequired.deepLink });
  }, [hitlRequired]);

  // Socket: error
  useEffect(() => {
    if (!workflowError) return;
    toast.error(`Workflow error: ${workflowError.error}`);
    setStatus(prev =>
      prev ? { ...prev, currentState: workflowError.state } : prev
    );
  }, [workflowError]);

  async function handleAction(action: () => Promise<void>, successMsg: string) {
    setActionLoading(true);
    try {
      await action();
      toast.success(successMsg);
      // Re-fetch status after action
      const updated = await workflowService.getWorkflowStatus(workflowId);
      setStatus(updated);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="error" title="Failed to load workflow">
        {fetchError}
      </Alert>
    );
  }

  if (!status) return null;

  const state = status.currentState.toUpperCase();
  const isTerminal = TERMINAL_STATES.has(state);
  const isAuto = AUTO_STATES.has(state);
  const isPaused = state === 'PAUSED';
  const isFailed = state === 'FAILED';

  return (
    <div className="space-y-4">
      {/* HITL Banner */}
      {hitlBanner && (
        <Alert
          variant="warning"
          title={`Human Review Required at ${hitlBanner.gate}`}
          onClose={() => setHitlBanner(null)}
        >
          <div className="flex items-center gap-3 mt-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>This workflow is waiting for your review.</span>
            <button
              type="button"
              onClick={() =>
                navigate(
                  GATE_ROUTES[hitlBanner.gate] ??
                    `/workflow/${workflowId}/hitl`
                )
              }
              className="underline font-medium hover:no-underline"
            >
              Go to review
            </button>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workflow Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <WorkflowProgressBar
            currentState={status.currentState}
            phase={status.phase}
            progress={status.progress}
          />

          {/* Metadata grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Started</dt>
              <dd className="font-medium text-gray-900">
                {formatTimestamp(status.startedAt)}
              </dd>
            </div>
            {status.completedAt && (
              <div>
                <dt className="text-gray-500">Completed</dt>
                <dd className="font-medium text-gray-900">
                  {formatTimestamp(status.completedAt)}
                </dd>
              </div>
            )}
            {status.retryCount > 0 && (
              <div>
                <dt className="text-gray-500">Retry count</dt>
                <dd className="font-medium text-orange-600">{status.retryCount}</dd>
              </div>
            )}
          </dl>

          {/* Error message */}
          {isFailed && status.errorMessage && (
            <Alert variant="error" title="Workflow failed">
              {status.errorMessage}
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {isAuto && !isTerminal && (
              <Button
                variant="secondary"
                size="sm"
                isLoading={actionLoading}
                leftIcon={<Pause className="w-4 h-4" />}
                onClick={() =>
                  handleAction(
                    () => workflowService.pauseWorkflow(workflowId),
                    'Workflow paused'
                  )
                }
              >
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                variant="primary"
                size="sm"
                isLoading={actionLoading}
                leftIcon={<Play className="w-4 h-4" />}
                onClick={() =>
                  handleAction(
                    () => workflowService.resumeWorkflow(workflowId),
                    'Workflow resumed'
                  )
                }
              >
                Resume
              </Button>
            )}
            {!isTerminal && (
              <Button
                variant="danger"
                size="sm"
                isLoading={actionLoading}
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() =>
                  handleAction(
                    () => workflowService.cancelWorkflow(workflowId),
                    'Workflow cancelled'
                  )
                }
              >
                Cancel
              </Button>
            )}
            {isFailed && (
              <Button
                variant="outline"
                size="sm"
                isLoading={actionLoading}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() =>
                  handleAction(
                    () => workflowService.retryWorkflow(workflowId),
                    'Workflow retrying…'
                  )
                }
              >
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
