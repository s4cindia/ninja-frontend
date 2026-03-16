import { useCorpusStatsMetrics } from '../../hooks/useMetrics';

const CONTENT_TYPE_STYLES: Record<string, string> = {
  'table-heavy': 'bg-teal-100 text-teal-700',
  'figure-heavy': 'bg-purple-100 text-purple-700',
  mixed: 'bg-blue-100 text-blue-700',
  'text-dominant': 'bg-gray-100 text-gray-600',
};

const DEFAULT_PILL_STYLE = 'bg-gray-100 text-gray-500';

export default function CorpusCompositionPanel() {
  const { data: stats, isLoading } = useCorpusStatsMetrics();

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="corpus-skeleton">
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-16 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (
    !stats ||
    (stats.totalDocuments === 0 &&
      stats.totalConfirmedZones === 0 &&
      stats.totalRuns === 0)
  ) {
    return (
      <div className="text-center py-8 text-gray-400">
        No corpus documents yet. Add documents to begin calibration.
      </div>
    );
  }

  const publishers = Object.entries(stats.byPublisher ?? {});
  const contentTypes = Object.entries(stats.byContentType ?? {});
  const maxPubCount = Math.max(...publishers.map(([, c]) => c), 1);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">
          Corpus Composition
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Breakdown of calibration corpus by publisher and content type
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800" data-testid="total-docs">
            {stats.totalDocuments}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Documents</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800" data-testid="total-zones">
            {stats.totalConfirmedZones}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Total Confirmed Zones
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800" data-testid="avg-agreement">
            {((stats.averageAgreementRate ?? 0) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg Agreement Rate</div>
        </div>
      </div>

      {/* Two sections */}
      <div className="flex gap-6">
        {/* By Publisher */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Documents by Publisher
          </h4>
          {publishers.length === 0 ? (
            <p className="text-sm text-gray-400">No publisher data</p>
          ) : (
            <div className="space-y-2">
              {publishers.map(([name, count]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-24 truncate" title={name}>
                    {name}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div
                      className="h-5 rounded-full bg-teal-600 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max((count / maxPubCount) * 100, 12)}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Content Type */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Documents by Content Type
          </h4>
          {contentTypes.length === 0 ? (
            <p className="text-sm text-gray-400">No content type data</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contentTypes.map(([type, count]) => (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full font-medium ${
                    CONTENT_TYPE_STYLES[type] ?? DEFAULT_PILL_STYLE
                  }`}
                >
                  {type}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
