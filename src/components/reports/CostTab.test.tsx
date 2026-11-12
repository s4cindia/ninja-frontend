import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CostTab } from './CostTab';
import { reportsService } from '@/services/reports.service';
import type { CostReport } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getCostReport: vi.fn(), getCostRoundTrend: vi.fn(), getScoreTrend: vi.fn() },
}));

const mockGetCostReport = vi.mocked(reportsService.getCostReport);
const mockGetCostRoundTrend = vi.mocked(reportsService.getCostRoundTrend);
const mockGetScoreTrend = vi.mocked(reportsService.getScoreTrend);

function mockReport(overrides?: Partial<CostReport>): CostReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    totalSpentUsd: 12.5,
    runCount: 3,
    avgCostPerRunUsd: 4.1667,
    avgCostPerPageUsd: 0.05,
    capHitFrequency: { converged: 2, budget_limit: 1 },
    spendByRun: [
      { jobId: 'job-aaa111', fileName: 'report-a.pdf', source: 'job_native', costUsd: 10, stopReason: 'budget_limit', pageCount: 100, completedAt: '2026-10-20T14:30:00.000Z' },
      { jobId: 'job-bbb222', fileName: null, source: 'comparison_trial', costUsd: 2.5, stopReason: 'converged', pageCount: 50, completedAt: '2026-10-21T09:00:00.000Z' },
      { jobId: 'job-ccc333', fileName: 'zero-cost.pdf', source: 'job_native', costUsd: 0, stopReason: 'converged', pageCount: null, completedAt: null },
    ],
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CostTab />
    </QueryClientProvider>
  );
}

describe('CostTab', () => {
  beforeEach(() => {
    mockGetCostReport.mockReset();
    mockGetCostRoundTrend.mockReset().mockResolvedValue({ jobId: 'job-aaa111', rounds: [] });
    mockGetScoreTrend.mockReset().mockResolvedValue({ jobId: 'job-aaa111', rounds: [] });
  });

  it('renders summary cards and the cap-hit breakdown', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();

    expect(await screen.findByText('Total Spent')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('Avg Cost / Run')).toBeInTheDocument();
    expect(screen.getByText('$4.17')).toBeInTheDocument();
  });

  it('shows $0.00 (not a dash) for a run that legitimately cost nothing', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();

    const row = await screen.findByText('zero-cost.pdf');
    const tr = row.closest('tr');
    expect(tr).not.toBeNull();
    expect(within(tr as HTMLElement).getByText('$0.00')).toBeInTheDocument();
  });

  it('shows a Date column so same-named rows can be told apart, with a dash when no timestamp exists', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();

    const row = await screen.findByText('report-a.pdf');
    const tr = row.closest('tr') as HTMLElement;
    expect(within(tr).getByText(new Date('2026-10-20T14:30:00.000Z').toLocaleString())).toBeInTheDocument();

    // This row also has a null pageCount, which renders its own '—' -- so
    // there are two dashes here (Date and Pages), not one.
    const zeroCostRow = screen.getByText('zero-cost.pdf').closest('tr') as HTMLElement;
    expect(within(zeroCostRow).getAllByText('—')).toHaveLength(2);
  });

  it('falls back to the job id when no file name is available', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();

    expect(await screen.findByText('job-bbb222')).toBeInTheDocument();
  });

  it('sorts spend by run when a column header is clicked', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();
    await screen.findByText('Spend by Run');

    const rowsDescByDefault = screen.getAllByRole('row').slice(1); // skip header row
    expect(within(rowsDescByDefault[0]).getByText('report-a.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cost'));
    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(within(rowsAsc[0]).getByText('zero-cost.pdf')).toBeInTheDocument();
  });

  it('opens the drill-down dialog when a row is clicked', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());
    mockGetCostRoundTrend.mockResolvedValue({
      jobId: 'job-aaa111',
      rounds: [{ cycleNumber: 1, costUsd: 5, completedAt: '2026-10-01T00:00:00Z' }],
    });

    renderTab();
    const row = await screen.findByText('report-a.pdf');
    fireEvent.click(row);

    expect(await screen.findByText(/Job History/)).toBeInTheDocument();
    expect(screen.getByText('Per-Round Cost')).toBeInTheDocument();
    expect(screen.getByText('Score Trend (Resolution Rate)')).toBeInTheDocument();
    expect(mockGetCostRoundTrend).toHaveBeenCalledWith('job-aaa111');
    expect(mockGetScoreTrend).toHaveBeenCalledWith('job-aaa111');
  });

  it('shows a retry-able error banner on failure', async () => {
    mockGetCostReport.mockRejectedValue(new Error('Network error'));

    renderTab();

    expect(await screen.findByText('Failed to load cost report')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
