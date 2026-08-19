import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonTrialWorkspacePage from './ComparisonTrialWorkspacePage';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { ComparisonTrialWithJob } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');

const mockService = vi.mocked(comparisonStudyService);

const mockTrial = (overrides?: Partial<ComparisonTrialWithJob>): ComparisonTrialWithJob => ({
  id: 'trial-1',
  sourceFileName: 'sample.pdf',
  sourceS3Path: 's3://bucket/sample.pdf',
  contentType: 'text-dominant',
  operatorId: 'op-1',
  ninjaJobId: null,
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
  job: null,
  ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/comparison-study/trials/trial-1']}>
        <Routes>
          <Route path="/comparison-study/trials/:id" element={<ComparisonTrialWorkspacePage />} />
          <Route path="/pdf/audit/:jobId" element={<div>Audit page</div>} />
          <Route path="/comparison-study/trials/:id/report" element={<div>Report page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ComparisonTrialWorkspacePage', () => {
  beforeEach(() => {
    mockService.getTrial.mockReset();
    mockService.logPdfxtData.mockReset();
    mockService.validateTrial.mockReset();
    mockService.getUploadUrl.mockReset();
    global.fetch = vi.fn();
  });

  it('disables Start Ninja Remediation until ninjaJobId is set', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({ ninjaJobId: null }));

    renderPage();

    const button = await screen.findByRole('button', { name: 'Start Ninja Remediation' });
    expect(button).toBeDisabled();
  });

  it('navigates to the audit page with the comparisonTrialId query param once ninjaJobId is set', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({ ninjaJobId: 'job-42' }));

    renderPage();

    const button = await screen.findByRole('button', { name: 'Start Ninja Remediation' });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    expect(await screen.findByText('Audit page')).toBeInTheDocument();
  });

  it('disables Run Validation while pdfxt data has not been logged yet', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({ status: 'registered' }));

    renderPage();

    const button = await screen.findByRole('button', { name: 'Run Validation' });
    expect(button).toBeDisabled();
  });

  it('saves pdfxt data (parsing mm:ss into ms) without a file, then enables validation once logged', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({ status: 'registered' }));
    mockService.logPdfxtData.mockResolvedValue(mockTrial({ status: 'pdfxt_logged', pdfxtTimeMs: 272000 }));

    renderPage();

    await screen.findByRole('button', { name: 'Run Validation' });

    fireEvent.change(screen.getByPlaceholderText('e.g. 4:32 or 272'), { target: { value: '4:32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save pdfxt Data' }));

    await waitFor(() => {
      expect(mockService.logPdfxtData).toHaveBeenCalledWith('trial-1', { pdfxtTimeMs: 272000 });
    });
    expect(mockService.getUploadUrl).not.toHaveBeenCalled();
  });

  it('shows the report link once a trial is validated', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({ status: 'validated' }));

    renderPage();

    fireEvent.click(await screen.findByRole('link', { name: /View Report/ }));

    expect(await screen.findByText('Report page')).toBeInTheDocument();
  });

  it('shows a not-found state for a missing trial without crashing', async () => {
    mockService.getTrial.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText('Trial not found.')).toBeInTheDocument();
  });
});
