import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { annotationReportService } from '@/services/annotation-report.service';
import { Spinner } from '@/components/ui/Spinner';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OperatorLineagePage() {
  const { runId } = useParams<{ runId: string }>();
  const [pageFilter, setPageFilter] = useState('ALL');
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['annotation-report', runId],
    queryFn: () => annotationReportService.getAnnotationReport(runId!),
    enabled: !!runId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12 text-red-500">
          Failed to load lineage report. {error instanceof Error ? error.message : ''}
        </div>
      </div>
    );
  }

  const lineage: any[] = report.lineageDetails ?? [];
  const documentId = report.header?.documentId ?? report.documentId;
  const documentName = report.header?.documentName ?? report.documentName ?? 'Unknown';

  const pages = [...new Set(lineage.map((z: any) => z.pageNumber))].sort((a: number, b: number) => a - b);

  const filtered = lineage.filter((z: any) => {
    if (pageFilter !== 'ALL' && z.pageNumber !== Number(pageFilter)) return false;
    if (bucketFilter !== 'ALL' && z.reconciliationBucket !== bucketFilter) return false;
    if (statusFilter === 'annotated' && !z.humanDecision) return false;
    if (statusFilter === 'pending' && z.humanDecision) return false;
    return true;
  });

  const bucketColor = (b: string | null) =>
    b === 'GREEN' ? 'text-green-600' : b === 'AMBER' ? 'text-amber-600' : b === 'RED' ? 'text-red-600' : 'text-gray-400';

  const decisionColor = (d: string | null) =>
    d === 'CONFIRMED' ? 'text-green-600' : d === 'CORRECTED' ? 'text-yellow-600' : d === 'REJECTED' ? 'text-red-600' : 'text-gray-400';

  // Summary stats
  const totalZones = lineage.length;
  const annotatedZones = lineage.filter((z: any) => z.humanDecision).length;
  const confirmed = lineage.filter((z: any) => z.humanDecision === 'CONFIRMED').length;
  const corrected = lineage.filter((z: any) => z.humanDecision === 'CORRECTED').length;
  const rejected = lineage.filter((z: any) => z.humanDecision === 'REJECTED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Queue
          </Link>
          <h1 className="text-xl font-semibold">Annotation Lineage</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => annotationReportService.downloadLineageCsv(runId!)}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Export CSV &darr;
          </button>
          {documentId && (
            <Link
              to={`/bootstrap/review/${documentId}`}
              className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700"
            >
              Review Zones
            </Link>
          )}
        </div>
      </div>

      {/* Document info */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-gray-500">Document:</span> <span className="font-medium">{documentName}</span></div>
        <div><span className="text-gray-500">Pages:</span> <span className="font-medium">{pages.length}</span></div>
        <div><span className="text-gray-500">Zones:</span> <span className="font-medium">{totalZones}</span></div>
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Zones', value: totalZones, color: 'text-gray-900' },
          { label: 'Annotated', value: annotatedZones, color: 'text-blue-600' },
          { label: 'Confirmed', value: confirmed, color: 'text-green-600' },
          { label: 'Corrected', value: corrected, color: 'text-yellow-600' },
          { label: 'Rejected', value: rejected, color: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-xs mt-1 text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalZones > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Annotation Progress</span>
            <span className="font-medium">{annotatedZones}/{totalZones} ({Math.round((annotatedZones / totalZones) * 100)}%)</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(annotatedZones / totalZones) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={pageFilter}
          onChange={e => setPageFilter(e.target.value)}
          aria-label="Filter by page"
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="ALL">All Pages</option>
          {pages.map(p => (
            <option key={p} value={p}>Page {p}</option>
          ))}
        </select>
        <select
          value={bucketFilter}
          onChange={e => setBucketFilter(e.target.value)}
          aria-label="Filter by bucket"
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="ALL">All Buckets</option>
          <option value="GREEN">GREEN</option>
          <option value="AMBER">AMBER</option>
          <option value="RED">RED</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by annotation status"
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="ALL">All Status</option>
          <option value="annotated">Annotated</option>
          <option value="pending">Pending Review</option>
        </select>
      </div>

      {/* Lineage table — simplified for operators (no AI columns) */}
      {lineage.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No lineage data available.</div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500 bg-gray-50">
                  <th className="text-left py-2 px-3">Page</th>
                  <th className="text-left py-2 px-3">Zone#</th>
                  <th className="text-left py-2 px-3">Docling</th>
                  <th className="text-left py-2 px-3">PDFXT</th>
                  <th className="text-left py-2 px-3">Bucket</th>
                  <th className="text-left py-2 px-3">Your Decision</th>
                  <th className="text-left py-2 px-3">Your Label</th>
                  <th className="text-left py-2 px-3">Final Label</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((z: any, i: number) => (
                  <tr key={z.zoneId ?? i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-3">{z.pageNumber}</td>
                    <td className="py-2 px-3">{z.zoneIndex ?? i + 1}</td>
                    <td className="py-2 px-3 text-xs">{z.doclingLabel ?? '--'}</td>
                    <td className="py-2 px-3 text-xs">{z.pdfxtLabel ?? '--'}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-medium ${bucketColor(z.reconciliationBucket)}`}>
                        {z.reconciliationBucket ?? '--'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-medium ${decisionColor(z.humanDecision)}`}>
                        {z.humanDecision ?? '--'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{z.humanLabel ?? '--'}</td>
                    <td className="py-2 px-3 text-xs font-medium">{z.finalLabel ?? '--'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">No zones match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t text-xs text-gray-400">
            Showing {filtered.length} of {lineage.length} zones
          </div>
        </div>
      )}
    </div>
  );
}
