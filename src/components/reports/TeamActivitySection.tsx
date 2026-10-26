import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useTeamActivityReport } from '@/hooks/useTeamActivityReport';
import { TeamActivityReportView } from './TeamActivityReportView';
import { defaultReportRange } from '@/utils/reportFormat';

// Self-service slice of the Operational Reports Group 5 design -- a Team
// Leader/Viewer's own team activity, without needing ADMIN. No date picker
// here (unlike the admin hub's Team Activity tab): the default 30-day
// window with a label is enough for this page; a picker would be one too
// many controls alongside the job-list filters already above it.
export function TeamActivitySection() {
  const [range] = useState(() => defaultReportRange());
  const { data, isLoading, isError, error, refetch } = useTeamActivityReport('self', range);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Team Activity</h2>
        <span className="text-xs text-gray-500">Last 30 days</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
        </div>
      ) : isError ? (
        <Alert variant="error" title="Failed to load team activity">
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
