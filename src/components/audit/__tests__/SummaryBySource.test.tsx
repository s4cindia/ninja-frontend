import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryBySource, type SummaryBySourceData } from '../SummaryBySource';

const baseSummary: SummaryBySourceData = {
  epubcheck: { critical: 1, serious: 0, moderate: 2, minor: 0, total: 3 },
  ace: { critical: 0, serious: 1, moderate: 0, minor: 1, total: 2 },
  'js-auditor': { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
};

describe('SummaryBySource', () => {
  it('renders the three core source cards even when PRH UK is absent', () => {
    render(<SummaryBySource summaryBySource={baseSummary} />);
    expect(screen.getByText('EPUBCheck')).toBeInTheDocument();
    expect(screen.getByText('ACE')).toBeInTheDocument();
    expect(screen.getByText('JS Auditor')).toBeInTheDocument();
    expect(screen.queryByText('PRH UK')).not.toBeInTheDocument();
  });

  it('does not render the PRH UK card when the bucket has zero total issues', () => {
    render(
      <SummaryBySource
        summaryBySource={{
          ...baseSummary,
          'prh-uk': { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
        }}
      />,
    );
    expect(screen.queryByText('PRH UK')).not.toBeInTheDocument();
  });

  it('renders the PRH UK card when the backend reports non-zero PRH issues', () => {
    render(
      <SummaryBySource
        summaryBySource={{
          ...baseSummary,
          'prh-uk': { critical: 0, serious: 4, moderate: 0, minor: 1, total: 5, autoFixable: 2 },
        }}
      />,
    );
    expect(screen.getByText('PRH UK')).toBeInTheDocument();
    expect(screen.getByText('Publisher-specific Checks')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/2 fixable/)).toBeInTheDocument();
  });

  it('forwards onSourceClick with "prh-uk" when the PRH card is clicked', async () => {
    const handleClick = vi.fn();
    render(
      <SummaryBySource
        summaryBySource={{
          ...baseSummary,
          'prh-uk': { critical: 0, serious: 1, moderate: 0, minor: 0, total: 1 },
        }}
        onSourceClick={handleClick}
      />,
    );
    await userEvent.click(screen.getByText('PRH UK'));
    expect(handleClick).toHaveBeenCalledWith('prh-uk');
  });
});
