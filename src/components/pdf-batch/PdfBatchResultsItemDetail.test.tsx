import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PdfBatchResultsItemDetail } from './PdfBatchResultsItemDetail';
import { jobsService } from '@/services/jobs.service';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { Job } from '@/services/jobs.service';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

vi.mock('@/services/jobs.service', () => ({
  jobsService: { getJob: vi.fn() },
}));
vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { getRemediationHistory: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockJobsService = jobsService as Mocked<typeof jobsService>;
const mockRemediationService = pdfRemediationService as Mocked<typeof pdfRemediationService>;

function makeItem(overrides: Partial<PdfBatchItem> = {}): PdfBatchItem {
  return {
    itemId: 'item-1',
    fileName: 'book.pdf',
    originalName: 'book.pdf',
    fileSize: '1024',
    status: 'REMEDIATED',
    uploadedAt: '2026-10-18T00:00:00.000Z',
    auditJobId: 'job-1',
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PdfBatchResultsItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockRemediationService.getRemediationHistory.mockResolvedValue([]);
  });

  it('shows a placeholder and fetches nothing when the item has no auditJobId', () => {
    renderWithClient(<PdfBatchResultsItemDetail item={makeItem({ auditJobId: null })} />);

    expect(screen.getByText(/no detail available/i)).toBeInTheDocument();
    expect(mockJobsService.getJob).not.toHaveBeenCalled();
    expect(mockRemediationService.getRemediationHistory).not.toHaveBeenCalled();
  });

  it('fetches the job once (no polling) and renders the audit timing panel for a completed job', async () => {
    const completedJob: Job = {
      id: 'job-1',
      type: 'pdf-audit',
      status: 'COMPLETED',
      progress: 100,
      input: { totalPages: 10 },
      createdAt: '2026-10-18T00:00:00.000Z',
      startedAt: '2026-10-18T00:00:01.000Z',
      completedAt: '2026-10-18T00:05:00.000Z',
      updatedAt: '2026-10-18T00:05:00.000Z',
    };
    mockJobsService.getJob.mockResolvedValue(completedJob);

    renderWithClient(<PdfBatchResultsItemDetail item={makeItem()} />);

    await waitFor(() => expect(mockJobsService.getJob).toHaveBeenCalledWith('job-1'));
    expect(await screen.findByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    // useJob's own refetchInterval returns false once status leaves
    // QUEUED/PROCESSING -- confirm it really only fetched once.
    expect(mockJobsService.getJob).toHaveBeenCalledTimes(1);
  });

  it('passes the item\'s own auditJobId through to the remediation history fetch', async () => {
    mockJobsService.getJob.mockResolvedValue({
      id: 'job-1', type: 'pdf-audit', status: 'COMPLETED', progress: 100,
      createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
    });
    mockRemediationService.getRemediationHistory.mockResolvedValue([
      {
        cycleNumber: 1,
        events: [
          { action: 'reaudit', source: 'auto_loop', status: 'completed', resolvedCount: 5, remainingCount: 1, regressionCount: 0, resolutionRate: 83, startedAt: '2026-10-18T00:01:00.000Z', completedAt: '2026-10-18T00:02:00.000Z' },
        ],
      },
    ]);

    renderWithClient(<PdfBatchResultsItemDetail item={makeItem({ auditJobId: 'job-42' })} />);

    await waitFor(() => expect(mockRemediationService.getRemediationHistory).toHaveBeenCalledWith('job-42'));
    expect(await screen.findByText('Remediation')).toBeInTheDocument();
    expect(await screen.findByText('Run 1')).toBeInTheDocument();
  });

  it('navigates to the full single-file results page (Matterhorn + page viewer) when "View Full Results" is clicked', async () => {
    mockJobsService.getJob.mockResolvedValue({
      id: 'job-1', type: 'pdf-audit', status: 'COMPLETED', progress: 100,
      createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
    });
    const user = userEvent.setup();

    renderWithClient(<PdfBatchResultsItemDetail item={makeItem({ auditJobId: 'job-99' })} />);

    await user.click(await screen.findByRole('button', { name: /view full results/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/pdf/audit/job-99');
  });
});
