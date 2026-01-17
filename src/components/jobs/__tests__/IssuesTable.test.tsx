import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IssuesTable } from '../IssuesTable';

const mockIssues = [
  {
    id: '1',
    code: 'EPUB-IMG-001',
    severity: 'serious' as const,
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
      expect(screen.getByText('Missing alt text')).toBeInTheDocument();
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
});
