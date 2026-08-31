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
import type { AutoModeStopReason } from '@/types/comparisonStudy.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

interface AutoModeStatusCardProps {
  status: AutoModeStatusResponse;
  onStop: () => void;
  isStopping: boolean;
  stopError?: unknown;
  stopSucceeded?: boolean;
}

const STOP_REASON_CONFIG: Record<NonNullable<AutoModeStopReason>, { variant: 'success' | 'warning' | 'error'; title: string }> = {
  converged: { variant: 'success', title: 'Auto remediation complete — no more AI-actionable fixes remain.' },
  round_limit: { variant: 'warning', title: 'Stopped: reached the maximum number of rounds.' },
  budget_limit: { variant: 'warning', title: 'Stopped: reached the cost limit.' },
  stalled: { variant: 'warning', title: 'Stopped: no further progress was being made.' },
  manual_stop: { variant: 'error', title: 'Stopped by the operator.' },
  error: { variant: 'error', title: 'Stopped due to an error in the auto-remediation loop.' },
};

export function AutoModeStatusCard({ status, onStop, isStopping, stopError, stopSucceeded }: AutoModeStatusCardProps) {
  // Nothing to show before the first run ever starts — the header's Start
  // Auto Remediation button is the entry point, not this card.
  if (status.autoStatus === null) return null;

  if (status.autoStatus === 'stopped') {
    const config = status.autoStopReason ? STOP_REASON_CONFIG[status.autoStopReason] : null;
    return (
      <div className="mx-6 mt-4">
        <Alert variant={config?.variant ?? 'info'} title={config?.title ?? 'Auto remediation stopped.'}>
          Ran {status.autoRoundsCompleted} of {status.autoMaxRounds} rounds, ${status.autoCostSpentUsd.toFixed(2)} of ${status.autoCostLimitUsd.toFixed(2)} spent.
        </Alert>
      </div>
    );
  }

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            Auto remediation running — round {status.autoRoundsCompleted} of {status.autoMaxRounds}
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
          ${status.autoCostSpentUsd.toFixed(2)} of ${status.autoCostLimitUsd.toFixed(2)} spent
        </p>
        {stopError !== undefined && (
          <p className="text-xs text-red-600 mt-2">{getErrorMessage(stopError)}</p>
        )}
        {stopSucceeded && (
          <p className="text-xs text-gray-500 mt-2">
            Stop requested — will take effect after the current round finishes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
