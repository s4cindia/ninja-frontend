import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PdfBatchListPage from './PdfBatchListPage';
import { pdfBatchService } from '@/services/pdfBatch.service';

vi.mock('@/services/pdfBatch.service');

const mockService = vi.mocked(pdfBatchService);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pdf-batches']}>
        <Routes>
          <Route path="/pdf-batches" element={<PdfBatchListPage />} />
          <Route path="/pdf-batches/new" element={<div>Create page</div>} />
          <Route path="/pdf-batches/:batchId" element={<div>Detail page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PdfBatchListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state with a create-batch CTA when there are no batches', async () => {
    mockService.listBatches.mockResolvedValue({ batches: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    renderPage();

    expect(await screen.findByText('No PDF batches yet')).toBeInTheDocument();
  });

  it('renders each batch with its status badge and file count, and navigates on click', async () => {
    mockService.listBatches.mockResolvedValue({
      batches: [
        { batchId: 'b1', name: 'My Batch', status: 'PROCESSING', totalFiles: 5, createdAt: '2026-10-01T00:00:00Z' },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText('My Batch')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getByText('My Batch'));

    expect(await screen.findByText('Detail page')).toBeInTheDocument();
  });

  it('paginates using the pagination object from the response, not a hardcoded page size', async () => {
    mockService.listBatches.mockResolvedValue({
      batches: Array.from({ length: 5 }, (_, i) => ({
        batchId: `b${i}`, name: `Batch ${i}`, status: 'DRAFT' as const, totalFiles: 1, createdAt: '2026-10-01T00:00:00Z',
      })),
      pagination: { page: 1, limit: 5, total: 12, totalPages: 3 },
    });

    renderPage();

    expect(await screen.findByText(/Showing 1 to 5 of 12 batches/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).not.toBeDisabled();
  });
});
