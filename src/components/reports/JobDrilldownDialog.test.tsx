import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JobDrilldownDialog } from './JobDrilldownDialog';
import { reportsService } from '@/services/reports.service';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getCostRoundTrend: vi.fn(), getScoreTrend: vi.fn(), getJobReviewStatus: vi.fn() },
}));

const mockGetCostRoundTrend = vi.mocked(reportsService.getCostRoundTrend);
const mockGetScoreTrend = vi.mocked(reportsService.getScoreTrend);
const mockGetJobReviewStatus = vi.mocked(reportsService.getJobReviewStatus);

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
    mockGetJobReviewStatus.mockReset();
    mockGetJobReviewStatus.mockResolvedValue({ jobId: 'job-1', teamReviews: [], reviewBlocked: false });
  });

  it('is closed and fetches nothing when jobId is null', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockGetCostRoundTrend).not.toHaveBeenCalled();
    expect(mockGetScoreTrend).not.toHaveBeenCalled();
    expect(mockGetJobReviewStatus).not.toHaveBeenCalled();
  });

  it('fetches cost, score, and review status independently and renders all three sections', async () => {
    mockGetCostRoundTrend.mockResolvedValue({
      jobId: 'job-1',
      rounds: [{ cycleNumber: 1, costUsd: 2.5, completedAt: '2026-10-01T00:00:00Z' }],
    });
    mockGetScoreTrend.mockResolvedValue({
      jobId: 'job-1',
      rounds: [{ cycleNumber: 1, resolvedCount: 3, remainingCount: 1, resolutionRate: 75, completedAt: '2026-10-01T00:00:00Z' }],
    });

    renderDialog('job-1');

    expect(await screen.findByText(/Job History — job-1/)).toBeInTheDocument();
    expect(screen.getByText('Per-Round Cost')).toBeInTheDocument();
    expect(screen.getByText('Score Trend (Resolution Rate)')).toBeInTheDocument();
    expect(screen.getByText('Review Status')).toBeInTheDocument();
    expect(mockGetCostRoundTrend).toHaveBeenCalledWith('job-1');
    expect(mockGetScoreTrend).toHaveBeenCalledWith('job-1');
    expect(mockGetJobReviewStatus).toHaveBeenCalledWith('job-1');
  });

  it("shows each section's own empty state when that round type has no history", async () => {
    mockGetCostRoundTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
    mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });

    renderDialog('job-1');

    expect(await screen.findByText('No AI-analysis rounds recorded for this job.')).toBeInTheDocument();
    expect(screen.getByText('No re-audit rounds recorded for this job.')).toBeInTheDocument();
    expect(await screen.findByText('No QC review recorded for this job yet.')).toBeInTheDocument();
  });

  it("shows each section's own error independently when only one fails", async () => {
    mockGetCostRoundTrend.mockRejectedValue(new Error('cost failed'));
    mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });

    renderDialog('job-1');

    expect(await screen.findByText('Failed to load cost trend')).toBeInTheDocument();
    expect(screen.getByText('No re-audit rounds recorded for this job.')).toBeInTheDocument();
  });

  describe('Review Status section', () => {
    it('shows the blocked banner and review history when the latest review is NEEDS_CORRECTION', async () => {
      mockGetCostRoundTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetJobReviewStatus.mockResolvedValue({
        jobId: 'job-1',
        reviewBlocked: true,
        teamReviews: [
          {
            id: 'review-1', jobId: 'job-1', reviewedBy: 'leader-1', reviewedAt: '2026-11-01T00:00:00Z',
            outcome: 'NEEDS_CORRECTION', notes: 'fix the alt text',
            reviewer: { id: 'leader-1', firstName: 'Lee', lastName: 'Leader', email: 'lee@example.com' },
          },
        ],
      });

      renderDialog('job-1');

      expect(await screen.findByText(/blocked from shipment/i)).toBeInTheDocument();
      expect(screen.getByText('Lee Leader')).toBeInTheDocument();
      expect(screen.getByText('fix the alt text')).toBeInTheDocument();
      expect(screen.getByText('Needs Correction')).toBeInTheDocument();
    });

    it('shows no blocked banner when the latest review is OK', async () => {
      mockGetCostRoundTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetJobReviewStatus.mockResolvedValue({
        jobId: 'job-1',
        reviewBlocked: false,
        teamReviews: [
          {
            id: 'review-1', jobId: 'job-1', reviewedBy: 'leader-1', reviewedAt: '2026-11-01T00:00:00Z',
            outcome: 'OK', notes: null,
            reviewer: { id: 'leader-1', firstName: 'Lee', lastName: 'Leader', email: 'lee@example.com' },
          },
        ],
      });

      renderDialog('job-1');

      await screen.findByText('Lee Leader');
      expect(screen.queryByText(/blocked from shipment/i)).not.toBeInTheDocument();
    });

    it('shows its own error independently of cost/score', async () => {
      mockGetCostRoundTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetScoreTrend.mockResolvedValue({ jobId: 'job-1', rounds: [] });
      mockGetJobReviewStatus.mockRejectedValue(new Error('review status failed'));

      renderDialog('job-1');

      expect(await screen.findByText('Failed to load review status')).toBeInTheDocument();
      expect(screen.getByText('No re-audit rounds recorded for this job.')).toBeInTheDocument();
    });
  });
});
