import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ZoneBucketBadge from '../ZoneBucketBadge';

describe('ZoneBucketBadge', () => {
  it('renders "Green" with green classes for GREEN bucket', () => {
    render(<ZoneBucketBadge bucket="GREEN" />);
    const badge = screen.getByText('Green');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
  });

  it('renders "Amber" with amber classes for AMBER bucket', () => {
    render(<ZoneBucketBadge bucket="AMBER" />);
    const badge = screen.getByText('Amber');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-amber-100');
  });

  it('renders "Red" with red classes for RED bucket', () => {
    render(<ZoneBucketBadge bucket="RED" />);
    const badge = screen.getByText('Red');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-red-100');
  });

  it('has aria-label containing the bucket name', () => {
    render(<ZoneBucketBadge bucket="AMBER" />);
    const badge = screen.getByText('Amber');
    expect(badge).toHaveAttribute('aria-label', 'Reconciliation bucket: Amber');
  });

  it('renders with size="md" without error', () => {
    render(<ZoneBucketBadge bucket="GREEN" size="md" />);
    const badge = screen.getByText('Green');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-sm');
  });
});
