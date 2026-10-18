import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfBatchItemList } from './PdfBatchItemList';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

// PdfBatchItemProgressDetail has its own dedicated test file -- stub it here
// so these tests stay focused on the list's own expand/collapse wiring and
// gating logic, not that component's polling/rendering behavior.
vi.mock('@/components/pdf-batch/PdfBatchItemProgressDetail', () => ({
  PdfBatchItemProgressDetail: ({ item }: { item: PdfBatchItem }) => (
    <div data-testid="progress-detail">progress-detail:{item.itemId}</div>
  ),
}));

function makeItem(overrides: Partial<PdfBatchItem> = {}): PdfBatchItem {
  return {
    itemId: 'item-1',
    fileName: 'book.pdf',
    originalName: 'book.pdf',
    fileSize: '1024',
    status: 'UPLOADED',
    uploadedAt: '2026-10-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('PdfBatchItemList', () => {
  it('renders a plain (non-expandable) row for an item with no auditJobId', () => {
    render(<PdfBatchItemList items={[makeItem({ status: 'AUDITING', auditJobId: null })]} />);

    expect(screen.getByText('book.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show progress detail/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('progress-detail')).not.toBeInTheDocument();
  });

  it('renders a plain (non-expandable) row for a non-expandable status even with an auditJobId', () => {
    render(<PdfBatchItemList items={[makeItem({ status: 'UPLOADED', auditJobId: 'job-1' })]} />);

    expect(screen.queryByRole('button', { name: /show progress detail/i })).not.toBeInTheDocument();
  });

  it.each(['AUDITING', 'AUDITED', 'HELD_FOR_BUDGET', 'REMEDIATING'] as const)(
    'offers an expand toggle for a %s item with an auditJobId',
    (status) => {
      render(<PdfBatchItemList items={[makeItem({ status, auditJobId: 'job-1' })]} />);

      expect(screen.getByRole('button', { name: /show progress detail/i })).toBeInTheDocument();
    }
  );

  it('expands to show the progress detail on click, and collapses (unmounting it) on a second click', () => {
    render(<PdfBatchItemList items={[makeItem({ status: 'AUDITING', auditJobId: 'job-1' })]} />);

    const toggle = screen.getByRole('button', { name: /show progress detail/i });
    expect(screen.queryByTestId('progress-detail')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId('progress-detail')).toHaveTextContent('progress-detail:item-1');
    expect(screen.getByRole('button', { name: /hide progress detail/i })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /hide progress detail/i }));
    expect(screen.queryByTestId('progress-detail')).not.toBeInTheDocument();
  });

  it('tracks each item\'s expanded state independently', () => {
    render(
      <PdfBatchItemList
        items={[
          makeItem({ itemId: 'item-1', originalName: 'a.pdf', status: 'AUDITING', auditJobId: 'job-1' }),
          makeItem({ itemId: 'item-2', originalName: 'b.pdf', status: 'REMEDIATING', auditJobId: 'job-2' }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /show progress detail for a\.pdf/i }));

    expect(screen.getByText('progress-detail:item-1')).toBeInTheDocument();
    expect(screen.queryByText('progress-detail:item-2')).not.toBeInTheDocument();
  });

  it('still supports remove while DRAFT, independent of expand state', () => {
    const onRemove = vi.fn();
    render(
      <PdfBatchItemList
        items={[makeItem({ status: 'UPLOADED' })]}
        removable
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove book.pdf'));
    expect(onRemove).toHaveBeenCalledWith('item-1');
  });
});
