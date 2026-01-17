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
});
