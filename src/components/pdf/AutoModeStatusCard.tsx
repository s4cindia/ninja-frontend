/**
 * AutoModeStatusCard
 *
 * Live progress for a Comparison Study trial's "Auto Mode" run — the
 * backend loops analyze -> auto-approve -> apply -> re-audit on its own
 * until convergence or a limit is hit. Polls GET /pdf/:jobId/auto-mode/status
 * every 5s while running (see useAutoModeStatus), and shows a terminal
 * Alert once the run has concluded.
 *
 * Only meaningful for auto-mode trials — the caller is expected to render
 * this only when the trial's mode is 'auto' (checking mode here too would
 * mean polling a status endpoint that's permanently irrelevant for manual
 * trials).
 */

import { Loader2, StopCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { useAutoModeStatus, useStopAutoMode } from '@/hooks/useAutoMode';
import { getErrorMessage } from '@/services/api';
import type { AutoModeStopReason } from '@/types/comparisonStudy.types';

interface AutoModeStatusCardProps {
  jobId: string;
}

const STOP_REASON_CONFIG: Record<NonNullable<AutoModeStopReason>, { variant: 'success' | 'warning' | 'error'; title: string }> = {
  converged: { variant: 'success', title: 'Auto remediation complete — no more AI-actionable fixes remain.' },
  round_limit: { variant: 'warning', title: 'Stopped: reached the maximum number of rounds.' },
  budget_limit: { variant: 'warning', title: 'Stopped: reached the cost limit.' },
  stalled: { variant: 'warning', title: 'Stopped: no further progress was being made.' },
  manual_stop: { variant: 'error', title: 'Stopped by the operator.' },
  error: { variant: 'error', title: 'Stopped due to an error in the auto-remediation loop.' },
};

export function AutoModeStatusCard({ jobId }: AutoModeStatusCardProps) {
  const { data } = useAutoModeStatus(jobId);
  const stopAutoMode = useStopAutoMode(jobId);

  // Nothing to show before the first run ever starts — the header's Start
  // Auto Remediation button is the entry point, not this card.
  if (!data || data.autoStatus === null) return null;

  if (data.autoStatus === 'stopped') {
    const config = data.autoStopReason ? STOP_REASON_CONFIG[data.autoStopReason] : null;
    return (
      <div className="mx-6 mt-4">
        <Alert variant={config?.variant ?? 'info'} title={config?.title ?? 'Auto remediation stopped.'}>
          Ran {data.autoRoundsCompleted} of {data.autoMaxRounds} rounds, ${data.autoCostSpentUsd.toFixed(2)} of ${data.autoCostLimitUsd.toFixed(2)} spent.
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
            Auto remediation running — round {data.autoRoundsCompleted} of {data.autoMaxRounds}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => stopAutoMode.mutate()}
            disabled={stopAutoMode.isPending}
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            {stopAutoMode.isPending ? 'Stopping…' : 'Stop'}
          </Button>
        </div>
        <Progress value={data.autoRoundsCompleted} max={data.autoMaxRounds} size="sm" />
        <p className="text-xs text-gray-500 mt-2">
          ${data.autoCostSpentUsd.toFixed(2)} of ${data.autoCostLimitUsd.toFixed(2)} spent
        </p>
        {stopAutoMode.isError && (
          <p className="text-xs text-red-600 mt-2">{getErrorMessage(stopAutoMode.error)}</p>
        )}
        {stopAutoMode.isSuccess && (
          <p className="text-xs text-gray-500 mt-2">
            Stop requested — will take effect after the current round finishes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
