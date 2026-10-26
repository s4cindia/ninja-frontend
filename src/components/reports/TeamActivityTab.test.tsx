import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamActivityTab } from './TeamActivityTab';
import { reportsService } from '@/services/reports.service';
import type { TeamActivityReport } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getTeamActivityReport: vi.fn() },
}));

const mockGetTeamActivityReport = vi.mocked(reportsService.getTeamActivityReport);

function mockReport(overrides?: Partial<TeamActivityReport>): TeamActivityReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    reviewThroughput: [
      { reviewerId: 'leader-1', reviewerName: 'Lee Leader', reviewerEmail: 'lee@example.com', okCount: 8, needsCorrectionCount: 2, total: 10 },
    ],
    ownership: [
      { ownerId: 'exec-1', ownerName: 'Eve Exec', ownerEmail: 'eve@example.com', totalJobs: 20, completedJobs: 15, failedJobs: 2, inProgressJobs: 3 },
    ],
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamActivityTab />
    </QueryClientProvider>
  );
}

describe('TeamActivityTab', () => {
  beforeEach(() => {
    mockGetTeamActivityReport.mockReset();
  });

  it('renders review throughput and ownership for the admin scope', async () => {
    mockGetTeamActivityReport.mockResolvedValue(mockReport());

    renderTab();

    expect(await screen.findByText('Lee Leader')).toBeInTheDocument();
    expect(screen.getByText('8 OK · 2 needs correction · 10 total')).toBeInTheDocument();
    expect(screen.getByText('Eve Exec')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();

    expect(mockGetTeamActivityReport).toHaveBeenCalledWith(
      'admin',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) })
    );
  });

  it('shows empty states when there is no activity in range', async () => {
    mockGetTeamActivityReport.mockResolvedValue(mockReport({ reviewThroughput: [], ownership: [] }));

    renderTab();

    expect(await screen.findByText('No team reviews in this range.')).toBeInTheDocument();
    expect(screen.getByText('No jobs in this range.')).toBeInTheDocument();
  });

  it('shows a retry-able error banner on failure', async () => {
    mockGetTeamActivityReport.mockRejectedValue(new Error('Network error'));

    renderTab();

    expect(await screen.findByText('Failed to load team activity report')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
