import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OwnerReviewBlockedBanner } from './OwnerReviewBlockedBanner';
import { teamService } from '@/services/team.service';
import type { TeamReviewRecord } from '@/types/team.types';

vi.mock('@/services/team.service', () => ({
  teamService: { requestReview: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockRequestReview = vi.mocked(teamService.requestReview);

const latestReview: TeamReviewRecord = {
  id: 'review-1',
  jobId: 'job-123',
  reviewedBy: 'leader-1',
  reviewedAt: '2026-11-01T00:00:00Z',
  outcome: 'NEEDS_CORRECTION',
  notes: 'fix the alt text on page 3',
  reviewer: { id: 'leader-1', firstName: 'Lee', lastName: 'Leader', email: 'lee@example.com' },
};

describe('OwnerReviewBlockedBanner', () => {
  beforeEach(() => {
    mockRequestReview.mockReset();
  });

  it('shows the block reason and the reviewer\'s notes', () => {
    render(<OwnerReviewBlockedBanner jobId="job-123" latestReview={latestReview} />);

    expect(screen.getByText(/blocked from shipment/i)).toBeInTheDocument();
    expect(screen.getByText('fix the alt text on page 3')).toBeInTheDocument();
  });

  it('requests a re-review and flips the button to "Requested"', async () => {
    mockRequestReview.mockResolvedValue({ notified: 1 });

    render(<OwnerReviewBlockedBanner jobId="job-123" latestReview={latestReview} />);
    fireEvent.click(screen.getByRole('button', { name: /request re-review/i }));

    await waitFor(() => expect(mockRequestReview).toHaveBeenCalledWith('job-123'));
    await waitFor(() => expect(screen.getByRole('button', { name: /requested/i })).toBeDisabled());
  });

  it('leaves the button usable again after a failed request', async () => {
    mockRequestReview.mockRejectedValue(new Error('network error'));

    render(<OwnerReviewBlockedBanner jobId="job-123" latestReview={latestReview} />);
    fireEvent.click(screen.getByRole('button', { name: /request re-review/i }));

    await waitFor(() => expect(mockRequestReview).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /request re-review/i })).not.toBeDisabled();
  });
});
