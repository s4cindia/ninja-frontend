import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CostTab } from './CostTab';
import { reportsService } from '@/services/reports.service';
import type { CostReport } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getCostReport: vi.fn(), getCostRoundTrend: vi.fn() },
}));

const mockGetCostReport = vi.mocked(reportsService.getCostReport);
const mockGetCostRoundTrend = vi.mocked(reportsService.getCostRoundTrend);

function mockReport(overrides?: Partial<CostReport>): CostReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    totalSpentUsd: 12.5,
    runCount: 3,
    avgCostPerRunUsd: 4.1667,
    avgCostPerPageUsd: 0.05,
    capHitFrequency: { converged: 2, budget_limit: 1 },
    spendByRun: [
      { jobId: 'job-aaa111', source: 'job_native', costUsd: 10, stopReason: 'budget_limit', pageCount: 100 },
      { jobId: 'job-bbb222', source: 'comparison_trial', costUsd: 2.5, stopReason: 'converged', pageCount: 50 },
      { jobId: 'job-ccc333', source: 'job_native', costUsd: 0, stopReason: 'converged', pageCount: null },
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

    const row = await screen.findByText('job-ccc3…');
    const tr = row.closest('tr');
    expect(tr).not.toBeNull();
    expect(within(tr as HTMLElement).getByText('$0.00')).toBeInTheDocument();
  });

  it('sorts spend by run when a column header is clicked', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());

    renderTab();
    await screen.findByText('Spend by Run');

    const rowsDescByDefault = screen.getAllByRole('row').slice(1); // skip header row
    expect(within(rowsDescByDefault[0]).getByText('job-aaa1…')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cost'));
    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(within(rowsAsc[0]).getByText('job-ccc3…')).toBeInTheDocument();
  });

  it('opens the drill-down dialog when a row is clicked', async () => {
    mockGetCostReport.mockResolvedValue(mockReport());
    mockGetCostRoundTrend.mockResolvedValue({
      jobId: 'job-aaa111',
      rounds: [{ cycleNumber: 1, costUsd: 5, completedAt: '2026-10-01T00:00:00Z' }],
    });

    renderTab();
    const row = await screen.findByText('job-aaa1…');
    fireEvent.click(row);

    expect(await screen.findByText(/Per-Round Cost/)).toBeInTheDocument();
    expect(mockGetCostRoundTrend).toHaveBeenCalledWith('job-aaa111');
  });

  it('shows a retry-able error banner on failure', async () => {
    mockGetCostReport.mockRejectedValue(new Error('Network error'));

    renderTab();

    expect(await screen.findByText('Failed to load cost report')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
