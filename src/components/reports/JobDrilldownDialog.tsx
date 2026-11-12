import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useCostRoundTrend } from '@/hooks/useCostRoundTrend';
import { useScoreTrend } from '@/hooks/useScoreTrend';
import { useJobReviewStatus } from '@/hooks/useJobReviewStatus';
import { formatUsd, formatResolutionRate } from '@/utils/reportFormat';
import type { TeamReviewRecord } from '@/types/team.types';

interface Props {
  jobId: string | null;
  onClose: () => void;
}

const OUTCOME_BADGE: Record<TeamReviewRecord['outcome'], string> = {
  OK: 'bg-green-100 text-green-700',
  NEEDS_CORRECTION: 'bg-amber-100 text-amber-700',
};

function reviewerName(reviewer: TeamReviewRecord['reviewer']): string {
  const name = `${reviewer.firstName} ${reviewer.lastName}`.trim();
  return name.length > 0 ? name : reviewer.email;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

// Shared by the Cost tab's spend-by-run table and the Quality tab's
// stuck-issue sample job links -- both are "drill into one job's auto-mode
// history," so one dialog covers cost, score trend, and QC review status
// rather than three separate per-job views.
export function JobDrilldownDialog({ jobId, onClose }: Props) {
  const cost = useCostRoundTrend(jobId);
  const score = useScoreTrend(jobId);
  const review = useJobReviewStatus(jobId);

  const costChartData = cost.data?.rounds.map((r) => ({ ...r, costUsd: r.costUsd ?? 0 })) ?? [];
  // resolutionRate can be null for an older row -- rendered as a gap, not
  // an error (0 would misleadingly plot as "no issues resolved").
  const scoreChartData = score.data?.rounds.map((r) => ({ ...r, resolutionRate: r.resolutionRate ?? null })) ?? [];

  return (
    <Dialog open={jobId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Job History — {jobId}</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Per-Round Cost</h3>
            {cost.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : cost.isError ? (
              <Alert variant="error" title="Failed to load cost trend">
                {cost.error instanceof Error ? cost.error.message : 'An unexpected error occurred'}
              </Alert>
            ) : cost.data && cost.data.rounds.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No AI-analysis rounds recorded for this job.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="cycleNumber" tick={{ fontSize: 12 }} label={{ value: 'Round', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatUsd(Number(v))} />
                    <Tooltip formatter={(value) => formatUsd(Number(value))} labelFormatter={(label) => `Round ${label}`} />
                    <Bar dataKey="costUsd" name="Cost" fill="#006B6B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Score Trend (Resolution Rate)</h3>
            {score.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : score.isError ? (
              <Alert variant="error" title="Failed to load score trend">
                {score.error instanceof Error ? score.error.message : 'An unexpected error occurred'}
              </Alert>
            ) : score.data && score.data.rounds.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No re-audit rounds recorded for this job.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="cycleNumber" tick={{ fontSize: 12 }} label={{ value: 'Round', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatResolutionRate(Number(v))} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => (value === null ? 'n/a' : formatResolutionRate(Number(value)))}
                      labelFormatter={(label) => `Round ${label}`}
                    />
                    <Line type="monotone" dataKey="resolutionRate" name="Resolution Rate" stroke="#1B3A6B" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Review Status</h3>
            {review.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : review.isError ? (
              <Alert variant="error" title="Failed to load review status">
                {review.error instanceof Error ? review.error.message : 'An unexpected error occurred'}
              </Alert>
            ) : review.data && review.data.teamReviews.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No QC review recorded for this job yet.
              </p>
            ) : (
              review.data && (
                <>
                  {review.data.reviewBlocked && (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        Blocked from shipment by the most recent review below.
                      </p>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {review.data.teamReviews.map((r) => (
                      <li key={r.id} className="border border-gray-100 rounded-md p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{reviewerName(r.reviewer)}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_BADGE[r.outcome]}`}
                          >
                            {r.outcome === 'OK' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {r.outcome === 'OK' ? 'OK' : 'Needs Correction'}
                          </span>
                        </div>
                        {r.notes && <p className="text-sm text-gray-600 mt-1">{r.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatTimestamp(r.reviewedAt)}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
