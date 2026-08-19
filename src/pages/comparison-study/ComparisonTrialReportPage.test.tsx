import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonTrialReportPage from './ComparisonTrialReportPage';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { TrialReport } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');

const mockService = vi.mocked(comparisonStudyService);

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
  });

  it('renders all four metric tiles with real data', async () => {
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

  it('shows a fallback state instead of crashing when no report exists yet', async () => {
    mockService.getTrialReport.mockRejectedValue(new Error('404'));

    renderPage();

    expect(await screen.findByText(/No report available yet/)).toBeInTheDocument();
  });
});
