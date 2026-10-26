import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobDrilldownDialog } from './JobDrilldownDialog';
import { reportsService } from '@/services/reports.service';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getCostRoundTrend: vi.fn(), getScoreTrend: vi.fn() },
}));

const mockGetCostRoundTrend = vi.mocked(reportsService.getCostRoundTrend);
const mockGetScoreTrend = vi.mocked(reportsService.getScoreTrend);

function renderDialog(jobId: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <JobDrilldownDialog jobId={jobId} onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe('JobDrilldownDialog', () => {
  beforeEach(() => {
    mockGetCostRoundTrend.mockReset();
    mockGetScoreTrend.mockReset();
  });

  it('is closed and fetches nothing when jobId is null', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockGetCostRoundTrend).not.toHaveBeenCalled();
    expect(mockGetScoreTrend).not.toHaveBeenCalled();
  });

  it('fetches both cost and score trends independently and renders both sections', async () => {
    mockGetCostRoundTrend.mockResolvedValue({
      jobId: 'job-1',
      rounds: [{ cycleNumber: 1, costUsd: 2.5, completedAt: '2026-10-01T00:00:00Z' }],
    });
    mockGetScoreTrend.mockResolvedValue({
      jobId: 'job-1',
      rounds: [{ cycleNumber: 1, resolvedCount: 3, remainingCount: 1, resolutionRate: 0.75, completedAt: '2026-10-01T00:00:00Z' }],
    });

    renderDialog('job-1');

    expect(await screen.findByText(/Job History — job-1/)).toBeInTheDocument();
    expect(screen.getByText('Per-Round Cost')).toBeInTheDocument();
    expect(screen.getByText('Score Trend (Resolution Rate)')).toBeInTheDocument();
    expect(mockGetCostRoundTrend).toHaveBeenCalledWith('job-1');
    expect(mockGetScoreTrend).toHaveBeenCalledWith('job-1');
  });

  it("shows each section's own empty state when that round type has no history", async () => {
    mockGetCostRoundTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
    mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });

    renderDialog('job-1');

    expect(await screen.findByText('No AI-analysis rounds recorded for this job.')).toBeInTheDocument();
    expect(screen.getByText('No re-audit rounds recorded for this job.')).toBeInTheDocument();
  });

  it("shows each section's own error independently when only one fails", async () => {
    mockGetCostRoundTrend.mockRejectedValue(new Error('cost failed'));
    mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });

    renderDialog('job-1');

    expect(await screen.findByText('Failed to load cost trend')).toBeInTheDocument();
    expect(screen.getByText('No re-audit rounds recorded for this job.')).toBeInTheDocument();
  });
});
