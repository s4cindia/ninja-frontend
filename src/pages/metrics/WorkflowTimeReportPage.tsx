import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { metricsService, type WorkflowDetailReport } from '@/services/metrics.service';

function fmtMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

const TYPE_BADGE: Record<string, string> = {
  machine: 'bg-blue-100 text-blue-700',
  hitl: 'bg-amber-100 text-amber-700',
  terminal: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-500',
};

export function WorkflowTimeReportPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [report, setReport] = useState<WorkflowDetailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    (async () => {
      try {
        const data = await metricsService.getWorkflowDetailReport(workflowId);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [workflowId]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <Alert variant="error" title="Error">{error}</Alert>;
  if (!report) return null;

  const m = report.metrics;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to={`/workflow/${workflowId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Workflow Time Report
          </h1>
          <p className="text-sm text-muted-foreground">{workflowId}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      {m && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Elapsed', value: fmtMs(m.totalElapsedMs) },
            { label: 'Machine Time', value: fmtMs(m.machineTimeMs) },
            { label: 'Human Active', value: fmtMs(m.humanActiveMs) },
            { label: 'Human Wait', value: fmtMs(m.humanWaitMs) },
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

      {/* State Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">State Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4">State</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Entered</th>
                  <th className="text-left py-2 pr-4">Exited</th>
                  <th className="text-right py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {report.stateTimeline.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{row.state}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[row.type] ?? TYPE_BADGE.other}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(row.enteredAt)}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(row.exitedAt)}</td>
                    <td className="py-2 text-right font-medium">{fmtMs(row.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* HITL Gate Breakdown */}
      {report.gateBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">HITL Gate Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">Gate</th>
                    <th className="text-left py-2 pr-4">Entered</th>
                    <th className="text-left py-2 pr-4">Review Started</th>
                    <th className="text-left py-2 pr-4">Submitted</th>
                    <th className="text-right py-2 pr-4">Wait</th>
                    <th className="text-right py-2 pr-4">Active</th>
                    <th className="text-center py-2">Auto</th>
                  </tr>
                </thead>
                <tbody>
                  {report.gateBreakdown.map((g, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{g.gate.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(g.enteredAt)}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(g.reviewStartedAt)}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(g.reviewSubmittedAt)}</td>
                      <td className="py-2 pr-4 text-right">{fmtMs(g.waitMs)}</td>
                      <td className="py-2 pr-4 text-right">{fmtMs(g.activeMs)}</td>
                      <td className="py-2 text-center">
                        {g.autoApproved
                          ? <span className="text-green-600 font-medium">Yes</span>
                          : <span className="text-muted-foreground">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
