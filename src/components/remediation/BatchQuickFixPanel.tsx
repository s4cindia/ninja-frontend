import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface BatchQuickFixPanelProps {
  jobId: string;
  fixType: string;
  fixName: string;
  issues: Array<{
    id: string;
    code: string;
    message: string;
    filePath: string;
    location?: string;
  }>;
  onComplete: () => void;
  onCancel: () => void;
}

export function BatchQuickFixPanel({
  jobId,
  fixType,
  fixName,
  issues,
  onComplete,
  onCancel
}: BatchQuickFixPanelProps) {
  const [results, setResults] = useState<any>(null);
  const queryClient = useQueryClient();

  const applyBatchMutation = useMutation({
    mutationFn: async () => {
      console.log('[Batch Quick Fix] Applying fixes:', {
        jobId,
        issueIds: issues.map(i => i.id),
        fixType
      });

      const response = await api.post(
        `/epub/job/${jobId}/remediation/quick-fix/batch`,
        {
          issueIds: issues.map(i => i.id),
          fixType
        }
      );

      console.log('[Batch Quick Fix] Response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['remediation-plan', jobId] });
      queryClient.invalidateQueries({ queryKey: ['issues', jobId] });
    },
    onError: (error: unknown) => {
      console.error('[Batch Quick Fix] Error:', error);
    }
  });

  if (results) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Batch Fix Results</h3>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <span className="font-medium">
              {results.successful.length} of {results.totalAttempted} fixes applied successfully
            </span>
          </div>

          {results.failed.length > 0 && (
            <div className="flex items-center gap-2 text-red-700">
              <XCircle size={20} />
              <span className="font-medium">
                {results.failed.length} fixes failed
              </span>
            </div>
          )}

          {results.failed.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm font-medium text-red-800 mb-2">Failed Issues:</p>
              <ul className="text-xs text-red-700 space-y-1">
                {results.failed.map((fail: any, idx: number) => (
                  <li key={idx}>
                    Issue {fail.issueId}: {fail.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={onComplete}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded">
          <Zap className="text-green-600" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{fixName}</h3>
          <p className="text-sm text-gray-600">
            Apply to {issues.length} similar {issues.length === 1 ? 'issue' : 'issues'}
          </p>
        </div>
      </div>

      <div className="mb-6 max-h-64 overflow-y-auto">
        <p className="text-sm font-medium text-gray-700 mb-2">
          This will fix the following issues:
        </p>
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li key={issue.id} className="text-sm bg-gray-50 p-2 rounded">
              <div className="font-medium text-gray-900">{issue.message}</div>
              <div className="text-xs text-gray-600">{issue.filePath}</div>
              {issue.location && (
                <div className="text-xs text-gray-500">{issue.location}</div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3 mb-6">
        <p className="text-sm text-green-800">
          All {issues.length} fixes will be applied automatically. The system will modify
          the affected files and update the issue status.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => applyBatchMutation.mutate()}
          disabled={applyBatchMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applyBatchMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Applying...
            </>
          ) : (
            <>
              <Zap size={16} />
              Apply All ({issues.length})
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={applyBatchMutation.isPending}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {applyBatchMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            Failed to apply batch fixes: {(applyBatchMutation.error as Error)?.message || 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  );
}
