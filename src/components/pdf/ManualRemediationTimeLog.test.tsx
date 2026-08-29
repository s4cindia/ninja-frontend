import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualRemediationTimeLog } from './ManualRemediationTimeLog';
import { api } from '@/services/api';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    api: { post: vi.fn() },
  };
});

const mockApi = api as Mocked<typeof api>;

describe('ManualRemediationTimeLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "0m logged" and no form by default, then opens the form on "Log time"', () => {
    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={vi.fn()} />);

    expect(screen.getByText(/0m/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Minutes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    expect(screen.getByPlaceholderText('Minutes')).toBeInTheDocument();
  });

  it('formats an existing total as hours and minutes', () => {
    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={95 * 60000} onLogged={vi.fn()} />);
    expect(screen.getByText(/1h 35m/)).toBeInTheDocument();
  });

  it('keeps Save disabled until a positive number of minutes is entered', () => {
    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '0' } });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '20' } });
    expect(saveButton).not.toBeDisabled();
  });

  it('submits minutes and note, reports the new total and the just-logged entry\'s timestamp upward, and closes the form', async () => {
    const onLogged = vi.fn();
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          totalMinutes: 45,
          log: [{ minutes: 45, note: 'fixed byline in Acrobat', loggedAt: '2026-08-29T12:00:00.000Z', loggedBy: 'user_abc' }],
        },
      },
    });

    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={onLogged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '45' } });
    fireEvent.change(screen.getByPlaceholderText(/Optional note/), { target: { value: 'fixed byline in Acrobat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/pdf/job-123/manual-remediation-time',
        { minutes: 45, note: 'fixed byline in Acrobat' }
      );
    });
    await waitFor(() => {
      expect(onLogged).toHaveBeenCalledWith(45 * 60000, '2026-08-29T12:00:00.000Z');
    });
    expect(screen.queryByPlaceholderText('Minutes')).not.toBeInTheDocument();
  });

  it('reports lastLoggedAt as undefined if the response omits a log array (defensive — should not crash)', async () => {
    const onLogged = vi.fn();
    mockApi.post.mockResolvedValueOnce({ data: { data: { totalMinutes: 10 } } });

    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={onLogged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onLogged).toHaveBeenCalledWith(10 * 60000, undefined);
    });
  });

  it('omits note from the request body when left blank', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { totalMinutes: 10, log: [] } } });

    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/pdf/job-123/manual-remediation-time', { minutes: 10 });
    });
  });

  it('keeps the form open with the entered values if the request fails', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('network error'));

    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalled();
    });
    expect(screen.getByPlaceholderText('Minutes')).toHaveValue(30);
  });

  it('Cancel closes the form and clears the entered values without submitting', () => {
    render(<ManualRemediationTimeLog jobId="job-123" manualRemediationMs={0} onLogged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
    fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByPlaceholderText('Minutes')).not.toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});
