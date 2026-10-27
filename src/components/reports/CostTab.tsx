import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useCostReport } from '@/hooks/useCostReport';
import { SPEND_SOURCE_LABELS } from '@/types/reports.types';
import type { SpendEntry } from '@/types/reports.types';
import { formatUsd, defaultReportRange, rangeLastNDays, clampDateRange, toIsoDate } from '@/utils/reportFormat';
import type { SimpleDateRange } from '@/utils/reportFormat';
import { JobDrilldownDialog } from './JobDrilldownDialog';

type SortKey = 'jobId' | 'source' | 'costUsd' | 'stopReason' | 'pageCount';

export function CostTab() {
  const [range, setRange] = useState<SimpleDateRange>(defaultReportRange());
  const [sortKey, setSortKey] = useState<SortKey>('costUsd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [drilldownJobId, setDrilldownJobId] = useState<string | null>(null);

  const today = toIsoDate(new Date());
  const { data, isLoading, isError, error, refetch } = useCostReport(range);

  const applyRange = (next: SimpleDateRange) => setRange(clampDateRange(next, today));

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const capHitData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.capHitFrequency)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const sortedSpend = useMemo(() => {
    if (!data) return [];
    const rows = [...data.spendByRun];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null) return bv === null ? 0 : 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const SortHeader = ({ keyName, label, align = 'right' }: { keyName: SortKey; label: string; align?: 'left' | 'right' }) => (
    <th
      className={`py-2 pr-3 text-xs text-gray-500 cursor-pointer select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => toggleSort(keyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === keyName && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="cost-from" className="text-xs font-medium text-gray-600">
                From
              </label>
              <input
                id="cost-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => applyRange({ from: e.target.value, to: range.to })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cost-to" className="text-xs font-medium text-gray-600">
                To
              </label>
              <input
                id="cost-to"
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
        <Alert variant="error" title="Failed to load cost report">
          <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          <Button size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Spent</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-2xl font-semibold text-gray-900">{formatUsd(data.totalSpentUsd)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Runs</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-2xl font-semibold text-gray-900">{data.runCount}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Cost / Run</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-2xl font-semibold text-gray-900">{formatUsd(data.avgCostPerRunUsd)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Cost / Page</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-2xl font-semibold text-gray-900">{formatUsd(data.avgCostPerPageUsd)}</span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cap Hit Frequency</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {capHitData.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No runs in this range.</p>
              ) : (
                <div style={{ height: Math.max(120, capHitData.length * 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capHitData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="reason" tick={{ fontSize: 12 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" name="Runs" fill="#1B3A6B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Spend by Run</CardTitle>
              <p className="text-xs text-gray-500">Click a row for its per-round cost trend.</p>
            </CardHeader>
            <CardContent className="pt-0">
              {sortedSpend.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No runs in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <SortHeader keyName="jobId" label="Job" align="left" />
                        <SortHeader keyName="source" label="Source" align="left" />
                        <SortHeader keyName="costUsd" label="Cost" />
                        <SortHeader keyName="stopReason" label="Stop Reason" align="left" />
                        <SortHeader keyName="pageCount" label="Pages" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSpend.map((run: SpendEntry) => (
                        <tr
                          key={run.jobId}
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setDrilldownJobId(run.jobId)}
                        >
                          <td
                            className="py-2 pr-3 text-xs text-gray-900 max-w-[200px] truncate"
                            title={run.fileName ?? run.jobId}
                          >
                            {run.fileName ?? run.jobId}
                          </td>
                          <td className="py-2 pr-3 text-gray-600">{SPEND_SOURCE_LABELS[run.source]}</td>
                          <td className="py-2 pr-3 text-right">{formatUsd(run.costUsd)}</td>
                          <td className="py-2 pr-3 text-gray-600">{run.stopReason ?? 'not stopped'}</td>
                          <td className="py-2 text-right">{run.pageCount ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <JobDrilldownDialog jobId={drilldownJobId} onClose={() => setDrilldownJobId(null)} />
    </div>
  );
}
