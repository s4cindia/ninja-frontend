import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { annotationReportService } from '@/services/annotation-report.service';
import { Spinner } from '@/components/ui/Spinner';

function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

type Tab = 'summary' | 'operators' | 'pages' | 'efficiency';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AnnotationTimesheetPage() {
  const { runId } = useParams<{ runId: string }>();
  const [tab, setTab] = useState<Tab>('summary');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['timesheet-report', runId],
    queryFn: () => annotationReportService.getTimesheetReport(runId!),
    enabled: !!runId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12 text-red-500">
          Failed to load timesheet report. {error instanceof Error ? error.message : ''}
        </div>
      </div>
    );
  }

  const ts = report.timeSummary ?? {};
  const operators: any[] = report.byOperator ?? [];
  const pages: any[] = report.byPage ?? [];
  const efficiency = report.efficiency ?? {};

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Time Summary' },
    { key: 'operators', label: 'By Operator' },
    { key: 'pages', label: 'By Page' },
    { key: 'efficiency', label: 'Efficiency' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/bootstrap/review/${report.header?.documentId ?? report.documentId ?? ''}`} className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Zone Review
          </Link>
          <h1 className="text-xl font-semibold">Timesheet Report</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => annotationReportService.downloadTimesheetCsv(runId!)}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            CSV &darr;
          </button>
          <button
            onClick={() => annotationReportService.downloadTimesheetPdf(runId!)}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            PDF &darr;
          </button>
        </div>
      </div>

      {/* Document info */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-gray-500">Document:</span> <span className="font-medium">{report.documentName ?? '--'}</span></div>
        <div><span className="text-gray-500">Run ID:</span> <span className="font-mono text-xs">{runId?.slice(0, 12)}...</span></div>
        <div><span className="text-gray-500">Pages:</span> <span className="font-medium">{report.pageCount ?? '--'}</span></div>
        <div><span className="text-gray-500">Zones:</span> <span className="font-medium">{report.zoneCount ?? '--'}</span></div>
        {report.periodFrom && report.periodTo && (
          <div><span className="text-gray-500">Period:</span> <span className="font-medium">{fmtDate(report.periodFrom)} — {fmtDate(report.periodTo)}</span></div>
        )}
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Wall-Clock Time', value: fmtMs(ts.wallClockMs), color: 'text-blue-600' },
          { label: 'Active Time', value: fmtMs(ts.activeMs), color: 'text-blue-600' },
          { label: 'Idle Time', value: fmtMs(ts.idleMs), color: 'text-gray-500' },
          { label: 'Zones/Hour', value: ts.zonesPerHour != null ? Number(ts.zonesPerHour).toFixed(2) : '--', color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-xs mt-1 text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Avg Secs/Zone', value: ts.avgSecsPerZone != null ? `${Number(ts.avgSecsPerZone).toFixed(2)}s` : '--', color: 'text-blue-600' },
          { label: 'Auto-Annotation Time', value: fmtMs(ts.autoAnnotationMs), color: 'text-indigo-600' },
          { label: 'Manual Review Time', value: fmtMs(ts.manualReviewMs), color: 'text-blue-600' },
          { label: 'Pages/Hour', value: ts.pagesPerHour != null ? Number(ts.pagesPerHour).toFixed(2) : '--', color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-xs mt-1 text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'summary' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Time Summary</h3>
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Total Wall-Clock Time', value: fmtMs(ts.totalWallClockMs) },
                { label: 'Total Active Time', value: fmtMs(ts.totalActiveMs ?? ts.activeMs) },
                { label: 'Total Idle Time', value: fmtMs(ts.totalIdleMs ?? ts.idleMs) },
                { label: 'Auto-Annotation Time', value: fmtMs(ts.autoAnnotationMs) },
                { label: 'Manual Review Time', value: fmtMs(ts.manualReviewMs) },
                { label: 'Avg. Seconds per Zone', value: ts.avgSecsPerZone != null ? `${Number(ts.avgSecsPerZone).toFixed(2)}s` : '--' },
                { label: 'Zones per Hour', value: ts.zonesPerHour != null ? Number(ts.zonesPerHour).toFixed(2) : '--' },
                { label: 'Pages per Hour', value: ts.pagesPerHour != null ? Number(ts.pagesPerHour).toFixed(2) : '--' },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 text-gray-500 w-1/2">{row.label}</td>
                  <td className="py-2.5 font-medium text-right tabular-nums">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'operators' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 pr-3">Operator</th>
                  <th className="text-right py-2 pr-3">Zones Reviewed</th>
                  <th className="text-right py-2 pr-3">Active Time</th>
                  <th className="text-right py-2 pr-3">Zones/hr</th>
                  <th className="text-right py-2 pr-3">Confirm %</th>
                  <th className="text-right py-2 pr-3">Correct %</th>
                  <th className="text-right py-2 pr-3">Reject %</th>
                  <th className="text-right py-2">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op: any, i: number) => (
                  <tr key={op.operator ?? i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{op.operator}</td>
                    <td className="py-2 pr-3 text-right">{op.zonesReviewed}</td>
                    <td className="py-2 pr-3 text-right">{fmtMs(op.activeMs)}</td>
                    <td className="py-2 pr-3 text-right">{op.zonesPerHour?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 pr-3 text-right text-green-600">{op.confirmPct != null ? `${Math.round(op.confirmPct)}%` : '--'}</td>
                    <td className="py-2 pr-3 text-right text-yellow-600">{op.correctPct != null ? `${Math.round(op.correctPct)}%` : '--'}</td>
                    <td className="py-2 pr-3 text-right text-red-600">{op.rejectPct != null ? `${Math.round(op.rejectPct)}%` : '--'}</td>
                    <td className="py-2 text-right text-xs text-gray-500">{fmtDate(op.lastActivity)}</td>
                  </tr>
                ))}
                {operators.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">No operator data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pages' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 pr-3">Page</th>
                  <th className="text-right py-2 pr-3">Zones</th>
                  <th className="text-right py-2 pr-3">Time Spent</th>
                  <th className="text-right py-2 pr-3">Zones/Min</th>
                  <th className="text-right py-2 pr-3">Confirmed</th>
                  <th className="text-right py-2 pr-3">Corrected</th>
                  <th className="text-right py-2">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p: any, i: number) => (
                  <tr key={p.pageNumber ?? i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3">{p.pageNumber}</td>
                    <td className="py-2 pr-3 text-right">{p.zones}</td>
                    <td className="py-2 pr-3 text-right">{fmtMs(p.timeSpentMs)}</td>
                    <td className="py-2 pr-3 text-right">{p.zonesPerMin?.toFixed(1) ?? '--'}</td>
                    <td className="py-2 pr-3 text-right text-green-600">{p.confirmed ?? 0}</td>
                    <td className="py-2 pr-3 text-right text-yellow-600">{p.corrected ?? 0}</td>
                    <td className="py-2 text-right text-red-600">{p.rejected ?? 0}</td>
                  </tr>
                ))}
                {pages.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No page data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'efficiency' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Efficiency Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Auto-annotation Savings', value: efficiency.autoAnnotationSavings != null ? fmtMs(efficiency.autoAnnotationSavings) : '--' },
              { label: 'Review Queue Reduction', value: efficiency.reviewQueueReduction != null ? `${Math.round(efficiency.reviewQueueReduction * 100)}%` : '--' },
              { label: 'Estimated Cost', value: efficiency.estimatedCost != null ? `$${efficiency.estimatedCost.toFixed(2)}` : '--' },
              { label: 'Complexity Score', value: efficiency.complexityScore != null ? efficiency.complexityScore.toFixed(2) : '--' },
            ].map(m => (
              <div key={m.label} className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">{m.label}</span>
                <span className="font-semibold text-blue-600">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
