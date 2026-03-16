import { useMAPHistory } from '../../hooks/useMetrics';
import type { ClassAPResult } from '../../services/metrics.service';

const ZONE_TYPE_LABELS: Record<string, string> = {
  paragraph: 'Body Text',
  'section-header': 'Heading',
  table: 'Table',
  figure: 'Figure / Image',
  caption: 'Caption',
  footnote: 'Footnote',
  header: 'Page Header',
  footer: 'Page Footer',
};

function apColourClass(ap: number): string {
  if (ap >= 0.75) return 'text-green-600 font-medium';
  if (ap >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

function StatusPill({ row }: { row: ClassAPResult }) {
  if (row.insufficientData) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
        Insufficient data
      </span>
    );
  }
  if (row.ap >= 0.75) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
        ✓ On target
      </span>
    );
  }
  if (row.ap >= 0.6) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
        Near target
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
      Below target
    </span>
  );
}

export default function MAPAccuracyPanel() {
  const { data: history, isLoading, isError } = useMAPHistory();
  const latest = history?.[history.length - 1];

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="map-skeleton">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">
        Unable to load accuracy data.
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No calibration runs completed yet.</p>
        <p className="text-sm mt-1">
          Run POST /metrics/map to compute accuracy scores.
        </p>
      </div>
    );
  }

  const overallPct = latest ? (latest.overallMAP * 100).toFixed(1) : null;
  const headlineColour = latest
    ? latest.overallMAP >= 0.75
      ? 'text-green-600'
      : latest.overallMAP >= 0.6
        ? 'text-amber-600'
        : 'text-red-600'
    : '';

  const hasInsufficientData = latest?.perClass.some((c) => c.insufficientData);

  return (
    <div>
      {/* Headline row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Zone Detection Accuracy
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            mAP@0.5 — mean Average Precision
          </p>
        </div>
        <span className={`text-3xl font-bold ${headlineColour}`} data-testid="overall-map">
          {overallPct ? `${overallPct}%` : '—'}
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-2 font-medium">Zone Type</th>
            <th className="pb-2 font-medium text-right">GT Instances</th>
            <th className="pb-2 font-medium text-right">Predictions</th>
            <th className="pb-2 font-medium text-right">AP Score</th>
            <th className="pb-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {latest?.perClass.map((row) => (
            <tr key={row.zoneType} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">
                {ZONE_TYPE_LABELS[row.zoneType] ?? row.zoneType}
              </td>
              <td className="py-2 text-right text-gray-600">
                {row.groundTruthCount}
              </td>
              <td className="py-2 text-right text-gray-600">
                {row.predictionCount}
              </td>
              <td className={`py-2 text-right ${apColourClass(row.ap)}`}>
                {(row.ap * 100).toFixed(1)}%
              </td>
              <td className="py-2 text-right">
                <StatusPill row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasInsufficientData && (
        <p className="text-xs text-gray-500 mt-3">
          ⚠ Classes with fewer than 5 ground truth instances are excluded from
          the overall mAP calculation.
        </p>
      )}
    </div>
  );
}
