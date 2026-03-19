import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentQueueView from '../DocumentQueueView';
import type { CorpusDocument } from '@/services/calibration.service';

const mockStartCalibration = vi.fn();

vi.mock('@/hooks/useCalibration', () => ({
  useCorpusDocumentsWithPolling: vi.fn(),
  useStartCalibration: () => ({
    mutate: mockStartCalibration,
    isPending: false,
  }),
  CALIBRATION_KEYS: {
    documents: () => ['calibration', 'documents'],
  },
}));

const { useCorpusDocumentsWithPolling } = await import('@/hooks/useCalibration');
const mockUseCorpus = vi.mocked(useCorpusDocumentsWithPolling);

function renderWithRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DocumentQueueView />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeDoc(overrides: Partial<CorpusDocument> = {}): CorpusDocument {
  return {
    id: 'doc-1',
    filename: 'test.pdf',
    s3Path: 's3://bucket/test.pdf',
    language: 'en',
    isScanned: false,
    uploadedAt: '2026-01-01T00:00:00Z',
    status: 'PENDING',
    ...overrides,
  };
}

describe('DocumentQueueView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton rows when loading', () => {
    mockUseCorpus.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no documents', () => {
    mockUseCorpus.mockReturnValue({
      data: { documents: [] },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    expect(screen.getByText('No documents in queue')).toBeInTheDocument();
  });

  it('renders document list with 3 documents', () => {
    mockUseCorpus.mockReturnValue({
      data: {
        documents: [
          makeDoc({ id: '1', filename: 'alpha.pdf' }),
          makeDoc({ id: '2', filename: 'beta.pdf' }),
          makeDoc({ id: '3', filename: 'gamma.pdf' }),
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.getByText('beta.pdf')).toBeInTheDocument();
    expect(screen.getByText('gamma.pdf')).toBeInTheDocument();
  });

  it('shows "Start Calibration" button for PENDING document', () => {
    mockUseCorpus.mockReturnValue({
      data: { documents: [makeDoc({ status: 'PENDING' })] },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    expect(screen.getByText('Start Calibration')).toBeInTheDocument();
  });

  it('shows "Review" button for NEEDS_REVIEW document', () => {
    mockUseCorpus.mockReturnValue({
      data: { documents: [makeDoc({ status: 'NEEDS_REVIEW' })] },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows "Done" text for COMPLETE document', () => {
    mockUseCorpus.mockReturnValue({
      data: { documents: [makeDoc({ status: 'COMPLETE' })] },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calls startCalibration with correct documentId', () => {
    mockUseCorpus.mockReturnValue({
      data: { documents: [makeDoc({ id: 'doc-abc', status: 'PENDING' })] },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    fireEvent.click(screen.getByText('Start Calibration'));
    expect(mockStartCalibration).toHaveBeenCalledWith({
      documentId: 'doc-abc',
      fileId: 'doc-abc',
    });
  });

  it('filters documents by publisher', () => {
    mockUseCorpus.mockReturnValue({
      data: {
        documents: [
          makeDoc({ id: '1', filename: 'pub-a.pdf', publisher: 'Publisher A' }),
          makeDoc({ id: '2', filename: 'pub-b.pdf', publisher: 'Publisher B' }),
          makeDoc({ id: '3', filename: 'pub-a2.pdf', publisher: 'Publisher A' }),
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof mockUseCorpus>);

    renderWithRouter();
    // All 3 visible initially
    expect(screen.getByText('pub-a.pdf')).toBeInTheDocument();
    expect(screen.getByText('pub-b.pdf')).toBeInTheDocument();
    expect(screen.getByText('pub-a2.pdf')).toBeInTheDocument();

    // Filter to Publisher A
    fireEvent.change(screen.getByLabelText('Filter by publisher'), {
      target: { value: 'Publisher A' },
    });

    expect(screen.getByText('pub-a.pdf')).toBeInTheDocument();
    expect(screen.getByText('pub-a2.pdf')).toBeInTheDocument();
    expect(screen.queryByText('pub-b.pdf')).not.toBeInTheDocument();
  });
});
