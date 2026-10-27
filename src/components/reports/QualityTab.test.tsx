import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QualityTab } from './QualityTab';
import { reportsService } from '@/services/reports.service';
import type { QualityReport, StuckIssuesResponse } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: {
    getQualityReport: vi.fn(),
    getStuckIssues: vi.fn(),
    getCostRoundTrend: vi.fn(),
    getScoreTrend: vi.fn(),
  },
}));

const mockGetQualityReport = vi.mocked(reportsService.getQualityReport);
const mockGetStuckIssues = vi.mocked(reportsService.getStuckIssues);
const mockGetCostRoundTrend = vi.mocked(reportsService.getCostRoundTrend);
const mockGetScoreTrend = vi.mocked(reportsService.getScoreTrend);

function mockQualityReport(overrides?: Partial<QualityReport>): QualityReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    yieldByType: [
      { suggestionType: 'ALT_TEXT_DECORATIVE', applied: 2, failed: 8, yieldRate: 0.2 },
      { suggestionType: 'TABLE_HEADER_SCOPE', applied: 9, failed: 1, yieldRate: 0.9 },
    ],
    ...overrides,
  };
}

function mockStuckIssues(overrides?: Partial<StuckIssuesResponse>): StuckIssuesResponse {
  return {
    stuckIssues: [
      {
        code: 'MISSING_ALT_TEXT',
        count: 12,
        sampleJobs: [
          { jobId: 'job-aaa111', fileName: 'figures.pdf' },
          { jobId: 'job-bbb222', fileName: null },
        ],
      },
    ],
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <QualityTab />
    </QueryClientProvider>
  );
}

describe('QualityTab', () => {
  beforeEach(() => {
    mockGetQualityReport.mockReset();
    mockGetStuckIssues.mockReset();
    mockGetCostRoundTrend.mockReset().mockResolvedValue({ jobId: 'job-aaa111', rounds: [] });
    mockGetScoreTrend.mockReset().mockResolvedValue({ jobId: 'job-aaa111', rounds: [] });
  });

  it('renders the yield-by-type chart and the stuck-issue backlog', async () => {
    mockGetQualityReport.mockResolvedValue(mockQualityReport());
    mockGetStuckIssues.mockResolvedValue(mockStuckIssues());

    renderTab();

    expect(await screen.findByText('Yield by Suggestion Type')).toBeInTheDocument();
    expect(await screen.findByText('MISSING_ALT_TEXT')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('figures.pdf')).toBeInTheDocument();
    expect(screen.getByText('job-bbb222')).toBeInTheDocument();
  });

  it('shows empty states when there is no activity', async () => {
    mockGetQualityReport.mockResolvedValue(mockQualityReport({ yieldByType: [] }));
    mockGetStuckIssues.mockResolvedValue(mockStuckIssues({ stuckIssues: [] }));

    renderTab();

    expect(await screen.findByText('No apply-fixes activity in this range.')).toBeInTheDocument();
    expect(screen.getByText('No stuck issues right now.')).toBeInTheDocument();
  });

  it('opens the shared job drill-down dialog when a sample job is clicked', async () => {
    mockGetQualityReport.mockResolvedValue(mockQualityReport());
    mockGetStuckIssues.mockResolvedValue(mockStuckIssues());

    renderTab();
    const sampleJobButton = await screen.findByText('figures.pdf');
    fireEvent.click(sampleJobButton);

    expect(await screen.findByText(/Job History — job-aaa111/)).toBeInTheDocument();
    expect(mockGetCostRoundTrend).toHaveBeenCalledWith('job-aaa111');
    expect(mockGetScoreTrend).toHaveBeenCalledWith('job-aaa111');
  });

  it('shows independent retry-able error banners for the yield report and the stuck-issue backlog', async () => {
    mockGetQualityReport.mockRejectedValue(new Error('Yield failed'));
    mockGetStuckIssues.mockRejectedValue(new Error('Stuck issues failed'));

    renderTab();

    expect(await screen.findByText('Failed to load quality report')).toBeInTheDocument();
    expect(screen.getByText('Yield failed')).toBeInTheDocument();
    expect(await screen.findByText('Failed to load stuck issue backlog')).toBeInTheDocument();
    expect(screen.getByText('Stuck issues failed')).toBeInTheDocument();
  });
});
