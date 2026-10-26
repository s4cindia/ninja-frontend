import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useReliabilityReport } from '@/hooks/useReliabilityReport';
import { INTERRUPTION_ACTION_LABELS, ERROR_CATEGORY_LABELS } from '@/types/reports.types';
import { defaultReportRange, rangeLastNDays, clampDateRange, toIsoDate } from '@/utils/reportFormat';
import type { SimpleDateRange } from '@/utils/reportFormat';

const UNKNOWN_COLOR = '#d1d5db'; // de-emphasized grey -- "not yet categorized," not a bug signal
const CATEGORY_COLOR = '#B45309';

export function ReliabilityTab() {
  const [range, setRange] = useState<SimpleDateRange>(defaultReportRange());
  const today = toIsoDate(new Date());

  const { data, isLoading, isError, error, refetch } = useReliabilityReport(range);

  const applyRange = (next: SimpleDateRange) => setRange(clampDateRange(next, today));

  const interruptionData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.interruptionsByAction)
      .map(([action, count]) => ({ action, label: INTERRUPTION_ACTION_LABELS[action] ?? action, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const failureData = useMemo(() => {
    if (!data) return [];
    return (Object.entries(data.failuresByCategory) as Array<[keyof typeof ERROR_CATEGORY_LABELS, number]>)
      .map(([category, count]) => ({ category, label: ERROR_CATEGORY_LABELS[category], count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="reliability-from" className="text-xs font-medium text-gray-600">
                From
              </label>
              <input
                id="reliability-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => applyRange({ from: e.target.value, to: range.to })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reliability-to" className="text-xs font-medium text-gray-600">
                To
              </label>
              <input
                id="reliability-to"
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8" />
        </div>
      ) : isError ? (
        <Alert variant="error" title="Failed to load reliability report">
          <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          <Button size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{data.interruptionCount}</span> interruption
            {data.interruptionCount !== 1 ? 's' : ''} &middot;{' '}
            <span className="font-medium text-gray-900">{data.failureCount}</span> failure
            {data.failureCount !== 1 ? 's' : ''} in this period
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Interruptions</CardTitle>
                <p className="text-xs text-gray-500">
                  A deploy or crash cut an auto-mode round off mid-way — infra health, not a
                  user-facing error.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {interruptionData.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No interruptions in this range.</p>
                ) : (
                  <div style={{ height: Math.max(100, interruptionData.length * 44) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={interruptionData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="count" name="Occurrences" fill={CATEGORY_COLOR} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Failure Reasons</CardTitle>
                <p className="text-xs text-gray-500">
                  "Not Yet Categorized" is expected — the classifier is deliberately narrow, not a
                  bug signal.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {failureData.every((f) => f.count === 0) ? (
                  <p className="text-sm text-gray-400 py-4">No failures in this range.</p>
                ) : (
                  <div style={{ height: Math.max(140, failureData.length * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={failureData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={140} />
                        <Tooltip />
                        <Bar dataKey="count" name="Jobs">
                          {failureData.map((entry) => (
                            <Cell key={entry.category} fill={entry.category === 'UNKNOWN' ? UNKNOWN_COLOR : CATEGORY_COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
