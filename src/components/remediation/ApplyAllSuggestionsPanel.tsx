import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { applyAllAiSuggestions, ApplyAllAiSuggestionsResult } from '@/services/api/pdfAiAnalysis.service';

interface ApplyAllSuggestionsPanelProps {
  jobId: string;
  /** Count of approved, apply-to-pdf-eligible suggestions — the safe default scope. */
  eligibleCount: number;
  /** Count of still-pending (not yet reviewed) apply-to-pdf-eligible suggestions. */
  pendingEligibleCount: number;
  /**
   * Fires once immediately after a successful apply-all response, before the
   * results screen is shown. The response only carries aggregate counts, so
   * the caller should refetch the full suggestion list here rather than have
   * this panel try to reconstruct per-issue state.
   */
  onApplied: () => void;
  /** Dismiss the panel — via Cancel before applying, or Done/auto-close after. */
  onClose: () => void;
}

function ResultsView({
  results,
  onClose,
}: {
  results: ApplyAllAiSuggestionsResult;
  onClose: () => void;
}) {
  const failedCount = results.failed;
  const errors = results.errors ?? [];

  const initialCountdown = failedCount > 0 ? 10 : 3;
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onClose, isPaused]);

  const handlePauseTimer = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4">Apply All Results</h3>

      <div className="space-y-4 mb-6">
        {results.applied > 0 && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle size={24} className="text-green-600" />
            <div className="flex-1">
              <div className="font-semibold text-green-800">
                Successfully applied {results.applied} {results.applied === 1 ? 'suggestion' : 'suggestions'}
              </div>
              {!isPaused && (
                <div className="text-sm text-green-700 mt-1">
                  Closing in {countdown} second{countdown !== 1 ? 's' : ''}...
                </div>
              )}
            </div>
          </div>
        )}

        {failedCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={20} className="text-red-600" />
              <span className="font-semibold text-red-800">
                {failedCount} {failedCount === 1 ? 'suggestion' : 'suggestions'} failed
              </span>
            </div>
            {errors.length > 0 && (
              <ul className="text-sm text-red-700 space-y-2 ml-7">
                {errors.map((err, idx) => (
                  <li key={`${err.issueId}-${idx}`} className="border-l-2 border-red-300 pl-3">
                    <div className="font-medium">{err.suggestionType} — {err.issueId.substring(0, 8)}...</div>
                    <div className="text-xs text-red-600">{err.reason}</div>
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
          onClick={onClose}
          className={`${isPaused ? 'w-full' : 'flex-1'} px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold`}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function ApplyAllSuggestionsPanel({
  jobId,
  eligibleCount,
  pendingEligibleCount,
  onApplied,
  onClose,
}: ApplyAllSuggestionsPanelProps) {
  const [includePending, setIncludePending] = useState(false);

  const applyAllMutation = useMutation({
    mutationFn: () => applyAllAiSuggestions(jobId, includePending),
    onSuccess: () => {
      // Aggregate counts only — refetch the real suggestion list rather than
      // guessing which issues succeeded from this response.
      onApplied();
    },
  });

  if (applyAllMutation.data) {
    return <ResultsView results={applyAllMutation.data} onClose={onClose} />;
  }

  const totalToApply = eligibleCount + (includePending ? pendingEligibleCount : 0);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded">
          <Zap className="text-green-600" size={24} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Apply All Approved</h3>
          <p className="text-sm text-gray-600">
            Apply {eligibleCount} approved {eligibleCount === 1 ? 'suggestion' : 'suggestions'} to the PDF
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
        <p className="text-sm text-green-800">
          All {eligibleCount} approved {eligibleCount === 1 ? 'fix' : 'fixes'} will be applied automatically.
          This also kicks off a post-fix validation audit to confirm what was resolved.
        </p>
      </div>

      {pendingEligibleCount > 0 && (
        <label className="flex items-start gap-2 mb-6 cursor-pointer select-none">
          <span className="mt-0.5">
            <Checkbox
              checked={includePending}
              onChange={setIncludePending}
              aria-label={`Also include ${pendingEligibleCount} suggestions awaiting review`}
            />
          </span>
          <span className="text-xs text-gray-500">
            Also include {pendingEligibleCount} {pendingEligibleCount === 1 ? 'suggestion' : 'suggestions'} awaiting review
            <span className="block text-gray-400">Skips the pending-review step for those suggestions.</span>
          </span>
        </label>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => applyAllMutation.mutate()}
          disabled={applyAllMutation.isPending || totalToApply === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {applyAllMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              Applying {totalToApply} {totalToApply === 1 ? 'fix' : 'fixes'}...
            </>
          ) : (
            <>
              <Zap size={20} aria-hidden="true" />
              Apply All ({totalToApply})
            </>
          )}
        </button>

        <button
          onClick={onClose}
          disabled={applyAllMutation.isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {applyAllMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            Failed to apply suggestions: {(applyAllMutation.error as Error)?.message || 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  );
}
