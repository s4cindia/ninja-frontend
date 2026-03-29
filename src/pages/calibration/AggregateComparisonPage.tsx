import { Link } from 'react-router-dom';
import { useAggregateComparison } from '@/hooks/useZoneReview';
import { Spinner } from '@/components/ui/Spinner';

function kpiColor(value: number, thresholds: [number, number]): string {
  if (value >= thresholds[0]) return 'border-green-500 bg-green-50 text-green-700';
  if (value >= thresholds[1]) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
  return 'border-red-500 bg-red-50 text-red-700';
}

function accColor(val: number): string {
  if (val >= 0.90) return 'text-green-600';
  if (val >= 0.75) return 'text-yellow-600';
  return 'text-red-600';
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AggregateComparisonPage() {
  const { data, isLoading, error } = useAggregateComparison();

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
          <h1 className="text-xl font-semibold">Aggregate Comparison Report</h1>
        </div>
        <div className="text-center py-12 text-gray-400">
          No aggregate data available. Run comparisons on individual documents first.
        </div>
      </div>
    );
  }

  const typeEntries = Object.entries(data.perTypeAccuracy).sort(
    (a, b) => (b[1] as any).total - (a[1] as any).total,
  );
  const pubEntries = Object.entries(data.perPublisherAccuracy ?? {}).sort(
    (a, b) => (b[1] as any).total - (a[1] as any).total,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <h1 className="text-xl font-semibold">Aggregate Comparison Report</h1>
      </div>

      {/* Section A: KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-lg border-l-4 p-4 ${kpiColor(data.overallAgreementRate, [0.85, 0.70])}`}>
          <p className="text-3xl font-bold tabular-nums">{(data.overallAgreementRate * 100).toFixed(1)}%</p>
          <p className="text-xs mt-1">Agreement Rate</p>
        </div>
        <div className={`rounded-lg border-l-4 p-4 ${data.overallCohensKappa != null ? kpiColor(data.overallCohensKappa, [0.80, 0.60]) : 'border-gray-300 bg-gray-50 text-gray-600'}`}>
          <p className="text-3xl font-bold tabular-nums">{data.overallCohensKappa != null ? data.overallCohensKappa.toFixed(3) : '--'}</p>
          <p className="text-xs mt-1">Cohen&apos;s Kappa</p>
        </div>
        <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4 text-gray-700">
          <p className="text-3xl font-bold tabular-nums">{data.totalComparableZones.toLocaleString()}</p>
          <p className="text-xs mt-1">Total Zones Compared</p>
        </div>
        <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4 text-blue-700">
          <p className="text-3xl font-bold tabular-nums">
            {data.timeSavingsEstimate ? `${data.timeSavingsEstimate.estimatedSpeedup.toFixed(1)}x` : '--'}
          </p>
          <p className="text-xs mt-1">Estimated Speedup</p>
        </div>
      </div>

      {/* Section B: Per-Run Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Per-Document Results ({data.totalRuns} runs)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">Document</th>
                <th className="text-left py-2 pr-3">Publisher</th>
                <th className="text-right py-2 pr-3">Zones</th>
                <th className="text-right py-2 pr-3">Agreement</th>
                <th className="text-right py-2 pr-3">Kappa</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.perRunSummary.map((run) => (
                <tr key={run.calibrationRunId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium truncate max-w-[200px]">{run.documentName}</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">{run.publisher}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.comparableZones}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${accColor(run.agreementRate)}`}>
                    {(run.agreementRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{run.cohensKappa?.toFixed(3) ?? '--'}</td>
                  <td className="py-2 text-xs text-gray-500">{fmtDate(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C: Per-Type Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Per-Type Accuracy (aggregated)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              <th className="text-left py-2 pr-3">Zone Type</th>
              <th className="text-right py-2 pr-3">Agree</th>
              <th className="text-right py-2 pr-3">Total</th>
              <th className="text-right py-2">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {typeEntries.map(([type, val]) => {
              const v = val as { agree: number; total: number; rate: number };
              return (
                <tr key={type} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium">{type}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{v.agree}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{v.total}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${accColor(v.rate)}`}>{(v.rate * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Section D: Per-Publisher Accuracy */}
      {pubEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Per-Publisher Accuracy</h3>
          <div className="space-y-3">
            {pubEntries.map(([pub, val]) => {
              const v = val as { agree: number; total: number; rate: number };
              const barColor = v.rate >= 0.90 ? 'bg-green-500' : v.rate >= 0.75 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={pub} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-medium text-gray-600 truncate">{pub}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div className={`${barColor} rounded-full h-5 flex items-center justify-end pr-2`} style={{ width: `${Math.max(v.rate * 100, 5)}%` }}>
                      <span className="text-[10px] font-bold text-white">{(v.rate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <span className="w-16 text-xs text-gray-400 text-right">{v.agree}/{v.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section E: Prompt Version Comparison */}
      {data.promptVersionStats && data.promptVersionStats.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Prompt Version Comparison</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">Version</th>
                <th className="text-right py-2 pr-3">Runs</th>
                <th className="text-right py-2 pr-3">Avg Agreement</th>
                <th className="text-right py-2">Avg Kappa</th>
              </tr>
            </thead>
            <tbody>
              {data.promptVersionStats.map((pv) => (
                <tr key={pv.promptVersion} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium">{pv.promptVersion}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pv.runs}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${accColor(pv.avgAgreementRate)}`}>
                    {(pv.avgAgreementRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right tabular-nums">{pv.avgCohensKappa?.toFixed(3) ?? '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section F: Time Savings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Time Savings Estimate</h3>
        {data.timeSavingsEstimate ? (
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4 text-center flex-1">
              <p className="text-lg font-bold text-gray-700">{(data.timeSavingsEstimate.avgHumanTimePerZoneMs / 1000).toFixed(1)}s</p>
              <p className="text-xs text-gray-500">Blind annotation per zone</p>
            </div>
            <span className="text-2xl text-gray-400">&rarr;</span>
            <div className="bg-green-50 rounded-lg p-4 text-center flex-1">
              <p className="text-lg font-bold text-green-700">{(data.timeSavingsEstimate.avgAiAssistedTimePerZoneMs / 1000).toFixed(1)}s</p>
              <p className="text-xs text-gray-500">AI-assisted per zone</p>
            </div>
            <span className="text-2xl text-gray-400">=</span>
            <div className="bg-blue-50 rounded-lg p-4 text-center flex-1">
              <p className="text-lg font-bold text-blue-700">{data.timeSavingsEstimate.estimatedSpeedup.toFixed(1)}x</p>
              <p className="text-xs text-gray-500">Speedup</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No timing data available. Annotation session tracking will populate this.</p>
        )}
      </div>

      {/* Top Mistakes */}
      {data.topMistakes && data.topMistakes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Top Mistakes (across all runs)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">AI Predicted</th>
                <th className="text-left py-2 pr-3">Human Corrected To</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topMistakes.slice(0, 10).map((m, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 text-red-600">{m.from}</td>
                  <td className="py-2 pr-3 text-green-600">&rarr; {m.to}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
