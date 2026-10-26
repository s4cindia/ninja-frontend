import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useTeamActivityReport } from '@/hooks/useTeamActivityReport';
import { TeamActivityReportView } from './TeamActivityReportView';
import { defaultReportRange, rangeLastNDays, clampDateRange, toIsoDate } from '@/utils/reportFormat';
import type { SimpleDateRange } from '@/utils/reportFormat';

export function TeamActivityTab() {
  const [range, setRange] = useState<SimpleDateRange>(defaultReportRange());
  const today = toIsoDate(new Date());

  const { data, isLoading, isError, error, refetch } = useTeamActivityReport('admin', range);

  const applyRange = (next: SimpleDateRange) => setRange(clampDateRange(next, today));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="team-activity-from" className="text-xs font-medium text-gray-600">
                From
              </label>
              <input
                id="team-activity-from"
                type="date"
                value={range.from}
                max={today}
                onChange={(e) => applyRange({ from: e.target.value, to: range.to })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="team-activity-to" className="text-xs font-medium text-gray-600">
                To
              </label>
              <input
                id="team-activity-to"
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
        <Alert variant="error" title="Failed to load team activity report">
          <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          <Button size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : data ? (
        <TeamActivityReportView data={data} />
      ) : null}
    </div>
  );
}
