import { Link } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAggregateReport } from '@/hooks/useComparisonStudy';

function fmtMs(ms: number | null): string {
  if (ms == null) return '--';
  return `${(ms / 1000).toFixed(1)}s`;
}
function fmtUsd(v: number | null): string {
  if (v == null) return '--';
  return `$${v.toFixed(2)}`;
}
function fmtNum(v: number | null): string {
  if (v == null) return '--';
  return v.toFixed(2);
}

export default function ComparisonAggregateReportPage() {
  const { data, isLoading, error } = useAggregateReport();

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <div className="text-center py-12 text-gray-400">No aggregate data available yet.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <h1 className="text-xl font-semibold">Comparison Study — Aggregate Report</h1>
      </div>

      <p className="text-sm text-gray-500">
        {data.validatedCount} of {data.trialCount} trials validated
      </p>

      {/* Time Savings Estimate — same 3-box pattern as the blind-annotation speedup
          tile, relabeled pdfxt-time -> Ninja-time -> speedup. */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Time Savings Estimate</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4 text-center flex-1">
            <p className="text-lg font-bold text-gray-700">{fmtMs(data.avgPdfxtTimeMs)}</p>
            <p className="text-xs text-gray-500">Avg pdfxt time</p>
          </div>
          <span className="text-2xl text-gray-400">&rarr;</span>
          <div className="bg-green-50 rounded-lg p-4 text-center flex-1">
            <p className="text-lg font-bold text-green-700">{fmtMs(data.avgNinjaActiveMs)}</p>
            <p className="text-xs text-gray-500">Avg Ninja time</p>
          </div>
          <span className="text-2xl text-gray-400">=</span>
          <div className="bg-blue-50 rounded-lg p-4 text-center flex-1">
            <p className="text-lg font-bold text-blue-700">
              {data.estimatedSpeedup != null ? `${data.estimatedSpeedup.toFixed(1)}x` : '--'}
            </p>
            <p className="text-xs text-gray-500">Speedup</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Avg Cost</p>
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold tabular-nums text-teal-700">{fmtUsd(data.avgNinjaCostUsd)}</p>
              <p className="text-xs text-gray-400 mt-1">Ninja</p>
            </div>
            <span className="text-gray-300">vs</span>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold tabular-nums text-gray-600">{fmtUsd(data.avgPdfxtCostUsd)}</p>
              <p className="text-xs text-gray-400 mt-1">pdfxt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Avg PAC Failures</p>
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold tabular-nums text-teal-700">{fmtNum(data.avgNinjaPacFailures)}</p>
              <p className="text-xs text-gray-400 mt-1">Ninja</p>
            </div>
            <span className="text-gray-300">vs</span>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold tabular-nums text-gray-600">{fmtNum(data.avgPdfxtPacFailures)}</p>
              <p className="text-xs text-gray-400 mt-1">pdfxt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
