import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { TeamActivityReport } from '@/types/reports.types';

interface Props {
  data: TeamActivityReport;
}

// Shared by the admin hub's "Team Activity" tab and MyTeamPage's self-service
// section -- both call sites get the identical response shape (see
// reportsService.getTeamActivityReport), so the rendering lives here once.
export function TeamActivityReportView({ data }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Team Review Throughput</CardTitle>
          <p className="text-xs text-gray-500">
            Spot-checks each Team Leader has logged. This is an audit trail, not a
            pass/fail gate.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {data.reviewThroughput.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No team reviews in this range.</p>
          ) : (
            <div className="space-y-3">
              {data.reviewThroughput.map((r) => (
                <div key={r.reviewerId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{r.reviewerName}</span>
                    <span className="text-gray-500">
                      {r.okCount} OK &middot; {r.needsCorrectionCount} needs correction &middot; {r.total} total
                    </span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(r.okCount / r.total) * 100}%` }}
                      title={`${r.okCount} OK`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(r.needsCorrectionCount / r.total) * 100}%` }}
                      title={`${r.needsCorrectionCount} needs correction`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Job Ownership</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.ownership.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No jobs in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 pr-3">Owner</th>
                    <th className="text-right py-2 pr-3">Total</th>
                    <th className="text-right py-2 pr-3">Completed</th>
                    <th className="text-right py-2 pr-3">Failed</th>
                    <th className="text-right py-2 pr-3">In Progress</th>
                    <th className="text-right py-2">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ownership.map((o) => (
                    <tr key={o.ownerId} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{o.ownerName}</td>
                      <td className="py-2 pr-3 text-right">{o.totalJobs}</td>
                      <td className="py-2 pr-3 text-right">{o.completedJobs}</td>
                      <td className="py-2 pr-3 text-right">{o.failedJobs}</td>
                      <td className="py-2 pr-3 text-right">{o.inProgressJobs}</td>
                      <td className="py-2 text-right">
                        {o.totalJobs > 0 ? `${Math.round((o.completedJobs / o.totalJobs) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
