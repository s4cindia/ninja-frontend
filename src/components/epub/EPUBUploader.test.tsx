import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DocumentUploader } from './EPUBUploader';
import { uploadService } from '@/services/upload.service';
import { tenantConfigService } from '@/services/tenant-config.service';
import { api } from '@/services/api';

vi.mock('@/services/upload.service');
vi.mock('@/services/tenant-config.service');
vi.mock('@/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const mockUploadService = vi.mocked(uploadService);
const mockTenantConfig = vi.mocked(tenantConfigService);
const mockApiGet = vi.mocked(api.get);

function pdfFile(name: string, sizeBytes: number): File {
  const file = new File(['%PDF-1.4 test content'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

type ProgressCallback = (progress: { loaded: number; total: number; percentage: number }) => void;

async function selectFileAndStartUpload(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(await screen.findByRole('button', { name: 'Start Accessibility Audit' }));
}

describe('DocumentUploader upload progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantConfig.getWorkflowConfig.mockResolvedValue({
      enabled: false,
    });
  });

  it('shows elapsed time, bytes uploaded, and ETA for a large upload instead of just a bare percentage', async () => {
    let capturedProgress: ProgressCallback | undefined;
    mockUploadService.uploadFile.mockImplementation((_file, onProgress) => {
      capturedProgress = onProgress as ProgressCallback;
      return new Promise(() => {}); // never resolves — stay in the 'uploading' state
    });

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
      />
    );

    await selectFileAndStartUpload(pdfFile('FMHE_PDF.pdf', 330 * 1024 * 1024));

    await waitFor(() => expect(capturedProgress).toBeDefined());

    act(() => {
      capturedProgress!({ loaded: 165 * 1024 * 1024, total: 330 * 1024 * 1024, percentage: 50 });
    });

    const detail = await screen.findByTestId('upload-progress-detail');
    expect(detail).toHaveTextContent('165.0 MB of 330.0 MB uploaded');
    expect(detail).toHaveTextContent('elapsed');
    expect(detail).toHaveTextContent(/remaining|Calculating/);
  });

  it('shows a "calculating" placeholder instead of a bogus ETA before any bytes have transferred', async () => {
    let capturedProgress: ProgressCallback | undefined;
    mockUploadService.uploadFile.mockImplementation((_file, onProgress) => {
      capturedProgress = onProgress as ProgressCallback;
      return new Promise(() => {});
    });

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
      />
    );

    await selectFileAndStartUpload(pdfFile('big.pdf', 330 * 1024 * 1024));

    await waitFor(() => expect(capturedProgress).toBeDefined());

    act(() => {
      capturedProgress!({ loaded: 0, total: 330 * 1024 * 1024, percentage: 0 });
    });

    expect(await screen.findByTestId('upload-progress-detail')).toHaveTextContent('Calculating time remaining…');
  });

  it('still caps the visible progress bar at 15% during upload (unchanged from before)', async () => {
    let capturedProgress: ProgressCallback | undefined;
    mockUploadService.uploadFile.mockImplementation((_file, onProgress) => {
      capturedProgress = onProgress as ProgressCallback;
      return new Promise(() => {});
    });

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
      />
    );

    await selectFileAndStartUpload(pdfFile('big.pdf', 330 * 1024 * 1024));

    await waitFor(() => expect(capturedProgress).toBeDefined());

    act(() => {
      capturedProgress!({ loaded: 330 * 1024 * 1024, total: 330 * 1024 * 1024, percentage: 100 });
    });

    await waitFor(() => {
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '15');
    });
  });

  it('regression: keeps showing the file name and size once upload starts, instead of it disappearing the moment the pre-upload confirmation step is left', async () => {
    let capturedProgress: ProgressCallback | undefined;
    mockUploadService.uploadFile.mockImplementation((_file, onProgress) => {
      capturedProgress = onProgress as ProgressCallback;
      return new Promise(() => {}); // never resolves — stay in the 'uploading' state
    });

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
      />
    );

    await selectFileAndStartUpload(pdfFile('Bressler_187513.pdf', 9.2 * 1024 * 1024));

    await waitFor(() => expect(capturedProgress).toBeDefined());
    act(() => {
      capturedProgress!({ loaded: 3.7 * 1024 * 1024, total: 9.2 * 1024 * 1024, percentage: 40 });
    });

    expect(await screen.findByText('Bressler_187513.pdf')).toBeInTheDocument();
    expect(screen.getByText('Uploading and auditing...')).toBeInTheDocument();
  });

  it('regression: keeps showing the file name and a Total row in the Timing table once the audit reaches Complete, not just during upload', async () => {
    mockUploadService.uploadFile.mockResolvedValue({
      uploadMethod: 'direct',
      jobId: 'job-123',
    } as Awaited<ReturnType<typeof uploadService.uploadFile>>);

    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith('/jobs/')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'job-123',
              status: 'COMPLETED',
              type: 'PDF_ACCESSIBILITY',
              startedAt: '2026-01-01T00:00:00.000Z',
              completedAt: '2026-01-01T00:10:00.000Z',
              input: {
                validatorProgress: [
                  { label: 'Color Contrast', issuesFound: 2, startedAt: '2026-01-01T00:02:00.000Z', completedAt: '2026-01-01T00:05:00.000Z' },
                ],
              },
              output: { auditReport: { issues: [] } },
            },
          },
        });
      }
      // AI-analysis status poll (fires once state is 'complete' for a PDF) —
      // keep it pending so this test only has to assert the Timing table.
      return Promise.resolve({ data: { data: { status: 'pending' } } });
    });

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
      />
    );

    await selectFileAndStartUpload(pdfFile('Farrar.pdf', 12 * 1024 * 1024));

    expect(await screen.findByText('Audit Complete')).toBeInTheDocument();
    // The file name must still be shown once the audit has finished, not
    // just during the uploading/queued/processing states (#368 fixed only
    // those; the Complete branch is rendered separately and never read
    // selectedFile at all).
    expect(screen.getByText('Farrar.pdf')).toBeInTheDocument();
    // The Timing table's own Total row (PdfJobProgressPanel got this in
    // #369, but the Complete branch builds its own separate table that
    // never got it). Asserting the duration cell is real, computed content
    // (not the "—" placeholder fmtDur falls back to) rather than an exact
    // value, since the Upload/Queue rows are timestamped off the real
    // wall clock (uploadStartRef/uploadEndRef), not the fixed fake dates
    // used for the rest of this job's data.
    const totalCell = screen.getByText('Total');
    const totalRow = totalCell.closest('tr');
    expect(totalRow).not.toBeNull();
    const durationCell = totalRow!.querySelector('td:last-child');
    expect(durationCell?.textContent).not.toBe('—');
    expect(durationCell?.textContent?.trim()).not.toBe('');
  });

  it('calls onJobCreated as soon as a PDF job exists, without waiting for the audit to complete or starting its own polling', async () => {
    mockUploadService.uploadFile.mockResolvedValue({
      uploadMethod: 'direct',
      jobId: 'job-456',
    } as Awaited<ReturnType<typeof uploadService.uploadFile>>);

    const onJobCreated = vi.fn();

    render(
      <DocumentUploader
        acceptedFileTypes={['pdf']}
        endpoints={{ pdf: { directUpload: '/pdf/audit-upload', auditFile: '/pdf/audit-file' } }}
        onJobCreated={onJobCreated}
      />
    );

    await selectFileAndStartUpload(pdfFile('Farrar.pdf', 12 * 1024 * 1024));

    await waitFor(() => expect(onJobCreated).toHaveBeenCalledWith('job-456'));
    expect(onJobCreated).toHaveBeenCalledTimes(1);
    // Never reaches the "Audit Complete" panel or polls job status -- the
    // caller is expected to navigate away (unmounting this component)
    // immediately upon onJobCreated, so starting polling here would just
    // be wasted/orphaned work.
    expect(screen.queryByText('Audit Complete')).not.toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('does not call onJobCreated for an EPUB upload, even when the prop is provided -- auto-navigate is PDF-only', async () => {
    mockUploadService.uploadFile.mockResolvedValue({
      uploadMethod: 'direct',
      jobId: 'job-789',
    } as Awaited<ReturnType<typeof uploadService.uploadFile>>);
    mockApiGet.mockResolvedValue({ data: { data: { status: 'pending' } } });

    const onJobCreated = vi.fn();
    const epubFile = new File(['test'], 'book.epub', { type: 'application/epub+zip' });

    render(
      <DocumentUploader
        acceptedFileTypes={['epub']}
        endpoints={{ epub: { directUpload: '/epub/audit-upload', auditFile: '/epub/audit-file' } }}
        onJobCreated={onJobCreated}
      />
    );

    await selectFileAndStartUpload(epubFile);

    // Normal polling-driven flow proceeds (api.get gets called at least
    // once for job-status polling) -- confirms this upload wasn't routed
    // down the early-return PDF path at all.
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    expect(onJobCreated).not.toHaveBeenCalled();
  });
});
