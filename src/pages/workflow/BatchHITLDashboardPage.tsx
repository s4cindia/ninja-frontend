import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  FileText,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { workflowService, BatchHITLCluster } from '@/services/workflowService';

const GATE_LABELS: Record<string, string> = {
  'ai-review': 'AI Review',
  'remediation-review': 'Remediation Review',
  'conformance-review': 'Conformance Review',
  'acr-signoff': 'ACR Sign-off',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-700 bg-red-50 border-red-200',
  serious:  'text-orange-700 bg-orange-50 border-orange-200',
  moderate: 'text-amber-700 bg-amber-50 border-amber-200',
  minor:    'text-gray-600 bg-gray-50 border-gray-200',
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_COLORS[severity.toLowerCase()] ?? SEVERITY_COLORS.moderate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {severity}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: 'ACCEPT' | 'REJECT' | null }) {
  if (!decision) return <span className="text-xs text-gray-400 italic">Pending</span>;
  if (decision === 'ACCEPT') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
      <XCircle className="w-3.5 h-3.5" /> Rejected
    </span>
  );
}

function ClusterCard({
  cluster,
  onDecision,
  isPending,
}: {
  cluster: BatchHITLCluster;
  onDecision: (id: string, decision: 'ACCEPT' | 'REJECT') => void;
  isPending: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-lg p-4 transition-colors ${
        cluster.decision === 'ACCEPT'
          ? 'border-green-200 bg-green-50/30'
          : cluster.decision === 'REJECT'
          ? 'border-red-200 bg-red-50/30'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: issue info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <code className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
              {cluster.issueCode}
            </code>
            <SeverityBadge severity={cluster.severity} />
            <DecisionBadge decision={cluster.decision} />
          </div>
          <p className="text-sm font-medium text-gray-800 truncate">{cluster.issueTitle}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {cluster.fileCount} {cluster.fileCount === 1 ? 'file' : 'files'}
            </span>
            <span className="flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              {cluster.totalInstances} {cluster.totalInstances === 1 ? 'instance' : 'instances'}
            </span>
          </div>
        </div>

        {/* Right: Accept / Reject buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onDecision(cluster.id, 'ACCEPT')}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
              ${cluster.decision === 'ACCEPT'
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-400 hover:text-green-700'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onDecision(cluster.id, 'REJECT')}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
              ${cluster.decision === 'REJECT'
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-400 hover:text-red-700'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export function BatchHITLDashboardPage() {
  const { batchId, gate } = useParams<{ batchId: string; gate: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingClusterId, setPendingClusterId] = useState<string | null>(null);

  const queryKey = ['batch-hitl-clusters', batchId, gate];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => workflowService.getBatchHITLClusters(batchId!, gate!),
    enabled: !!batchId && !!gate,
    refetchInterval: false,
  });

  const decisionMutation = useMutation({
    mutationFn: ({ clusterId, decision }: { clusterId: string; decision: 'ACCEPT' | 'REJECT' }) =>
      workflowService.updateClusterDecision(batchId!, clusterId, decision),
    onMutate: ({ clusterId }) => setPendingClusterId(clusterId),
    onSuccess: (result) => {
      // Optimistic update in cache
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        const clusters = old.clusters.map(c =>
          c.id === result.cluster.id ? result.cluster : c
        );
        const reviewedCount = clusters.filter(c => c.decision !== null).length;
        return {
          ...old,
          clusters,
          reviewedCount,
          allReviewed: reviewedCount === clusters.length && clusters.length > 0,
        };
      });
    },
    onError: () => toast.error('Failed to save decision'),
    onSettled: () => setPendingClusterId(null),
  });

  const applyMutation = useMutation({
    mutationFn: () => workflowService.applyBatchDecisions(batchId!, gate!),
    onSuccess: (result) => {
      toast.success(`Decisions applied to ${result.appliedCount} workflows`);
      navigate(`/workflow/batch/${batchId}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to apply decisions';
      toast.error(message);
    },
  });

  const gateLabel = GATE_LABELS[gate ?? ''] ?? gate ?? 'Review';

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-700 text-sm">Failed to load issue clusters. Please try again.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const { clusters, reviewedCount, totalCount, allReviewed } = data;

  const progress = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/workflow/batch/${batchId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Batch
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch {gateLabel}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review each issue type once — your decision applies to all files in the batch.
          </p>
        </div>
        <Button
          onClick={() => applyMutation.mutate()}
          disabled={!allReviewed || applyMutation.isPending}
          className="shrink-0"
        >
          {applyMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Apply All Decisions
        </Button>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Review progress</span>
          <span className="text-gray-500">
            {reviewedCount} / {totalCount} clusters reviewed
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allReviewed ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {allReviewed && (
          <p className="mt-2 text-xs text-green-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All clusters reviewed — click "Apply All Decisions" to advance the batch.
          </p>
        )}
      </div>

      {/* No clusters */}
      {clusters.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">
            No issue clusters found for this gate. The workflows may not have reached this stage yet.
          </p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      )}

      {/* Cluster cards — split by severity */}
      {clusters.length > 0 && (
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Issue Types', value: totalCount },
              { label: 'Files Affected', value: Math.max(...clusters.map(c => c.fileCount), 0) },
              { label: 'Total Instances', value: clusters.reduce((s, c) => s + c.totalInstances, 0) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Issue Clusters
          </h2>

          {clusters.map(cluster => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              onDecision={(id, decision) => decisionMutation.mutate({ clusterId: id, decision })}
              isPending={pendingClusterId === cluster.id && decisionMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
