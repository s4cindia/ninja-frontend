import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { api } from '@/services/api';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  AlertCircle,
  StopCircle,
  Play,
  RefreshCw,
} from 'lucide-react';

interface JobStatus {
  jobId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  issuesFixed?: number;
  error?: string;
}

interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  jobs: JobStatus[];
  summary: {
    totalIssuesFixed: number;
    successRate: number;
  };
  estimatedTimeRemaining?: number;
  currentJobIndex?: number;
}

interface SelectedJob {
  jobId: string;
  fileName: string;
}

interface BatchProgressProps {
  batchId: string;
  selectedJobs?: SelectedJob[];
  onComplete?: (status: BatchStatus) => void;
  onCancel?: () => void;
  className?: string;
}

const POLL_INTERVAL = 2500;

const STATUS_ICONS = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: StopCircle,
};

const STATUS_COLORS = {
  pending: 'text-gray-500',
  processing: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  cancelled: 'text-amber-500',
};

const mapBatchStatus = (data: Record<string, unknown>): BatchStatus => {
  const jobs = (data.jobs || []) as Record<string, unknown>[];
  const summary = (data.summary || {}) as Record<string, unknown>;
  
  return {
    batchId: String(data.batchId || data.batch_id || ''),
    status: (data.status || 'pending') as BatchStatus['status'],
    totalJobs: Number(data.totalJobs || data.total_jobs || 0),
    completedJobs: Number(data.completedJobs || data.completed_jobs || 0),
    failedJobs: Number(data.failedJobs || data.failed_jobs || 0),
    jobs: jobs.map(j => ({
      jobId: String(j.jobId || j.job_id || ''),
      fileName: String(j.fileName || j.file_name || 'Unknown'),
      status: (j.status || 'pending') as JobStatus['status'],
      issuesFixed: j.issuesFixed !== undefined ? Number(j.issuesFixed || j.issues_fixed) : undefined,
      error: j.error ? String(j.error) : undefined,
    })),
    summary: {
      totalIssuesFixed: Number(summary.totalIssuesFixed || summary.total_issues_fixed || 0),
      successRate: Number(summary.successRate || summary.success_rate || 0),
    },
    estimatedTimeRemaining: data.estimatedTimeRemaining !== undefined 
      ? Number(data.estimatedTimeRemaining || data.estimated_time_remaining) 
      : undefined,
    currentJobIndex: data.currentJobIndex !== undefined
      ? Number(data.currentJobIndex || data.current_job_index)
      : undefined,
  };
};

const MAX_RETRIES = 3;

const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export const BatchProgress: React.FC<BatchProgressProps> = ({
  batchId,
  selectedJobs: _selectedJobs,
  onComplete,
  onCancel,
  className = '',
}) => {
  const { accessToken } = useAuthStore();
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isSSEConnectedRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get(`/epub/batch/${batchId}`);
      const data = response.data.data || response.data;
      const status = mapBatchStatus(data);
      setBatchStatus(status);
      setRetryCount(0);
      
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (status.status === 'completed' && onComplete) {
          onComplete(status);
        }
      }
    } catch (err) {
      console.error('[BatchProgress] Failed to fetch status:', err);

      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
      } else {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        const errorMessage = err instanceof Error
          ? err.message
          : 'Failed to fetch batch status. Please check your connection.';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [batchId, onComplete, retryCount]);

  // SSE Connection Effect - runs only when batchId changes
  useEffect(() => {
    // Skip if no batchId or demo mode
    if (!batchId || batchId.startsWith('demo-')) {
      return;
    }

    // Skip if already connected to this batch
    if (batchIdRef.current === batchId && isSSEConnectedRef.current) {
      return;
    }

    // Close existing connection if connecting to different batch
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isSSEConnectedRef.current = false;
    }

    if (!accessToken) {
      console.warn('[SSE] No auth token available');
      return;
    }

    batchIdRef.current = batchId;

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const sseUrl = `${apiBaseUrl}/sse/batch/${batchId}/progress?token=${encodeURIComponent(accessToken)}`;

    console.log('[SSE] Opening connection for batch:', batchId);

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connection established');
      isSSEConnectedRef.current = true;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Event received:', data.type);

        if (data.type === 'connected') {
          console.log('[SSE] Server confirmed:', data.clientId);
          return;
        }

        if (data.type === 'job_started') {
          setBatchStatus(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              jobs: prev.jobs.map(job =>
                job.jobId === data.jobId ? { ...job, status: 'processing' as const } : job
              ),
            };
          });
        }

        if (data.type === 'job_completed') {
          setBatchStatus(prev => {
            if (!prev) return prev;
            const updatedJobs = prev.jobs.map(job =>
              job.jobId === data.jobId
                ? { ...job, status: 'completed' as const, issuesFixed: data.issuesFixed }
                : job
            );
            return {
              ...prev,
              jobs: updatedJobs,
              completedJobs: updatedJobs.filter(j => j.status === 'completed').length,
            };
          });
        }

        if (data.type === 'job_failed') {
          setBatchStatus(prev => {
            if (!prev) return prev;
            const updatedJobs = prev.jobs.map(job =>
              job.jobId === data.jobId
                ? { ...job, status: 'failed' as const, error: data.error }
                : job
            );
            return {
              ...prev,
              jobs: updatedJobs,
              failedJobs: updatedJobs.filter(j => j.status === 'failed').length,
            };
          });
        }

        if (data.type === 'batch_completed') {
          setBatchStatus(prev => prev ? {
            ...prev,
            status: data.status,
            summary: data.summary,
          } : prev);
        }
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE] Error:', err);
      isSSEConnectedRef.current = false;
      // Don't close on error - EventSource will auto-reconnect
    };

    // Cleanup only on unmount or batchId change
    return () => {
      console.log('[SSE] Cleanup for batch:', batchIdRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      isSSEConnectedRef.current = false;
      batchIdRef.current = null;
    };
  }, [batchId, accessToken]); // Only depend on batchId and accessToken

  // Polling fallback effect
  useEffect(() => {
    // Skip polling if SSE is connected
    if (isSSEConnectedRef.current) {
      // Still fetch initial status once
      fetchStatus();
      return;
    }

    // Polling fallback
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchStatus]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      // Skip API call for demo batches
      if (!batchId.startsWith('demo-') && !batchId.startsWith('batch-')) {
        await api.post(`/epub/batch/${batchId}/cancel`);
      }
    } catch (err) {
      console.warn('[BatchProgress] Cancel API call failed (batch may be demo mode):', err);
    } finally {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setBatchStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setIsCancelling(false);
      if (onCancel) onCancel();
    }
  };

  if (isLoading && !batchStatus) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!batchStatus) {
    return (
      <Alert variant="warning" className={className}>
        No batch status available
      </Alert>
    );
  }

  const progressPercent = batchStatus.totalJobs > 0
    ? Math.round((batchStatus.completedJobs / batchStatus.totalJobs) * 100)
    : 0;

  const StatusIcon = STATUS_ICONS[batchStatus.status];
  const statusColor = STATUS_COLORS[batchStatus.status];
  const isProcessing = batchStatus.status === 'processing';

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setRetryCount(0);
                fetchStatus();
                pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}
      <Card className={className}>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon 
              className={`h-5 w-5 ${statusColor} ${isProcessing ? 'animate-spin' : ''}`} 
              aria-hidden="true" 
            />
            Batch Remediation Progress
            {isSSEConnectedRef.current && eventSourceRef.current && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </CardTitle>
          {isProcessing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              aria-label="Cancel batch remediation"
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
              ) : (
                <StopCircle className="h-4 w-4 mr-1" aria-hidden="true" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress: {batchStatus.completedJobs} of {batchStatus.totalJobs} completed
            </span>
            <span className="text-sm font-semibold text-gray-900">{progressPercent}%</span>
          </div>
          <div 
            className="h-4 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Batch remediation progress"
          >
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {batchStatus.estimatedTimeRemaining !== undefined && isProcessing && (
            <p className="text-sm text-gray-500 mt-2">
              Estimated time remaining: {formatTimeRemaining(batchStatus.estimatedTimeRemaining)}
            </p>
          )}
        </div>

        {batchStatus.failedJobs > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {batchStatus.failedJobs} job(s) failed during processing
          </Alert>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Job Status</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {batchStatus.jobs.map((job, idx) => {
              const JobIcon = STATUS_ICONS[job.status];
              const jobColor = STATUS_COLORS[job.status];
              const isCurrent = idx === batchStatus.currentJobIndex && isProcessing;
              
              return (
                <div
                  key={job.jobId}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <JobIcon 
                      className={`h-4 w-4 ${jobColor} ${job.status === 'processing' ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-gray-900">{job.fileName}</span>
                    {isCurrent && (
                      <Badge variant="info" size="sm">
                        <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                        Processing
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.issuesFixed !== undefined && (
                      <span className="text-sm text-green-600">
                        {job.issuesFixed} issues fixed
                      </span>
                    )}
                    {job.error && (
                      <span className="text-sm text-red-600 max-w-48 truncate" title={job.error}>
                        {job.error}
                      </span>
                    )}
                    <Badge
                      variant={
                        job.status === 'completed' ? 'success' :
                        job.status === 'failed' ? 'error' :
                        job.status === 'processing' ? 'info' : 'default'
                      }
                      size="sm"
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      </Card>
    </>
  );
};
