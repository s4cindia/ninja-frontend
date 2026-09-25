import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import {
  useTrialReport,
  useComparisonTrial,
  useExternalPacReport,
  useUploadExternalPacReport,
  useDeleteExternalPacReport,
} from '@/hooks/useComparisonStudy';
import { formatDuration } from '@/utils/format';
import type { ExternalPacReportSummary } from '@/types/comparisonStudy.types';

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

/**
 * pdfxtValue is optional — some metrics (time-to-convergence, AI/AWS cost)
 * are Ninja-only with no pdfxt equivalent to compare against. Omitting it
 * renders a single centered value instead of the Ninja-vs-pdfxt split.
 */
function MetricTile({
  label,
  ninjaValue,
  pdfxtValue,
}: {
  label: string;
  ninjaValue: string;
  pdfxtValue?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      {pdfxtValue === undefined ? (
        <p className="text-2xl font-bold tabular-nums text-teal-700 text-center">{ninjaValue}</p>
      ) : (
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
      )}
    </div>
  );
}

const PAC_SUMMARY_FIELDS: { key: keyof ExternalPacReportSummary; label: string }[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'fail', label: 'Fail' },
  { key: 'untested', label: 'Untested' },
  { key: 'humanRequired', label: 'Human Required' },
  { key: 'notApplicable', label: 'Not Applicable' },
];

/**
 * A real, external PAC-tool report file the operator uploads by hand — not
 * Ninja's own self-generated PAC report (that's PacReportModal, unrelated)
 * and not the veraPDF ninjaPacResult blob above. No parser exists for real
 * PAC exports, so the summary counts are hand-typed alongside the upload,
 * same as this page's pdfxt data-entry precedent.
 */
function ExternalPacReportCard({ trialId }: { trialId: string }) {
  const { data: pacReport, isLoading } = useExternalPacReport(trialId);
  const uploadMutation = useUploadExternalPacReport(trialId);
  const deleteMutation = useDeleteExternalPacReport(trialId);

  const [file, setFile] = useState<File | null>(null);
  const [counts, setCounts] = useState<Record<keyof ExternalPacReportSummary, string>>({
    pass: '', fail: '', untested: '', humanRequired: '', notApplicable: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleUpload = () => {
    setError(null);
    if (!file) {
      setError('Choose a PAC report file first.');
      return;
    }
    const summary: ExternalPacReportSummary = {};
    for (const { key } of PAC_SUMMARY_FIELDS) {
      const raw = counts[key].trim();
      if (raw) summary[key] = Number(raw);
    }
    uploadMutation.mutate(
      { file, summary },
      { onError: () => setError('Failed to upload External PAC Report — please retry.') }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">External PAC Report</h3>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (pacReport) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-1">External PAC Report</h3>
        <p className="text-xs text-gray-400 mb-4">{pacReport.originalFileName}</p>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Pass', value: pacReport.pass },
            { label: 'Fail', value: pacReport.fail },
            { label: 'Untested', value: pacReport.untested },
            { label: 'Human Required', value: pacReport.humanRequired },
            { label: 'Not Applicable', value: pacReport.notApplicable },
          ].map((c) => (
            <div key={c.label} className="text-center">
              <p className="text-lg font-bold tabular-nums text-gray-800">{c.value ?? '--'}</p>
              <p className="text-xs text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
        {/* No download link yet — ExternalPacReport only carries an s3Key,
            and there's no presigned-download endpoint in the API contract
            this was built against. Needs a backend addition before this can
            link anywhere real. */}
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Removing…' : 'Remove'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-semibold mb-1">External PAC Report</h3>
      <p className="text-xs text-gray-400 mb-4">
        Upload the real PAC-tool export for this file and enter its summary counts — there's no automated parser, so these are hand-entered.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 sm:col-span-3">
          <label htmlFor="external-pac-report-file" className="block text-xs font-medium text-gray-600 mb-1">PAC Report File</label>
          <input
            id="external-pac-report-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white hover:file:bg-gray-50"
          />
        </div>
        {PAC_SUMMARY_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`external-pac-report-${key}`} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              id={`external-pac-report-${key}`}
              type="number"
              min={0}
              value={counts[key]}
              onChange={(e) => setCounts((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={uploadMutation.isPending}
        className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {uploadMutation.isPending && <Loader2 className="animate-spin h-4 w-4" />}
        Upload PAC Report
      </button>
    </div>
  );
}

export default function ComparisonTrialReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading: reportLoading, error: reportError } = useTrialReport(id);
  const { data: trial, isLoading: trialLoading } = useComparisonTrial(id);

  if (reportLoading || trialLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (!trial) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <div className="text-center py-12 text-gray-400">Trial not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to={`/comparison-study/trials/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Trial</Link>
        <h1 className="text-xl font-semibold">Trial Report — {trial.sourceFileName}</h1>
      </div>

      {/* Ninja-vs-pdfxt comparison — only available once validation has run.
          Everything below this (auto-mode timing/cost, External PAC Report)
          comes from the trial itself and doesn't require validation. */}
      {reportError || !report ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          No comparison report available yet — run validation on this trial first.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {report.contentType} &middot; {report.pageCount != null ? `${report.pageCount} pages` : 'page count unknown'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricTile label="Time" ninjaValue={fmtMs(report.ninja.activeMs)} pdfxtValue={fmtMs(report.pdfxt.timeMs)} />
            <MetricTile label="Cost" ninjaValue={fmtUsd(report.ninja.costUsd)} pdfxtValue={fmtUsd(report.pdfxt.costUsd)} />
            <MetricTile
              label="PAC Failures"
              ninjaValue={fmtNum(report.ninja.pacFailureCount)}
              pdfxtValue={fmtNum(report.pdfxt.pacFailureCount)}
            />
            <MetricTile
              label="Pages / Hour"
              ninjaValue={fmtNum(report.ninja.pagesPerHour, 1)}
              pdfxtValue={fmtNum(report.pdfxt.pagesPerHour, 1)}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricTile label="Time to Convergence" ninjaValue={formatDuration(trial.autoStartedAt, trial.autoStoppedAt) ?? '--'} />
        <MetricTile label="AI Cost" ninjaValue={fmtUsd(trial.autoCostSpentUsd)} />
        <MetricTile label="AWS Cost (Est.)" ninjaValue={trial.ninjaGpuCostUsd != null ? `~${fmtUsd(trial.ninjaGpuCostUsd)}` : '--'} />
      </div>

      <ExternalPacReportCard trialId={id!} />
    </div>
  );
}
