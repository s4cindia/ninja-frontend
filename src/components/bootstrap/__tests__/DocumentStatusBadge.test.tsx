import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentStatusBadge } from '../DocumentStatusBadge';

describe('DocumentStatusBadge', () => {
  it('renders "Pending" for PENDING status', () => {
    render(<DocumentStatusBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders "In Progress" for IN_PROGRESS status', () => {
    render(<DocumentStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders "Needs Review" for NEEDS_REVIEW status', () => {
    render(<DocumentStatusBadge status="NEEDS_REVIEW" />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('renders "Complete" for COMPLETE status', () => {
    render(<DocumentStatusBadge status="COMPLETE" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('has role="status" on the element', () => {
    render(<DocumentStatusBadge status="PENDING" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label containing the status label', () => {
    render(<DocumentStatusBadge status="NEEDS_REVIEW" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Status: Needs Review');
  });
});
