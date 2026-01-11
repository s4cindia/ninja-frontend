import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { applyBatchQuickFix, BatchQuickFixResult } from '@/services/quickfix.service';

interface BatchFixResults extends BatchQuickFixResult {
  errorMessage?: string;
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
  const successCount = results.successful;
  const failedCount = results.failed.length;
  const failedItems = results.failed;

  const initialCountdown = failedCount > 0 ? 10 : 3;
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          console.log('[Batch Quick Fix] Auto-closing panel');
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onComplete, isPaused]);

  const handlePauseTimer = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  console.log('[BatchQuickFixPanel] Results object:', results);
  console.log('[BatchQuickFixPanel] Successful:', results.successful);
  console.log('[BatchQuickFixPanel] Failed:', results.failed);
  console.log('[BatchQuickFixPanel] Total attempted:', results.totalAttempted);

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
              {!isPaused && (
                <div className="text-sm text-green-700 mt-1">
                  Closing in {countdown} second{countdown !== 1 ? 's' : ''}...
                </div>
              )}
            </div>
          </div>
        )}

        {(failedCount > 0 || results.errorMessage) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={20} className="text-red-600" />
              <span className="font-semibold text-red-800">
                {results.errorMessage 
                  ? 'Batch fix failed' 
                  : `${failedCount} fixes failed`}
              </span>
            </div>
            {results.errorMessage && (
              <p className="text-sm text-red-700 mb-2">{results.errorMessage}</p>
            )}
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

      <div className="flex gap-2">
        {!isPaused && (
          <button
            onClick={handlePauseTimer}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel Auto-close
          </button>
        )}
        <button
          onClick={onComplete}
          className={`${isPaused ? 'w-full' : 'flex-1'} px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold`}
        >
          Done
        </button>
      </div>
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
      if (import.meta.env.DEV) {
        console.log('[Batch Quick Fix] Applying fixes:', {
          jobId,
          issueIds: issues.map(i => i.id),
          fixType
        });
      }

      const result = await applyBatchQuickFix(jobId, issues.map(i => i.id), fixType);

      if (import.meta.env.DEV) {
        console.log('[Batch Quick Fix] Result:', result);
      }
      
      return result;
    },
    onSuccess: (data) => {
      if (import.meta.env.DEV) {
        console.log('[Batch Quick Fix] Success! Setting results:', data);
      }
      setResults(data);

      queryClient.invalidateQueries({ queryKey: ['remediation-plan', jobId] });
      queryClient.invalidateQueries({ queryKey: ['similar-issues', jobId] });
      queryClient.invalidateQueries({ queryKey: ['issues', jobId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', jobId] });

      queryClient.refetchQueries({ queryKey: ['remediation-plan', jobId] });
      queryClient.refetchQueries({ queryKey: ['similar-issues', jobId] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Batch Quick Fix] Error:', error);
      setResults({
        successful: 0,
        failed: [],
        totalAttempted: issues.length,
        errorMessage
      });
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
