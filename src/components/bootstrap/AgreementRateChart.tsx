import { useCalibrationRuns } from '../../hooks/useCalibration';

export default function AgreementRateChart() {
  const { data, isLoading } = useCalibrationRuns({ limit: 20 });
  const runs = data?.runs ?? [];

  const chartData = runs
    .filter(
      (r) =>
        r.greenCount != null && r.redCount != null && r.amberCount != null
    )
    .map((r) => {
      const total =
        (r.greenCount ?? 0) + (r.amberCount ?? 0) + (r.redCount ?? 0);
      return {
        date: new Date(r.runDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        agreementRate: total > 0 ? Math.round((r.greenCount! / total) * 100) : 0,
        runId: r.id,
      };
    });

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 240 }}
        data-testid="agreement-spinner"
      >
        <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No calibration runs yet.
      </div>
    );
  }

  // Find max for bar scaling
  const maxRate = Math.max(...chartData.map((d) => d.agreementRate), 1);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">
          Tool Agreement Rate
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Percentage of zones where Docling and pdfxt agree
        </p>
      </div>

      {/* Simple bar chart fallback (recharts not installed) */}
      <div className="space-y-2">
        {/* Target line */}
        <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
          <span className="border-t-2 border-dashed border-green-500 w-6" />
          Target 75%
        </div>

        <table className="w-full text-sm" data-testid="agreement-table">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 font-medium w-24">Date</th>
              <th className="pb-2 font-medium">Agreement Rate</th>
              <th className="pb-2 font-medium text-right w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.runId} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-600">{row.date}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                      <div
                        className={`h-4 rounded-full ${
                          row.agreementRate >= 75
                            ? 'bg-teal-500'
                            : row.agreementRate >= 60
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                        }`}
                        style={{
                          width: `${(row.agreementRate / maxRate) * 100}%`,
                        }}
                      />
                      {/* 75% target marker */}
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-green-500"
                        style={{ left: `${(75 / maxRate) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-1.5 text-right font-medium text-gray-700">
                  {row.agreementRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
