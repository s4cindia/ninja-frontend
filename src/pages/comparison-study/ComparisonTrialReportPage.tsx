import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useTrialReport } from '@/hooks/useComparisonStudy';

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '--';
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '--';
  return `$${v.toFixed(2)}`;
}

function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v == null) return '--';
  return v.toFixed(digits);
}

function MetricTile({
  label,
  ninjaValue,
  pdfxtValue,
}: {
  label: string;
  ninjaValue: string;
  pdfxtValue: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <div className="text-center flex-1">
          <p className="text-2xl font-bold tabular-nums text-teal-700">{ninjaValue}</p>
          <p className="text-xs text-gray-400 mt-1">Ninja</p>
        </div>
        <span className="text-gray-300">vs</span>
        <div className="text-center flex-1">
          <p className="text-2xl font-bold tabular-nums text-gray-600">{pdfxtValue}</p>
          <p className="text-xs text-gray-400 mt-1">pdfxt</p>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonTrialReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTrialReport(id);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <div className="text-center py-12 text-gray-400">
          No report available yet — run validation on this trial first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to={`/comparison-study/trials/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Trial</Link>
        <h1 className="text-xl font-semibold">Trial Report — {data.sourceFileName}</h1>
      </div>
      <p className="text-sm text-gray-500">
        {data.contentType} &middot; {data.pageCount != null ? `${data.pageCount} pages` : 'page count unknown'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricTile label="Time" ninjaValue={fmtMs(data.ninja.activeMs)} pdfxtValue={fmtMs(data.pdfxt.timeMs)} />
        <MetricTile label="Cost" ninjaValue={fmtUsd(data.ninja.costUsd)} pdfxtValue={fmtUsd(data.pdfxt.costUsd)} />
        <MetricTile
          label="PAC Failures"
          ninjaValue={fmtNum(data.ninja.pacFailureCount)}
          pdfxtValue={fmtNum(data.pdfxt.pacFailureCount)}
        />
        <MetricTile
          label="Pages / Hour"
          ninjaValue={fmtNum(data.ninja.pagesPerHour, 1)}
          pdfxtValue={fmtNum(data.pdfxt.pagesPerHour, 1)}
        />
      </div>
    </div>
  );
}
