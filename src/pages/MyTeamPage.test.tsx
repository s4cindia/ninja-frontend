import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import MyTeamPage from './MyTeamPage';
import { teamService } from '@/services/team.service';
import { reportsService } from '@/services/reports.service';
import type { TeamJob } from '@/types/team.types';

vi.mock('@/services/team.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/team.service')>(
    '@/services/team.service'
  );
  return {
    ...actual,
    teamService: { listTeamJobs: vi.fn() },
  };
});

vi.mock('@/services/reports.service', () => ({
  reportsService: { getTeamActivityReport: vi.fn() },
}));

const mockListTeamJobs = vi.mocked(teamService.listTeamJobs);
const mockGetTeamActivityReport = vi.mocked(reportsService.getTeamActivityReport);

function mockTeamJob(overrides?: Partial<TeamJob>): TeamJob {
  return {
    id: 'job-1',
    type: 'PDF_ACCESSIBILITY',
    status: 'COMPLETED',
    progress: 100,
    input: { fileName: 'teammate-file.pdf' },
    createdAt: '2026-01-01T00:00:00Z',
    userId: 'teammate-user-id-123',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/my-team']}>
        <MyTeamPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MyTeamPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockListTeamJobs.mockReset();
    mockGetTeamActivityReport.mockReset().mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26' },
      reviewThroughput: [],
      ownership: [],
    });
  });

  it('lists teammates\' jobs with file, type, status, owner id, and a view link routed to the PDF audit page', async () => {
    mockListTeamJobs.mockResolvedValue({
      jobs: [mockTeamJob()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    renderPage();

    expect(await screen.findByText('teammate-file.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF Accessibility Audit')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByTitle('teammate-user-id-123')).toBeInTheDocument();
    // /jobs/:id never renders the Team Review Panel -- a PDF job's view
    // link must go to /pdf/audit/:id, the only route that does.
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/pdf/audit/job-1');
  });

  it('routes a view link to the generic job detail page for a job type with no dedicated route', async () => {
    mockListTeamJobs.mockResolvedValue({
      jobs: [mockTeamJob({ type: 'EPUB_ACCESSIBILITY' })],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    renderPage();

    expect(await screen.findByText('teammate-file.pdf')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/jobs/job-1');
  });

  it('shows a not-applicable empty state, not an error banner, for a caller who is not a Team Leader/Viewer on any team', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { success: false, error: { code: 'NOT_TEAM_LEADER_OR_VIEWER', message: 'nope' } },
      },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockListTeamJobs.mockRejectedValue(error);

    renderPage();

    expect(
      await screen.findByText(/not a Team Leader or Viewer on any team/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows a retry-able error banner for any other failure', async () => {
    mockListTeamJobs.mockRejectedValue(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows an empty state when the caller has no team jobs', async () => {
    mockListTeamJobs.mockResolvedValue({
      jobs: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 1 },
    });

    renderPage();

    await waitFor(() => expect(mockListTeamJobs).toHaveBeenCalled());
    expect(await screen.findByText('No team jobs yet')).toBeInTheDocument();
  });

  it("shows the caller's own Team Activity section below the job list", async () => {
    mockListTeamJobs.mockResolvedValue({
      jobs: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 1 },
    });
    mockGetTeamActivityReport.mockResolvedValue({
      period: { from: '2026-09-26', to: '2026-10-26' },
      reviewThroughput: [
        { reviewerId: 'leader-1', reviewerName: 'Lee Leader', reviewerEmail: 'lee@example.com', okCount: 3, needsCorrectionCount: 1, total: 4 },
      ],
      ownership: [],
    });

    renderPage();

    expect(await screen.findByText('Team Activity')).toBeInTheDocument();
    expect(await screen.findByText('Lee Leader')).toBeInTheDocument();
    expect(mockGetTeamActivityReport).toHaveBeenCalledWith('self', expect.anything());
  });

  it('does not show the Team Activity section for a caller who is not a Team Leader/Viewer on any team', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: {
        status: 403,
        data: { success: false, error: { code: 'NOT_TEAM_LEADER_OR_VIEWER', message: 'nope' } },
      },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockListTeamJobs.mockRejectedValue(error);

    renderPage();

    await screen.findByText(/not a Team Leader or Viewer on any team/i);
    expect(screen.queryByText('Team Activity')).not.toBeInTheDocument();
    expect(mockGetTeamActivityReport).not.toHaveBeenCalled();
  });
});
