import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationList } from '../CitationList';
import type { Citation, CitationType, CitationStyle, CitationComponent } from '@/types/citation.types';

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
    rawText: 'Test citation text',
    citationType: 'PARENTHETICAL' as CitationType,
    detectedStyle: 'APA' as CitationStyle,
    confidence: 85,
    needsReview: false,
    pageNumber: 1,
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: 20,
    primaryComponentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('CitationList', () => {
  describe('empty state', () => {
    it('should render empty state when no citations', () => {
      render(<CitationList citations={[]} />);

      expect(screen.getByText('No citations found')).toBeInTheDocument();
      expect(screen.getByText('Upload a document to detect citations')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should render loading skeletons', () => {
      render(<CitationList citations={[]} isLoading={true} />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('citation rendering', () => {
    it('should render citation list with proper ARIA role', () => {
      const citations = [createMockCitation()];
      render(<CitationList citations={citations} />);

      expect(screen.getByRole('list', { name: 'Citation list' })).toBeInTheDocument();
    });

    it('should render citation text', () => {
      const citations = [createMockCitation({ rawText: 'Smith et al. (2023)' })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('Smith et al. (2023)')).toBeInTheDocument();
    });

    it('should render type badge', () => {
      const citations = [createMockCitation({ citationType: 'PARENTHETICAL' })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('parenthetical')).toBeInTheDocument();
    });

    it('should render style badge', () => {
      const citations = [createMockCitation({ detectedStyle: 'APA' })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('APA')).toBeInTheDocument();
    });

    it('should render confidence percentage', () => {
      const citations = [createMockCitation({ confidence: 92 })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should render unparsed badge when no primaryComponent', () => {
      const citations = [createMockCitation({ primaryComponent: undefined })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('Unparsed')).toBeInTheDocument();
    });

    it('should render parsed badge when has primaryComponent', () => {
      const citations = [
        createMockCitation({
          primaryComponent: createMockComponent(),
        }),
      ];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('Parsed')).toBeInTheDocument();
    });

    it('should render needs review badge when flagged', () => {
      const citations = [createMockCitation({ needsReview: true })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('Needs Review')).toBeInTheDocument();
    });

    it('should normalize confidence from 0-1 scale', () => {
      const citations = [createMockCitation({ confidence: 0.75 })];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should expand citation on click', async () => {
      const user = userEvent.setup();
      const citations = [createMockCitation({ pageNumber: 5, paragraphIndex: 2 })];
      render(<CitationList citations={citations} />);

      expect(screen.queryByText('Page: 5')).not.toBeInTheDocument();

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByText('Page: 5')).toBeInTheDocument();
      expect(screen.getByText('Paragraph: 3')).toBeInTheDocument();
    });

    it('should collapse citation on second click', async () => {
      const user = userEvent.setup();
      const citations = [createMockCitation({ pageNumber: 5 })];
      render(<CitationList citations={citations} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);
      expect(screen.getByText('Page: 5')).toBeInTheDocument();

      await user.click(row!);
      expect(screen.queryByText('Page: 5')).not.toBeInTheDocument();
    });

    it('should show position info when expanded', async () => {
      const user = userEvent.setup();
      const citations = [createMockCitation({ startOffset: 100, endOffset: 200 })];
      render(<CitationList citations={citations} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByText('Position: 100-200')).toBeInTheDocument();
    });

    it('should show parsed components when expanded and parsed', async () => {
      const user = userEvent.setup();
      const citations = [
        createMockCitation({
          primaryComponent: createMockComponent({
            authors: ['Smith, J.', 'Doe, A.'],
            title: 'Test Article Title',
            year: '2023',
          }),
        }),
      ];
      render(<CitationList citations={citations} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByText('Parsed Components')).toBeInTheDocument();
      expect(screen.getByText('Smith, J., Doe, A.')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });
  });

  describe('parse action', () => {
    it('should show parse button for unparsed citations when expanded', async () => {
      const user = userEvent.setup();
      const onParse = vi.fn();
      const citations = [createMockCitation({ primaryComponent: undefined })];
      render(<CitationList citations={citations} onParse={onParse} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByRole('button', { name: /parse citation/i })).toBeInTheDocument();
    });

    it('should call onParse with citation ID when parse clicked', async () => {
      const user = userEvent.setup();
      const onParse = vi.fn();
      const citations = [createMockCitation({ id: 'cit-123', primaryComponent: undefined })];
      render(<CitationList citations={citations} onParse={onParse} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      const parseButton = screen.getByRole('button', { name: /parse citation/i });
      await user.click(parseButton);

      expect(onParse).toHaveBeenCalledWith('cit-123');
    });

    it('should show parsing state when isParsing matches citation ID', async () => {
      const user = userEvent.setup();
      const citations = [createMockCitation({ id: 'cit-123', primaryComponent: undefined })];
      render(<CitationList citations={citations} onParse={() => {}} isParsing="cit-123" />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByRole('button', { name: /parsing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /parsing/i })).toBeDisabled();
    });

    it('should not disable parse button for other citations while one is parsing', async () => {
      const user = userEvent.setup();
      const citations = [
        createMockCitation({ id: 'cit-1', primaryComponent: undefined }),
        createMockCitation({ id: 'cit-2', rawText: 'Second citation', primaryComponent: undefined }),
      ];
      render(<CitationList citations={citations} onParse={() => {}} isParsing="cit-1" />);

      const rows = screen.getAllByText(/citation/i);
      const secondRow = rows[1].closest('.cursor-pointer');
      await user.click(secondRow!);

      const parseButton = within(secondRow!.closest('[class*="overflow-hidden"]')!).getByRole('button', {
        name: /parse citation/i,
      });
      expect(parseButton).not.toBeDisabled();
    });
  });

  describe('view details action', () => {
    it('should show view details button when expanded', async () => {
      const user = userEvent.setup();
      const onViewDetail = vi.fn();
      const citations = [createMockCitation()];
      render(<CitationList citations={citations} onViewDetail={onViewDetail} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('should call onViewDetail with citation when clicked', async () => {
      const user = userEvent.setup();
      const onViewDetail = vi.fn();
      const citation = createMockCitation();
      render(<CitationList citations={[citation]} onViewDetail={onViewDetail} />);

      const row = screen.getByText('Test citation text').closest('.cursor-pointer');
      await user.click(row!);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewButton);

      expect(onViewDetail).toHaveBeenCalledWith(citation);
    });
  });

  describe('multiple citations', () => {
    it('should render multiple citations', () => {
      const citations = [
        createMockCitation({ id: 'cit-1', rawText: 'First citation' }),
        createMockCitation({ id: 'cit-2', rawText: 'Second citation' }),
        createMockCitation({ id: 'cit-3', rawText: 'Third citation' }),
      ];
      render(<CitationList citations={citations} />);

      expect(screen.getByText('First citation')).toBeInTheDocument();
      expect(screen.getByText('Second citation')).toBeInTheDocument();
      expect(screen.getByText('Third citation')).toBeInTheDocument();
    });
  });

  describe('confidence colors', () => {
    it('should show green for high confidence (>=80)', () => {
      const citations = [createMockCitation({ confidence: 85 })];
      render(<CitationList citations={citations} />);

      const confidenceElement = screen.getByText('85%');
      expect(confidenceElement).toHaveClass('text-green-600');
    });

    it('should show yellow for medium confidence (>=50, <80)', () => {
      const citations = [createMockCitation({ confidence: 65 })];
      render(<CitationList citations={citations} />);

      const confidenceElement = screen.getByText('65%');
      expect(confidenceElement).toHaveClass('text-yellow-600');
    });

    it('should show red for low confidence (<50)', () => {
      const citations = [createMockCitation({ confidence: 30 })];
      render(<CitationList citations={citations} />);

      const confidenceElement = screen.getByText('30%');
      expect(confidenceElement).toHaveClass('text-red-600');
    });
  });
});
