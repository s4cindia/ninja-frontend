import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceBadge } from '../SourceBadge';

describe('SourceBadge', () => {
  it.each([
    ['epubcheck', 'EPUBCheck', /bg-blue-100/],
    ['ace', 'ACE', /bg-purple-100/],
    ['js-auditor', 'JS Auditor', /bg-green-100/],
    ['prh-uk', 'PRH UK', /bg-teal-100/],
  ] as const)(
    'renders the %s source with the expected label and theme class',
    (source, label, classRe) => {
      render(<SourceBadge source={source} />);
      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(classRe);
    },
  );

  it('falls back to a neutral style for an unknown source value', () => {
    render(<SourceBadge source="something-new" />);
    const badge = screen.getByText('something-new');
    expect(badge.className).toMatch(/bg-gray-100/);
  });
});
