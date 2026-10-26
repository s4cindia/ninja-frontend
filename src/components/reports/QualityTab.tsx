import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useQualityReport } from '@/hooks/useQualityReport';
import { useStuckIssues } from '@/hooks/useStuckIssues';
import { defaultReportRange, rangeLastNDays, clampDateRange, toIsoDate } from '@/utils/reportFormat';
import type { SimpleDateRange } from '@/utils/reportFormat';
import { JobDrilldownDialog } from './JobDrilldownDialog';

export function QualityTab() {
  const [range, setRange] = useState<SimpleDateRange>(defaultReportRange());
  const [drilldownJobId, setDrilldownJobId] = useState<string | null>(null);
  const today = toIsoDate(new Date());

  const yield_ = useQualityReport(range);
  const stuck = useStuckIssues();

  const applyRange = (next: SimpleDateRange) => setRange(clampDateRange(next, today));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="quality-from" className="text-xs font-medium text-gray-600">
                From
              </label>
              <input
                id="quality-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => applyRange({ from: e.target.value, to: range.to })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="quality-to" className="text-xs font-medium text-gray-600">
                To
              </label>
              <input
                id="quality-to"
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Yield by Suggestion Type</CardTitle>
          <p className="text-xs text-gray-500">
            Worst-yield types first — the actionable end of the list for deciding what to work on
            next.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {yield_.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : yield_.isError ? (
            <Alert variant="error" title="Failed to load quality report">
              <p>{yield_.error instanceof Error ? yield_.error.message : 'An unexpected error occurred'}</p>
              <Button size="sm" className="mt-2" onClick={() => yield_.refetch()}>
                Retry
              </Button>
            </Alert>
          ) : yield_.data && yield_.data.yieldByType.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No apply-fixes activity in this range.</p>
          ) : yield_.data ? (
            <div style={{ height: Math.max(140, yield_.data.yieldByType.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yield_.data.yieldByType}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="suggestionType" tick={{ fontSize: 12 }} width={160} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="applied" name="Applied" stackId="a" fill="#16A34A" />
                  <Bar dataKey="failed" name="Failed" stackId="a" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Stuck Issue Backlog</CardTitle>
          <p className="text-xs text-gray-500">
            Issue codes that keep not getting fixed on jobs whose auto-mode run has stopped.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {stuck.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : stuck.isError ? (
            <Alert variant="error" title="Failed to load stuck issue backlog">
              <p>{stuck.error instanceof Error ? stuck.error.message : 'An unexpected error occurred'}</p>
              <Button size="sm" className="mt-2" onClick={() => stuck.refetch()}>
                Retry
              </Button>
            </Alert>
          ) : stuck.data && stuck.data.stuckIssues.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No stuck issues right now.</p>
          ) : stuck.data ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 pr-3">Issue Code</th>
                    <th className="text-right py-2 pr-3">Count</th>
                    <th className="text-left py-2">Sample Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {stuck.data.stuckIssues.map((issue) => (
                    <tr key={issue.code} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs text-gray-900">{issue.code}</td>
                      <td className="py-2 pr-3 text-right">{issue.count}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          {issue.sampleJobIds.map((jobId) => (
                            <button
                              key={jobId}
                              type="button"
                              className="font-mono text-xs text-[#006B6B] hover:underline"
                              onClick={() => setDrilldownJobId(jobId)}
                            >
                              {jobId.slice(0, 8)}…
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <JobDrilldownDialog jobId={drilldownJobId} onClose={() => setDrilldownJobId(null)} />
    </div>
  );
}
