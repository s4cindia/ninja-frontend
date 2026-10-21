import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PdfBatchItemProgressDetail } from './PdfBatchItemProgressDetail';
import { api } from '@/services/api';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { PdfBatchItem } from '@/types/pdfBatch.types';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), defaults: { baseURL: '' } },
  };
});
vi.mock('@/services/pdfAutoMode.service', () => ({
  pdfAutoModeService: {
    startAutoMode: vi.fn(),
    getAutoModeStatus: vi.fn(),
    stopAutoMode: vi.fn(),
  },
}));
vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { getRemediationHistory: vi.fn().mockResolvedValue([]) },
}));

const NEVER_RUN_STATUS: AutoModeStatusResponse = {
  mode: 'manual',
  autoStatus: null,
  autoStopReason: null,
  autoRoundsCompleted: 0,
  autoMaxRounds: 10,
  autoCostSpentUsd: 0,
  autoCostLimitUsd: 2,
  autoColorContrastMode: null,
};

function makeItem(overrides: Partial<PdfBatchItem> = {}): PdfBatchItem {
  return {
    itemId: 'item-1',
    fileName: 'book.pdf',
    originalName: 'book.pdf',
    fileSize: '1024',
    status: 'AUDITING',
    uploadedAt: '2026-10-18T00:00:00.000Z',
    auditJobId: 'job-1',
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PdfBatchItemProgressDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pdfAutoModeService.getAutoModeStatus).mockResolvedValue(NEVER_RUN_STATUS);
    vi.mocked(pdfRemediationService.getRemediationHistory).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a placeholder and never polls when the item has no auditJobId yet', () => {
    renderWithClient(<PdfBatchItemProgressDetail item={makeItem({ auditJobId: null })} />);

    expect(screen.getByText(/no progress detail available/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    expect(pdfAutoModeService.getAutoModeStatus).not.toHaveBeenCalled();
  });

  it('polls GET /jobs/:id and renders the audit progress panel once job data arrives', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: {
          id: 'job-1',
          status: 'PROCESSING',
          type: 'pdf-audit',
          progress: 54,
          input: { totalPages: 10 },
          createdAt: '2026-10-18T00:00:00.000Z',
          startedAt: '2026-10-18T00:00:01.000Z',
        },
      },
    });

    renderWithClient(<PdfBatchItemProgressDetail item={makeItem()} />);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/jobs/job-1'));
    expect(await screen.findByText('Audit')).toBeInTheDocument();
    expect(screen.getByText(/page \d+ of 10/i)).toBeInTheDocument();
    // No remediation run has ever started for this job -- that section is omitted.
    expect(screen.queryByText('Remediation')).not.toBeInTheDocument();
  });

  it('renders the Auto Mode status card and round history once a remediation run exists', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: 'job-1', status: 'PROCESSING', type: 'pdf-audit', progress: 95 } },
    });
    vi.mocked(pdfAutoModeService.getAutoModeStatus).mockResolvedValue({
      ...NEVER_RUN_STATUS,
      mode: 'auto',
      autoStatus: 'running',
      autoRoundsCompleted: 1,
    });
    vi.mocked(pdfRemediationService.getRemediationHistory).mockResolvedValue([
      {
        cycleNumber: 1,
        events: [
          {
            action: 'reaudit',
            source: 'auto_loop',
            status: 'completed',
            resolvedCount: 5,
            remainingCount: 3,
            regressionCount: 0,
            resolutionRate: 62.5,
            startedAt: '2026-10-18T00:01:00.000Z',
            completedAt: '2026-10-18T00:02:00.000Z',
          },
        ],
      },
    ]);

    renderWithClient(<PdfBatchItemProgressDetail item={makeItem({ status: 'REMEDIATING' })} />);

    expect(await screen.findByText('Remediation')).toBeInTheDocument();
    expect(screen.getByText(/auto remediation running — round 2 in progress/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Round-by-round')).toBeInTheDocument());
  });

  it('shows the live current-round phase line, derived from the raw remediation history', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: 'job-1', status: 'PROCESSING', type: 'pdf-audit', progress: 95 } },
    });
    vi.mocked(pdfAutoModeService.getAutoModeStatus).mockResolvedValue({
      ...NEVER_RUN_STATUS,
      mode: 'auto',
      autoStatus: 'running',
      autoRoundsCompleted: 1,
      autoStartedAt: '2026-10-18T00:00:00.000Z',
    });
    vi.mocked(pdfRemediationService.getRemediationHistory).mockResolvedValue([
      {
        cycleNumber: 1,
        events: [
          {
            action: 'reaudit', source: 'auto_loop', status: 'completed',
            resolvedCount: 5, remainingCount: 3, regressionCount: 0, resolutionRate: 62.5,
            startedAt: '2026-10-18T00:01:00.000Z', completedAt: '2026-10-18T00:02:00.000Z',
          },
        ],
      },
      {
        cycleNumber: 2,
        events: [
          {
            action: 'ai_analysis', source: 'auto_loop', status: 'completed',
            startedAt: '2026-10-18T00:02:00.000Z', completedAt: '2026-10-18T00:03:00.000Z',
          },
        ],
      },
    ]);

    renderWithClient(<PdfBatchItemProgressDetail item={makeItem({ status: 'REMEDIATING' })} />);

    expect(await screen.findByText(/Applying fixes/)).toBeInTheDocument();
  });

  it('does not show a stop error for an active remediation run when Stop was never clicked (real bug, confirmed live: useMutation.error defaults to null, not undefined)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: 'job-1', status: 'PROCESSING', type: 'pdf-audit', progress: 95 } },
    });
    vi.mocked(pdfAutoModeService.getAutoModeStatus).mockResolvedValue({
      ...NEVER_RUN_STATUS,
      mode: 'auto',
      autoStatus: 'running',
      autoRoundsCompleted: 0,
    });

    renderWithClient(<PdfBatchItemProgressDetail item={makeItem({ status: 'REMEDIATING' })} />);

    await screen.findByText('Remediation');
    expect(pdfAutoModeService.stopAutoMode).not.toHaveBeenCalled();
    expect(screen.queryByText(/an unexpected error occurred/i)).not.toBeInTheDocument();
  });

  it('wires the Stop button through to pdfAutoModeService.stopAutoMode', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: 'job-1', status: 'PROCESSING', type: 'pdf-audit', progress: 95 } },
    });
    vi.mocked(pdfAutoModeService.getAutoModeStatus).mockResolvedValue({
      ...NEVER_RUN_STATUS,
      mode: 'auto',
      autoStatus: 'running',
      autoRoundsCompleted: 0,
    });
    vi.mocked(pdfAutoModeService.stopAutoMode).mockResolvedValue(undefined);

    renderWithClient(<PdfBatchItemProgressDetail item={makeItem({ status: 'REMEDIATING' })} />);

    const stopButton = await screen.findByRole('button', { name: /stop/i });
    await user.click(stopButton);

    await waitFor(() => expect(pdfAutoModeService.stopAutoMode).toHaveBeenCalledWith('job-1'));
  });
});
