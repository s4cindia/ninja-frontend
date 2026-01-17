import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { IssuesTable } from '../IssuesTable';

expect.extend(toHaveNoViolations);

const mockIssues = [
  {
    id: '1',
    code: 'EPUB-IMG-001',
    severity: 'critical' as const,
    description: 'Missing alt text',
    location: 'chapter1.xhtml',
    autoFixable: true,
  },
  {
    id: '2',
    code: 'EPUB-STRUCT-002',
    severity: 'minor' as const,
    description: 'Heading skip',
    location: 'chapter2.xhtml',
    autoFixable: false,
  },
  {
    id: '3',
    code: 'EPUB-NAV-003',
    severity: 'serious' as const,
    description: 'Alpha navigation issue',
    location: 'nav.xhtml',
    autoFixable: true,
  },
];

describe('IssuesTable', () => {
  it('renders table headers', () => {
    render(<IssuesTable issues={mockIssues} />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('renders issue rows', () => {
    render(<IssuesTable issues={mockIssues} />);
    expect(screen.getByText('Missing alt text')).toBeInTheDocument();
    expect(screen.getByText('Heading skip')).toBeInTheDocument();
  });

  it('shows empty state when no issues', () => {
    render(<IssuesTable issues={[]} />);
    expect(screen.getByText(/no issues found/i)).toBeInTheDocument();
  });

  it('filters by severity', async () => {
    render(<IssuesTable issues={mockIssues} />);
    const filter = screen.getByRole('combobox');
    fireEvent.change(filter, { target: { value: 'serious' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha navigation issue')).toBeInTheDocument();
      expect(screen.queryByText('Missing alt text')).not.toBeInTheDocument();
      expect(screen.queryByText('Heading skip')).not.toBeInTheDocument();
    });
  });

  it('uses standard table below virtualization threshold', () => {
    const fewIssues = Array(10).fill(null).map((_, i) => ({
      ...mockIssues[0],
      id: String(i),
    }));
    const { container } = render(<IssuesTable issues={fewIssues} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('switches to virtualized list above threshold (50+ items)', () => {
    const manyIssues = Array(51).fill(null).map((_, i) => ({
      ...mockIssues[0],
      id: String(i),
    }));
    const { container } = render(<IssuesTable issues={manyIssues} />);
    expect(container.querySelector('table')).not.toBeInTheDocument();
  });

  describe('Sorting Integration', () => {
    it('sorts by severity when clicking severity header', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      const severityButton = screen.getByRole('button', { name: /severity/i });
      await user.click(severityButton);
      
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('toggles sort order on repeated clicks', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      const severityButton = screen.getByRole('button', { name: /severity/i });
      
      await user.click(severityButton);
      const firstHeader = screen.getAllByRole('columnheader')[0];
      expect(firstHeader).toHaveAttribute('aria-sort', 'descending');
      
      await user.click(severityButton);
      expect(firstHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('sorts by description column', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      const descButton = screen.getByRole('button', { name: /description/i });
      await user.click(descButton);
      
      const descHeader = screen.getAllByRole('columnheader')[1];
      expect(descHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('sorts by location column', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      const locButton = screen.getByRole('button', { name: /location/i });
      await user.click(locButton);
      
      const locHeader = screen.getAllByRole('columnheader')[2];
      expect(locHeader).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('Keyboard Navigation', () => {
    it('allows keyboard focus on sort buttons', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      await user.tab();
      await user.tab();
      
      expect(document.activeElement?.textContent).toContain('Severity');
    });

    it('activates sort via Enter key', async () => {
      const user = userEvent.setup();
      render(<IssuesTable issues={mockIssues} />);
      
      const severityButton = screen.getByRole('button', { name: /severity/i });
      severityButton.focus();
      await user.keyboard('{Enter}');
      
      const firstHeader = screen.getAllByRole('columnheader')[0];
      expect(firstHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('filter dropdown is keyboard accessible', () => {
      render(<IssuesTable issues={mockIssues} />);
      
      const filter = screen.getByRole('combobox');
      filter.focus();
      expect(document.activeElement).toBe(filter);
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<IssuesTable issues={mockIssues} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('empty state has no accessibility violations', async () => {
      const { container } = render(<IssuesTable issues={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels on filter', () => {
      render(<IssuesTable issues={mockIssues} />);
      const filter = screen.getByRole('combobox');
      expect(filter).toHaveAttribute('aria-label', 'Filter issues by severity level');
    });

    it('has table caption for screen readers', () => {
      render(<IssuesTable issues={mockIssues} />);
      expect(screen.getByText(/accessibility issues found in document/i)).toBeInTheDocument();
    });

    it('announces filter changes via aria-live', () => {
      render(<IssuesTable issues={mockIssues} />);
      const heading = screen.getByRole('heading', { name: /issues/i });
      expect(heading).toHaveAttribute('aria-live', 'polite');
    });
  });
});
