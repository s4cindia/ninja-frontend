import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackDetail } from './FeedbackDetail';
import { api } from '@/services/api';
import type { FeedbackItem } from '@/types/feedback.types';

vi.mock('@/services/api', () => ({
  api: { patch: vi.fn(), get: vi.fn() },
}));

vi.mock('@/services/feedback-attachment.service', () => ({
  feedbackAttachmentService: {
    upload: vi.fn(),
    getDownloadUrl: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}));

const mockPatch = vi.mocked(api.patch);

function mockItem(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: 'fb-1',
    type: 'BUG_REPORT',
    status: 'NEW',
    comment: 'Download button does nothing',
    createdAt: '2026-11-01T00:00:00Z',
    attachments: [],
    ...overrides,
  };
}

describe('FeedbackDetail -- severity', () => {
  beforeEach(() => {
    mockPatch.mockReset();
    mockPatch.mockResolvedValue({ data: {} });
  });

  it('shows "Not specified" when no severity is set', () => {
    render(<FeedbackDetail item={mockItem()} isOpen onClose={vi.fn()} />);

    expect((screen.getByDisplayValue('Not specified') as HTMLSelectElement).value).toBe('');
  });

  it('preselects the item\'s existing severity', () => {
    render(<FeedbackDetail item={mockItem({ severity: 'HIGH' })} isOpen onClose={vi.fn()} />);

    expect((screen.getByDisplayValue('🟠 High') as HTMLSelectElement).value).toBe('HIGH');
  });

  it('changing severity PATCHes with the current status and the new severity', async () => {
    render(<FeedbackDetail item={mockItem({ status: 'REVIEWED', severity: 'LOW' })} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('⚪ Low'), { target: { value: 'CRITICAL' } });

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/feedback/fb-1', { status: 'REVIEWED', severity: 'CRITICAL' })
    );
  });

  it('changing status PATCHes with the current severity unchanged', async () => {
    render(<FeedbackDetail item={mockItem({ status: 'NEW', severity: 'MEDIUM' })} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('New'), { target: { value: 'RESOLVED' } });

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/feedback/fb-1', { status: 'RESOLVED', severity: 'MEDIUM' })
    );
  });

  it('sends severity: undefined when clearing it back to "Not specified"', async () => {
    render(<FeedbackDetail item={mockItem({ severity: 'LOW' })} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('⚪ Low'), { target: { value: '' } });

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/feedback/fb-1', { status: 'NEW', severity: undefined })
    );
  });
});
