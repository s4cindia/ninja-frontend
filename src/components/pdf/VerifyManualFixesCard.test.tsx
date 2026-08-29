import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VerifyManualFixesCard } from './VerifyManualFixesCard';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { ReauditComparisonResult } from '@/types/pdf-remediation.types';

vi.mock('@/services/pdf-remediation.service', () => ({
  pdfRemediationService: { reauditPdf: vi.fn() },
}));

const mockService = pdfRemediationService as Mocked<typeof pdfRemediationService>;

function renderCard(onReaudited = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    onReaudited,
    ...render(
      <QueryClientProvider client={queryClient}>
        <VerifyManualFixesCard jobId="job-123" onReaudited={onReaudited} />
      </QueryClientProvider>
    ),
  };
}

function pdfFile(name = 'fixed.pdf', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

function successResult(overrides?: Partial<ReauditComparisonResult>): ReauditComparisonResult {
  return {
    success: true,
    jobId: 'job-123',
    originalAuditId: 'audit-1',
    reauditId: 'audit-2',
    fileName: 'fixed.pdf',
    comparison: {} as ReauditComparisonResult['comparison'],
    metrics: {
      totalOriginal: 10,
      totalNew: 8,
      resolvedCount: 2,
      remainingCount: 8,
      regressionCount: 0,
      resolutionRate: 20,
      criticalResolved: 0,
      criticalRemaining: 0,
    } as ReauditComparisonResult['metrics'],
    ...overrides,
  };
}

describe('VerifyManualFixesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload affordance with no success note by default', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /Upload Fixed PDF/ })).toBeInTheDocument();
    expect(screen.queryByText(/issue\(s\) resolved/)).not.toBeInTheDocument();
  });

  it('rejects a non-PDF file without calling the API', () => {
    const { container } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'not-a-pdf.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockService.reauditPdf).not.toHaveBeenCalled();
  });

  it('rejects a file over 100MB without calling the API', () => {
    const { container } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = pdfFile('huge.pdf', 101 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockService.reauditPdf).not.toHaveBeenCalled();
  });

  it('uploads a valid PDF, shows the success note, and reports the result upward', async () => {
    const result = successResult();
    mockService.reauditPdf.mockResolvedValueOnce(result);
    const { container, onReaudited } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => {
      expect(mockService.reauditPdf).toHaveBeenCalledWith('job-123', expect.any(File));
    });
    await waitFor(() => {
      expect(onReaudited).toHaveBeenCalledWith(result);
    });
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/Re-run AI Analysis \(above\) to/)).toBeInTheDocument();
  });

  it('shows a disabled "Re-auditing…" state while the request is in flight', async () => {
    let resolveUpload!: (value: ReauditComparisonResult) => void;
    mockService.reauditPdf.mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));
    const { container } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Re-auditing…/ })).toBeDisabled();
    });

    resolveUpload(successResult());
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Fixed PDF/ })).not.toBeDisabled();
    });
  });

  it('does not show the success note and does not call onReaudited when the re-audit itself reports failure', async () => {
    mockService.reauditPdf.mockResolvedValueOnce(successResult({ success: false }));
    const { container, onReaudited } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => {
      expect(mockService.reauditPdf).toHaveBeenCalled();
    });
    expect(onReaudited).not.toHaveBeenCalled();
    expect(screen.queryByText(/issue\(s\) resolved/)).not.toBeInTheDocument();
  });

  it('re-enables the button and does not crash if the upload request rejects', async () => {
    mockService.reauditPdf.mockRejectedValueOnce(new Error('network error'));
    const { container } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Fixed PDF/ })).not.toBeDisabled();
    });
  });

  it('regression: clears a prior success note once a subsequent upload fails, so a failed retry does not keep showing the earlier successful counts as if it also succeeded', async () => {
    mockService.reauditPdf.mockResolvedValueOnce(successResult({ metrics: { ...successResult().metrics, resolvedCount: 3 } }));
    const { container } = renderCard();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [pdfFile()] } });
    await waitFor(() => {
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    mockService.reauditPdf.mockRejectedValueOnce(new Error('network error'));
    fireEvent.change(input, { target: { files: [pdfFile()] } });

    await waitFor(() => {
      expect(mockService.reauditPdf).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText(/issue\(s\) resolved/)).not.toBeInTheDocument();
  });
});
