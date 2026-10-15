import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PdfBatchCreatePage from './PdfBatchCreatePage';
import { pdfBatchService } from '@/services/pdfBatch.service';
import { uploadService } from '@/services/upload.service';

vi.mock('@/services/pdfBatch.service');
vi.mock('@/services/upload.service');

// react-dropzone needs a real file-selection path in jsdom; drive it through
// the hidden <input type="file"> the dropzone renders rather than simulating
// a drag-and-drop event, matching how the rest of the codebase's upload-zone
// tests work.
function pdfFile(name: string): File {
  return new File(['%PDF-1.4 test content'], name, { type: 'application/pdf' });
}

const mockBatchService = vi.mocked(pdfBatchService);
const mockUploadService = vi.mocked(uploadService);

function DetailPagePlaceholder() {
  const { batchId } = useParams<{ batchId: string }>();
  return <div>Detail page for batch {batchId}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pdf-batches/new']}>
        <Routes>
          <Route path="/pdf-batches/new" element={<PdfBatchCreatePage />} />
          <Route path="/pdf-batches/:batchId" element={<DetailPagePlaceholder />} />
          <Route path="/pdf-batches" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// react-dropzone's change handler resolves file metadata asynchronously
// (file-selector's fromEvent returns a promise) before calling onDrop, so
// the selected file doesn't appear synchronously after fireEvent.change —
// wait for it to actually show up before returning.
async function selectFiles(files: File[]) {
  const input = screen.getByLabelText('Upload PDF files') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  await screen.findByText(files[0].name);
}

describe('PdfBatchCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchService.createBatch.mockResolvedValue({
      batchId: 'b1', name: 'x', status: 'DRAFT', totalFiles: 0, createdAt: '2026-10-15T00:00:00Z',
    });
    mockUploadService.getPresignedUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload', fileKey: 'key', fileId: 'file-1', expiresIn: 900,
    });
    mockUploadService.uploadToS3.mockResolvedValue(undefined);
    mockUploadService.confirmUpload.mockResolvedValue(undefined);
    mockBatchService.addItems.mockResolvedValue({ itemsAdded: 1, items: [] });
  });

  it('lists a selected file and lets it be removed before upload starts', async () => {
    renderPage();

    await selectFiles([pdfFile('a.pdf')]);

    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 file selected')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove a.pdf'));

    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('0 files selected')).toBeInTheDocument();
  });

  it('creates the batch, uploads each file through presign -> S3 -> confirm, adds items, and navigates to the detail page', async () => {
    renderPage();

    await selectFiles([pdfFile('a.pdf'), pdfFile('b.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & Upload' }));

    await waitFor(() => expect(screen.getByText('Detail page for batch b1')).toBeInTheDocument());

    expect(mockBatchService.createBatch).toHaveBeenCalledWith({ name: undefined });
    expect(mockUploadService.getPresignedUrl).toHaveBeenCalledTimes(2);
    expect(mockUploadService.uploadToS3).toHaveBeenCalledTimes(2);
    expect(mockUploadService.confirmUpload).toHaveBeenCalledTimes(2);
    expect(mockBatchService.addItems).toHaveBeenCalledWith('b1', [{ sourceFileId: 'file-1' }, { sourceFileId: 'file-1' }]);
  });

  it('passes the batch name through when provided', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Batch Name (Optional)'), { target: { value: 'Q4 Batch' } });
    await selectFiles([pdfFile('a.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & Upload' }));

    await waitFor(() => expect(mockBatchService.createBatch).toHaveBeenCalledWith({ name: 'Q4 Batch' }));
  });

  it('still adds the files that succeeded even if one upload fails, and surfaces the per-file error', async () => {
    mockUploadService.getPresignedUrl
      .mockResolvedValueOnce({ uploadUrl: 'https://s3.example.com/upload', fileKey: 'key1', fileId: 'file-1', expiresIn: 900 })
      .mockRejectedValueOnce(new Error('Presign failed'));

    renderPage();

    await selectFiles([pdfFile('a.pdf'), pdfFile('b.pdf')]);
    fireEvent.click(screen.getByRole('button', { name: 'Create & Upload' }));

    await waitFor(() => expect(screen.getByText(/Detail page/)).toBeInTheDocument());

    expect(mockBatchService.addItems).toHaveBeenCalledWith('b1', [{ sourceFileId: 'file-1' }]);
  });

  it('disables Create & Upload with no files selected', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Create & Upload' })).toBeDisabled();
  });
});
