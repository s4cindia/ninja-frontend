import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackList } from './FeedbackList';
import type { FeedbackItem } from '@/types/feedback.types';

function mockItem(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: 'fb-1',
    type: 'BUG_REPORT',
    status: 'NEW',
    comment: 'Download button does nothing',
    createdAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

const baseFilters = { type: 'ALL' as const, status: 'ALL' as const, severity: 'ALL' as const, rating: 'all' as const };

function renderList(items: FeedbackItem[], overrides: Partial<ComponentProps<typeof FeedbackList>> = {}) {
  const onFilterChange = vi.fn();
  render(
    <FeedbackList
      items={items}
      page={1}
      totalPages={1}
      onPageChange={vi.fn()}
      onItemClick={vi.fn()}
      filters={baseFilters}
      onFilterChange={onFilterChange}
      {...overrides}
    />
  );
  return { onFilterChange };
}

describe('FeedbackList -- severity', () => {
  it('shows a severity badge for an item that has one', () => {
    renderList([mockItem({ severity: 'CRITICAL' })]);

    expect(screen.getByText('🔴 Critical')).toBeInTheDocument();
  });

  it('shows a dash for an item with no severity set', () => {
    renderList([mockItem({ severity: undefined })]);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('includes a severity filter dropdown, and changing it reports the new filter', () => {
    const { onFilterChange } = renderList([mockItem()]);

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'HIGH' } });

    expect(onFilterChange).toHaveBeenCalledWith({ ...baseFilters, severity: 'HIGH' });
  });

  it('clearing filters resets severity back to ALL alongside the others', () => {
    const { onFilterChange } = renderList([mockItem()], {
      filters: { ...baseFilters, severity: 'CRITICAL', type: 'BUG_REPORT' },
    });

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(onFilterChange).toHaveBeenCalledWith(baseFilters);
  });
});
