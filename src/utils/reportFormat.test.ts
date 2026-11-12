import { describe, it, expect } from 'vitest';
import { formatResolutionRate } from './reportFormat';

describe('formatResolutionRate', () => {
  it('renders an already-0-100 rate as-is, not rescaled', () => {
    // Regression test for a real bug: the backend's resolutionRate is
    // resolvedCount/totalCount * 100 (see pdf-reaudit.service.ts), but the
    // Job Drilldown Dialog's chart used to multiply it by 100 again,
    // turning a real 75.3% into "7528%".
    expect(formatResolutionRate(75.3)).toBe('75%');
    expect(formatResolutionRate(5.63)).toBe('6%');
  });

  it('rounds to the nearest whole percent', () => {
    expect(formatResolutionRate(0)).toBe('0%');
    expect(formatResolutionRate(100)).toBe('100%');
    expect(formatResolutionRate(49.5)).toBe('50%');
  });
});
