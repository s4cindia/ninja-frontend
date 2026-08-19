import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComparisonAggregateReportPage from './ComparisonAggregateReportPage';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { AggregateReport } from '@/types/comparisonStudy.types';

vi.mock('@/services/comparisonStudy.service');

const mockService = vi.mocked(comparisonStudyService);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/comparison-study/aggregate-report']}>
        <Routes>
          <Route path="/comparison-study/aggregate-report" element={<ComparisonAggregateReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ComparisonAggregateReportPage', () => {
  beforeEach(() => {
    mockService.getAggregateReport.mockReset();
  });

  it('renders the validated-count line, time savings tiles, and speedup with real data', async () => {
    const report: AggregateReport = {
      trialCount: 10,
      validatedCount: 6,
      avgNinjaActiveMs: 90000,
      avgPdfxtTimeMs: 300000,
      estimatedSpeedup: 3.3,
      avgNinjaPacFailures: 1.5,
      avgPdfxtPacFailures: 4.2,
      avgNinjaCostUsd: 1.1,
      avgPdfxtCostUsd: 3.3,
    };
    mockService.getAggregateReport.mockResolvedValue(report);

    renderPage();

    expect(await screen.findByText('6 of 10 trials validated')).toBeInTheDocument();
    expect(screen.getByText('3.3x')).toBeInTheDocument();
    expect(screen.getByText('90.0s')).toBeInTheDocument();
    expect(screen.getByText('300.0s')).toBeInTheDocument();
  });

  it('does not crash when no trials have been validated yet (every average is null)', async () => {
    const report: AggregateReport = {
      trialCount: 3,
      validatedCount: 0,
      avgNinjaActiveMs: null,
      avgPdfxtTimeMs: null,
      estimatedSpeedup: null,
      avgNinjaPacFailures: null,
      avgPdfxtPacFailures: null,
      avgNinjaCostUsd: null,
      avgPdfxtCostUsd: null,
    };
    mockService.getAggregateReport.mockResolvedValue(report);

    renderPage();

    expect(await screen.findByText('0 of 3 trials validated')).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });

  it('shows a fallback state instead of crashing when the request fails', async () => {
    mockService.getAggregateReport.mockRejectedValue(new Error('500'));

    renderPage();

    expect(await screen.findByText('No aggregate data available yet.')).toBeInTheDocument();
  });
});
