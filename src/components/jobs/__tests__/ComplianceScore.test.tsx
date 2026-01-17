import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceScore } from '../ComplianceScore';

describe('ComplianceScore', () => {
  it('displays the correct score value', () => {
    render(<ComplianceScore score={66} isAccessible={false} />);
    expect(screen.getByText('66')).toBeInTheDocument();
  });

  it('shows ACCESSIBLE badge when isAccessible is true', () => {
    render(<ComplianceScore score={90} isAccessible={true} />);
    expect(screen.getByText('ACCESSIBLE')).toBeInTheDocument();
  });

  it('shows NOT ACCESSIBLE badge when isAccessible is false', () => {
    render(<ComplianceScore score={50} isAccessible={false} />);
    expect(screen.getByText('NOT ACCESSIBLE')).toBeInTheDocument();
  });

  it('handles score of 0', () => {
    render(<ComplianceScore score={0} isAccessible={false} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles score of 100', () => {
    render(<ComplianceScore score={100} isAccessible={true} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows N/A for NaN score', () => {
    render(<ComplianceScore score={NaN} isAccessible={false} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByLabelText('Compliance score not available')).toBeInTheDocument();
  });

  it('shows N/A for Infinity score', () => {
    render(<ComplianceScore score={Infinity} isAccessible={false} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByLabelText('Compliance score not available')).toBeInTheDocument();
  });

  it('applies correct color tier at boundary 90 (Excellent - green)', () => {
    const { container } = render(<ComplianceScore score={90} isAccessible={true} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle).toHaveAttribute('stroke', '#22c55e');
  });

  it('applies correct color tier at boundary 89 (Good - blue)', () => {
    const { container } = render(<ComplianceScore score={89} isAccessible={true} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle).toHaveAttribute('stroke', '#3b82f6');
  });

  it('applies correct color tier at boundary 70 (Good - blue)', () => {
    const { container } = render(<ComplianceScore score={70} isAccessible={false} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle).toHaveAttribute('stroke', '#3b82f6');
  });

  it('applies correct color tier at boundary 69 (Needs Work - yellow)', () => {
    const { container } = render(<ComplianceScore score={69} isAccessible={false} />);
    const circle = container.querySelectorAll('circle')[1];
    expect(circle).toHaveAttribute('stroke', '#eab308');
  });
});
