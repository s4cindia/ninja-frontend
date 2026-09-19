import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceBadge } from '../SourceBadge';

describe('SourceBadge', () => {
  it.each([
    ['epubcheck', 'EPUBCheck', /bg-blue-100/],
    ['ace', 'ACE', /bg-purple-100/],
    ['js-auditor', 'JS Auditor', /bg-green-100/],
    ['prh-uk', 'PRH UK', /bg-teal-100/],
    ['ninja', 'Ninja', /bg-indigo-100/],
    ['pdf-structure', 'Ninja', /bg-indigo-100/],
    ['contrast-validator', 'Ninja', /bg-indigo-100/],
    ['alt-text-validator', 'Ninja', /bg-indigo-100/],
    ['verapdf', 'veraPDF', /bg-slate-100/],
    ['pdfa11y', 'pdfa11y', /bg-cyan-100/],
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

  it('renders nothing rather than throwing when source is a non-string value (CodeRabbit finding — an unvalidated API payload could hand this an object)', () => {
    const { container } = render(
      <SourceBadge source={{ malformed: true } as unknown as string} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
