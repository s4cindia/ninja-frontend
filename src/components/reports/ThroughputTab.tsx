import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Eye, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { useThroughputReport } from '@/hooks/useThroughputReport';
import { ROUND_ACTION_LABELS } from '@/types/reports.types';
import type { ReportGroupBy } from '@/types/reports.types';
import { formatMs, defaultReportRange, rangeLastNDays, clampDateRange, toIsoDate } from '@/utils/reportFormat';
import type { SimpleDateRange } from '@/utils/reportFormat';

const GROUP_BY_OPTIONS: { value: ReportGroupBy; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
];

export function ThroughputTab() {
  const [range, setRange] = useState<SimpleDateRange>(defaultReportRange());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');

  const today = toIsoDate(new Date());

  const { data, isLoading, isError, error, refetch } = useThroughputReport({
    from: range.from,
    to: range.to,
    groupBy,
  });

  const applyRange = (next: SimpleDateRange) => setRange(clampDateRange(next, today));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="throughput-from" className="text-xs font-medium text-gray-600">
                From
              </label>
              <input
                id="throughput-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => applyRange({ from: e.target.value, to: range.to })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="throughput-to" className="text-xs font-medium text-gray-600">
                To
              </label>
              <input
                id="throughput-to"
                type="date"
                value={range.to}
                max={today}
                onChange={(e) => applyRange({ from: range.from, to: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setRange(rangeLastNDays(30))}>
                Last 30 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRange(rangeLastNDays(90))}>
                Last 90 days
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Group by</span>
              <div className="flex gap-1">
                {GROUP_BY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGroupBy(opt.value)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      groupBy === opt.value
                        ? 'bg-[#006B6B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8" />
        </div>
      ) : isError ? (
        <Alert variant="error" title="Failed to load throughput report">
          <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          <Button size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Queue Wait</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{formatMs(data.queueWait.avgMs)}</span>
                  <span className="text-sm text-gray-500">avg</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  p95 {formatMs(data.queueWait.p95Ms)} &middot; {data.queueWait.count} job
                  {data.queueWait.count !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Initial Audit</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-gray-900">{formatMs(data.initialAudit.avgMs)}</span>
                  <span className="text-sm text-gray-500">avg</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  p95 {formatMs(data.initialAudit.p95Ms)} &middot; {data.initialAudit.count} job
                  {data.initialAudit.count !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Round Duration by Action</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.roundDuration.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No remediation rounds in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500">
                        <th className="text-left py-2 pr-3">Action</th>
                        <th className="text-right py-2 pr-3">Avg</th>
                        <th className="text-right py-2 pr-3">p50</th>
                        <th className="text-right py-2 pr-3">p95</th>
                        <th className="text-right py-2">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.roundDuration.map((row) => (
                        <tr key={row.action} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-gray-900">
                            {ROUND_ACTION_LABELS[row.action] ?? row.action}
                          </td>
                          <td className="py-2 pr-3 text-right">{formatMs(row.avgMs)}</td>
                          <td className="py-2 pr-3 text-right">{formatMs(row.p50Ms)}</td>
                          <td className="py-2 pr-3 text-right">{formatMs(row.p95Ms)}</td>
                          <td className="py-2 text-right">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Queue Wait &amp; Initial Audit Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.trend.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No jobs in this range.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatMs(v)} />
                      <Tooltip
                        formatter={(value, name) => [formatMs(Number(value)), String(name)]}
                        labelFormatter={(label) => String(label)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="queueWaitAvgMs"
                        name="Queue wait (avg)"
                        stroke="#006B6B"
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="initialAuditAvgMs"
                        name="Initial audit (avg)"
                        stroke="#1B3A6B"
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  Concurrency
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.concurrency ? (
                  <>
                    <Progress
                      value={data.concurrency.unitsInUse}
                      max={data.concurrency.totalUnits}
                      variant={data.concurrency.unitsInUse >= data.concurrency.totalUnits ? 'error' : 'default'}
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      {data.concurrency.unitsInUse} / {data.concurrency.totalUnits} units in use
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No concurrency data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-amber-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  Stuck Jobs {data.stuckJobs.length > 0 && `(${data.stuckJobs.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.stuckJobs.length === 0 ? (
                  <p className="text-sm text-gray-400">No stuck jobs right now.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.stuckJobs.map((job) => (
                      <li
                        key={job.jobId}
                        className="flex items-center justify-between gap-3 py-2 bg-amber-50 -mx-2 px-2 rounded"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {job.fileName ?? job.jobId}
                          </p>
                          <p className="text-xs text-amber-700">
                            {job.status} &middot; stuck for {formatMs(job.stuckForMs)}
                          </p>
                        </div>
                        <Link to={`/jobs/${job.jobId}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
