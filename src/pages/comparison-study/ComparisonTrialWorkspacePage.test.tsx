import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonTrialWorkspacePage from './ComparisonTrialWorkspacePage';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import { useJobPolling } from '@/hooks/useJobPolling';
import type { ComparisonTrialWithJob } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');
vi.mock('@/hooks/useJobPolling');
vi.mock('@/components/pdf/PdfJobProgressPanel', () => ({
  PdfJobProgressPanel: ({ progress }: { progress: number }) => (
    <div data-testid="progress-panel">progress:{progress}</div>
  ),
}));

const mockService = vi.mocked(comparisonStudyService);
const mockUseJobPolling = vi.mocked(useJobPolling);
const mockStartPolling = vi.fn();

function stubJobPolling(status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null, progress = 0) {
  mockUseJobPolling.mockReturnValue({
    status,
    data: status ? { id: 'job-42', status, type: 'PDF_ACCESSIBILITY', progress } : null,
    error: null,
    isLoading: false,
    isPolling: status === 'QUEUED' || status === 'PROCESSING',
    startPolling: mockStartPolling,
    stopPolling: vi.fn(),
  });
}

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
  mode: 'manual',
  autoMaxRounds: 10,
  autoCostLimitUsd: 2,
  autoRoundsCompleted: 0,
  autoCostSpentUsd: 0,
  autoStatus: null,
  autoStopReason: null,
  job: null,
  ...overrides,
});

function buildTree(queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/comparison-study/trials/trial-1']}>
        <Routes>
          <Route path="/comparison-study/trials/:id" element={<ComparisonTrialWorkspacePage />} />
          <Route path="/pdf/audit/:jobId" element={<div>Audit page</div>} />
          <Route path="/comparison-study/trials/:id/report" element={<div>Report page</div>} />
          <Route path="/comparison-study" element={<div>Console page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(buildTree(queryClient));
  return {
    ...result,
    rerenderPage: () => result.rerender(buildTree(queryClient)),
  };
}

describe('ComparisonTrialWorkspacePage', () => {
  beforeEach(() => {
    mockService.getTrial.mockReset();
    mockService.logPdfxtData.mockReset();
    mockService.validateTrial.mockReset();
    mockService.getUploadUrl.mockReset();
    mockService.deleteTrial.mockReset();
    mockService.updateAutoModeConfig.mockReset();
    mockStartPolling.mockReset();
    stubJobPolling(null);
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

  it('labels the button "View Ninja Results" once the Ninja job is already COMPLETED, and still navigates to the results page (regression: label used to always say "Start")', async () => {
    mockService.getTrial.mockResolvedValue(
      mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'COMPLETED', output: {} } })
    );

    renderPage();

    const button = await screen.findByRole('button', { name: 'View Ninja Results' });
    expect(screen.queryByRole('button', { name: 'Start Ninja Remediation' })).not.toBeInTheDocument();
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

  describe('Delete Trial', () => {
    it('opens a confirmation dialog without calling the delete mutation', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial());

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Delete Trial' }));

      expect(await screen.findByText(/permanently removes the trial from Comparison Study/)).toBeInTheDocument();
      expect(mockService.deleteTrial).not.toHaveBeenCalled();
    });

    it('canceling closes the dialog without calling the delete mutation', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial());

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Delete Trial' }));
      await screen.findByText(/permanently removes the trial from Comparison Study/);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByText(/permanently removes the trial from Comparison Study/)).not.toBeInTheDocument();
      });
      expect(mockService.deleteTrial).not.toHaveBeenCalled();
    });

    it('confirming calls the delete mutation and navigates to /comparison-study on success', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial());
      mockService.deleteTrial.mockResolvedValue({ id: 'trial-1' });

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Delete Trial' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Trial' }));

      await waitFor(() => {
        expect(mockService.deleteTrial).toHaveBeenCalledWith('trial-1');
      });
      expect(await screen.findByText('Console page')).toBeInTheDocument();
    });

    it('shows an inline error and keeps the dialog open on failure', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial());
      mockService.deleteTrial.mockRejectedValue(new Error('500'));

      renderPage();

      fireEvent.click(await screen.findByRole('button', { name: 'Delete Trial' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Trial' }));

      expect(await screen.findByText('Failed to delete trial — please retry.')).toBeInTheDocument();
      expect(screen.getByText(/permanently removes the trial from Comparison Study/)).toBeInTheDocument();
    });
  });

  describe('Ninja job progress panel', () => {
    it('starts polling the Ninja job once ninjaJobId is set and the job is not yet terminal', async () => {
      mockService.getTrial.mockResolvedValue(
        mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'PROCESSING', output: {} } })
      );

      renderPage();

      await screen.findByRole('button', { name: 'Start Ninja Remediation' });
      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalledWith('job-42');
      });
    });

    it('does not start polling when ninjaJobId is not yet set', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ ninjaJobId: null, job: null }));

      renderPage();

      await screen.findByRole('button', { name: 'Start Ninja Remediation' });
      expect(mockStartPolling).not.toHaveBeenCalled();
    });

    it('does not start polling when the Ninja job is already COMPLETED on load', async () => {
      mockService.getTrial.mockResolvedValue(
        mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'COMPLETED', output: {} } })
      );

      renderPage();

      await screen.findByRole('button', { name: 'View Ninja Results' });
      expect(mockStartPolling).not.toHaveBeenCalled();
    });

    it('does not start polling when the Ninja job is already FAILED on load', async () => {
      mockService.getTrial.mockResolvedValue(
        mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'FAILED', output: {} } })
      );

      renderPage();

      await screen.findByRole('button', { name: 'Start Ninja Remediation' });
      expect(mockStartPolling).not.toHaveBeenCalled();
    });

    it('renders the progress panel while the polled status is QUEUED or PROCESSING', async () => {
      mockService.getTrial.mockResolvedValue(
        mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'PROCESSING', output: {} } })
      );
      stubJobPolling('PROCESSING', 42);

      renderPage();

      expect(await screen.findByTestId('progress-panel')).toHaveTextContent('progress:42');
    });

    it('does not render the progress panel when the polled status is null, COMPLETED, or FAILED', async () => {
      mockService.getTrial.mockResolvedValue(
        mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'PROCESSING', output: {} } })
      );
      stubJobPolling(null);

      renderPage();

      await screen.findByRole('button', { name: 'Start Ninja Remediation' });
      expect(screen.queryByTestId('progress-panel')).not.toBeInTheDocument();
    });

    it('refetches the trial once the polled Ninja job status reaches COMPLETED, flipping the button label promptly', async () => {
      mockService.getTrial
        .mockResolvedValueOnce(
          mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'PROCESSING', output: {} } })
        )
        .mockResolvedValue(
          mockTrial({ ninjaJobId: 'job-42', job: { id: 'job-42', status: 'COMPLETED', output: {} } })
        );
      stubJobPolling('PROCESSING', 50);

      const { rerenderPage } = renderPage();

      await screen.findByRole('button', { name: 'Start Ninja Remediation' });
      expect(mockService.getTrial).toHaveBeenCalledTimes(1);

      // Simulate the poll picking up a COMPLETED status on a later tick.
      stubJobPolling('COMPLETED', 100);
      rerenderPage();

      await waitFor(() => {
        expect(mockService.getTrial).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByRole('button', { name: 'View Ninja Results' })).toBeInTheDocument();
    });
  });

  describe('Auto Remediation Mode config', () => {
    it('defaults the number inputs to the trial\'s current autoMaxRounds/autoCostLimitUsd and only shows them once Auto is selected', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ mode: 'manual', autoMaxRounds: 5, autoCostLimitUsd: 1.5 }));
      renderPage();

      await screen.findByRole('radio', { name: 'Manual' });
      expect(screen.queryByLabelText('Max rounds')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: 'Auto' }));

      expect(screen.getByLabelText('Max rounds')).toHaveValue(5);
      expect(screen.getByLabelText('Cost limit (USD)')).toHaveValue(1.5);
    });

    it('saves mode + rounds + cost limit via updateAutoModeConfig', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ mode: 'manual' }));
      mockService.updateAutoModeConfig.mockResolvedValue(mockTrial({ mode: 'auto' }));
      renderPage();

      fireEvent.click(await screen.findByRole('radio', { name: 'Auto' }));
      fireEvent.change(screen.getByLabelText('Max rounds'), { target: { value: '8' } });
      fireEvent.change(screen.getByLabelText('Cost limit (USD)'), { target: { value: '3.5' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockService.updateAutoModeConfig).toHaveBeenCalledWith('trial-1', {
          mode: 'auto',
          autoMaxRounds: 8,
          autoCostLimitUsd: 3.5,
        });
      });
      expect(await screen.findByText('Saved.')).toBeInTheDocument();
    });

    it('disables the mode radios and Save button while a run is actively in progress', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ mode: 'auto', autoStatus: 'running' }));
      renderPage();

      expect(await screen.findByRole('radio', { name: 'Manual' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Auto' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('regression: surfaces the real 409 message from a save that was rejected server-side (e.g. a run started between page load and clicking Save), instead of a generic failure', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ mode: 'manual', autoStatus: null }));
      mockService.updateAutoModeConfig.mockRejectedValue({
        isAxiosError: true,
        response: { status: 409, data: { error: { message: 'Stop the current run before changing mode.' } } },
      });
      renderPage();

      fireEvent.click(await screen.findByRole('radio', { name: 'Auto' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Stop the current run before changing mode.')).toBeInTheDocument();
    });

    it('validates max rounds and cost limit are positive numbers before calling the API', async () => {
      mockService.getTrial.mockResolvedValue(mockTrial({ mode: 'manual' }));
      renderPage();

      fireEvent.click(await screen.findByRole('radio', { name: 'Auto' }));
      fireEvent.change(screen.getByLabelText('Max rounds'), { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText(/max rounds must be a positive number/i)).toBeInTheDocument();
      expect(mockService.updateAutoModeConfig).not.toHaveBeenCalled();
    });
  });
});
