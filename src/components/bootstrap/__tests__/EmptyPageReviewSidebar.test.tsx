import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmptyPageReviewSidebar } from '../EmptyPageReviewSidebar';
import type {
  EmptyPageCategory,
  EmptyPageReview,
} from '@/services/empty-page-review.service';

vi.mock('@/hooks/useEmptyPageReviews', () => ({
  useEmptyPageReview: vi.fn(),
  useSaveEmptyPageReview: vi.fn(),
  useDeleteEmptyPageReview: vi.fn(),
}));

vi.mock('@/lib/telemetry', () => ({
  trackEvent: vi.fn(),
}));

const {
  useEmptyPageReview,
  useSaveEmptyPageReview,
  useDeleteEmptyPageReview,
} = await import('@/hooks/useEmptyPageReviews');

const mockUseExisting = vi.mocked(useEmptyPageReview);
const mockUseSave = vi.mocked(useSaveEmptyPageReview);
const mockUseDelete = vi.mocked(useDeleteEmptyPageReview);

function makeReview(
  overrides: Partial<EmptyPageReview> = {},
): EmptyPageReview {
  return {
    pageNumber: 96,
    category: 'LEGIT_EMPTY' as EmptyPageCategory,
    pageType: 'blank',
    expectedContent: null,
    notes: null,
    annotator: {
      id: 'user-1',
      firstName: 'Poornakala',
      lastName: 'B',
      email: 'p@example.com',
    },
    reviewedAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    ...overrides,
  };
}

function renderSidebar(props: Partial<{ pageNumber: number; filename: string }> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EmptyPageReviewSidebar
        runId="run-1"
        pageNumber={props.pageNumber ?? 96}
        filename={props.filename}
      />
    </QueryClientProvider>,
  );
}

describe('EmptyPageReviewSidebar', () => {
  let saveMutate: ReturnType<typeof vi.fn>;
  let deleteMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    saveMutate = vi.fn().mockResolvedValue(makeReview());
    deleteMutate = vi.fn().mockResolvedValue({ deleted: true });

    mockUseSave.mockReturnValue({
      mutateAsync: saveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveEmptyPageReview>);

    mockUseDelete.mockReturnValue({
      mutateAsync: deleteMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteEmptyPageReview>);

    mockUseExisting.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useEmptyPageReview>);
  });

  it('renders form fields when no existing review', () => {
    renderSidebar();
    expect(screen.getByText(/empty page 96/i)).toBeInTheDocument();
    expect(screen.getByText('Legit empty')).toBeInTheDocument();
    expect(screen.getByText('Detection failure')).toBeInTheDocument();
    expect(screen.getByText('Unsure')).toBeInTheDocument();
    expect(screen.getByLabelText(/page type/i)).toBeInTheDocument();
  });

  it('disables save until a category and page type are picked', () => {
    renderSidebar();
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/legit empty/i));
    expect(saveButton).toBeDisabled(); // no page type yet

    fireEvent.change(screen.getByLabelText(/page type/i), {
      target: { value: 'blank' },
    });
    expect(saveButton).not.toBeDisabled();
  });

  it('requires expectedContent when category is detection failure', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/detection failure/i));
    fireEvent.change(screen.getByLabelText(/page type/i), {
      target: { value: 'text_normal' },
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled(); // expectedContent empty

    fireEvent.change(screen.getByLabelText(/expected content/i), {
      target: { value: 'Two-column body text' },
    });
    expect(saveButton).not.toBeDisabled();
  });

  it('clears the page-type when switching to a category whose vocabulary differs', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/legit empty/i));
    fireEvent.change(screen.getByLabelText(/page type/i), {
      target: { value: 'blank' },
    });
    expect((screen.getByLabelText(/page type/i) as HTMLSelectElement).value).toBe(
      'blank',
    );

    fireEvent.click(screen.getByLabelText(/detection failure/i));
    expect((screen.getByLabelText(/page type/i) as HTMLSelectElement).value).toBe(
      '',
    );
  });

  it('prefills form from an existing review', () => {
    mockUseExisting.mockReturnValue({
      data: makeReview({
        category: 'DETECTION_FAILURE',
        pageType: 'text_normal',
        expectedContent: 'Two-column body',
        notes: 'flagged earlier',
      }),
      isLoading: false,
    } as unknown as ReturnType<typeof useEmptyPageReview>);

    renderSidebar();
    expect(
      (screen.getByLabelText(/detection failure/i) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText(/page type/i) as HTMLSelectElement).value,
    ).toBe('text_normal');
    expect(
      (screen.getByLabelText(/expected content/i) as HTMLTextAreaElement).value,
    ).toBe('Two-column body');
    expect(
      (screen.getByLabelText(/notes/i) as HTMLTextAreaElement).value,
    ).toBe('flagged earlier');
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    expect(screen.getByText(/Poornakala B/)).toBeInTheDocument();
  });

  it('calls saveMutateAsync with the trimmed payload', async () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/legit empty/i));
    fireEvent.change(screen.getByLabelText(/page type/i), {
      target: { value: 'image_plate' },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: '  full-page photo plate  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveMutate).toHaveBeenCalledWith({
        pageNumber: 96,
        payload: {
          category: 'LEGIT_EMPTY',
          pageType: 'image_plate',
          expectedContent: undefined,
          notes: 'full-page photo plate',
        },
      });
    });
    await waitFor(() => {
      expect(screen.getByText(/review saved/i)).toBeInTheDocument();
    });
  });

  it('shows two-step inline confirm before deleting', async () => {
    mockUseExisting.mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as unknown as ReturnType<typeof useEmptyPageReview>);

    renderSidebar();
    // First click reveals the confirm row.
    fireEvent.click(screen.getByTitle(/clear this review/i));
    expect(deleteMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /confirm clear/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^cancel$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm clear/i }));
    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(96);
    });
  });

  it('cancel returns from the confirm row without deleting', () => {
    mockUseExisting.mockReturnValue({
      data: makeReview(),
      isLoading: false,
    } as unknown as ReturnType<typeof useEmptyPageReview>);

    renderSidebar();
    fireEvent.click(screen.getByTitle(/clear this review/i));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(deleteMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /update/i }),
    ).toBeInTheDocument();
  });

  it('Ctrl+S triggers save when the form is valid and dirty', async () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/legit empty/i));
    fireEvent.change(screen.getByLabelText(/page type/i), {
      target: { value: 'blank' },
    });

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    await waitFor(() => {
      expect(saveMutate).toHaveBeenCalled();
    });
  });

  it('Ctrl+S is a no-op when save is disabled', () => {
    renderSidebar();
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(saveMutate).not.toHaveBeenCalled();
  });
});
