import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useCitationsByJob,
  useCitationsByDocument,
  useCitation,
  useCitationComponents,
  useCitationStats,
  useParseCitation,
  useParseAllCitations,
  useDetectCitations,
  citationKeys,
} from '../useCitation';
import { citationService } from '@/services/citation.service';
import type {
  Citation,
  CitationComponent,
  PaginatedCitations,
  CitationStats,
  BulkParseResult,
  DetectionResult,
  CitationType,
  CitationStyle,
} from '@/types/citation.types';

vi.mock('@/services/citation.service', () => ({
  citationService: {
    getByJob: vi.fn(),
    getByDocument: vi.fn(),
    getById: vi.fn(),
    getComponents: vi.fn(),
    getStats: vi.fn(),
    parse: vi.fn(),
    parseAll: vi.fn(),
    detectFromFile: vi.fn(),
  },
}));

const mockService = vi.mocked(citationService);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function createMockCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: 'cit-1',
    documentId: 'doc-1',
    rawText: 'Test citation',
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

function createMockPaginatedCitations(overrides: Partial<PaginatedCitations> = {}): PaginatedCitations {
  return {
    items: [createMockCitation()],
    total: 1,
    page: 0,
    limit: 10,
    totalPages: 1,
    ...overrides,
  };
}

describe('citationKeys', () => {
  it('should generate correct query keys', () => {
    expect(citationKeys.all).toEqual(['citations']);
    expect(citationKeys.byDocument('doc-1')).toEqual(['citations', 'document', 'doc-1']);
    expect(citationKeys.byJob('job-1')).toEqual(['citations', 'job', 'job-1']);
    expect(citationKeys.detail('cit-1')).toEqual(['citations', 'detail', 'cit-1']);
    expect(citationKeys.components('cit-1')).toEqual(['citations', 'components', 'cit-1']);
    expect(citationKeys.stats('doc-1')).toEqual(['citations', 'stats', 'doc-1']);
  });
});

describe('useCitationsByJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch citations by job ID', async () => {
    const mockData = createMockPaginatedCitations();
    mockService.getByJob.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useCitationsByJob('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(mockService.getByJob).toHaveBeenCalledWith('job-1', undefined);
  });

  it('should not fetch when jobId is empty', () => {
    renderHook(() => useCitationsByJob(''), {
      wrapper: createWrapper(),
    });

    expect(mockService.getByJob).not.toHaveBeenCalled();
  });

  it('should pass filters to service', async () => {
    mockService.getByJob.mockResolvedValueOnce(createMockPaginatedCitations({ items: [] }));

    const filters = { type: 'PARENTHETICAL' as CitationType, page: 1 };
    renderHook(() => useCitationsByJob('job-1', filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockService.getByJob).toHaveBeenCalled());
    expect(mockService.getByJob).toHaveBeenCalledWith('job-1', filters);
  });
});

describe('useCitationsByDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch citations by document ID', async () => {
    const mockData = createMockPaginatedCitations();
    mockService.getByDocument.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useCitationsByDocument('doc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(mockService.getByDocument).toHaveBeenCalledWith('doc-1', undefined);
  });

  it('should not fetch when documentId is empty', () => {
    renderHook(() => useCitationsByDocument(''), {
      wrapper: createWrapper(),
    });

    expect(mockService.getByDocument).not.toHaveBeenCalled();
  });
});

describe('useCitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single citation', async () => {
    const mockCitation = createMockCitation();
    mockService.getById.mockResolvedValueOnce(mockCitation);

    const { result } = renderHook(() => useCitation('cit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCitation);
  });

  it('should not fetch when citationId is empty', () => {
    renderHook(() => useCitation(''), {
      wrapper: createWrapper(),
    });

    expect(mockService.getById).not.toHaveBeenCalled();
  });
});

describe('useCitationComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch component history', async () => {
    const mockComponents = [createMockComponent(), createMockComponent({ id: 'comp-2' })];
    mockService.getComponents.mockResolvedValueOnce(mockComponents);

    const { result } = renderHook(() => useCitationComponents('cit-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockComponents);
  });
});

describe('useCitationStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch document stats', async () => {
    const mockStats: CitationStats = {
      total: 100,
      parsed: 80,
      unparsed: 20,
      needsReview: 5,
      byType: { PARENTHETICAL: 50, NARRATIVE: 30, FOOTNOTE: 20, ENDNOTE: 0, NUMERIC: 0, UNKNOWN: 0 },
      byStyle: { APA: 40, MLA: 30, CHICAGO: 20, VANCOUVER: 5, HARVARD: 3, IEEE: 2, UNKNOWN: 0 },
      averageConfidence: 85,
    };
    mockService.getStats.mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useCitationStats('doc-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStats);
  });
});

describe('useParseCitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse citation and return component', async () => {
    const mockComponent = createMockComponent();
    mockService.parse.mockResolvedValueOnce(mockComponent);
    mockService.getById.mockResolvedValueOnce(createMockCitation({ documentId: 'doc-1' }));

    const { result } = renderHook(() => useParseCitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('cit-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockComponent);
    expect(mockService.parse).toHaveBeenCalledWith('cit-1');
  });
});

describe('useParseAllCitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse all citations in document', async () => {
    const mockResult: BulkParseResult = {
      documentId: 'doc-1',
      message: 'Parsed 10 citations with 2 errors',
      parsed: 10,
      skipped: 0,
      failed: 2,
      averageConfidence: 0.85,
      stats: { total: 12, parsed: 10, unparsed: 2 },
      results: [],
    };
    mockService.parseAll.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useParseAllCitations(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ documentId: 'doc-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResult);
    expect(mockService.parseAll).toHaveBeenCalledWith('doc-1', undefined);
  });
});

describe('useDetectCitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect citations from file', async () => {
    const mockResult: DetectionResult = {
      jobId: 'job-1',
      documentId: 'doc-1',
      citations: [],
      totalCount: 0,
      byType: { PARENTHETICAL: 0, NARRATIVE: 0, FOOTNOTE: 0, ENDNOTE: 0, NUMERIC: 0, UNKNOWN: 0 },
      byStyle: { APA: 0, MLA: 0, CHICAGO: 0, VANCOUVER: 0, HARVARD: 0, IEEE: 0, UNKNOWN: 0 },
    };
    mockService.detectFromFile.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useDetectCitations(), {
      wrapper: createWrapper(),
    });

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResult);
    expect(mockService.detectFromFile).toHaveBeenCalledWith(file, undefined);
  });
});
