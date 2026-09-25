import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonStudyConsolePage from './ComparisonStudyConsolePage';
import { comparisonStudyService, uploadComparisonPdf } from '@/services/comparisonStudy.service';
import type { ComparisonTrial } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');

const mockService = vi.mocked(comparisonStudyService);
const mockUpload = vi.mocked(uploadComparisonPdf);

const mockTrial = (overrides?: Partial<ComparisonTrial>): ComparisonTrial => ({
  id: 'trial-1',
  sourceFileName: 'sample.pdf',
  sourceS3Path: 's3://bucket/sample.pdf',
  contentType: 'text-dominant',
  operatorId: 'op-1',
  ninjaJobId: 'job-1',
  ninjaActiveMs: null,
  ninjaGpuCostUsd: null,
  ninjaPacResult: null,
  pdfxtS3Path: null,
  pdfxtTimeMs: null,
  pdfxtPageCount: null,
  pdfxtCostUsd: null,
  pdfxtPacResult: null,
  status: 'registered',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  mode: 'manual',
  autoMaxRounds: 10,
  autoCostLimitUsd: 2,
  autoRoundsCompleted: 0,
  autoCostSpentUsd: 0,
  autoStatus: null,
  autoStopReason: null,
  autoColorContrastMode: null,
  autoStartedAt: null,
  autoStoppedAt: null,
  ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/comparison-study']}>
        <Routes>
          <Route path="/comparison-study" element={<ComparisonStudyConsolePage />} />
          <Route path="/comparison-study/trials/:id" element={<div>Workspace page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ComparisonStudyConsolePage', () => {
  beforeEach(() => {
    mockService.listTrials.mockReset();
    mockService.registerTrial.mockReset();
    mockUpload.mockReset();
    // Each row fetches its own External PAC Report attachment status —
    // default to "none attached" so unrelated tests don't resolve this
    // query to undefined (React Query logs an error for that).
    mockService.getExternalPacReport.mockReset().mockResolvedValue(null);
  });

  it('renders the trial list with status badges', async () => {
    mockService.listTrials.mockResolvedValue({
      trials: [mockTrial(), mockTrial({ id: 'trial-2', sourceFileName: 'other.pdf', status: 'validated' })],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText('sample.pdf')).toBeInTheDocument();
    expect(screen.getByText('other.pdf')).toBeInTheDocument();
    expect(screen.getByText('Registered')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('shows time-to-convergence, AI cost, AWS cost estimate, PAC failure count, and External PAC Report attachment per row', async () => {
    mockService.listTrials.mockResolvedValue({
      trials: [
        mockTrial({
          autoStartedAt: '2026-08-01T10:00:00Z',
          autoStoppedAt: '2026-08-01T10:04:32Z',
          autoCostSpentUsd: 1.23,
          ninjaGpuCostUsd: 0.45,
          ninjaPacResult: { ran: true, failures: [{ ruleId: 'r1', description: 'd' }, { ruleId: 'r2', description: 'd' }] },
        }),
      ],
      nextCursor: null,
    });
    mockService.getExternalPacReport.mockResolvedValue({
      id: 'pac-1', trialId: 'trial-1', s3Key: 'k', originalFileName: 'report.pdf', mimeType: 'application/pdf',
      size: 100, pass: 10, fail: 2, untested: 1, humanRequired: 0, notApplicable: 0,
      uploadedById: 'op-1', createdAt: '2026-08-01T10:05:00Z',
    });

    renderPage();

    expect(await screen.findByText('4m 32s')).toBeInTheDocument();
    expect(screen.getByText('$1.23')).toBeInTheDocument();
    expect(screen.getByText('~$0.45')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(await screen.findByText('Attached')).toBeInTheDocument();
  });

  it('shows dashes for time-to-convergence/AWS cost/PAC failures and no attachment badge text when the underlying data is absent', async () => {
    mockService.listTrials.mockResolvedValue({
      trials: [mockTrial({ autoStartedAt: null, autoStoppedAt: null, ninjaGpuCostUsd: null, ninjaPacResult: null })],
      nextCursor: null,
    });

    renderPage();

    await screen.findByText('sample.pdf');
    const row = screen.getByText('sample.pdf').closest('tr')!;
    expect(within(row).getAllByText('--').length).toBeGreaterThanOrEqual(3);
    expect(await within(row).findByText('—')).toBeInTheDocument();
  });

  it('shows an empty state when there are no trials', async () => {
    mockService.listTrials.mockResolvedValue({ trials: [], nextCursor: null });

    renderPage();

    expect(await screen.findByText('No trials registered yet')).toBeInTheDocument();
  });

  it('uploads via the presigned-URL flow then registers and navigates to the trial workspace', async () => {
    mockService.listTrials.mockResolvedValue({ trials: [], nextCursor: null });
    mockUpload.mockResolvedValue('uploads/new.pdf');
    mockService.registerTrial.mockResolvedValue(mockTrial({ id: 'trial-new', sourceFileName: 'new.pdf' }));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Register Trial' }));

    const dialog = screen.getByRole('dialog');
    const file = new File(['%PDF-1.4'], 'new.pdf', { type: 'application/pdf' });
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Register Trial' }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file);
    });
    expect(mockService.registerTrial).toHaveBeenCalledWith({
      sourceFileName: 'new.pdf',
      sourceS3Key: 'uploads/new.pdf',
      contentType: 'text-dominant',
    });
    expect(await screen.findByText('Workspace page')).toBeInTheDocument();
  });
});
