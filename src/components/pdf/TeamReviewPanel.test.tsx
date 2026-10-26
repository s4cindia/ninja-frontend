import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TeamReviewPanel } from './TeamReviewPanel';
import { teamService } from '@/services/team.service';
import type { TeamReviewRecord } from '@/types/team.types';

vi.mock('@/services/team.service', () => ({
  teamService: { submitTeamReview: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockSubmitTeamReview = vi.mocked(teamService.submitTeamReview);

function mockReview(overrides?: Partial<TeamReviewRecord>): TeamReviewRecord {
  return {
    id: 'review-1',
    jobId: 'job-123',
    reviewedBy: 'leader-1',
    reviewedAt: '2026-10-20T00:00:00Z',
    outcome: 'OK',
    notes: null,
    reviewer: { id: 'leader-1', firstName: 'Lee', lastName: 'Leader', email: 'lee@example.com' },
    ...overrides,
  };
}

describe('TeamReviewPanel', () => {
  beforeEach(() => {
    mockSubmitTeamReview.mockReset();
  });

  it('shows "no reviews" implicitly (empty list) when there is no history yet', () => {
    render(<TeamReviewPanel jobId="job-123" teamReviews={[]} onSubmitted={vi.fn()} />);

    expect(screen.getByText('Team Review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
  });

  it('renders existing review history with reviewer name, outcome, and notes', () => {
    render(
      <TeamReviewPanel
        jobId="job-123"
        teamReviews={[mockReview({ outcome: 'NEEDS_CORRECTION', notes: 'Check page 3 alt text' })]}
        onSubmitted={vi.fn()}
      />
    );

    const reviewItem = screen.getByText('Lee Leader').closest('li') as HTMLElement;
    expect(within(reviewItem).getByText('Needs Correction')).toBeInTheDocument();
    expect(within(reviewItem).getByText('Check page 3 alt text')).toBeInTheDocument();
  });

  it('submits the selected outcome and trimmed notes, then calls onSubmitted', async () => {
    mockSubmitTeamReview.mockResolvedValue({
      id: 'review-2',
      jobId: 'job-123',
      reviewedBy: 'leader-1',
      reviewedAt: '2026-10-27T00:00:00Z',
      outcome: 'NEEDS_CORRECTION',
      notes: 'looks off',
    });
    const onSubmitted = vi.fn();

    render(<TeamReviewPanel jobId="job-123" teamReviews={[]} onSubmitted={onSubmitted} />);

    fireEvent.change(screen.getByLabelText('Review outcome'), { target: { value: 'NEEDS_CORRECTION' } });
    fireEvent.change(screen.getByPlaceholderText('Notes (optional)'), { target: { value: '  looks off  ' } });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(mockSubmitTeamReview).toHaveBeenCalledWith('job-123', {
        outcome: 'NEEDS_CORRECTION',
        notes: 'looks off',
      })
    );
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it('sends no notes field when the textarea is left blank', async () => {
    mockSubmitTeamReview.mockResolvedValue({
      id: 'review-3',
      jobId: 'job-123',
      reviewedBy: 'leader-1',
      reviewedAt: '2026-10-27T00:00:00Z',
      outcome: 'OK',
      notes: null,
    });

    render(<TeamReviewPanel jobId="job-123" teamReviews={[]} onSubmitted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(mockSubmitTeamReview).toHaveBeenCalledWith('job-123', { outcome: 'OK', notes: undefined })
    );
  });

  it('does not call onSubmitted and leaves the form usable after a failed submit (e.g. a VIEWER server-rejection)', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { success: false, error: { code: 'FORBIDDEN', message: 'Only a Team Leader may write a review for this job' } },
      },
    });
    mockSubmitTeamReview.mockRejectedValue(error);
    const onSubmitted = vi.fn();

    render(<TeamReviewPanel jobId="job-123" teamReviews={[]} onSubmitted={onSubmitted} />);

    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => expect(mockSubmitTeamReview).toHaveBeenCalled());
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
  });
});
