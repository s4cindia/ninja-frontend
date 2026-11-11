import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TeamActivityReportView } from './TeamActivityReportView';
import type { TeamActivityReport } from '@/types/reports.types';

function mockReport(overrides?: Partial<TeamActivityReport>): TeamActivityReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    reviewThroughput: [],
    ownership: [
      {
        ownerId: 'exec-1',
        ownerName: 'Eve Exec',
        ownerEmail: 'eve@example.com',
        totalJobs: 2,
        completedJobs: 1,
        failedJobs: 0,
        inProgressJobs: 1,
        jobs: [
          { jobId: 'job-2', title: 'The Great Gatsby', type: 'PDF_ACCESSIBILITY', status: 'PROCESSING', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z' },
          { jobId: 'job-1', title: 'book.epub', type: 'EPUB_ACCESSIBILITY', status: 'COMPLETED', createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z' },
        ],
      },
    ],
    ...overrides,
  };
}

function renderView(data: TeamActivityReport) {
  return render(
    <MemoryRouter>
      <TeamActivityReportView data={data} />
    </MemoryRouter>
  );
}

describe('TeamActivityReportView -- per-owner assignments', () => {
  it('collapses the assignment list by default, showing only a toggle with the count', () => {
    renderView(mockReport());

    expect(screen.getByRole('button', { name: /show 2 assignments/i })).toBeInTheDocument();
    expect(screen.queryByText('The Great Gatsby')).not.toBeInTheDocument();
  });

  it('expands to show each assignment\'s title, type, status, and links into the job', () => {
    renderView(mockReport());

    fireEvent.click(screen.getByRole('button', { name: /show 2 assignments/i }));

    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    expect(screen.getByText('book.epub')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Great Gatsby' })).toHaveAttribute('href', '/pdf/audit/job-2');
    expect(screen.getByRole('link', { name: 'book.epub' })).toHaveAttribute('href', '/jobs/job-1');
    expect(screen.getByRole('button', { name: /hide assignments/i })).toBeInTheDocument();
  });

  it('collapses again on a second click', () => {
    renderView(mockReport());

    const toggle = screen.getByRole('button', { name: /show 2 assignments/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /hide assignments/i }));

    expect(screen.queryByText('The Great Gatsby')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show 2 assignments/i })).toBeInTheDocument();
  });

  it('shows no toggle for an owner with zero jobs in range', () => {
    renderView(mockReport({
      ownership: [
        { ownerId: 'exec-2', ownerName: 'No Jobs', ownerEmail: 'none@example.com', totalJobs: 0, completedJobs: 0, failedJobs: 0, inProgressJobs: 0, jobs: [] },
      ],
    }));

    expect(screen.queryByRole('button', { name: /assignment/i })).not.toBeInTheDocument();
  });

  it('singularizes the toggle label for exactly one assignment', () => {
    renderView(mockReport({
      ownership: [
        {
          ownerId: 'exec-3', ownerName: 'One Job', ownerEmail: 'one@example.com',
          totalJobs: 1, completedJobs: 1, failedJobs: 0, inProgressJobs: 0,
          jobs: [{ jobId: 'job-3', title: 'Solo.pdf', type: 'PDF_ACCESSIBILITY', status: 'COMPLETED', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' }],
        },
      ],
    }));

    expect(screen.getByRole('button', { name: /show 1 assignment$/i })).toBeInTheDocument();
  });
});
