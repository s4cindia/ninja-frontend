import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackForm } from './FeedbackForm';
import { api } from '@/services/api';
import { feedbackAttachmentService } from '@/services/feedback-attachment.service';

vi.mock('@/services/api', () => ({
  api: { post: vi.fn() },
}));

vi.mock('@/services/feedback-attachment.service', () => ({
  feedbackAttachmentService: { upload: vi.fn() },
}));

const mockPost = vi.mocked(api.post);
const mockUpload = vi.mocked(feedbackAttachmentService.upload);

function makeFile(name = 'screenshot.png', type = 'image/png', size = 1024) {
  const file = new File(['x'.repeat(size)], name, { type });
  return file;
}

describe('FeedbackForm', () => {
  const originalPathname = window.location.pathname;

  beforeEach(() => {
    mockPost.mockReset();
    mockUpload.mockReset();
    mockPost.mockResolvedValue({ data: { data: { id: 'fb-1' } } });
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/pdf/audit/not-a-uuid' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: originalPathname },
      writable: true,
    });
  });

  it('submits severity when one is selected', async () => {
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText('Feedback Type'), { target: { value: 'BUG_REPORT' } });
    fireEvent.change(screen.getByLabelText(/Severity/), { target: { value: 'CRITICAL' } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Download button does nothing' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [, payload] = mockPost.mock.calls[0];
    expect((payload as Record<string, unknown>).severity).toBe('CRITICAL');
  });

  it('omits severity entirely when left as "Not specified"', async () => {
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Just a thought' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [, payload] = mockPost.mock.calls[0];
    expect((payload as Record<string, unknown>).severity).toBeUndefined();
  });

  it('auto-extracts a job id from the current URL into context.jobId', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/pdf/audit/37febe12-1234-5678-9abc-def012345678' },
      writable: true,
    });
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Something is wrong on this job' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [, payload] = mockPost.mock.calls[0];
    const context = (payload as Record<string, unknown>).context as Record<string, unknown>;
    expect(context.jobId).toBe('37febe12-1234-5678-9abc-def012345678');
  });

  it('does not set context.jobId when the current path has no UUID', async () => {
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'General note' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    const [, payload] = mockPost.mock.calls[0];
    const context = (payload as Record<string, unknown>).context as Record<string, unknown>;
    expect(context.jobId).toBeUndefined();
  });

  it('uploads selected attachments after the feedback is created', async () => {
    mockUpload.mockResolvedValue([]);
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'With a screenshot' } });
    const file = makeFile();
    const input = screen.getByLabelText(/Attach a screenshot/i);
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith('fb-1', [file]));
  });

  it('shows a warning (not an error) when the feedback saves but attachment upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('S3 down'));
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'With a screenshot' } });
    const file = makeFile();
    const input = screen.getByLabelText(/Attach a screenshot/i);
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    expect(await screen.findByText(/attachments failed to upload/i)).toBeInTheDocument();
  });

  it('rejects an attachment larger than the max size client-side, without calling upload', async () => {
    render(<FeedbackForm />);

    const bigFile = makeFile('huge.png', 'image/png', 11 * 1024 * 1024);
    const input = screen.getByLabelText(/Attach a screenshot/i);
    fireEvent.change(input as HTMLInputElement, { target: { files: [bigFile] } });

    expect(await screen.findByText(/too large/i)).toBeInTheDocument();
  });

  it('still submits successfully with no attachments at all (unchanged baseline behavior)', async () => {
    render(<FeedbackForm />);

    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'No attachments here' } });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
