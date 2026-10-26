import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useCostRoundTrend } from '@/hooks/useCostRoundTrend';
import { formatUsd } from '@/utils/reportFormat';

interface Props {
  jobId: string | null;
  onClose: () => void;
}

export function CostDrilldownDialog({ jobId, onClose }: Props) {
  const { data, isLoading, isError, error } = useCostRoundTrend(jobId);

  // `costUsd` can be null for an old row logged before the field existed --
  // rendered as a 0-height gap in the chart, not an error (the "completed"
  // bar still appears at its cycle number, just with no cost known).
  const chartData = data?.rounds.map((r) => ({ ...r, costUsd: r.costUsd ?? 0 })) ?? [];

  return (
    <Dialog open={jobId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Per-Round Cost — {jobId}</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6" />
            </div>
          ) : isError ? (
            <Alert variant="error" title="Failed to load round cost trend">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </Alert>
          ) : data && data.rounds.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No AI-analysis rounds recorded for this job.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="cycleNumber" tick={{ fontSize: 12 }} label={{ value: 'Round', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatUsd(v)} />
                  <Tooltip formatter={(value) => formatUsd(Number(value))} labelFormatter={(label) => `Round ${label}`} />
                  <Bar dataKey="costUsd" name="Cost" fill="#006B6B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
