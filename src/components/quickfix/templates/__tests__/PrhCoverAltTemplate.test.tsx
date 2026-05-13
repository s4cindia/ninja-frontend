import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrhCoverAltTemplate } from '../PrhCoverAltTemplate';
import { extractCoverImageSrc } from '../prh-cover-extract';

const baseIssue = {
  id: 'iss-1',
  code: 'PRH-COVER-ALT-EMPTY',
  message: 'Cover image is missing alt text.',
  location: 'EPUB/xhtml/cover.xhtml',
};

describe('extractCoverImageSrc', () => {
  it('returns the imagePath field when set', () => {
    expect(
      extractCoverImageSrc({ ...baseIssue, imagePath: 'EPUB/images/cover.jpg' }),
    ).toBe('EPUB/images/cover.jpg');
  });

  it('falls back to context.images[0].fullPath when context parses as JSON', () => {
    const context = JSON.stringify({
      images: [{ fullPath: 'OEBPS/images/cover.png', html: '<img …/>' }],
    });
    expect(extractCoverImageSrc({ ...baseIssue, context })).toBe(
      'OEBPS/images/cover.png',
    );
  });

  it('falls through to the html regex when context is not JSON', () => {
    expect(
      extractCoverImageSrc({
        ...baseIssue,
        html: '<img src="EPUB/images/cover-front.jpg" alt=""/>',
      }),
    ).toBe('EPUB/images/cover-front.jpg');
  });

  it('returns "" when nothing in the issue carries a src', () => {
    expect(extractCoverImageSrc(baseIssue)).toBe('');
  });
});

describe('PrhCoverAltTemplate', () => {
  function setup(over: Partial<React.ComponentProps<typeof PrhCoverAltTemplate>> = {}) {
    // Pull the change handlers out of `over` first so we can fall back to a
    // fresh mock when the caller didn't supply one — and so spreading `over`
    // later doesn't re-introduce undefined values from missing keys.
    const onAltTextChange = over.onAltTextChange ?? vi.fn();
    const onImageSrcChange = over.onImageSrcChange ?? vi.fn();
    const { onAltTextChange: _omitA, onImageSrcChange: _omitB, ...rest } = over;
    void _omitA;
    void _omitB;
    const props: React.ComponentProps<typeof PrhCoverAltTemplate> = {
      issue: baseIssue,
      bookTitle: undefined,
      altText: '',
      imageSrc: '',
      apiError: null,
      isApplying: false,
      ...rest,
      onAltTextChange,
      onImageSrcChange,
    };
    return { ...render(<PrhCoverAltTemplate {...props} />), onAltTextChange, onImageSrcChange };
  }

  it('pre-fills the alt-text input with "Cover for {bookTitle}" on mount when title is supplied', () => {
    const onAltTextChange = vi.fn();
    setup({ bookTitle: 'The Midnight Library', onAltTextChange });
    expect(onAltTextChange).toHaveBeenCalledWith('Cover for The Midnight Library');
  });

  it('does not pre-fill alt text when bookTitle is missing', () => {
    const onAltTextChange = vi.fn();
    setup({ onAltTextChange });
    expect(onAltTextChange).not.toHaveBeenCalled();
  });

  it('does not overwrite an alt-text value the operator already typed', () => {
    const onAltTextChange = vi.fn();
    setup({ bookTitle: 'Book', altText: 'Operator typed this', onAltTextChange });
    expect(onAltTextChange).not.toHaveBeenCalled();
  });

  it('pre-fills the image src on mount when the issue carries one', () => {
    const onImageSrcChange = vi.fn();
    setup({
      issue: { ...baseIssue, imagePath: 'EPUB/images/cover.jpg' },
      onImageSrcChange,
    });
    expect(onImageSrcChange).toHaveBeenCalledWith('EPUB/images/cover.jpg');
  });

  it('exposes a manual image-src input and flags when extraction failed', () => {
    setup();
    expect(
      screen.getByText(/Could not detect the cover image src/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Cover image path/i)).toBeInTheDocument();
  });

  it('renders the backend validation error verbatim when apiError is set', () => {
    setup({ apiError: '`altText` cannot be empty for cover image' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Server rejected the fix');
    expect(alert).toHaveTextContent('`altText` cannot be empty for cover image');
  });

  it('disables both inputs while a submit is in flight', () => {
    setup({ isApplying: true });
    expect(screen.getByLabelText(/Cover image path/i)).toBeDisabled();
    expect(screen.getByLabelText(/Alt text/i)).toBeDisabled();
    expect(screen.getByText(/Applying cover alt-text fix/i)).toBeInTheDocument();
  });

  it('forwards subsequent edits via onAltTextChange', async () => {
    const onAltTextChange = vi.fn();
    setup({ onAltTextChange });
    const input = screen.getByLabelText(/Alt text/i);
    await userEvent.type(input, 'A');
    // Type fires per-character changes; check the latest call carries the
    // partial value the parent should commit.
    expect(onAltTextChange).toHaveBeenCalled();
    expect(onAltTextChange).toHaveBeenLastCalledWith('A');
  });
});
