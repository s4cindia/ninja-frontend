import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SeveritySummary } from '../SeveritySummary';

describe('SeveritySummary', () => {
  const mockSummary = {
    total: 7,
    critical: 1,
    serious: 3,
    moderate: 2,
    minor: 1,
  };

  it('renders all four severity cards', () => {
    render(<SeveritySummary summary={mockSummary} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Serious')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Minor')).toBeInTheDocument();
  });

  it('displays correct counts', () => {
    render(<SeveritySummary summary={mockSummary} />);
    expect(screen.getByTestId('critical-count')).toHaveTextContent('1');
    expect(screen.getByTestId('serious-count')).toHaveTextContent('3');
    expect(screen.getByTestId('moderate-count')).toHaveTextContent('2');
    expect(screen.getByTestId('minor-count')).toHaveTextContent('1');
  });

  it('handles all zeros', () => {
    const zeroSummary = { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 };
    render(<SeveritySummary summary={zeroSummary} />);
    expect(screen.getByTestId('critical-count')).toHaveTextContent('0');
  });
});
