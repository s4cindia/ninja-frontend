import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useComparisonReport } from '@/hooks/useZoneReview';
import { Spinner } from '@/components/ui/Spinner';
import type { ComparisonResult } from '@/services/zone-correction.service';

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

function confDotColor(val: number): string {
  if (val >= 0.95) return 'text-green-600';
  if (val >= 0.80) return 'text-yellow-600';
  return 'text-red-600';
}

export default function ComparisonReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data, isLoading, error } = useComparisonReport(runId!);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [agreeFilter, setAgreeFilter] = useState<'all' | 'agree' | 'disagree'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [detailPage, setDetailPage] = useState(0);

  const comparison: ComparisonResult | undefined = data?.comparisons?.[0];

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !comparison) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12 text-gray-400">
          No comparison data available. Run a comparison from the Zone Review workspace first.
        </div>
      </div>
    );
  }

  const typeEntries = Object.entries(comparison.perTypeAccuracy).sort(
    (a, b) => {
      const aTotal = comparison.zoneDetails.filter((z) => z.type === a[0]).length;
      const bTotal = comparison.zoneDetails.filter((z) => z.type === b[0]).length;
      return bTotal - aTotal;
    },
  );

  const filteredDetails = comparison.zoneDetails.filter((z) => {
    if (agreeFilter === 'agree' && !z.agrees) return false;
    if (agreeFilter === 'disagree' && z.agrees) return false;
    if (typeFilter && z.type !== typeFilter) return false;
    return true;
  });

  const PAGE_SIZE = 50;
  const totalDetailPages = Math.ceil(filteredDetails.length / PAGE_SIZE);
  const pagedDetails = filteredDetails.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE);

  const allTypes = [...new Set(comparison.zoneDetails.map((z) => z.type))].sort();

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/bootstrap`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Zone Review
        </Link>
        <h1 className="text-xl font-semibold">Comparison Report</h1>
      </div>

      {/* Section A: KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-lg border-l-4 p-4 ${kpiColor(comparison.agreementRate, [0.85, 0.70])}`}>
          <p className="text-3xl font-bold tabular-nums">{(comparison.agreementRate * 100).toFixed(1)}%</p>
          <p className="text-xs mt-1">Agreement Rate</p>
        </div>
        <div className={`rounded-lg border-l-4 p-4 ${comparison.cohensKappa != null ? kpiColor(comparison.cohensKappa, [0.80, 0.60]) : 'border-gray-300 bg-gray-50 text-gray-600'}`}>
          <p className="text-3xl font-bold tabular-nums">{comparison.cohensKappa != null ? comparison.cohensKappa.toFixed(3) : '--'}</p>
          <p className="text-xs mt-1">Cohen&apos;s Kappa</p>
        </div>
        <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-4 text-gray-700">
          <p className="text-3xl font-bold tabular-nums">{comparison.comparableZones} <span className="text-lg font-normal text-gray-400">/ {comparison.totalZones}</span></p>
          <p className="text-xs mt-1">Comparable Zones</p>
        </div>
        <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4 text-red-700">
          <p className="text-3xl font-bold tabular-nums">{comparison.disagreementCount}</p>
          <p className="text-xs mt-1">Disagreements</p>
        </div>
      </div>

      {/* Section B: Per-Type Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Per-Type Accuracy</h3>
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
            {typeEntries.map(([type, accuracy]) => {
              const total = comparison.zoneDetails.filter((z) => z.type === type).length;
              const agree = Math.round(accuracy * total);
              return (
                <tr key={type} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium">{type}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{agree}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{total}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${accColor(accuracy)}`}>
                    {(accuracy * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Section C: Per-Bucket Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Per-Bucket Accuracy</h3>
        <div className="space-y-3">
          {(['GREEN', 'AMBER', 'RED'] as const).map((bucket) => {
            const acc = comparison.perBucketAccuracy[bucket] ?? 0;
            const barColor = bucket === 'GREEN' ? 'bg-green-500' : bucket === 'AMBER' ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={bucket} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium text-gray-600">{bucket}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5">
                  <div className={`${barColor} rounded-full h-5 flex items-center justify-end pr-2`} style={{ width: `${Math.max(acc * 100, 5)}%` }}>
                    <span className="text-[10px] font-bold text-white">{(acc * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section D: Confidence Calibration */}
      {comparison.confidenceCalibration.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Confidence Calibration</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">Confidence Bucket</th>
                <th className="text-right py-2 pr-3">Avg Predicted</th>
                <th className="text-right py-2 pr-3">Actual Agreement</th>
                <th className="text-right py-2 pr-3">Gap</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {comparison.confidenceCalibration.map((row) => {
                const gap = row.predicted - row.actual;
                return (
                  <tr key={row.bucket} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{row.bucket}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(row.predicted * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(row.actual * 100).toFixed(1)}%</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${gap > 0.05 ? 'text-red-500' : 'text-green-600'}`}>
                      {gap > 0 ? '+' : ''}{(gap * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Section E: Common Mistakes */}
      {comparison.commonMistakes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Common Mistakes</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">AI Predicted</th>
                <th className="text-left py-2 pr-3">Human Corrected To</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {comparison.commonMistakes.slice(0, 10).map((m, i) => (
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

      {/* Section F: Zone Details (collapsible) */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setDetailsOpen((v) => !v)}
          className="w-full px-6 py-4 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50"
        >
          <span>Zone Details ({comparison.zoneDetails.length} zones)</span>
          <span className="text-gray-400">{detailsOpen ? '\u25B2' : '\u25BC'}</span>
        </button>
        {detailsOpen && (
          <div className="px-6 pb-6">
            <div className="flex gap-3 mb-4">
              <select
                value={agreeFilter}
                onChange={(e) => { setAgreeFilter(e.target.value as 'all' | 'agree' | 'disagree'); setDetailPage(0); }}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="agree">Agrees only</option>
                <option value="disagree">Disagrees only</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setDetailPage(0); }}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">All Types</option>
                {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="text-xs text-gray-400 self-center">{filteredDetails.length} zones</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 pr-3">Page</th>
                    <th className="text-left py-2 pr-3">Original Type</th>
                    <th className="text-left py-2 pr-3">Human Label</th>
                    <th className="text-left py-2 pr-3">AI Label</th>
                    <th className="text-right py-2 pr-3">AI Confidence</th>
                    <th className="text-center py-2">Agrees</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDetails.map((z) => (
                    <tr key={z.zoneId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-3">{z.pageNumber}</td>
                      <td className="py-2 pr-3 text-xs">{z.type}</td>
                      <td className="py-2 pr-3 text-xs font-medium">{z.humanLabel}</td>
                      <td className="py-2 pr-3 text-xs">{z.aiLabel}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${confDotColor(z.aiConfidence)}`}>
                        {(z.aiConfidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 text-center">
                        {z.agrees
                          ? <span className="text-green-600 font-bold">&check;</span>
                          : <span className="text-red-600 font-bold">&times;</span>}
                      </td>
                    </tr>
                  ))}
                  {pagedDetails.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">No zones match filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalDetailPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
                  disabled={detailPage === 0}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30"
                >
                  &larr; Prev
                </button>
                <span className="text-xs text-gray-500">Page {detailPage + 1} of {totalDetailPages}</span>
                <button
                  onClick={() => setDetailPage((p) => Math.min(totalDetailPages - 1, p + 1))}
                  disabled={detailPage >= totalDetailPages - 1}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-30"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
