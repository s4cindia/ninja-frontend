import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowProgressBar } from '../WorkflowProgressBar';

describe('WorkflowProgressBar', () => {
  it('renders progress bar with correct percentage', () => {
    render(
      <WorkflowProgressBar currentState="RUNNING_ACE" phase="audit" progress={42} />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows phase label correctly', () => {
    render(
      <WorkflowProgressBar currentState="RUNNING_EPUBCHECK" phase="audit" progress={10} />
    );
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });

  it('shows human review waiting message for AWAITING_* states', () => {
    render(
      <WorkflowProgressBar
        currentState="AWAITING_AI_REVIEW"
        phase="audit"
        progress={55}
      />
    );
    expect(screen.getByText('Waiting for human review')).toBeInTheDocument();
  });

  it('shows COMPLETED state correctly', () => {
    render(
      <WorkflowProgressBar currentState="COMPLETED" phase="complete" progress={100} />
    );
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    // No waiting message for terminal state
    expect(screen.queryByText('Waiting for human review')).not.toBeInTheDocument();
  });

  it('shows FAILED state with error styling', () => {
    render(
      <WorkflowProgressBar currentState="FAILED" phase="failed" progress={30} />
    );
    // Both the phase badge and the state label render "Failed"
    const failedElements = screen.getAllByText('Failed');
    expect(failedElements.length).toBeGreaterThanOrEqual(1);
    // Progress bar should use error variant (bg-red-600)
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toMatch(/bg-red-600/);
    // No waiting message
    expect(screen.queryByText('Waiting for human review')).not.toBeInTheDocument();
  });
});
