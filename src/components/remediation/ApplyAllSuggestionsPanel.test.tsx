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
});
