import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DocumentUploader } from './EPUBUploader';
import { uploadService } from '@/services/upload.service';
import { tenantConfigService } from '@/services/tenant-config.service';

vi.mock('@/services/upload.service');
vi.mock('@/services/tenant-config.service');
vi.mock('@/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const mockUploadService = vi.mocked(uploadService);
const mockTenantConfig = vi.mocked(tenantConfigService);

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
});
