import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BatchCreationPage from './BatchCreationPage';
import { batchService } from '@/services/batch.service';

vi.mock('@/services/batch.service');

const mockBatchService = vi.mocked(batchService);

type ProgressCallback = (progress: { loaded: number; total: number; percentage: number }) => void;

function epubFile(name: string, sizeBytes: number): File {
  const file = new File(['epub content'], name, { type: 'application/epub+zip' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

// react-dropzone resolves file selection asynchronously before onDrop fires,
// so wait for the file to actually show up rather than asserting right away
// (same pattern used for PdfBatchCreatePage's dropzone tests).
async function selectFiles(files: File[]) {
  const input = screen.getByLabelText('Upload EPUB files') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  await screen.findByText(files[0].name);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/batches/new']}>
        <Routes>
          <Route path="/batches/new" element={<BatchCreationPage />} />
          <Route path="/batch/:batchId" element={<div>Detail page</div>} />
          <Route path="/batches" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BatchCreationPage upload progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchService.createBatch.mockResolvedValue({ batchId: 'b1' });
  });

  it('shows elapsed time, bytes uploaded, and ETA during the batch upload instead of just a spinner', async () => {
    let capturedProgress: ProgressCallback | undefined;
    mockBatchService.uploadFiles.mockImplementation((_batchId, _files, onProgress) => {
      capturedProgress = onProgress;
      return new Promise(() => {}); // never resolves — stays in the uploading state
    });

    renderPage();

    await selectFiles([epubFile('a.epub', 50 * 1024 * 1024)]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & Upload' }));

    await waitFor(() => expect(capturedProgress).toBeDefined());

    act(() => {
      capturedProgress!({ loaded: 25 * 1024 * 1024, total: 50 * 1024 * 1024, percentage: 50 });
    });

    const detail = await screen.findByTestId('batch-upload-progress-detail');
    expect(detail).toHaveTextContent('25.0 MB of 50.0 MB uploaded');
    expect(detail).toHaveTextContent('elapsed');
    expect(detail).toHaveTextContent(/remaining|Calculating/);
  });

  it('shows a plain "Uploading files…" line before any progress has been reported yet', async () => {
    mockBatchService.uploadFiles.mockImplementation(() => new Promise(() => {}));

    renderPage();

    await selectFiles([epubFile('a.epub', 50 * 1024 * 1024)]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & Upload' }));

    expect(await screen.findByTestId('batch-upload-progress-detail')).toHaveTextContent('Uploading files…');
  });
});
