import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { metricsService, type AggregateReport, type AggregateFilters } from '@/services/metrics.service';

function fmtMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function pct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${Math.round(v * 100)}%`;
}

const WORKFLOW_TYPES = ['All', 'MANUAL', 'AGENTIC'] as const;
const FILE_TYPES = ['All', 'EPUB', 'PDF'] as const;

export function AggregateTimeReportPage() {
  const [report, setReport] = useState<AggregateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [workflowType, setWorkflowType] = useState<string>('All');
  const [fileType, setFileType] = useState<string>('All');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: AggregateFilters = {};
      if (from) filters.from = new Date(from).toISOString();
      if (to) filters.to = new Date(to).toISOString();
      if (workflowType !== 'All') filters.workflowType = workflowType as 'MANUAL' | 'AGENTIC';
      if (fileType !== 'All') filters.fileType = fileType;
      const data = await metricsService.getAggregateReport(filters);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCsv = () => {
    const filters: AggregateFilters = {};
    if (from) filters.from = new Date(from).toISOString();
    if (to) filters.to = new Date(to).toISOString();
    if (workflowType !== 'All') filters.workflowType = workflowType as 'MANUAL' | 'AGENTIC';
    if (fileType !== 'All') filters.fileType = fileType;
    window.open(metricsService.getExportCsvUrl(filters), '_blank');
  };

  const kpis = report?.kpis;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5" /> Time Reports
        </h1>
        <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Workflow Type</label>
              <div className="flex gap-1">
                {WORKFLOW_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setWorkflowType(t)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${workflowType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">File Type</label>
              <div className="flex gap-1">
                {FILE_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setFileType(t)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${fileType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={fetchReport} isLoading={loading}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      {kpis && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { label: 'Total Workflows', value: String(kpis.totalWorkflows) },
            { label: 'Avg Workflow Time', value: fmtMs(kpis.avgWorkflowTimeMs) },
            { label: 'Auto-Approval Rate', value: pct(kpis.autoApprovalRate) },
            { label: 'Human Time Saved', value: fmtMs(kpis.totalHumanTimeSavedMs) },
            { label: 'p90 Elapsed', value: fmtMs(kpis.p90ElapsedMs) },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-semibold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}
      {error && <Alert variant="error" title="Error">{error}</Alert>}

      {/* Summary table */}
      {report && report.rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workflow Summary ({report.rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3">File</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Mode</th>
                    <th className="text-left py-2 pr-3">State</th>
                    <th className="text-right py-2 pr-3">Total</th>
                    <th className="text-right py-2 pr-3">Machine</th>
                    <th className="text-right py-2 pr-3">Human</th>
                    <th className="text-right py-2">Auto %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map(r => (
                    <tr key={r.workflowId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-3 max-w-[180px] truncate">
                        <Link to={`/workflow/${r.workflowId}/time-report`} className="text-primary hover:underline">
                          {r.filename}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{r.fileType}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{r.workflowType}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium ${r.currentState === 'COMPLETED' ? 'text-green-600' : r.currentState === 'FAILED' ? 'text-red-600' : 'text-amber-600'}`}>
                          {r.currentState}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right">{fmtMs(r.totalElapsedMs)}</td>
                      <td className="py-2 pr-3 text-right">{fmtMs(r.machineTimeMs)}</td>
                      <td className="py-2 pr-3 text-right">{fmtMs(r.humanActiveMs)}</td>
                      <td className="py-2 text-right">{pct(r.autoApprovalRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {report && report.rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No workflows found for the selected filters.
        </div>
      )}
    </div>
  );
}
