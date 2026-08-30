/**
 * RemediationHistoryCard
 *
 * Renders the "Run 1 / Run 2 / ..." remediation-cycle history from
 * GET /pdf/:jobId/remediation/history (backend PR #501) — one collapsible
 * section per cycle, most recent expanded by default, each listing its
 * events (apply_fixes / reaudit / ai_analysis) in order.
 *
 * Fetches on mount and again whenever remediationCycleInProgress flips
 * true -> false (a cycle just completed), rather than polling — this is a
 * detail view, not something that needs to track a running cycle live.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, History, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { RemediationHistoryRun, RemediationHistoryEvent, RemediationHistoryAction } from '@/types/pdf-remediation.types';

interface RemediationHistoryCardProps {
  jobId: string;
  /** Used only to detect the true -> false transition that means "a cycle just finished, refetch." */
  remediationCycleInProgress: boolean;
}

const ACTION_LABELS: Record<RemediationHistoryAction, string> = {
  apply_fixes: 'Apply Fixes',
  reaudit: 'Re-audit',
  ai_analysis: 'AI Analysis',
};

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function EventRow({ event }: { event: RemediationHistoryEvent }) {
  const stats: Array<[string, number | null | undefined]> = [
    ['applied', event.appliedCount],
    ['failed', event.failedCount],
    ['resolved', event.resolvedCount],
    ['remaining', event.remainingCount],
    ['regressions', event.regressionCount],
  ];
  const visibleStats = stats.filter(([, value]) => value != null);
  const startedLabel = formatTimestamp(event.startedAt);
  const completedLabel = formatTimestamp(event.completedAt);

  return (
    <div className="flex items-start gap-2 py-2 border-t border-gray-100 first:border-t-0">
      {event.status === 'completed' ? (
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{ACTION_LABELS[event.action]}</span>
          {visibleStats.length > 0 && (
            <span className="text-xs text-gray-600">
              {visibleStats.map(([label, value]) => `${value} ${label}`).join(', ')}
              {event.resolutionRate != null && ` (${event.resolutionRate}% resolved)`}
            </span>
          )}
        </div>
        {event.status === 'failed' && event.errorMessage && (
          <p className="text-xs text-red-600 mt-0.5">{event.errorMessage}</p>
        )}
        {(startedLabel || completedLabel) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {startedLabel}
            {completedLabel && completedLabel !== startedLabel ? ` – ${completedLabel}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function RunSection({ run, label, defaultExpanded }: { run: RemediationHistoryRun; label: string; defaultExpanded: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const failedCount = run.events.filter(e => e.status === 'failed').length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(v => !v)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          <span className="text-xs text-gray-500">
            {run.events.length} {run.events.length === 1 ? 'step' : 'steps'}
            {failedCount > 0 && `, ${failedCount} failed`}
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="px-3 pb-1 bg-white">
          {run.events.map((event, idx) => (
            <EventRow key={`${event.action}-${event.startedAt}-${idx}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RemediationHistoryCard({ jobId, remediationCycleInProgress }: RemediationHistoryCardProps) {
  const [runs, setRuns] = useState<RemediationHistoryRun[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const wasInProgressRef = useRef(remediationCycleInProgress);

  const fetchHistory = useCallback(async () => {
    if (!jobId) return;
    try {
      const result = await pdfRemediationService.getRemediationHistory(jobId);
      setRuns(result);
    } catch {
      // Non-fatal — the card just won't reflect the latest history until
      // the next trigger (mount, or the next lock-clears transition).
    } finally {
      setHasLoaded(true);
    }
  }, [jobId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (wasInProgressRef.current && !remediationCycleInProgress) {
      fetchHistory();
    }
    wasInProgressRef.current = remediationCycleInProgress;
  }, [remediationCycleInProgress, fetchHistory]);

  // Nothing to show yet (still loading, or genuinely no history) — most
  // jobs won't have any until they go through a cycle after this feature
  // shipped, so an always-present empty card would just be clutter.
  if (!hasLoaded || runs.length === 0) return null;

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Remediation History</span>
        </div>
        <div className="space-y-2">
          {runs.map((run, idx) => (
            <RunSection
              key={run.cycleNumber}
              run={run}
              label={`Run ${idx + 1}`}
              defaultExpanded={idx === runs.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
