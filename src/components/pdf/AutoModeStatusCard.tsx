/**
 * AutoModeStatusCard
 *
 * Live progress for a Comparison Study trial's "Auto Mode" run — the
 * backend loops analyze -> auto-approve -> apply -> re-audit on its own
 * until convergence or a limit is hit.
 *
 * Presentational only — the status query and stop mutation live in
 * PdfAuditResultsPage (via useAutoModeStatus/useStopAutoMode) so the page
 * can react to round/status transitions (refetching audit + AI suggestion
 * data) instead of this card polling in isolation.
 */

import { Loader2, StopCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/services/api';
import { AutoModeRoundHistory } from '@/components/pdf/AutoModeRoundHistory';
import type { AutoModeRound } from '@/hooks/useAutoMode';
import type { AutoColorContrastMode, AutoModeStopReason } from '@/types/comparisonStudy.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

interface AutoModeStatusCardProps {
  status: AutoModeStatusResponse;
  onStop: () => void;
  isStopping: boolean;
  stopError?: unknown;
  stopSucceeded?: boolean;
  /** Round-by-round trend — fetched by the page (see useAutoModeRoundHistory), same "query lives in the page" split as `status`. */
  rounds: AutoModeRound[];
}

const STOP_REASON_CONFIG: Record<NonNullable<AutoModeStopReason>, { variant: 'success' | 'warning' | 'error'; title: string }> = {
  converged: { variant: 'success', title: 'Auto remediation complete — no more AI-actionable fixes remain.' },
  round_limit: { variant: 'warning', title: 'Stopped: reached the maximum number of rounds.' },
  budget_limit: { variant: 'warning', title: 'Stopped: reached the cost limit.' },
  stalled: { variant: 'warning', title: 'Stopped: no further progress was being made.' },
  manual_stop: { variant: 'error', title: 'Stopped by the operator.' },
  error: { variant: 'error', title: 'Stopped due to an error in the auto-remediation loop.' },
};

const CONTRAST_MODE_LABELS: Record<NonNullable<AutoColorContrastMode>, string> = {
  'guidance-only': 'guidance only',
  disabled: 'disabled',
  'apply-to-pdf': 'auto-apply',
};

// null is the trial's own stored override, not the fully resolved effective
// mode — the true behavior still depends on tenant config this component
// can't see, so "inherited" is the only accurate label for it.
function contrastModeLabel(mode: AutoColorContrastMode): string {
  return mode ? CONTRAST_MODE_LABELS[mode] : 'inherited';
}

export function AutoModeStatusCard({ status, onStop, isStopping, stopError, stopSucceeded, rounds }: AutoModeStatusCardProps) {
  // Nothing to show before the first run ever starts — the header's Start
  // Auto Remediation button is the entry point, not this card.
  if (status.autoStatus === null) return null;

  if (status.autoStatus === 'stopped') {
    const config = status.autoStopReason ? STOP_REASON_CONFIG[status.autoStopReason] : null;
    return (
      <div className="mx-6 mt-4">
        <Alert variant={config?.variant ?? 'info'} title={config?.title ?? 'Auto remediation stopped.'}>
          Ran {status.autoRoundsCompleted} of {status.autoMaxRounds} rounds, ${status.autoCostSpentUsd.toFixed(2)} of ${status.autoCostLimitUsd.toFixed(2)} spent · contrast: {contrastModeLabel(status.autoColorContrastMode)}.
        </Alert>
        <AutoModeRoundHistory rounds={rounds} />
      </div>
    );
  }

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            {/* autoRoundsCompleted only increments once a round's apply+re-audit
                both finish — showing it as "round X of N" during that window
                (which can run 10-15+ min on a large document) reads as frozen,
                even though the backend is actively working. "in progress"
                instead of the static "of N" phrasing makes clear a round is
                live; the static phrasing only applies once autoStatus leaves
                'running' (see the 'stopped' branch above). */}
            Auto remediation running — round {status.autoRoundsCompleted + 1} in progress
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            disabled={isStopping}
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            {isStopping ? 'Stopping…' : 'Stop'}
          </Button>
        </div>
        <Progress value={status.autoRoundsCompleted} max={status.autoMaxRounds} size="sm" />
        <p className="text-xs text-gray-500 mt-2">
          ${status.autoCostSpentUsd.toFixed(2)} of ${status.autoCostLimitUsd.toFixed(2)} spent · contrast: {contrastModeLabel(status.autoColorContrastMode)}
        </p>
        {stopError !== undefined && (
          <p className="text-xs text-red-600 mt-2">{getErrorMessage(stopError)}</p>
        )}
        {stopSucceeded && (
          <p className="text-xs text-gray-500 mt-2">
            Stop requested — will take effect after the current round finishes.
          </p>
        )}
        <AutoModeRoundHistory rounds={rounds} />
      </CardContent>
    </Card>
  );
}
