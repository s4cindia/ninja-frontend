import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PdfBatchStatusSummary } from './PdfBatchStatusSummary';
import type { PdfBatchDetail } from '@/types/pdfBatch.types';

function batch(overrides?: Partial<PdfBatchDetail>): PdfBatchDetail {
  return {
    batchId: 'b1',
    name: 'Batch 1',
    status: 'PROCESSING',
    totalFiles: 5,
    statusCounts: {},
    createdAt: '2026-10-01T11:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('PdfBatchStatusSummary', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a live elapsed timer anchored on startedAt while active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:10.000Z'));

    render(<PdfBatchStatusSummary batch={batch({ status: 'PROCESSING', startedAt: '2026-10-01T12:00:00.000Z' })} />);

    expect(screen.getByTestId('pdf-batch-elapsed')).toHaveTextContent('10s');
  });

  it('ticks the elapsed timer forward', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

    render(<PdfBatchStatusSummary batch={batch({ status: 'QUEUED', startedAt: '2026-10-01T12:00:00.000Z' })} />);
    expect(screen.getByTestId('pdf-batch-elapsed')).toHaveTextContent('0s');

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('pdf-batch-elapsed')).toHaveTextContent('4s');
  });

  it('does not show an elapsed timer for a terminal batch', () => {
    render(<PdfBatchStatusSummary batch={batch({ status: 'COMPLETED', startedAt: '2026-10-01T12:00:00.000Z', completedAt: '2026-10-01T12:30:00.000Z' })} />);

    expect(screen.queryByTestId('pdf-batch-elapsed')).not.toBeInTheDocument();
  });

  it('does not show the long-running explanatory copy for a terminal batch', () => {
    render(<PdfBatchStatusSummary batch={batch({ status: 'COMPLETED' })} />);
    expect(screen.queryByText(/can legitimately take hours/)).not.toBeInTheDocument();
  });

  it('breaks down non-zero status counts, including the budget-wait states', () => {
    render(<PdfBatchStatusSummary batch={batch({
      statusCounts: { AUDITING: 2, QUEUED_FOR_BUDGET: 3, REMEDIATED: 1, FAILED: 0 },
    })} />);

    expect(screen.getByText('Auditing')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Queued for audit')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Remediated')).toBeInTheDocument();
    // FAILED is 0, so its label should not render at all.
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });
});
