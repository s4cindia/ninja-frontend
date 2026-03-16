import { usePhaseGate } from '../../hooks/useMetrics';
import type { PhaseGateCriterion } from '../../services/metrics.service';
import { InfoTooltip } from '../ui/InfoTooltip';

const TRAFFIC_LIGHT: Record<string, string> = {
  GREEN: 'bg-green-500',
  AMBER: 'bg-amber-400',
  RED: 'bg-red-500',
};

const BORDER_COLOUR: Record<string, string> = {
  GREEN: 'border-green-200',
  AMBER: 'border-amber-200',
  RED: 'border-red-200',
};

const PILL_STYLES: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-700',
  AMBER: 'bg-amber-100 text-amber-700',
  RED: 'bg-red-100 text-red-700',
};

function CriterionRow({ criterion }: { criterion: PhaseGateCriterion }) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors ${
        BORDER_COLOUR[criterion.status] ?? 'border-gray-200'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full flex-shrink-0 ${
          TRAFFIC_LIGHT[criterion.status] ?? 'bg-gray-300'
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">Status: {criterion.status}</span>
      <div className="flex-1 min-w-0">
        <InfoTooltip content={criterion.tooltip}>
          <span className="font-medium text-gray-800 text-sm">
            {criterion.label}
          </span>
        </InfoTooltip>
      </div>
      <span className="text-sm text-gray-600">{criterion.currentValue}</span>
      <span className="text-xs text-gray-400">
        Target: {criterion.threshold}
      </span>
    </div>
  );
}

export default function PhaseGatePanel() {
  const { data: status, isLoading, refetch, isFetching } = usePhaseGate();

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="phasegate-skeleton">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load phase gate status</p>
        <button
          onClick={() => refetch()}
          className="mt-3 px-4 py-2 text-sm border border-teal-600 text-teal-600 rounded-md hover:bg-teal-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Phase 1 Exit Criteria
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            All 5 must be GREEN to advance to Phase 2
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh phase gate status"
          className="px-3 py-1.5 text-xs border border-teal-600 text-teal-600 rounded-md hover:bg-teal-50 disabled:opacity-50 transition-colors"
        >
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Phase complete banner */}
      {status.readyForPhase2 && (
        <div className="rounded-lg bg-green-50 border border-green-300 p-4 flex items-center gap-3 mb-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Phase 1 Complete</p>
            <p className="text-sm text-green-600">
              All criteria met — ready to begin Phase 2
            </p>
          </div>
        </div>
      )}

      {/* Criteria list */}
      <div className="space-y-2">
        {status.criteria.map((c) => (
          <CriterionRow key={c.id} criterion={c} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Overall:</span>
          <span
            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
              PILL_STYLES[status.overallStatus] ?? 'bg-gray-100 text-gray-500'
            }`}
            data-testid="overall-status-pill"
          >
            {status.overallStatus}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          Auto-refreshes every 60 seconds
        </span>
      </div>
    </div>
  );
}
