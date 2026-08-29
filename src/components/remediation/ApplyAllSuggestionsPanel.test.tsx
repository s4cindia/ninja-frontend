import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApplyAllSuggestionsPanel } from './ApplyAllSuggestionsPanel';
import { applyAllAiSuggestions } from '@/services/api/pdfAiAnalysis.service';

vi.mock('@/services/api/pdfAiAnalysis.service');

function renderPanel(props?: Partial<React.ComponentProps<typeof ApplyAllSuggestionsPanel>>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onApplied = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ApplyAllSuggestionsPanel
        jobId="job-123"
        eligibleCount={3}
        pendingEligibleCount={0}
        onApplied={onApplied}
        onClose={onClose}
        {...props}
      />
    </QueryClientProvider>
  );
  return { ...utils, onApplied, onClose };
}

describe('ApplyAllSuggestionsPanel', () => {
  const mockApplyAll = vi.mocked(applyAllAiSuggestions);

  beforeEach(() => {
    mockApplyAll.mockReset();
  });

  it('shows the eligible count and no pending toggle when nothing is pending', () => {
    renderPanel({ eligibleCount: 3, pendingEligibleCount: 0 });

    expect(screen.getByText(/Apply 3 approved suggestions to the PDF/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply All \(3\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows an unchecked include-pending toggle when there are pending-eligible suggestions', () => {
    renderPanel({ eligibleCount: 3, pendingEligibleCount: 2 });

    const checkbox = screen.getByRole('checkbox', { name: /Also include 2 suggestions awaiting review/ });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: /Apply All \(3\)/ })).toBeInTheDocument();
  });

  it('applies approved-only by default, without includePending', async () => {
    mockApplyAll.mockResolvedValue({ applied: 3, failed: 0 });
    const { onApplied } = renderPanel({ eligibleCount: 3, pendingEligibleCount: 2 });

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(3\)/ }));

    await waitFor(() => {
      expect(mockApplyAll).toHaveBeenCalledWith('job-123', false);
    });
    // Refetch/poll trigger fires immediately on success, before results render.
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
  });

  it('includes pending suggestions only when the toggle is checked', async () => {
    mockApplyAll.mockResolvedValue({ applied: 5, failed: 0 });
    renderPanel({ eligibleCount: 3, pendingEligibleCount: 2 });

    fireEvent.click(screen.getByRole('checkbox', { name: /Also include 2 suggestions awaiting review/ }));
    expect(screen.getByRole('button', { name: /Apply All \(5\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(5\)/ }));

    await waitFor(() => {
      expect(mockApplyAll).toHaveBeenCalledWith('job-123', true);
    });
  });

  it('regression: checking "include pending" updates the headline/description off the 0-approved default, instead of leaving them contradicting the "Apply All (N)" button — reported live as "why does it say 0 approved" next to "Apply All (260)"', () => {
    renderPanel({ eligibleCount: 0, pendingEligibleCount: 260 });

    // Before checking the toggle, the 0-approved headline is accurate: there
    // is nothing pending-inclusive going on yet.
    expect(screen.getByText(/Apply 0 approved suggestions to the PDF/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Also include 260 suggestions awaiting review/ }));

    // Once the toggle is checked, the button and headline must agree — no
    // more "0 approved" text sitting next to "Apply All (260)".
    expect(screen.getByRole('button', { name: /Apply All \(260\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/Apply 0 approved suggestions to the PDF/)).not.toBeInTheDocument();
    expect(screen.getByText(/Apply 260 suggestions to the PDF/)).toBeInTheDocument();
    expect(screen.getAllByText(/0 approved, 260 awaiting review/).length).toBeGreaterThan(0);
  });

  it('shows aggregate results with per-issue failure reasons, not a reconstructed issue list', async () => {
    mockApplyAll.mockResolvedValue({
      applied: 2,
      failed: 1,
      errors: [{ issueId: 'issue-abcdefgh', suggestionType: 'alt-text', reason: 'PDF page locked' }],
    });
    renderPanel({ eligibleCount: 3, pendingEligibleCount: 0 });

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(3\)/ }));

    await waitFor(() => {
      expect(screen.getByText('Successfully applied 2 suggestions')).toBeInTheDocument();
    });
    expect(screen.getByText('1 suggestion failed')).toBeInTheDocument();
    expect(screen.getByText(/alt-text — issue-ab/)).toBeInTheDocument();
    expect(screen.getByText('PDF page locked')).toBeInTheDocument();
  });

  it('cancelling before applying closes the panel without calling the API', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockApplyAll).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('regression: a response-less network error notifies the caller so a retry can be blocked — this is the bridge fix for a false-timeout race (CloudFront can kill the connection on a large batch while the backend keeps applying fixes to completion server-side; an immediate retry would start a second, genuinely overlapping run)', async () => {
    mockApplyAll.mockRejectedValue({ isAxiosError: true, message: 'Network Error', response: undefined });
    const onApplyError = vi.fn();
    renderPanel({ onApplyError });

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(3\)/ }));

    await waitFor(() => {
      expect(onApplyError).toHaveBeenCalledTimes(1);
    });
  });

  it('regression: a 504 Gateway Timeout also notifies the caller — CloudFront returns an actual response in this case (unlike a dropped connection), but the origin may still be applying fixes', async () => {
    mockApplyAll.mockRejectedValue({ isAxiosError: true, message: 'Gateway Timeout', response: { status: 504, data: {} } });
    const onApplyError = vi.fn();
    renderPanel({ onApplyError });

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(3\)/ }));

    await waitFor(() => {
      expect(onApplyError).toHaveBeenCalledTimes(1);
    });
  });

  it('regression: a definitive 4xx rejection does NOT block a retry — the request was rejected before the apply-all loop could start, so there is nothing running in the background to collide with', async () => {
    mockApplyAll.mockRejectedValue({ isAxiosError: true, message: 'Unauthorized', response: { status: 401, data: {} } });
    const onApplyError = vi.fn();
    renderPanel({ onApplyError });

    fireEvent.click(screen.getByRole('button', { name: /Apply All \(3\)/ }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to apply suggestions/)).toBeInTheDocument();
    });
    expect(onApplyError).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Apply All \(3\)/ })).not.toBeDisabled();
  });

  it('regression: while retryBlockedUntil is in the future, the Apply All button is disabled and explains why, instead of allowing an immediate retry that could double-apply fixes', () => {
    renderPanel({ retryBlockedUntil: Date.now() + 45_000 });

    const button = screen.getByRole('button', { name: /Retry available in 4[45]s/ });
    expect(button).toBeDisabled();
    expect(mockApplyAll).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(mockApplyAll).not.toHaveBeenCalled();
  });

  it('regression: once retryBlockedUntil is in the past (or null), the button is a normal enabled Apply All button again', () => {
    renderPanel({ retryBlockedUntil: Date.now() - 1000 });

    expect(screen.getByRole('button', { name: /Apply All \(3\)/ })).not.toBeDisabled();
  });
});
