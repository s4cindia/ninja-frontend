import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThroughputTab } from './ThroughputTab';
import { reportsService } from '@/services/reports.service';
import type { ThroughputReport } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getThroughputReport: vi.fn() },
}));

const mockGetThroughputReport = vi.mocked(reportsService.getThroughputReport);

function mockReport(overrides?: Partial<ThroughputReport>): ThroughputReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26', groupBy: 'day' },
    queueWait: { avgMs: 5000, p50Ms: 4000, p95Ms: 12000, count: 10 },
    initialAudit: { avgMs: 90000, p50Ms: 80000, p95Ms: 150000, count: 10 },
    roundDuration: [{ action: 'apply_fixes', avgMs: 20000, p50Ms: 18000, p95Ms: 30000, count: 5 }],
    trend: [{ period: '2026-10-25', queueWaitAvgMs: 5000, initialAuditAvgMs: 90000, jobCount: 10 }],
    stuckJobs: [],
    concurrency: { totalUnits: 4, unitsInUse: 1 },
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThroughputTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ThroughputTab', () => {
  beforeEach(() => {
    mockGetThroughputReport.mockReset();
  });

  it('renders summary cards, round duration, and concurrency once loaded', async () => {
    mockGetThroughputReport.mockResolvedValue(mockReport());

    renderTab();

    expect(await screen.findByText('Queue Wait')).toBeInTheDocument();
    expect(screen.getByText('5.0s')).toBeInTheDocument();
    expect(screen.getByText('Initial Audit')).toBeInTheDocument();
    expect(screen.getByText('Apply Fixes')).toBeInTheDocument();
    expect(screen.getByText('1 / 4 units in use')).toBeInTheDocument();
    expect(screen.getByText('No stuck jobs right now.')).toBeInTheDocument();
  });

  it('shows a visually distinct stuck-jobs section when there are stuck jobs', async () => {
    mockGetThroughputReport.mockResolvedValue(
      mockReport({
        stuckJobs: [
          { jobId: 'job-99', status: 'PROCESSING', updatedAt: '2026-10-26T00:00:00Z', stuckForMs: 1_500_000, fileName: 'report.pdf' },
        ],
      })
    );

    renderTab();

    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('Stuck Jobs (1)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/jobs/job-99');
  });

  it('shows "no concurrency data" when concurrency is null', async () => {
    mockGetThroughputReport.mockResolvedValue(mockReport({ concurrency: null }));

    renderTab();

    expect(await screen.findByText('No concurrency data yet.')).toBeInTheDocument();
  });

  it('shows a retry-able error banner on failure', async () => {
    mockGetThroughputReport.mockRejectedValue(new Error('Network error'));

    renderTab();

    expect(await screen.findByText('Failed to load throughput report')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('re-fetches with week groupBy when the toggle is clicked', async () => {
    mockGetThroughputReport.mockResolvedValue(mockReport());

    renderTab();
    await screen.findByText('Queue Wait');

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));

    await waitFor(() =>
      expect(mockGetThroughputReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ groupBy: 'week' })
      )
    );
  });
});
