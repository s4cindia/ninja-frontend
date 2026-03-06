import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Cpu, User, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { metricsService, type WorkflowDetailReport } from '@/services/metrics.service';

interface Props {
  workflowId: string;
}

function fmtMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function WorkflowTimeSummaryCard({ workflowId }: Props) {
  const [report, setReport] = useState<WorkflowDetailReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await metricsService.getWorkflowDetailReport(workflowId);
        if (!cancelled) setReport(data);
      } catch {
        // metrics unavailable — hide card silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workflowId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Spinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  const m = report?.metrics;
  if (!m || !m.totalElapsedMs) return null;

  const total = m.totalElapsedMs;
  const machine = m.machineTimeMs;
  const humanWait = m.humanWaitMs;
  const humanActive = m.humanActiveMs;
  const idle = Math.max(0, total - machine - humanWait - humanActive);

  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  const machinePct = pct(machine);
  const waitPct = pct(humanWait);
  const activePct = pct(humanActive);
  const idlePct = pct(idle);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden w-full">
          {machinePct > 0 && (
            <div
              className="bg-blue-500"
              style={{ width: `${machinePct}%` }}
              title={`Machine: ${fmtMs(machine)}`}
            />
          )}
          {waitPct > 0 && (
            <div
              className="bg-amber-400"
              style={{ width: `${waitPct}%` }}
              title={`Human Wait: ${fmtMs(humanWait)}`}
            />
          )}
          {activePct > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${activePct}%` }}
              title={`Human Active: ${fmtMs(humanActive)}`}
            />
          )}
          {idlePct > 0 && (
            <div
              className="bg-gray-200"
              style={{ width: `${idlePct}%` }}
              title={`Idle: ${fmtMs(idle)}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Machine</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Human Wait</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Human Active</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-200 border" /> Idle</span>
        </div>

        {/* Metric chips */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricChip icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />} label="Total" value={fmtMs(total)} />
          <MetricChip icon={<Cpu className="h-3.5 w-3.5 text-blue-500" />} label="Machine" value={fmtMs(machine)} />
          <MetricChip icon={<User className="h-3.5 w-3.5 text-green-500" />} label="Human Active" value={fmtMs(humanActive)} />
          <MetricChip
            icon={<Moon className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Gates"
            value={`${m.autoApprovedCount}/${m.gateCount} auto`}
          />
        </div>

        <div className="text-right">
          <Link
            to={`/workflow/${workflowId}/time-report`}
            className="text-xs text-primary hover:underline"
          >
            View Full Report →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
