import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { annotationReportService } from '@/services/annotation-report.service';
import { useAiAnnotationReport, useAnnotationFeedback } from '@/hooks/useZoneReview';
import { Spinner } from '@/components/ui/Spinner';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function fmtRate(val: unknown): string {
  if (val == null || typeof val !== 'number') return '--';
  return `${(val * 100).toFixed(1)}%`;
}

function fmtSummaryValue(key: string, val: unknown): string {
  if (val == null) return '--';
  if (typeof val === 'number' && key.toLowerCase().endsWith('rate')) {
    return fmtRate(val);
  }
  return typeof val === 'number' ? String(val) : String(val);
}

type Tab = 'summary' | 'zones' | 'quality' | 'corrections' | 'ai-costs' | 'feedback' | 'lineage';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AnnotationReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const [tab, setTab] = useState<Tab>('summary');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [bucketFilter, setBucketFilter] = useState('ALL');

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
          Failed to load annotation report. {error instanceof Error ? error.message : ''}
        </div>
      </div>
    );
  }

  const summary = report.summary ?? {};
  const zones: any[] = report.zones ?? [];
  const quality = report.qualityMetrics ?? {};
  const corrections: any[] = report.corrections ?? [];
  const totalZones = summary.totalZones ?? 0;
  const confirmed = summary.confirmed ?? 0;
  const corrected = summary.corrected ?? 0;
  const rejected = summary.rejected ?? 0;
  const unreviewed = summary.unreviewed ?? 0;

  const filteredZones = zones.filter((z: any) => {
    if (decisionFilter !== 'ALL' && z.decision !== decisionFilter) return false;
    if (bucketFilter !== 'ALL' && z.bucket !== bucketFilter) return false;
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'zones', label: 'Zone Details' },
    { key: 'quality', label: 'Quality Metrics' },
    { key: 'corrections', label: 'Corrections Log' },
    { key: 'ai-costs', label: 'AI Costs' },
    { key: 'feedback', label: 'Feedback' },
    { key: 'lineage', label: 'Lineage' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/bootstrap/review/${report.documentId ?? ''}`} className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Zone Review
          </Link>
          <h1 className="text-xl font-semibold">Annotation Report</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={annotationReportService.getAnnotationReportCsvUrl(runId!)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            CSV &darr;
          </a>
          <a
            href={annotationReportService.getAnnotationReportPdfUrl(runId!)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            PDF &darr;
          </a>
        </div>
      </div>

      {/* Document info */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-gray-500">Document:</span> <span className="font-medium">{report.header?.documentName ?? report.documentName ?? 'Unknown'}</span></div>
        <div><span className="text-gray-500">Run ID:</span> <span className="font-mono text-xs">{runId?.slice(0, 12)}...</span></div>
        <div><span className="text-gray-500">Pages:</span> <span className="font-medium">{report.header?.totalPages ?? summary.pageCount ?? '--'}</span></div>
        <div><span className="text-gray-500">Date:</span> <span className="font-medium">{fmtDate(report.header?.createdAt ?? report.createdAt)}</span></div>
        {(report.header?.annotators ?? report.annotators) && (
          <div><span className="text-gray-500">Annotators:</span> <span className="font-medium">{((report.header?.annotators ?? report.annotators) as string[]).join(', ')}</span></div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Zones', value: totalZones, color: 'text-gray-900' },
          { label: 'Confirmed', value: `${confirmed} (${pct(confirmed, totalZones)})`, color: 'text-green-600' },
          { label: 'Corrected', value: `${corrected} (${pct(corrected, totalZones)})`, color: 'text-yellow-600' },
          { label: 'Rejected', value: `${rejected} (${pct(rejected, totalZones)})`, color: 'text-red-600' },
          { label: 'Unreviewed', value: `${unreviewed} (${pct(unreviewed, totalZones)})`, color: 'text-gray-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{k.value}</p>
            <p className={`text-xs mt-1 ${k.color}`}>{k.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'GREEN', value: summary.greenCount ?? 0, color: 'text-green-600' },
          { label: 'AMBER', value: summary.amberCount ?? 0, color: 'text-amber-600' },
          { label: 'RED', value: summary.redCount ?? 0, color: 'text-red-600' },
          { label: 'Accuracy Rate', value: summary.accuracyRate != null ? `${Math.round(summary.accuracyRate * 100)}%` : '--', color: 'text-blue-600' },
          { label: 'Auto-Annotated', value: summary.autoAnnotated ?? summary.autoAnnotatedCount ?? 0, color: 'text-indigo-600' },
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
          <h3 className="text-sm font-semibold mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(summary).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{key}</span>
                <span className="font-medium">{fmtSummaryValue(key, val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'zones' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-3 mb-4">
            <select
              value={decisionFilter}
              onChange={e => setDecisionFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="ALL">All Decisions</option>
              <option value="confirmed">Confirmed</option>
              <option value="corrected">Corrected</option>
              <option value="rejected">Rejected</option>
              <option value="unreviewed">Unreviewed</option>
            </select>
            <select
              value={bucketFilter}
              onChange={e => setBucketFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="ALL">All Buckets</option>
              <option value="GREEN">GREEN</option>
              <option value="AMBER">AMBER</option>
              <option value="RED">RED</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 pr-3">Page</th>
                  <th className="text-left py-2 pr-3">Zone#</th>
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left py-2 pr-3">Original Type</th>
                  <th className="text-left py-2 pr-3">Label</th>
                  <th className="text-left py-2 pr-3">Bucket</th>
                  <th className="text-left py-2 pr-3">Decision</th>
                  <th className="text-left py-2 pr-3">Final Label</th>
                  <th className="text-left py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map((z: any, i: number) => (
                  <tr key={z.id ?? i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3">{z.pageNumber}</td>
                    <td className="py-2 pr-3">{z.zoneNumber ?? i + 1}</td>
                    <td className="py-2 pr-3 text-xs">{z.source}</td>
                    <td className="py-2 pr-3 text-xs">{z.originalType}</td>
                    <td className="py-2 pr-3 text-xs">{z.label}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-medium ${
                        z.bucket === 'GREEN' ? 'text-green-600' : z.bucket === 'AMBER' ? 'text-amber-600' : 'text-red-600'
                      }`}>{z.bucket}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-medium ${
                        z.decision === 'confirmed' ? 'text-green-600' :
                        z.decision === 'corrected' ? 'text-yellow-600' :
                        z.decision === 'rejected' ? 'text-red-600' : 'text-gray-400'
                      }`}>{z.decision ?? 'unreviewed'}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs">{z.finalLabel ?? '--'}</td>
                    <td className="py-2 text-xs text-gray-500">{z.reviewedBy ?? '--'}</td>
                  </tr>
                ))}
                {filteredZones.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">No zones match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'quality' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-sm font-semibold mb-4">Quality Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Extractor Agreement Rate', value: fmtRate(quality.extractorAgreementRate) },
              { label: 'Auto-Annotation Coverage', value: fmtRate(quality.autoAnnotationCoverage) },
              { label: 'Human Review Required', value: fmtRate(quality.humanReviewRequiredPct ?? quality.humanReviewRequired) },
              { label: 'Correction Rate', value: fmtRate(quality.correctionRate) },
              { label: 'Rejection Rate', value: fmtRate(quality.rejectionRate) },
              { label: 'Pages With Zero Corrections', value: quality.pagesWithZeroCorrections ?? '--' },
              { label: 'Most Corrected Page', value: quality.mostCorrectedPage ?? '--' },
            ].map(m => (
              <div key={m.label} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">{m.label}</span>
                <span className="font-medium">{m.value}</span>
              </div>
            ))}
          </div>
          {quality.typeDistribution && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Type Distribution</h4>
              <div className="space-y-2">
                {Object.entries(quality.typeDistribution as Record<string, number>).map(([type, count]) => {
                  const maxCount = Math.max(...Object.values(quality.typeDistribution as Record<string, number>));
                  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-gray-600 truncate">{type}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div className="bg-blue-500 rounded-full h-4" style={{ width: `${widthPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'corrections' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 pr-3">Zone ID</th>
                  <th className="text-left py-2 pr-3">Page</th>
                  <th className="text-left py-2 pr-3">From → To</th>
                  <th className="text-left py-2 pr-3">Reason</th>
                  <th className="text-left py-2 pr-3">By</th>
                  <th className="text-left py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((c: any, i: number) => (
                  <tr key={c.id ?? i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-mono text-xs">{(c.zoneId ?? '').slice(0, 12)}...</td>
                    <td className="py-2 pr-3">{c.pageNumber}</td>
                    <td className="py-2 pr-3 text-xs">
                      <span className="text-red-500">{c.fromLabel}</span> → <span className="text-green-600">{c.toLabel}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-500 max-w-[200px] truncate">{c.reason || '--'}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{c.reviewedBy ?? '--'}</td>
                    <td className="py-2 text-xs text-gray-500">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
                {corrections.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No corrections recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ai-costs' && <AiCostsTab runId={runId!} />}

      {tab === 'feedback' && <FeedbackTab runId={runId!} />}

      {tab === 'lineage' && <LineageTab report={report} runId={runId!} />}
    </div>
  );
}

function AiCostsTab({ runId }: { runId: string }) {
  const { data: aiReport, isLoading } = useAiAnnotationReport(runId);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>;
  if (!aiReport) return <div className="text-center py-8 text-gray-400">No AI annotation data available.</div>;

  const runs = aiReport.runs ?? [];
  const latestRun = runs[0];
  const overrideRate = aiReport.totalAiAnnotatedZones > 0
    ? ((aiReport.aiOverriddenByHuman / aiReport.totalAiAnnotatedZones) * 100).toFixed(1)
    : '0.0';

  const fmtTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
  const fmtDuration = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const fmtCost = (n: number) => `$${n.toFixed(3)}`;
  const fmtShortDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Row 1: Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total AI Runs', value: runs.length, color: 'text-gray-900' },
          { label: 'Zones Annotated', value: `${aiReport.totalAiAnnotatedZones} / ${latestRun?.totalZones ?? '--'}`, color: 'text-blue-600' },
          { label: 'Human Overrides', value: aiReport.aiOverriddenByHuman, color: 'text-amber-600' },
          { label: 'Override Rate', value: `${overrideRate}%`, color: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-xs mt-1 text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Cost & Performance Table */}
      {runs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Cost &amp; Performance (per run)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="text-left py-2 pr-3">Run</th>
                  <th className="text-left py-2 pr-3">Model</th>
                  <th className="text-right py-2 pr-3">Zones</th>
                  <th className="text-right py-2 pr-3">Tokens (in/out)</th>
                  <th className="text-right py-2 pr-3">Cost</th>
                  <th className="text-right py-2 pr-3">Duration</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{runs.length - i}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{r.model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.annotatedZones}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-xs">{fmtTokens(r.inputTokens)}/{fmtTokens(r.outputTokens)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmtCost(r.estimatedCostUsd)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtDuration(r.durationMs)}</td>
                    <td className="py-2 text-xs text-gray-500">{fmtShortDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 3: Decision Distribution (latest run) */}
      {latestRun && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Decision Distribution (latest run)</h3>
          <div className="flex h-6 rounded-full overflow-hidden">
            {[
              { label: 'Confirmed', count: latestRun.confirmedCount, color: 'bg-green-500' },
              { label: 'Corrected', count: latestRun.correctedCount, color: 'bg-yellow-500' },
              { label: 'Rejected', count: latestRun.rejectedCount, color: 'bg-red-500' },
              { label: 'Skipped', count: latestRun.skippedZones, color: 'bg-gray-400' },
            ].map((s) => {
              const pct = latestRun.totalZones > 0 ? (s.count / latestRun.totalZones) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={s.label}
                  className={`${s.color} flex items-center justify-center text-[10px] font-bold text-white`}
                  style={{ width: `${pct}%` }}
                  title={`${s.label}: ${s.count}`}
                >
                  {pct > 8 ? s.count : ''}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmed: {latestRun.confirmedCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Corrected: {latestRun.correctedCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Rejected: {latestRun.rejectedCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Skipped: {latestRun.skippedZones}</span>
          </div>
        </div>
      )}

      {/* Row 4: Confidence Distribution (latest run) */}
      {latestRun && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Confidence Distribution (latest run)</h3>
          <div className="flex h-6 rounded-full overflow-hidden">
            {[
              { label: 'High (>= 0.95)', count: latestRun.highConfCount, color: 'bg-green-500' },
              { label: 'Medium (0.80-0.95)', count: latestRun.medConfCount, color: 'bg-yellow-500' },
              { label: 'Low (< 0.80)', count: latestRun.lowConfCount, color: 'bg-red-500' },
            ].map((s) => {
              const total = latestRun.highConfCount + latestRun.medConfCount + latestRun.lowConfCount;
              const pct = total > 0 ? (s.count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={s.label}
                  className={`${s.color} flex items-center justify-center text-[10px] font-bold text-white`}
                  style={{ width: `${pct}%` }}
                  title={`${s.label}: ${s.count}`}
                >
                  {pct > 8 ? s.count : ''}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> High: {latestRun.highConfCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Medium: {latestRun.medConfCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Low: {latestRun.lowConfCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackTab({ runId }: { runId: string }) {
  const { data: fb, isLoading } = useAnnotationFeedback(runId);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>;
  if (!fb) return <div className="text-center py-8 text-gray-400">No feedback data available.</div>;

  const overrideColor = fb.overrideRate < 0.10 ? 'text-green-600' : fb.overrideRate < 0.20 ? 'text-yellow-600' : 'text-red-600';
  const confColor = fb.averageOverriddenConfidence >= 0.95 ? 'text-green-600' : fb.averageOverriddenConfidence >= 0.80 ? 'text-yellow-600' : 'text-red-600';

  const matrix = fb.overridesByDecision;
  const matrixRows = [
    { label: 'AI Confirmed', confirmed: '—', corrected: matrix.aiConfirmedHumanCorrected, rejected: matrix.aiConfirmedHumanRejected },
    { label: 'AI Corrected', confirmed: matrix.aiCorrectedHumanConfirmed, corrected: matrix.aiCorrectedHumanCorrected, rejected: matrix.aiCorrectedHumanRejected },
    { label: 'AI Rejected', confirmed: matrix.aiRejectedHumanConfirmed, corrected: matrix.aiRejectedHumanCorrected, rejected: '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Section A: KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className={`text-2xl font-bold tabular-nums ${overrideColor}`}>{(fb.overrideRate * 100).toFixed(1)}%</p>
          <p className="text-xs mt-1 text-gray-500">Override Rate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-gray-900">{fb.totalHumanOverrides} <span className="text-lg font-normal text-gray-400">/ {fb.totalAiAnnotated}</span></p>
          <p className="text-xs mt-1 text-gray-500">Total Overrides</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className={`text-2xl font-bold tabular-nums ${confColor}`}>{fb.averageOverriddenConfidence.toFixed(2)}</p>
          <p className="text-xs mt-1 text-gray-500">Avg Override Confidence</p>
        </div>
      </div>

      {/* Section B: Override by Label */}
      {fb.overridesByType.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Overrides by Label</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3">AI Predicted</th>
                <th className="text-left py-2 pr-3">Human Changed To</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {fb.overridesByType.map((o, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 text-red-600">{o.aiLabel}</td>
                  <td className="py-2 pr-3 text-green-600">&rarr; {o.humanLabel}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{o.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section C: Decision Matrix */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Override Decision Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left py-2 pr-3"></th>
                <th className="text-center py-2 px-3">Human Confirmed</th>
                <th className="text-center py-2 px-3">Human Corrected</th>
                <th className="text-center py-2 px-3">Human Rejected</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.label} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium text-xs">{row.label}</td>
                  {[row.confirmed, row.corrected, row.rejected].map((val, i) => (
                    <td key={i} className={`py-2 px-3 text-center tabular-nums ${val === '—' ? 'text-gray-300' : typeof val === 'number' && val > 10 ? 'bg-red-50 text-red-700 font-semibold' : typeof val === 'number' && val > 0 ? 'bg-yellow-50 text-yellow-700' : ''}`}>
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section D: Confidence vs Override Rate */}
      {fb.confidenceDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold mb-4">Confidence vs Override Rate</h3>
          <div className="space-y-2">
            {fb.confidenceDistribution.map((row) => {
              const barWidth = Math.max(row.overrideRate * 100, 2);
              const barColor = row.overrideRate < 0.05 ? 'bg-green-500' : row.overrideRate < 0.15 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={row.bucket} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-mono text-gray-600">{row.bucket}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div className={`${barColor} rounded-full h-5 flex items-center justify-end pr-2`} style={{ width: `${barWidth}%` }}>
                      <span className="text-[10px] font-bold text-white">{(row.overrideRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <span className="w-20 text-xs text-gray-400 text-right">{row.overrides}/{row.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LineageTab({ report, runId }: { report: any; runId: string }) {
  const [pageFilter, setPageFilter] = useState('ALL');
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [decisionFilter, setDecisionFilter] = useState('ALL');

  const lineage: any[] = report.lineageDetails ?? [];

  const pages = [...new Set(lineage.map((z: any) => z.pageNumber))].sort((a, b) => a - b);

  const filtered = lineage.filter((z: any) => {
    if (pageFilter !== 'ALL' && z.pageNumber !== Number(pageFilter)) return false;
    if (bucketFilter !== 'ALL' && z.reconciliationBucket !== bucketFilter) return false;
    if (decisionFilter === 'ai-only' && !z.aiDecision) return false;
    if (decisionFilter === 'human-only' && !z.humanDecision) return false;
    if (decisionFilter === 'both' && (!z.aiDecision || !z.humanDecision)) return false;
    if (decisionFilter === 'unreviewed' && (z.aiDecision || z.humanDecision)) return false;
    return true;
  });

  const bucketColor = (b: string | null) =>
    b === 'GREEN' ? 'text-green-600' : b === 'AMBER' ? 'text-amber-600' : b === 'RED' ? 'text-red-600' : 'text-gray-400';

  const decisionColor = (d: string | null) =>
    d === 'CONFIRMED' ? 'text-green-600' : d === 'CORRECTED' ? 'text-yellow-600' : d === 'REJECTED' ? 'text-red-600' : 'text-gray-400';

  if (lineage.length === 0) {
    return <div className="text-center py-12 text-gray-400">No lineage data available. Ensure the backend returns lineageDetails in the annotation report.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <select
            value={pageFilter}
            onChange={e => setPageFilter(e.target.value)}
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
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="ALL">All Buckets</option>
            <option value="GREEN">GREEN</option>
            <option value="AMBER">AMBER</option>
            <option value="RED">RED</option>
          </select>
          <select
            value={decisionFilter}
            onChange={e => setDecisionFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="ALL">All Annotations</option>
            <option value="ai-only">AI Annotated</option>
            <option value="human-only">Human Annotated</option>
            <option value="both">AI + Human</option>
            <option value="unreviewed">Unreviewed</option>
          </select>
        </div>
        <a
          href={annotationReportService.getLineageCsvUrl(runId)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Lineage CSV &darr;
        </a>
      </div>

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
                <th className="text-left py-2 px-3">AI Decision</th>
                <th className="text-left py-2 px-3">AI Label</th>
                <th className="text-left py-2 px-3">AI Conf</th>
                <th className="text-left py-2 px-3">Human Decision</th>
                <th className="text-left py-2 px-3">Human Label</th>
                <th className="text-left py-2 px-3">Final</th>
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
                    <span className={`text-xs font-medium ${decisionColor(z.aiDecision)}`}>
                      {z.aiDecision ?? '--'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs">{z.aiLabel ?? '--'}</td>
                  <td className="py-2 px-3 text-xs tabular-nums">
                    {z.aiConfidence != null ? z.aiConfidence.toFixed(2) : '--'}
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
                <tr><td colSpan={11} className="py-8 text-center text-gray-400">No zones match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t text-xs text-gray-400">
          Showing {filtered.length} of {lineage.length} zones
        </div>
      </div>
    </div>
  );
}
