import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonTrialReportPage from './ComparisonTrialReportPage';
import { comparisonStudyService, uploadExternalPacReportFile } from '@/services/comparisonStudy.service';
import type { TrialReport, ComparisonTrialWithJob, ExternalPacReport, ManualFixItem } from '@/types/comparisonStudy.types';

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
  taggerSource: null,
  autoTagStatus: null,
  aiFixesAppliedCount: 0,
  manualFixesRequiredCount: 0,
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

const mockManualFixItem = (overrides?: Partial<ManualFixItem>): ManualFixItem => ({
  id: 'fix-1',
  code: 'MATTERHORN-13-001',
  message: 'Image is missing alternative text.',
  wcagCriteria: ['1.1.1'],
  location: '/Document/Page[3]/Figure[1]',
  pageNumber: 3,
  matterhornCheckpoint: '13',
  suggestionType: 'alt-text',
  guidance: 'Add a concise, descriptive alt attribute to this figure.',
  rationale: 'The AI could not confidently generate alt text for this decorative-looking image.',
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

/**
 * Matches App.tsx's real global staleTime (5 minutes) — renderPage()'s
 * QueryClient omits it, which is effectively React Query's own default of
 * 0 and would make any query, including useManualFixes, look "always
 * fresh" regardless of whether it sets its own staleTime: 0 override. Only
 * this variant actually isolates that override.
 */
function renderPageWithAppStaleTime() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } });
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
    mockService.getManualFixes.mockReset();
    mockUploadFile.mockReset();
  });

  it('renders all four Ninja-vs-pdfxt metric tiles with real data', async () => {
    const report: TrialReport = {
      trialId: 'trial-1',
      sourceFileName: 'sample.pdf',
      contentType: 'text-dominant',
      pageCount: 42,
      ninja: {
        activeMs: 90000, costUsd: 1.23, pacFailureCount: 2, pagesPerHour: 28,
        taggerSource: 'seam-c', autoTagStatus: 'complete', aiFixesAppliedCount: 4, manualFixesRequiredCount: 1,
      },
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
      ninja: {
        activeMs: null, costUsd: null, pacFailureCount: null, pagesPerHour: null,
        taggerSource: null, autoTagStatus: null, aiFixesAppliedCount: 0, manualFixesRequiredCount: 0,
      },
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

  it('regression (Codex finding on PR #335): renders the trial header, cost/convergence tiles, and External PAC Report card while the comparison report is still loading, instead of blocking the whole page behind it', async () => {
    mockService.getTrialReport.mockImplementation(() => new Promise(() => {})); // never resolves

    renderPage();

    expect(await screen.findByText(/Trial Report — sample.pdf/)).toBeInTheDocument();
    expect(screen.getByText('Time to Convergence')).toBeInTheDocument();
    expect(screen.getByText('External PAC Report')).toBeInTheDocument();
    // The comparison-report section itself shows its own loading indicator.
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
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
      // Mirrors a real backend: the initial load has nothing attached, and
      // the invalidate-triggered refetch after a successful upload reflects
      // the newly created report — a static mock here would mask whether
      // the immediate setQueryData seed (asserted below) actually matters.
      mockService.getExternalPacReport.mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockPacReport());

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
      // regression (CodeRabbit finding on PR #335): the upload form must
      // disappear immediately, not just after a later invalidated refetch —
      // otherwise it stays visible long enough to invite a double-submit.
      expect(await screen.findByText('real-pac-report.pdf')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Upload PAC Report' })).not.toBeInTheDocument();
    });

    it('regression (CodeRabbit finding on PR #335): rejects a non-integer or negative summary count instead of silently sending it', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));

      renderPage();

      const file = new File(['%PDF-1.4'], 'export.pdf', { type: 'application/pdf' });
      fireEvent.change(await screen.findByLabelText('PAC Report File'), { target: { files: [file] } });
      fireEvent.change(screen.getByLabelText('Pass'), { target: { value: '1.5' } });

      fireEvent.click(screen.getByRole('button', { name: 'Upload PAC Report' }));

      expect(await screen.findByText('Pass must be a whole number of 0 or more.')).toBeInTheDocument();
      expect(mockService.confirmExternalPacReportUpload).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();
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
      mockService.deleteExternalPacReport.mockResolvedValue({ success: true });
      // Mirrors a real backend: the initial load has the report attached,
      // and the invalidate-triggered refetch after a successful delete
      // reflects the removal — a static mock here would mask whether the
      // immediate setQueryData(null) seed (asserted below) actually matters.
      mockService.getExternalPacReport.mockReset()
        .mockResolvedValueOnce(mockPacReport())
        .mockResolvedValue(null);

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));

      await waitFor(() => {
        expect(mockService.deleteExternalPacReport).toHaveBeenCalledWith('trial-1');
      });
      // regression (CodeRabbit finding on PR #335): the old report must not
      // keep showing until the invalidated query gets around to refetching.
      expect(await screen.findByRole('button', { name: 'Upload PAC Report' })).toBeInTheDocument();
      expect(screen.queryByText('real-pac-report.pdf')).not.toBeInTheDocument();
    });

    it('regression (Codex finding on PR #335): shows a distinct error state with a retry option, not the upload form, when the attachment status fails to load', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
      mockService.getExternalPacReport.mockRejectedValue(new Error('500'));

      renderPage();

      expect(await screen.findByText('Could not load External PAC Report status.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Upload PAC Report' })).not.toBeInTheDocument();

      mockService.getExternalPacReport.mockResolvedValue(mockPacReport());
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('real-pac-report.pdf')).toBeInTheDocument();
    });

    it('regression (Codex finding on PR #335): refetches for a fresh presigned URL before navigating on Download, instead of trusting a URL that may have gone stale', async () => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
      mockService.getExternalPacReport.mockResolvedValueOnce(mockPacReport({ downloadUrl: 'https://s3.example/stale' }));

      renderPage();
      await screen.findByRole('link', { name: 'Download' });

      const freshReport = mockPacReport({ downloadUrl: 'https://s3.example/fresh' });
      mockService.getExternalPacReport.mockResolvedValueOnce(freshReport);
      const getCallsBefore = mockService.getExternalPacReport.mock.calls.length;

      fireEvent.click(screen.getByRole('link', { name: 'Download' }));

      await waitFor(() => {
        expect(mockService.getExternalPacReport.mock.calls.length).toBeGreaterThan(getCallsBefore);
      });
    });
  });

  describe('Tagger / AI Fixes Applied / Manual Fixes Required', () => {
    beforeEach(() => {
      mockService.getTrialReport.mockRejectedValue(new Error('404'));
    });

    it.each([
      ['seam-c' as const, null, 'Seam-C'],
      ['adobe' as const, null, 'Adobe'],
      [null, 'failed' as const, 'Tagging failed'],
      [null, 'skipped' as const, 'Tagging skipped'],
      [null, null, 'Not yet tagged'],
    ])('shows the tagger tile as %s', async (taggerSource, autoTagStatus, expectedLabel) => {
      mockService.getTrial.mockResolvedValue(mockTrial({ taggerSource, autoTagStatus }));

      renderPage();

      expect(await screen.findByText('Tagger')).toBeInTheDocument();
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it('shows the AI Fixes Applied count', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ aiFixesAppliedCount: 7 }));

      renderPage();

      expect(await screen.findByText('AI Fixes Applied')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renders Manual Fixes Required as a plain (non-clickable) tile when the count is zero', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ manualFixesRequiredCount: 0 }));

      renderPage();

      await screen.findByText('Manual Fixes Required');
      expect(screen.queryByRole('button', { name: /Manual Fixes Required/ })).not.toBeInTheDocument();
    });

    it('opens the modal and lazily fetches manual fixes when the count tile is clicked', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ manualFixesRequiredCount: 2 }));
      mockService.getManualFixes.mockResolvedValue({
        items: [
          mockManualFixItem({ id: 'fix-1' }),
          mockManualFixItem({
            id: 'fix-2',
            code: null,
            message: null,
            wcagCriteria: null,
            location: null,
            pageNumber: null,
            matterhornCheckpoint: null,
            guidance: 'Manually verify the reading order for this section.',
            rationale: 'Reading order could not be automatically confirmed.',
          }),
        ],
      });

      renderPage();

      const tile = await screen.findByRole('button', { name: /Manual Fixes Required/ });
      expect(mockService.getManualFixes).not.toHaveBeenCalled();

      fireEvent.click(tile);

      await waitFor(() => {
        expect(mockService.getManualFixes).toHaveBeenCalledWith('trial-1');
      });
      expect(await screen.findByText('MATTERHORN-13-001')).toBeInTheDocument();
      expect(screen.getByText('Image is missing alternative text.')).toBeInTheDocument();
      expect(screen.getByText(/Add a concise, descriptive alt attribute/)).toBeInTheDocument();
      // The code/message-less item still renders usefully via guidance/rationale.
      expect(screen.getByText(/Manually verify the reading order/)).toBeInTheDocument();
      expect(screen.getByText(/Reading order could not be automatically confirmed/)).toBeInTheDocument();
    });

    it('shows an error state with retry when the manual-fixes fetch fails', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ manualFixesRequiredCount: 1 }));
      mockService.getManualFixes.mockRejectedValueOnce(new Error('500'));

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: /Manual Fixes Required/ }));

      expect(await screen.findByText('Could not load manual fixes.')).toBeInTheDocument();

      mockService.getManualFixes.mockResolvedValueOnce({ items: [mockManualFixItem()] });
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('MATTERHORN-13-001')).toBeInTheDocument();
    });

    it('regression (Codex finding on PR #336): refetches manual fixes on reopen instead of serving a cached list from before a fix landed', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ manualFixesRequiredCount: 1 }));
      mockService.getManualFixes.mockResolvedValueOnce({ items: [mockManualFixItem({ id: 'fix-old', code: 'OLD-CODE' })] });

      // Uses the app-matching 5-minute staleTime — renderPage()'s QueryClient
      // has no staleTime override at all, which already behaves like
      // staleTime: 0 regardless of what useManualFixes itself sets.
      renderPageWithAppStaleTime();

      const tile = await screen.findByRole('button', { name: /Manual Fixes Required/ });
      fireEvent.click(tile);
      expect(await screen.findByText('OLD-CODE')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(screen.queryByText('OLD-CODE')).not.toBeInTheDocument());

      // The operator remediated the old one — the reopen must not serve the
      // stale cached list (staleTime: 0 forces a real refetch every time).
      mockService.getManualFixes.mockResolvedValueOnce({ items: [mockManualFixItem({ id: 'fix-new', code: 'NEW-CODE' })] });
      fireEvent.click(tile);

      expect(await screen.findByText('NEW-CODE')).toBeInTheDocument();
      expect(screen.queryByText('OLD-CODE')).not.toBeInTheDocument();
      expect(mockService.getManualFixes).toHaveBeenCalledTimes(2);
    });

    it('regression (CodeRabbit finding on PR #336): returns focus to the Manual Fixes Required tile after the modal closes', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ manualFixesRequiredCount: 1 }));
      mockService.getManualFixes.mockResolvedValue({ items: [mockManualFixItem()] });

      renderPage();

      const tile = await screen.findByRole('button', { name: /Manual Fixes Required/ });
      tile.focus();
      fireEvent.click(tile);

      fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

      await waitFor(() => expect(document.activeElement).toBe(tile));
    });
  });

  describe('Ninja metrics prefer the comparison report once it is loaded', () => {
    it("regression (CodeRabbit finding on PR #336): shows report.ninja's counts, not the (potentially stale) trial object's, once the comparison report has loaded", async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ aiFixesAppliedCount: 3, manualFixesRequiredCount: 3 }));
      mockService.getTrialReport.mockResolvedValue({
        trialId: 'trial-1',
        sourceFileName: 'sample.pdf',
        contentType: 'text-dominant',
        pageCount: 10,
        ninja: {
          activeMs: 1000, costUsd: 1, pacFailureCount: 0, pagesPerHour: 10,
          taggerSource: 'seam-c', autoTagStatus: 'complete', aiFixesAppliedCount: 9, manualFixesRequiredCount: 0,
        },
        pdfxt: { timeMs: null, costUsd: null, pacFailureCount: null, pagesPerHour: null },
      });

      renderPage();

      expect(await screen.findByText('AI Fixes Applied')).toBeInTheDocument();
      // 9 (from report.ninja), not 3 (the trial object's own, now-stale value).
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      // manualFixesRequiredCount is 0 in the report, so the tile must not be
      // clickable even though the trial object still says 3.
      expect(screen.queryByRole('button', { name: /Manual Fixes Required/ })).not.toBeInTheDocument();
    });
  });
});
