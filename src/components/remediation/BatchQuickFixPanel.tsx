import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface BatchFixResults {
  successful: Array<{ issueId: string }> | number;
  failed: Array<{ issueId: string; error: string }> | number;
  totalAttempted: number;
}

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

function ResultsDisplay({ 
  results, 
  issuesCount,
  onComplete
}: { 
  results: BatchFixResults; 
  issuesCount: number;
  onComplete: () => void;
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          console.log('[Batch Quick Fix] Auto-closing panel');
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  console.log('[BatchQuickFixPanel] Results object:', results);
  console.log('[BatchQuickFixPanel] Successful:', results.successful);
  console.log('[BatchQuickFixPanel] Failed:', results.failed);
  console.log('[BatchQuickFixPanel] Total attempted:', results.totalAttempted);

  const successCount = typeof results.successful === 'number' 
    ? results.successful 
    : (Array.isArray(results.successful) ? results.successful.length : 0);
  const failedCount = typeof results.failed === 'number' 
    ? results.failed 
    : (Array.isArray(results.failed) ? results.failed.length : 0);
  const failedItems = Array.isArray(results.failed) ? results.failed : [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold mb-4">Batch Fix Results</h3>

      <div className="space-y-4 mb-6">
        {successCount > 0 && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle size={24} className="text-green-600" />
            <div className="flex-1">
              <div className="font-semibold text-green-800">
                Successfully applied {successCount} of {results.totalAttempted || issuesCount} fixes
              </div>
              <div className="text-sm text-green-700 mt-1">
                Closing in {countdown} second{countdown !== 1 ? 's' : ''}...
              </div>
            </div>
          </div>
        )}

        {failedCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={20} className="text-red-600" />
              <span className="font-semibold text-red-800">
                {failedCount} fixes failed
              </span>
            </div>
            {failedItems.length > 0 && (
              <ul className="text-sm text-red-700 space-y-2 ml-7">
                {failedItems.map((fail, idx) => (
                  <li key={idx} className="border-l-2 border-red-300 pl-3">
                    <div className="font-medium">Issue {fail.issueId?.substring(0, 8)}...</div>
                    <div className="text-xs text-red-600">{fail.error}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onComplete}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
      >
        Done
      </button>
    </div>
  );
}

export function BatchQuickFixPanel({
  jobId,
  fixType,
  fixName,
  issues,
  onComplete,
  onCancel
}: BatchQuickFixPanelProps) {
  const [results, setResults] = useState<BatchFixResults | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[BatchQuickFixPanel] Current results state:', results);
  }, [results]);

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

      console.log('[Batch Quick Fix] Full response:', response);
      console.log('[Batch Quick Fix] Response data:', response.data);

      const rawData = response.data?.data?.results || response.data?.results || response.data;
      
      const extractedResults: BatchFixResults = {
        successful: rawData?.successful ?? 0,
        failed: rawData?.failed ?? [],
        totalAttempted: typeof rawData?.totalAttempted === 'number' ? rawData.totalAttempted : issues.length
      };

      console.log('[Batch Quick Fix] Extracted results:', extractedResults);
      return extractedResults;
    },
    onSuccess: (data) => {
      console.log('[Batch Quick Fix] Success! Setting results:', data);
      setResults(data);

      queryClient.invalidateQueries({ queryKey: ['remediation-plan'] });
      queryClient.invalidateQueries({ queryKey: ['similar-issues'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      queryClient.refetchQueries({ queryKey: ['remediation-plan', jobId] });
      queryClient.refetchQueries({ queryKey: ['similar-issues', jobId] });
    },
    onError: (error: any) => {
      console.error('[Batch Quick Fix] Error:', error);
      alert(`Failed to apply batch fixes: ${error.message || 'Unknown error'}`);
    }
  });

  if (results) {
    return <ResultsDisplay results={results} issuesCount={issues.length} onComplete={onComplete} />;
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
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {applyBatchMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Applying {issues.length} fixes...
            </>
          ) : (
            <>
              <Zap size={20} />
              Apply All ({issues.length})
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={applyBatchMutation.isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
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
