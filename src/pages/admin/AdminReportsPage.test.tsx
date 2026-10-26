import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminReportsPage from './AdminReportsPage';
import { reportsService } from '@/services/reports.service';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/auth.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: {
    getThroughputReport: vi.fn(),
    getTeamActivityReport: vi.fn(),
    getCostReport: vi.fn(),
    getReliabilityReport: vi.fn(),
  },
}));

const mockGetThroughputReport = vi.mocked(reportsService.getThroughputReport);
const mockGetTeamActivityReport = vi.mocked(reportsService.getTeamActivityReport);
const mockGetCostReport = vi.mocked(reportsService.getCostReport);
const mockGetReliabilityReport = vi.mocked(reportsService.getReliabilityReport);

const adminUser: User = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Ad',
  lastName: 'Min',
  role: 'ADMIN',
  tenantId: 'tenant-1',
};

function setCurrentUser(overrides?: Partial<User>) {
  useAuthStore.setState({
    user: { ...adminUser, ...overrides },
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'token',
    refreshToken: 'refresh',
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/reports']}>
        <Routes>
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    mockGetThroughputReport.mockReset().mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26', groupBy: 'day' },
      queueWait: { avgMs: null, p50Ms: null, p95Ms: null, count: 0 },
      initialAudit: { avgMs: null, p50Ms: null, p95Ms: null, count: 0 },
      roundDuration: [],
      trend: [],
      stuckJobs: [],
      concurrency: null,
    });
    mockGetTeamActivityReport.mockReset().mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26' },
      reviewThroughput: [],
      ownership: [],
    });
    mockGetCostReport.mockReset().mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26' },
      totalSpentUsd: 0,
      runCount: 0,
      avgCostPerRunUsd: null,
      avgCostPerPageUsd: null,
      capHitFrequency: {},
      spendByRun: [],
    });
    mockGetReliabilityReport.mockReset().mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26' },
      interruptionCount: 0,
      interruptionsByAction: {},
      failureCount: 0,
      failuresByCategory: {
        SIZE_LIMIT_EXCEEDED: 0,
        TIMEOUT: 0,
        PARSE_ERROR: 0,
        VALIDATION_ERROR: 0,
        UNKNOWN: 0,
      },
    });
  });

  it('redirects a non-admin away from the page', async () => {
    setCurrentUser({ role: 'USER' });

    renderPage();

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Operational Reports')).not.toBeInTheDocument();
  });

  it('shows the Throughput tab by default, switches through Cost/Team Activity/Reliability, and still placeholders Quality', async () => {
    setCurrentUser();

    renderPage();

    expect(await screen.findByText('Operational Reports')).toBeInTheDocument();
    expect(await screen.findByText('Queue Wait')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Cost' }));
    expect(await screen.findByText('Total Spent')).toBeInTheDocument();
    expect(screen.queryByText('Queue Wait')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Team Activity' }));
    expect(await screen.findByText('No team reviews in this range.')).toBeInTheDocument();
    expect(screen.queryByText('Queue Wait')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Spent')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Reliability' }));
    expect(
      await screen.findByText(
        (_, el) => el?.tagName === 'P' && el.textContent?.replace(/\s+/g, ' ').trim() === '0 interruptions · 0 failures in this period'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No team reviews in this range.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Quality' }));
    expect(screen.getByText('Fix quality / effectiveness reports are coming soon.')).toBeInTheDocument();
  });
});
