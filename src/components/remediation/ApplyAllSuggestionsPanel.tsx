import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/Checkbox';
import { applyAllAiSuggestions, ApplyAllAiSuggestionsResult } from '@/services/api/pdfAiAnalysis.service';

/**
 * A definitive 4xx (auth/validation/not-found) means the request was
 * rejected before the apply-all loop ever started — nothing is running in
 * the background, so blocking a retry would just punish the user for no
 * reason. Only a response-less failure (dropped connection, CORS, DNS) or a
 * gateway-timeout-class status (502/503/504 — the infra gave up waiting on
 * the origin, which is exactly the CloudFront-vs-slow-backend scenario this
 * cooldown exists for) leaves real ambiguity about whether the backend is
 * still applying fixes.
 */
function isAmbiguousApplyAllFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return [502, 503, 504].includes(error.response.status);
}

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
  onApplied: (result: ApplyAllAiSuggestionsResult) => void;
  /** Dismiss the panel — via Cancel before applying, or Done/auto-close after. */
  onClose: () => void;
  /**
   * Timestamp (Date.now()-style ms) until which retrying is blocked, or null
   * if there's no active cooldown. Lifted to the caller because this panel
   * unmounts on every close (the Dialog wrapper returns null when closed),
   * so a cooldown tracked in local state would silently reset on reopen.
   */
  retryBlockedUntil?: number | null;
  /**
   * Fires when the apply-all request itself errors (e.g. the backend is
   * still synchronous and a slow batch outlasts CloudFront's origin-response
   * timeout, so the browser sees a network error while the backend keeps
   * applying fixes to completion in the background). A same-request retry
   * right after would start a second, genuinely overlapping apply-all run
   * against the same PDF — this is a temporary bridge until the backend's
   * remediation-cycle lock rejects that case with a clean 409 instead.
   */
  onApplyError?: () => void;
}

/** How long to block a retry after an apply-all error. CloudFront's origin
 * timeout tops out at 60s; this adds margin for the backend to actually
 * finish writing/re-auditing after the connection was cut. Exported so the
 * caller sets the same duration it's setting `retryBlockedUntil` to. */
export const APPLY_ALL_RETRY_COOLDOWN_MS = 90_000;

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
  retryBlockedUntil = null,
  onApplyError,
}: ApplyAllSuggestionsPanelProps) {
  const [includePending, setIncludePending] = useState(false);
  // Ticks once a second while a retry cooldown is active, so the countdown
  // displays and the button re-enables itself once the cooldown lapses —
  // without this, isRetryBlocked/retrySecondsLeft below would only ever be
  // computed once per unrelated re-render.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (retryBlockedUntil == null || retryBlockedUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      // retryBlockedUntil itself doesn't change once the cooldown lapses, so
      // without this the effect's own dependency array would never re-run
      // and the interval would keep re-rendering the panel every second
      // indefinitely, even long after the button is re-enabled.
      if (now >= retryBlockedUntil) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [retryBlockedUntil]);

  const applyAllMutation = useMutation({
    mutationFn: () => applyAllAiSuggestions(jobId, includePending),
    onSuccess: (result) => {
      // Aggregate counts only — refetch the real suggestion list rather than
      // guessing which issues succeeded from this response.
      onApplied(result);
    },
    onError: (error) => {
      if (isAmbiguousApplyAllFailure(error)) {
        onApplyError?.();
      }
    },
  });

  if (applyAllMutation.data) {
    return <ResultsView results={applyAllMutation.data} onClose={onClose} />;
  }

  const totalToApply = eligibleCount + (includePending ? pendingEligibleCount : 0);

  const isRetryBlocked = retryBlockedUntil != null && retryBlockedUntil > nowTick;
  const retrySecondsLeft = isRetryBlocked ? Math.ceil((retryBlockedUntil - nowTick) / 1000) : 0;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded">
          <Zap className="text-green-600" size={24} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Apply All Approved</h3>
          <p className="text-sm text-gray-600">
            {includePending && pendingEligibleCount > 0 ? (
              <>
                Apply {totalToApply} {totalToApply === 1 ? 'suggestion' : 'suggestions'} to the PDF{' '}
                <span className="text-gray-400">({eligibleCount} approved, {pendingEligibleCount} awaiting review)</span>
              </>
            ) : (
              <>Apply {eligibleCount} approved {eligibleCount === 1 ? 'suggestion' : 'suggestions'} to the PDF</>
            )}
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
        <p className="text-sm text-green-800">
          {includePending && pendingEligibleCount > 0 ? (
            <>All {totalToApply} {totalToApply === 1 ? 'fix' : 'fixes'} ({eligibleCount} approved, {pendingEligibleCount} awaiting review) will be applied automatically.</>
          ) : (
            <>All {eligibleCount} approved {eligibleCount === 1 ? 'fix' : 'fixes'} will be applied automatically.</>
          )}
          {' '}This also kicks off a post-fix validation audit to confirm what was resolved.
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
          disabled={applyAllMutation.isPending || totalToApply === 0 || isRetryBlocked}
          title={isRetryBlocked ? `Waiting in case the previous attempt is still processing on the server (${retrySecondsLeft}s)` : undefined}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {applyAllMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              Applying {totalToApply} {totalToApply === 1 ? 'fix' : 'fixes'}...
            </>
          ) : isRetryBlocked ? (
            <>Retry available in {retrySecondsLeft}s</>
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
          {isRetryBlocked && (
            <p className="text-xs text-red-600 mt-1">
              The previous attempt may still be applying fixes in the background — retrying now
              could apply the same suggestions twice. Retry available in {retrySecondsLeft}s.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
