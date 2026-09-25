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
  autoStartedAt: null,
  autoStoppedAt: null,
  autoColorContrastMode: null,
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

  it('shows convergence time, AI/AWS costs, PAC failure count, and a PAC-report indicator for a completed auto-mode trial', async () => {
    mockService.listTrials.mockResolvedValue({
      trials: [
        mockTrial({
          mode: 'auto',
          autoStatus: 'stopped',
          autoStartedAt: '2026-08-01T10:00:00Z',
          autoStoppedAt: '2026-08-01T10:04:12Z',
          autoCostSpentUsd: 1.23,
          ninjaGpuCostUsd: 0.42,
          ninjaPacResult: [
            { ruleId: 'r1', description: 'x' },
            { ruleId: 'r2', description: 'y' },
          ],
          hasPacReport: true,
        }),
      ],
      nextCursor: null,
    });

    renderPage();

    await screen.findByText('sample.pdf');
    expect(screen.getByText('4m 12s')).toBeInTheDocument();
    expect(screen.getByText('$1.23')).toBeInTheDocument();
    expect(screen.getByText('$0.42')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByTitle('PAC report uploaded')).toBeInTheDocument();
  });

  it('shows a blank convergence time while a run is still active, and a dash when no PAC report is attached', async () => {
    mockService.listTrials.mockResolvedValue({
      trials: [
        mockTrial({
          mode: 'auto',
          autoStatus: 'running',
          autoStartedAt: '2026-08-01T10:00:00Z',
          autoStoppedAt: null,
          hasPacReport: false,
        }),
      ],
      nextCursor: null,
    });

    renderPage();

    await screen.findByText('sample.pdf');
    expect(screen.queryByTitle('PAC report uploaded')).not.toBeInTheDocument();
    // '--' appears for both convergence time (running) and PAC failures (null ninjaPacResult).
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);
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
