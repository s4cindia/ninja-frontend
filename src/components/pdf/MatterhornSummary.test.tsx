import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatterhornSummary } from './MatterhornSummary';
import type { MatterhornSummary as MatterhornSummaryType } from '@/types/pdf.types';

const mockSummary: MatterhornSummaryType = {
  totalCheckpoints: 10,
  passed: 7,
  failed: 2,
  notApplicable: 1,
  categories: [
    {
      id: '01',
      name: 'Document Structure',
      checkpoints: [
        {
          id: '01-001',
          description: 'Content is marked as Artifact',
          status: 'passed',
          issueCount: 0,
        },
        {
          id: '01-002',
          description: 'Real content is tagged',
          status: 'failed',
          issueCount: 3,
        },
        {
          id: '01-003',
          description: 'Meaningful sequence',
          status: 'not-applicable',
          issueCount: 0,
        },
      ],
    },
    {
      id: '06',
      name: 'Headings',
      checkpoints: [
        {
          id: '06-001',
          description: 'Heading levels skip',
          status: 'passed',
          issueCount: 0,
        },
      ],
    },
  ],
};

describe('MatterhornSummary', () => {
  it('renders overall compliance statistics', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getByText('Matterhorn Protocol Compliance')).toBeInTheDocument();
    expect(screen.getAllByText('70%')[0]).toBeInTheDocument(); // 7/10 = 70%
    expect(screen.getByText('10')).toBeInTheDocument(); // Total checkpoints
  });

  it('renders passed, failed, and not applicable counts', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getByText('7')).toBeInTheDocument(); // Passed
    expect(screen.getByText('2')).toBeInTheDocument(); // Failed
    expect(screen.getByText('1')).toBeInTheDocument(); // Not applicable
  });

  it('renders all categories', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getByText('01: Document Structure')).toBeInTheDocument();
    expect(screen.getByText('06: Headings')).toBeInTheDocument();
  });

  it('toggles category expansion when clicked', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    const categoryButton = screen.getByText('01: Document Structure').closest('button');
    expect(categoryButton).toBeInTheDocument();

    // Initially expanded (collapsed=false by default)
    expect(screen.getByText('Content is marked as Artifact')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(categoryButton!);
    expect(screen.queryByText('Content is marked as Artifact')).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(categoryButton!);
    expect(screen.getByText('Content is marked as Artifact')).toBeInTheDocument();
  });

  it('renders checkpoint details when category is expanded', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getByText('01-001')).toBeInTheDocument();
    expect(screen.getByText('Content is marked as Artifact')).toBeInTheDocument();
    expect(screen.getByText('01-002')).toBeInTheDocument();
    expect(screen.getByText('Real content is tagged')).toBeInTheDocument();
  });

  it('displays issue count badge for failed checkpoints', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getAllByText('3 issues')[0]).toBeInTheDocument();
  });

  it('calls onCheckpointClick when checkpoint with issues is clicked', () => {
    const onCheckpointClick = vi.fn();
    render(<MatterhornSummary summary={mockSummary} onCheckpointClick={onCheckpointClick} />);

    const failedCheckpoint = screen.getByText('Real content is tagged').closest('div');
    fireEvent.click(failedCheckpoint!);

    expect(onCheckpointClick).toHaveBeenCalledWith('01-002');
  });

  it('does not call onCheckpointClick for passed checkpoints', () => {
    const onCheckpointClick = vi.fn();
    render(<MatterhornSummary summary={mockSummary} onCheckpointClick={onCheckpointClick} />);

    const passedCheckpoint = screen.getByText('Content is marked as Artifact').closest('div');
    fireEvent.click(passedCheckpoint!);

    expect(onCheckpointClick).not.toHaveBeenCalled();
  });

  it('starts with categories collapsed when collapsed prop is true', () => {
    render(<MatterhornSummary summary={mockSummary} collapsed={true} />);

    expect(screen.queryByText('Content is marked as Artifact')).not.toBeInTheDocument();
  });

  it('renders status legend', () => {
    render(<MatterhornSummary summary={mockSummary} />);

    expect(screen.getByText('Status Legend:')).toBeInTheDocument();
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not Applicable').length).toBeGreaterThan(0);
  });

  it('handles empty categories array', () => {
    const emptySummary: MatterhornSummaryType = {
      totalCheckpoints: 0,
      passed: 0,
      failed: 0,
      notApplicable: 0,
      categories: [],
    };

    render(<MatterhornSummary summary={emptySummary} />);

    expect(screen.getByText('Matterhorn Protocol Compliance')).toBeInTheDocument();
    expect(screen.getAllByText('0%')[0]).toBeInTheDocument();
  });
});
