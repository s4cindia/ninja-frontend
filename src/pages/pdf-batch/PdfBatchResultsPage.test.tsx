import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PdfBatchResultsPage from './PdfBatchResultsPage';
import { pdfBatchService } from '@/services/pdfBatch.service';
import type { PdfBatchDetail } from '@/types/pdfBatch.types';

vi.mock('@/services/pdfBatch.service');
vi.mock('@/components/pdf/DownloadRemediatedButton', () => ({
  DownloadRemediatedButton: () => <button type="button">Download</button>,
}));

const mockService = vi.mocked(pdfBatchService);

function detail(overrides?: Partial<PdfBatchDetail>): PdfBatchDetail {
  return {
    batchId: 'b1',
    name: 'My Batch',
    status: 'COMPLETED',
    totalFiles: 2,
    statusCounts: { REMEDIATED: 1, FAILED: 1 },
    createdAt: '2026-10-01T11:00:00.000Z',
    items: [
      { itemId: 'i1', fileName: 'a.pdf', originalName: 'a.pdf', fileSize: '1000', status: 'REMEDIATED', uploadedAt: '2026-10-01T11:00:00Z', auditScore: 90, issuesFound: 5, issuesAutoFixed: 5, issuesGuidanceOnly: 0 },
      { itemId: 'i2', fileName: 'b.pdf', originalName: 'b.pdf', fileSize: '2000', status: 'FAILED', uploadedAt: '2026-10-01T11:00:00Z', error: 'Extraction failed' },
    ],
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pdf-batches/b1/results']}>
        <Routes>
          <Route path="/pdf-batches/:batchId/results" element={<PdfBatchResultsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PdfBatchResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows remediated/failed/skipped summary counts and the per-item results table', async () => {
    mockService.getBatch.mockResolvedValue(detail());

    renderPage();

    expect(await screen.findByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(screen.getByText('Extraction failed')).toBeInTheDocument();
    // Remediated/Failed/Skipped summary dd values
    const dds = screen.getAllByRole('definition');
    expect(dds.map((d) => d.textContent)).toEqual(['1', '1', '0']);
  });

  it('shows a not-found state for a missing batch', async () => {
    mockService.getBatch.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText('Batch not found')).toBeInTheDocument();
  });
});
