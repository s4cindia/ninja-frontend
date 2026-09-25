import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonTrialReportPage from './ComparisonTrialReportPage';
import { comparisonStudyService, uploadExternalPacReportFile } from '@/services/comparisonStudy.service';
import type { TrialReport, ComparisonTrialWithJob, ExternalPacReport } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');

const mockService = vi.mocked(comparisonStudyService);
const mockUploadFile = vi.mocked(uploadExternalPacReportFile);

const mockTrial = (overrides?: Partial<ComparisonTrialWithJob>): ComparisonTrialWithJob => ({
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
  status: 'validated',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  mode: 'auto',
  autoMaxRounds: 10,
  autoCostLimitUsd: 2,
  autoRoundsCompleted: 3,
  autoCostSpentUsd: 0,
  autoStatus: 'stopped',
  autoStopReason: 'converged',
  autoColorContrastMode: null,
  autoStartedAt: null,
  autoStoppedAt: null,
  job: null,
  ...overrides,
});

const mockPacReport = (overrides?: Partial<ExternalPacReport>): ExternalPacReport => ({
  id: 'pac-1',
  trialId: 'trial-1',
  s3Key: 'key',
  originalFileName: 'real-pac-report.pdf',
  mimeType: 'application/pdf',
  size: 12345,
  pass: 20,
  fail: 3,
  untested: 1,
  humanRequired: 0,
  notApplicable: 2,
  uploadedById: 'op-1',
  createdAt: '2026-08-01T11:00:00Z',
  downloadUrl: 'https://s3.example/presigned-get',
  ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/comparison-study/trials/trial-1/report']}>
        <Routes>
          <Route path="/comparison-study/trials/:id/report" element={<ComparisonTrialReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ComparisonTrialReportPage', () => {
  beforeEach(() => {
    mockService.getTrialReport.mockReset();
    mockService.getTrial.mockReset().mockResolvedValue(mockTrial());
    mockService.getExternalPacReport.mockReset().mockResolvedValue(null);
    mockService.confirmExternalPacReportUpload.mockReset();
    mockService.deleteExternalPacReport.mockReset();
    mockUploadFile.mockReset();
  });

  it('renders all four Ninja-vs-pdfxt metric tiles with real data', async () => {
    const report: TrialReport = {
      trialId: 'trial-1',
      sourceFileName: 'sample.pdf',
      contentType: 'text-dominant',
      pageCount: 42,
      ninja: { activeMs: 90000, costUsd: 1.23, pacFailureCount: 2, pagesPerHour: 28 },
      pdfxt: { timeMs: 300000, costUsd: 4.56, pacFailureCount: 5, pagesPerHour: 8.4 },
    };
    mockService.getTrialReport.mockResolvedValue(report);

    renderPage();

    expect(await screen.findByText(/Trial Report — sample.pdf/)).toBeInTheDocument();
    expect(screen.getByText('90.0s')).toBeInTheDocument();
    expect(screen.getByText('300.0s')).toBeInTheDocument();
    expect(screen.getByText('$1.23')).toBeInTheDocument();
    expect(screen.getByText('$4.56')).toBeInTheDocument();
  });

  it('does not crash when every numeric field is null (report generated before validation)', async () => {
    const report: TrialReport = {
      trialId: 'trial-1',
      sourceFileName: 'sample.pdf',
      contentType: 'text-dominant',
      pageCount: null,
      ninja: { activeMs: null, costUsd: null, pacFailureCount: null, pagesPerHour: null },
      pdfxt: { timeMs: null, costUsd: null, pacFailureCount: null, pagesPerHour: null },
    };
    mockService.getTrialReport.mockResolvedValue(report);

    renderPage();

    expect(await screen.findByText(/Trial Report — sample.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/page count unknown/)).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });

  it('shows a fallback message for the comparison grid, but still renders the trial-level tiles and External PAC Report card, when no report exists yet (regression: the whole page used to bail out instead of degrading)', async () => {
    mockService.getTrial.mockResolvedValue(mockTrial({
      autoStartedAt: '2026-08-01T10:00:00Z',
      autoStoppedAt: '2026-08-01T10:04:32Z',
      autoCostSpentUsd: 1.5,
      ninjaGpuCostUsd: 0.3,
    }));
    mockService.getTrialReport.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText(/No comparison report available yet/)).toBeInTheDocument();
    expect(screen.getByText(/Trial Report — sample.pdf/)).toBeInTheDocument();
    expect(screen.getByText('4m 32s')).toBeInTheDocument();
    expect(screen.getByText('$1.50')).toBeInTheDocument();
    expect(screen.getByText('~$0.30')).toBeInTheDocument();
    expect(screen.getByText('External PAC Report')).toBeInTheDocument();
  });

  it('shows "Trial not found" instead of crashing when the trial itself does not exist', async () => {
    mockService.getTrial.mockRejectedValue(new Error('404'));
    mockService.getTrialReport.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText('Trial not found.')).toBeInTheDocument();
  });

  describe('Time to Convergence / AI cost / AWS cost tiles', () => {
    it('shows dashes when auto mode has never run', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ autoStartedAt: null, autoStoppedAt: null, autoCostSpentUsd: 0, ninjaGpuCostUsd: null }));
      mockService.getTrialReport.mockRejectedValue(new Error('404'));

      renderPage();

      await screen.findByText('External PAC Report');
      expect(screen.getByText('Time to Convergence').closest('div')).toHaveTextContent('--');
      expect(screen.getByText('AWS Cost (Est.)').closest('div')).toHaveTextContent('--');
    });
  });

  describe('External PAC Report card', () => {
    it('shows the summary counts and filename when a report is already attached, with no upload form', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
      mockService.getExternalPacReport.mockResolvedValue(mockPacReport());

      renderPage();

      expect(await screen.findByText('real-pac-report.pdf')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // pass
      expect(screen.getByText('3')).toBeInTheDocument(); // fail
      expect(screen.queryByText('Upload PAC Report')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', 'https://s3.example/presigned-get');
    });

    it('uploads the file then confirms with the hand-typed summary counts (presign + S3 PUT mechanics are covered in comparisonStudy.service.test.ts)', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
      mockUploadFile.mockResolvedValue(undefined);
      mockService.confirmExternalPacReportUpload.mockResolvedValue(mockPacReport());

      renderPage();

      const file = new File(['%PDF-1.4'], 'export.pdf', { type: 'application/pdf' });
      fireEvent.change(await screen.findByLabelText('PAC Report File'), { target: { files: [file] } });
      fireEvent.change(screen.getByLabelText('Pass'), { target: { value: '20' } });
      fireEvent.change(screen.getByLabelText('Fail'), { target: { value: '3' } });

      fireEvent.click(screen.getByRole('button', { name: 'Upload PAC Report' }));

      await waitFor(() => {
        expect(mockUploadFile).toHaveBeenCalledWith('trial-1', file);
      });
      await waitFor(() => {
        expect(mockService.confirmExternalPacReportUpload).toHaveBeenCalledWith('trial-1', {
          originalFileName: 'export.pdf',
          mimeType: 'application/pdf',
          summary: { pass: 20, fail: 3 },
        });
      });
    });

    it('shows an error and does not call confirm when no file is chosen', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Upload PAC Report' }));

      expect(await screen.findByText('Choose a PAC report file first.')).toBeInTheDocument();
      expect(mockService.getExternalPacReportUploadUrl).not.toHaveBeenCalled();
    });

    it('removes an attached report via the Remove link', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
      mockService.getExternalPacReport.mockResolvedValue(mockPacReport());
      mockService.deleteExternalPacReport.mockResolvedValue({ success: true });

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));

      await waitFor(() => {
        expect(mockService.deleteExternalPacReport).toHaveBeenCalledWith('trial-1');
      });
    });
  });
});
