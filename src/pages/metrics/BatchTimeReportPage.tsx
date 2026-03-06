import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { metricsService, type BatchDetailReport } from '@/services/metrics.service';

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

const FILE_TYPES = ['All', 'EPUB', 'PDF'] as const;

export function BatchTimeReportPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [report, setReport] = useState<BatchDetailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('All');
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!batchId) return;
    setLoading(true);
    (async () => {
      try {
        const data = await metricsService.getBatchDetailReport(batchId, fileType === 'All' ? undefined : fileType);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId, fileType]);

  // Tick every second while any file has an open gate
  useEffect(() => {
    const hasOpenGate = report?.files.some(f => f.openGateEnteredAt !== null) ?? false;
    if (hasOpenGate) {
      timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [report]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <Alert variant="error" title="Error">{error}</Alert>;
  if (!report) return null;

  const s = report.summary;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to={`/workflow/batch/${batchId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" /> Batch Time Report
          </h1>
          <p className="text-sm text-muted-foreground">{report.name}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Elapsed', value: fmtMs(s.totalElapsedMs) },
            { label: 'Avg Workflow', value: fmtMs(s.avgWorkflowTimeMs) },
            { label: 'Auto-Approval Rate', value: pct(s.autoApprovalRate) },
            { label: 'Human Time Saved', value: fmtMs(s.humanTimeSavedMs) },
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

      {/* File type filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <div className="flex gap-1">
          {FILE_TYPES.map(ft => (
            <button
              key={ft}
              onClick={() => setFileType(ft)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                fileType === ft
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

      {/* Per-file table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Per-File Results ({report.files.length} files)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4">File</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">State</th>
                  <th className="text-right py-2 pr-4">Total</th>
                  <th className="text-right py-2 pr-4">Machine</th>
                  <th className="text-right py-2 pr-4">Human Wait</th>
                  <th className="text-right py-2 pr-4">Human Active</th>
                  <th className="text-center py-2">Gates</th>
                </tr>
              </thead>
              <tbody>
                {report.files.map(f => {
                  const liveExtra = f.openGateEnteredAt
                    ? Math.max(0, now - new Date(f.openGateEnteredAt).getTime())
                    : 0;
                  const displayWait = f.humanWaitMs + liveExtra;
                  const isLive = liveExtra > 0;
                  return (
                    <tr key={f.workflowId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        <Link to={`/workflow/${f.workflowId}/time-report`} className="text-primary hover:underline">
                          {f.filename}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{f.fileType}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-medium ${f.currentState === 'COMPLETED' ? 'text-green-600' : f.currentState === 'FAILED' ? 'text-red-600' : 'text-amber-600'}`}>
                          {f.currentState}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{fmtMs(f.totalElapsedMs)}</td>
                      <td className="py-2 pr-4 text-right">{fmtMs(f.machineTimeMs)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className={isLive ? 'text-amber-600 font-medium' : ''}>
                          {fmtMs(displayWait)}
                        </span>
                        {isLive && (
                          <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse align-middle" title="Waiting for review" />
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right">{fmtMs(f.humanActiveMs)}</td>
                      <td className="py-2 text-center text-xs">{f.autoApprovedCount}/{f.gateCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
