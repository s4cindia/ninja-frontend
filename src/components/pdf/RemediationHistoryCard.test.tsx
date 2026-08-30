import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemediationHistoryCard } from './RemediationHistoryCard';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { RemediationHistoryRun } from '@/types/pdf-remediation.types';

vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { getRemediationHistory: vi.fn() },
}));

const mockService = pdfRemediationService as Mocked<typeof pdfRemediationService>;

function renderCard(remediationCycleInProgress = false) {
  return render(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={remediationCycleInProgress} />);
}

const oneRun: RemediationHistoryRun[] = [
  {
    cycleNumber: 1,
    events: [
      { action: 'apply_fixes', source: 'apply_all', status: 'completed', appliedCount: 5, failedCount: 0, startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-01T10:01:00Z' },
      { action: 'reaudit', source: 'apply_all', status: 'completed', resolvedCount: 5, remainingCount: 3, regressionCount: 0, resolutionRate: 62, startedAt: '2026-08-01T10:01:05Z', completedAt: '2026-08-01T10:02:00Z' },
    ],
  },
];

describe('RemediationHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while loading and nothing when there is no history yet', async () => {
    mockService.getRemediationHistory.mockResolvedValueOnce([]);
    const { container } = renderCard();

    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one collapsible Run section per history run, using array position for the label rather than the literal (gap-prone) cycleNumber', async () => {
    // cycleNumber 1 and 5 (a gap, from cycles that acquired the lock but
    // produced no event) — must still render as "Run 1" / "Run 2", not
    // "Run 1" / "Run 5".
    const runsWithGap: RemediationHistoryRun[] = [
      oneRun[0],
      { cycleNumber: 5, events: [{ action: 'ai_analysis', source: 'analyze_job', status: 'completed', startedAt: '2026-08-02T00:00:00Z' }] },
    ];
    mockService.getRemediationHistory.mockResolvedValueOnce(runsWithGap);
    renderCard();

    await waitFor(() => expect(screen.getByText('Run 1')).toBeInTheDocument());
    expect(screen.getByText('Run 2')).toBeInTheDocument();
    expect(screen.queryByText('Run 5')).not.toBeInTheDocument();
  });

  it('expands the most recent run by default and keeps earlier runs collapsed', async () => {
    const twoRuns: RemediationHistoryRun[] = [
      oneRun[0],
      { cycleNumber: 2, events: [{ action: 'ai_analysis', source: 'analyze_job', status: 'completed', startedAt: '2026-08-02T00:00:00Z' }] },
    ];
    mockService.getRemediationHistory.mockResolvedValueOnce(twoRuns);
    renderCard();

    await waitFor(() => expect(screen.getByText('Run 2')).toBeInTheDocument());
    // Run 2 (most recent) is expanded — its event content is visible.
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();
    // Run 1 is collapsed — its event content is not rendered.
    expect(screen.queryByText('Apply Fixes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Run 1'));
    expect(screen.getByText('Apply Fixes')).toBeInTheDocument();
  });

  it('shows the relevant counts per event type and a failed event\'s error message', async () => {
    const withFailure: RemediationHistoryRun[] = [
      {
        cycleNumber: 1,
        events: [
          { action: 'apply_fixes', source: 'apply_all', status: 'failed', appliedCount: 2, failedCount: 3, errorMessage: 'PDF locked', startedAt: '2026-08-01T10:00:00Z' },
        ],
      },
    ];
    mockService.getRemediationHistory.mockResolvedValueOnce(withFailure);
    renderCard();

    await waitFor(() => expect(screen.getByText(/2 applied, 3 failed/)).toBeInTheDocument());
    expect(screen.getByText('PDF locked')).toBeInTheDocument();
  });

  it('regression: refetches when remediationCycleInProgress flips true -> false (a cycle just completed), not on every render', async () => {
    mockService.getRemediationHistory.mockResolvedValue(oneRun);
    const { rerender } = render(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={true} />);

    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1));

    // Still in progress — re-rendering with the same value must not refetch.
    rerender(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={true} />);
    expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1);

    // Flips to false — the cycle just finished, refetch to pick up the new event.
    rerender(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={false} />);
    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(2));
  });

  it('does not throw or show content when the fetch fails', async () => {
    mockService.getRemediationHistory.mockRejectedValueOnce(new Error('network error'));
    const { container } = renderCard();

    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('regression: refetches when refreshTrigger changes — covers local success paths (single-apply, an awaited-directly re-audit, a fast apply-all) that complete before this client ever observes an intermediate "in progress" poll response, so the lock-transition alone would miss them', async () => {
    mockService.getRemediationHistory.mockResolvedValue(oneRun);
    const { rerender } = render(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={false} refreshTrigger={0} />);

    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1));

    // Same value — must not refetch.
    rerender(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={false} refreshTrigger={0} />);
    expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(1);

    // A local action succeeded — the caller bumps the trigger directly.
    rerender(<RemediationHistoryCard jobId="job-123" remediationCycleInProgress={false} refreshTrigger={1} />);
    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledTimes(2));
  });

  it('regression: a stale response for a job the user has navigated away from (jobId changed without a remount) cannot overwrite the current job\'s history, and the previous job\'s runs are cleared immediately rather than lingering until the new fetch resolves', async () => {
    let resolveJobA!: (value: RemediationHistoryRun[]) => void;
    mockService.getRemediationHistory.mockImplementationOnce(
      () => new Promise((resolve) => { resolveJobA = resolve; })
    );

    const { rerender } = render(<RemediationHistoryCard jobId="job-A" remediationCycleInProgress={false} />);
    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledWith('job-A'));

    // Navigate to job B before job A's fetch resolves. Job A's stale runs
    // must not linger on screen, and job B gets its own (empty, for this
    // test) fetch.
    mockService.getRemediationHistory.mockResolvedValueOnce([]);
    rerender(<RemediationHistoryCard jobId="job-B" remediationCycleInProgress={false} />);
    await waitFor(() => expect(mockService.getRemediationHistory).toHaveBeenCalledWith('job-B'));

    // Job A's request finally resolves — must be discarded, not applied.
    resolveJobA(oneRun);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText('Run 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Remediation History')).not.toBeInTheDocument();
  });
});
