/**
 * Scoped integration tests for the `PRH-COVER-ALT-EMPTY` branch of
 * QuickFixPanel. The broader panel has many other branches (template-driven
 * inputs, backend-fix-only, manual remediation) that are covered elsewhere
 * or implicitly — this file only exercises the new cover-alt path so the
 * apply-handler wiring stays correct as the panel evolves.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// vi.mock factories hoist to the top of the file, so the mock function must
// be created inside vi.hoisted() to avoid the TDZ "Cannot access before
// initialization" error when the mock body references it.
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock('@/services/api', () => ({
  api: { post: postMock },
}));

import { QuickFixPanel } from '../QuickFixPanel';

const issue = {
  id: 'iss-cover-1',
  code: 'PRH-COVER-ALT-EMPTY',
  message: 'Cover image is missing alt text.',
  location: 'EPUB/xhtml/cover.xhtml',
  imagePath: 'EPUB/images/cover.jpg',
};

describe('QuickFixPanel — PRH-COVER-ALT-EMPTY branch', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('renders the cover-alt template (not the generic image-alt template)', () => {
    render(
      <QuickFixPanel
        issue={issue}
        jobId="job-1"
        bookTitle="The Midnight Library"
        onApplyFix={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /Add cover image alt text/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Alt text/i)).toHaveValue(
      'Cover for The Midnight Library',
    );
    expect(screen.getByLabelText(/Cover image path/i)).toHaveValue(
      'EPUB/images/cover.jpg',
    );
  });

  it('POSTs the imageAlts payload to /epub/job/:id/apply-fix on submit', async () => {
    postMock.mockResolvedValue({ data: { data: { results: [] } } });
    render(
      <QuickFixPanel
        issue={issue}
        jobId="job-1"
        bookTitle="Test Book"
        onApplyFix={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Apply Cover Alt Text/i }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const applyCall = postMock.mock.calls.find(
      ([url]) => typeof url === 'string' && url.endsWith('/apply-fix'),
    );
    expect(applyCall).toBeDefined();
    expect(applyCall![0]).toBe('/epub/job/job-1/apply-fix');
    expect(applyCall![1]).toEqual({
      fixCode: 'PRH-COVER-ALT-EMPTY',
      options: {
        imageAlts: [
          { imageSrc: 'EPUB/images/cover.jpg', altText: 'Cover for Test Book' },
        ],
      },
    });
  });

  it('surfaces a backend 400 message directly in the dialog (no generic toast)', async () => {
    postMock.mockRejectedValueOnce({
      response: {
        data: { error: { message: '`imageSrc` is required for cover image' } },
      },
    });
    render(
      <QuickFixPanel
        issue={issue}
        jobId="job-1"
        bookTitle="Test"
        onApplyFix={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Apply Cover Alt Text/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server rejected the fix');
    expect(alert).toHaveTextContent('`imageSrc` is required for cover image');
  });

  it('blocks submit and shows an in-dialog error when alt text is empty', async () => {
    render(
      <QuickFixPanel
        issue={{ ...issue, imagePath: 'EPUB/images/cover.jpg' }}
        jobId="job-1"
        // bookTitle absent → no pre-fill → alt-text starts empty.
        onApplyFix={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Apply Cover Alt Text/i }));

    // Network call never fires — client-side validation short-circuits so
    // the operator gets immediate feedback rather than a round-trip.
    expect(postMock).not.toHaveBeenCalled();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Alt text is required/i);
  });

  it('clears the apiError state when the operator edits the alt-text field', async () => {
    postMock.mockRejectedValueOnce({
      response: { data: { error: { message: 'whatever' } } },
    });
    render(
      <QuickFixPanel
        issue={issue}
        jobId="job-1"
        bookTitle="Test Book"
        onApplyFix={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Apply Cover Alt Text/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/Alt text/i), '!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
