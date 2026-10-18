import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PdfBatchDetailPage from './PdfBatchDetailPage';
import { pdfBatchService } from '@/services/pdfBatch.service';
import type { PdfBatchDetail, PdfBatchItem } from '@/types/pdfBatch.types';

vi.mock('@/services/pdfBatch.service');

const mockService = vi.mocked(pdfBatchService);

function item(overrides: Partial<PdfBatchItem>): PdfBatchItem {
  return {
    itemId: 'i1',
    fileName: 'a.pdf',
    originalName: 'a.pdf',
    fileSize: '1000',
    status: 'UPLOADED',
    uploadedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function detail(overrides?: Partial<PdfBatchDetail>): PdfBatchDetail {
  return {
    batchId: 'b1',
    name: 'My Batch',
    status: 'DRAFT',
    totalFiles: 1,
    statusCounts: {},
    createdAt: '2026-10-01T11:00:00.000Z',
    items: [item({})],
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pdf-batches/b1']}>
        <Routes>
          <Route path="/pdf-batches/:batchId" element={<PdfBatchDetailPage />} />
          <Route path="/pdf-batches/:batchId/results" element={<div>Results page</div>} />
          <Route path="/pdf-batches" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PdfBatchDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows the item list with a remove button and a Start button while DRAFT', async () => {
    mockService.getBatch.mockResolvedValue(detail());

    renderPage();

    expect(await screen.findByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Processing/ })).toBeEnabled();
    expect(screen.getByLabelText('Remove a.pdf')).toBeInTheDocument();
  });

  it('disables Start Processing when the batch has no items', async () => {
    mockService.getBatch.mockResolvedValue(detail({ totalFiles: 0, items: [] }));

    renderPage();

    expect(await screen.findByRole('button', { name: /Start Processing/ })).toBeDisabled();
  });

  it('calls startBatch with the confirmed Auto Mode overrides when Start Processing is clicked and confirmed', async () => {
    mockService.getBatch.mockResolvedValue(detail());
    mockService.startBatch.mockResolvedValue({ batchId: 'b1', status: 'QUEUED', totalFiles: 1, startedAt: '2026-10-01T12:00:00Z' });

    renderPage();

    // Clicking the trigger reveals the Auto Mode settings popover (reused
    // from the single-file page's AutoModeStartControl) rather than
    // starting immediately -- confirming with the unedited defaults is
    // what actually calls startBatch.
    fireEvent.click(await screen.findByRole('button', { name: /Start Processing/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(mockService.startBatch).toHaveBeenCalledWith('b1', {
      autoMaxRounds: 10,
      autoCostLimitUsd: 2,
      autoColorContrastMode: 'apply-to-pdf',
    }));
  });

  it('calls removeItem when a DRAFT item is removed', async () => {
    mockService.getBatch.mockResolvedValue(detail());
    mockService.removeItem.mockResolvedValue(undefined);

    renderPage();

    fireEvent.click(await screen.findByLabelText('Remove a.pdf'));

    await waitFor(() => expect(mockService.removeItem).toHaveBeenCalledWith('b1', 'i1'));
  });

  it('shows the status summary and a Cancel button while PROCESSING, without a remove button on items', async () => {
    mockService.getBatch.mockResolvedValue(detail({
      status: 'PROCESSING',
      startedAt: '2026-10-01T11:30:00.000Z',
      statusCounts: { AUDITING: 1 },
      items: [item({ status: 'AUDITING' })],
    }));

    renderPage();

    expect(await screen.findByText('Processing Progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel Batch/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove a.pdf')).not.toBeInTheDocument();
  });

  it('calls cancelBatch (after confirmation) when Cancel Batch is clicked', async () => {
    mockService.getBatch.mockResolvedValue(detail({ status: 'QUEUED', startedAt: '2026-10-01T11:30:00.000Z' }));
    mockService.cancelBatch.mockResolvedValue({ batchId: 'b1', status: 'CANCELLED' });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Cancel Batch/ }));

    await waitFor(() => expect(mockService.cancelBatch).toHaveBeenCalledWith('b1'));
  });

  it('shows a View Results button and final counts for a terminal batch', async () => {
    mockService.getBatch.mockResolvedValue(detail({
      status: 'COMPLETED',
      startedAt: '2026-10-01T11:00:00.000Z',
      completedAt: '2026-10-01T12:00:00.000Z',
      statusCounts: { REMEDIATED: 2, FAILED: 1 },
      items: [item({ status: 'REMEDIATED' }), item({ itemId: 'i2', status: 'FAILED' })],
    }));

    renderPage();

    expect(await screen.findByText(/2 remediated, 1 failed, 0 skipped/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Results/ }));

    expect(await screen.findByText('Results page')).toBeInTheDocument();
  });

  it('shows a not-found state for a missing batch', async () => {
    mockService.getBatch.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText('Batch not found')).toBeInTheDocument();
  });
});
