import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CitationDetail } from '../CitationDetail';
import type { Citation, CitationType, CitationStyle, CitationComponent } from '@/types/citation.types';

vi.mock('@/hooks/useCitation', () => ({
  useCitationComponents: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useParseCitation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}));

import { useCitationComponents, useParseCitation } from '@/hooks/useCitation';
const mockUseCitationComponents = vi.mocked(useCitationComponents);
const mockUseParseCitation = vi.mocked(useParseCitation);

function createMockComponent(overrides: Partial<CitationComponent> = {}): CitationComponent {
  return {
    id: 'comp-1',
    citationId: 'cit-1',
    parseVariant: 'APA',
    confidence: 90,
    authors: ['Smith, J.'],
    year: '2023',
    title: 'Test Article',
    source: 'Test Journal',
    volume: '1',
    issue: '1',
    pages: '1-10',
    doi: null,
    url: null,
    publisher: null,
    edition: null,
    accessDate: null,
    sourceType: 'JOURNAL_ARTICLE',
    fieldConfidence: {},
    doiVerified: null,
    urlValid: null,
    urlCheckedAt: null,
    needsReview: false,
    reviewReasons: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: 'cit-1',
    documentId: 'doc-1',
    rawText: 'Test citation text by Author (2023)',
    citationType: 'PARENTHETICAL' as CitationType,
    detectedStyle: 'APA' as CitationStyle,
    confidence: 85,
    needsReview: false,
    pageNumber: 1,
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: 50,
    primaryComponentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('CitationDetail', () => {
  let onClose: () => void;
  let originalBodyOverflow: string;

  beforeEach(() => {
    onClose = vi.fn() as unknown as () => void;
    originalBodyOverflow = document.body.style.overflow;
    vi.clearAllMocks();

    mockUseCitationComponents.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useCitationComponents>);

    mockUseParseCitation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    } as unknown as ReturnType<typeof useParseCitation>);
  });

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow;
  });

  describe('modal behavior', () => {
    it('should render as a modal dialog', () => {
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have accessible title', () => {
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('heading', { name: 'Citation Details' })).toBeInTheDocument();
    });

    it('should lock body scroll when open', () => {
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(
        <CitationDetail citation={createMockCitation()} onClose={onClose} />,
        { wrapper: createWrapper() }
      );

      unmount();

      expect(document.body.style.overflow).toBe(originalBodyOverflow);
    });

    it('should close when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const backdrop = document.querySelector('[aria-hidden="true"]');
      await user.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should focus close button on mount', async () => {
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(document.activeElement).toBe(closeButton);
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const buttons = screen.getAllByRole('button');
      const lastButton = buttons[buttons.length - 1];
      lastButton.focus();

      await user.tab();

      const firstButton = buttons[0];
      expect(document.activeElement).toBe(firstButton);
    });

    it('should trap focus in reverse with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<CitationDetail citation={createMockCitation()} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0];
      firstButton.focus();

      await user.tab({ shift: true });

      const lastButton = buttons[buttons.length - 1];
      expect(document.activeElement).toBe(lastButton);
    });
  });

  describe('citation display', () => {
    it('should display raw citation text', () => {
      const citation = createMockCitation({ rawText: 'Smith, J. (2023). Test Article.' });
      render(<CitationDetail citation={citation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Smith, J. (2023). Test Article.')).toBeInTheDocument();
    });

    it('should display type badge', () => {
      render(<CitationDetail citation={createMockCitation({ citationType: 'FOOTNOTE' })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('footnote')).toBeInTheDocument();
    });

    it('should display style badge', () => {
      render(<CitationDetail citation={createMockCitation({ detectedStyle: 'MLA' })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('MLA')).toBeInTheDocument();
    });

    it('should display confidence badge', () => {
      render(<CitationDetail citation={createMockCitation({ confidence: 92 })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('92% confidence')).toBeInTheDocument();
    });

    it('should display page number when present', () => {
      render(<CitationDetail citation={createMockCitation({ pageNumber: 15 })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Page: 15')).toBeInTheDocument();
    });

    it('should display paragraph index when present', () => {
      render(<CitationDetail citation={createMockCitation({ paragraphIndex: 3 })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Paragraph: 4')).toBeInTheDocument();
    });

    it('should display position offsets', () => {
      render(
        <CitationDetail
          citation={createMockCitation({ startOffset: 100, endOffset: 200 })}
          onClose={onClose}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Position: 100-200')).toBeInTheDocument();
    });
  });

  describe('unparsed state', () => {
    it('should show "Not Yet Parsed" message', () => {
      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Not Yet Parsed')).toBeInTheDocument();
    });

    it('should show parse button', () => {
      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /parse citation/i })).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/click "parse citation" to extract/i)).toBeInTheDocument();
    });
  });

  describe('parsed state', () => {
    const parsedCitation = createMockCitation({
      primaryComponent: createMockComponent({
        authors: ['Smith, J.', 'Doe, A.'],
        title: 'Test Article Title',
        year: '2023',
      }),
      primaryComponentId: 'comp-1',
    });

    it('should show "Parsed Components" heading', () => {
      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Parsed Components')).toBeInTheDocument();
    });

    it('should show re-parse button', () => {
      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /re-parse/i })).toBeInTheDocument();
    });

    it('should show current and history tabs', () => {
      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('tab', { name: /current parse/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    });
  });

  describe('parse action', () => {
    it('should call parse mutation when button clicked', async () => {
      const user = userEvent.setup();
      const parseMutate = vi.fn();
      mockUseParseCitation.mockReturnValue({
        mutate: parseMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as unknown as ReturnType<typeof useParseCitation>);

      render(
        <CitationDetail
          citation={createMockCitation({ id: 'cit-123', primaryComponent: undefined })}
          onClose={onClose}
        />,
        { wrapper: createWrapper() }
      );

      const parseButton = screen.getByRole('button', { name: /parse citation/i });
      await user.click(parseButton);

      expect(parseMutate).toHaveBeenCalledWith('cit-123');
    });

    it('should show parsing state', () => {
      mockUseParseCitation.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
      } as unknown as ReturnType<typeof useParseCitation>);

      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /parsing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /parsing/i })).toBeDisabled();
    });

    it('should show success message after parsing', () => {
      mockUseParseCitation.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isSuccess: true,
        isError: false,
      } as unknown as ReturnType<typeof useParseCitation>);

      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('status')).toHaveTextContent('Citation parsed successfully!');
    });

    it('should show error message on parse failure', () => {
      mockUseParseCitation.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: true,
      } as unknown as ReturnType<typeof useParseCitation>);

      render(<CitationDetail citation={createMockCitation({ primaryComponent: undefined })} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to parse citation');
    });
  });

  describe('history tab', () => {
    it('should show loading state while fetching history', async () => {
      const user = userEvent.setup();
      mockUseCitationComponents.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useCitationComponents>);

      const parsedCitation = createMockCitation({
        primaryComponent: createMockComponent(),
      });

      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show empty history message', async () => {
      const user = userEvent.setup();
      mockUseCitationComponents.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useCitationComponents>);

      const parsedCitation = createMockCitation({
        primaryComponent: createMockComponent(),
      });

      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(screen.getByText('No parse history available')).toBeInTheDocument();
    });

    it('should show history count badge', () => {
      mockUseCitationComponents.mockReturnValue({
        data: [
          createMockComponent({ id: 'comp-1' }),
          createMockComponent({ id: 'comp-2', parseVariant: 'MLA' }),
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useCitationComponents>);

      const parsedCitation = createMockCitation({
        primaryComponent: createMockComponent(),
      });

      render(<CitationDetail citation={parsedCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('XSS protection', () => {
    it('should sanitize HTML in raw text', () => {
      const maliciousCitation = createMockCitation({
        rawText: '<script>alert("xss")</script>Safe text',
      });

      render(<CitationDetail citation={maliciousCitation} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Safe text')).toBeInTheDocument();
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });
  });
});
