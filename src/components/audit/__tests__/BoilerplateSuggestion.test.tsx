import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoilerplateSuggestion } from '../BoilerplateSuggestion';
import { isBoilerplateCode } from '../boilerplate-codes';

describe('isBoilerplateCode', () => {
  it.each([
    ['PRH-COPY-TDM-PARAGRAPH-MISSING', true],
    ['PRH-COPY-EEA-LINE-MISSING', true],
    ['PRH-COPY-PRH-LOGO-MISSING', true],
    ['PRH-SOCIALS-STRAPLINE-MISSING', true],
  ] as const)('returns true for boilerplate code %s', (code, expected) => {
    expect(isBoilerplateCode(code)).toBe(expected);
  });

  it.each([
    'PRH-MARKUP-DEPRECATED-TAG',
    'PRH-NAV-MISSING-PAGELIST',
    'PRH-COVER-ALT-EMPTY',
    'EPUB-IMG-001',
    'PRH-SOCIALS-OTHER-CODE',
    'random-string',
  ])('returns false for non-boilerplate code %s', (code) => {
    expect(isBoilerplateCode(code)).toBe(false);
  });
});

describe('BoilerplateSuggestion', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    // navigator.clipboard is read-only in JSDOM, so install via
    // defineProperty rather than Object.assign.
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('renders the verbatim text inside a monospace pre block, preserving line breaks', () => {
    const text = 'Line one.\nLine two with    spacing.\nLine three.';
    render(<BoilerplateSuggestion code="PRH-COPY-TDM-PARAGRAPH-MISSING" text={text} />);
    const pre = screen.getByText((_, el) => el?.tagName === 'PRE' && el?.textContent === text);
    expect(pre.tagName).toBe('PRE');
    expect(pre.className).toMatch(/font-mono/);
    expect(pre.className).toMatch(/whitespace-pre-wrap/);
  });

  it('renders an accessible Copy button labelled with the issue code', () => {
    render(<BoilerplateSuggestion code="PRH-COPY-EEA-LINE-MISSING" text="x" />);
    expect(
      screen.getByRole('button', { name: /Copy suggested text for PRH-COPY-EEA-LINE-MISSING/i }),
    ).toBeInTheDocument();
  });

  it('writes the verbatim text to the clipboard on click and shows "Copied" feedback', async () => {
    const text = 'Pasted exactly.';
    render(<BoilerplateSuggestion code="PRH-COPY-EEA-LINE-MISSING" text={text} />);
    const button = screen.getByRole('button', { name: /Copy suggested text/i });
    expect(button).toHaveTextContent(/^Copy$/);

    await userEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(text));
    await waitFor(() => expect(button).toHaveTextContent(/Copied/));
  });

  it('reverts the Copied state after ~2 seconds', async () => {
    render(<BoilerplateSuggestion code="PRH-COPY-EEA-LINE-MISSING" text="x" />);
    const button = screen.getByRole('button', { name: /Copy suggested text/i });

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent(/Copied/));

    // Real-timer wait — the component sets a 2s timeout; allow a small
    // cushion so the test isn't fighting the same clock.
    await waitFor(() => expect(button).toHaveTextContent(/^Copy$/), {
      timeout: 2500,
    });
  });

  it('does not get stuck in "Copied" state when the clipboard write fails', async () => {
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
    render(<BoilerplateSuggestion code="PRH-COPY-EEA-LINE-MISSING" text="x" />);
    const button = screen.getByRole('button', { name: /Copy suggested text/i });

    await userEvent.click(button);
    // After the rejection settles the button must still read "Copy", not
    // "Copied" — otherwise the operator gets a silent false success.
    await waitFor(() => expect(button).toHaveTextContent(/^Copy$/));
  });
});
