import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { PdfAuditResultsPage } from './PdfAuditResultsPage';
import { api } from '@/services/api';
import type { PdfAuditResult, PdfAuditIssue, MatterhornSummary } from '@/types/pdf.types';

// Mock dependencies
vi.mock('@/services/api');
vi.mock('@/components/pdf/PdfPreviewPanel', () => ({
  PdfPreviewPanel: ({ pdfUrl, currentPage, onPageChange, onIssueSelect }: {
    pdfUrl: string;
    currentPage: number;
    onPageChange: (page: number) => void;
    onIssueSelect: (issue: { id: string }) => void;
  }) => (
    <div data-testid="pdf-preview-panel">
      <div>PDF URL: {pdfUrl}</div>
      <div>Current Page: {currentPage}</div>
      <button onClick={() => onPageChange(2)}>Change Page</button>
      <button onClick={() => onIssueSelect({ id: 'issue-1' })}>Select Issue</button>
    </div>
  ),
}));

vi.mock('@/components/pdf/PdfPageNavigator', () => ({
  PdfPageNavigator: ({ pageCount, currentPage, onPageChange }: {
    pageCount: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pdf-page-navigator">
      <div>Pages: {pageCount}</div>
      <div>Current: {currentPage}</div>
      <button onClick={() => onPageChange(3)}>Go to Page 3</button>
    </div>
  ),
}));

vi.mock('@/components/pdf/MatterhornSummary', () => ({
  MatterhornSummary: ({ summary, onCheckpointClick }: {
    summary: { totalCheckpoints: number };
    onCheckpointClick: (id: string) => void;
  }) => (
    <div data-testid="matterhorn-summary">
      <div>Total Checkpoints: {summary.totalCheckpoints}</div>
      <button onClick={() => onCheckpointClick('01-003')}>Click Checkpoint</button>
    </div>
  ),
}));

vi.mock('@/components/remediation/IssueCard', () => ({
  IssueCard: ({ issue, onPageClick }: {
    issue: { id: string; message: string; pageNumber?: number };
    onPageClick?: (page: number) => void;
  }) => (
    <div data-testid={`issue-card-${issue.id}`}>
      <div>{issue.message}</div>
      <button onClick={() => onPageClick && onPageClick(issue.pageNumber!)}>
        Go to Page {issue.pageNumber}
      </button>
    </div>
  ),
}));

vi.mock('@/components/remediation/ApplyAllSuggestionsPanel', () => ({
  ApplyAllSuggestionsPanel: ({ onApplied }: {
    onApplied: (result: { applied: number; failed: number }) => void;
  }) => (
    <button onClick={() => onApplied({ applied: 1, failed: 0 })}>
      Mock Apply All
    </button>
  ),
}));

const mockMatterhornSummary: MatterhornSummary = {
  totalCheckpoints: 31,
  passed: 25,
  failed: 4,
  notApplicable: 2,
  categories: [
    {
      id: '01',
      name: 'Document',
      checkpoints: [
        {
          id: '01-001',
          description: 'Document has title',
          status: 'passed',
          issueCount: 0,
        },
        {
          id: '01-003',
          description: 'Document language specified',
          status: 'failed',
          issueCount: 1,
        },
      ],
    },
    {
      id: '07',
      name: 'Graphics',
      checkpoints: [
        {
          id: '07-001',
          description: 'All images have alt text',
          status: 'failed',
          issueCount: 3,
        },
      ],
    },
  ],
};

const createMockIssue = (
  id: string,
  pageNumber: number,
  severity: 'critical' | 'serious' | 'moderate' | 'minor',
  matterhornCheckpoint?: string,
  wcagCriteria?: string[]
): PdfAuditIssue => ({
  id,
  ruleId: `RULE-${id}`,
  severity,
  message: `Test issue ${id}`,
  description: `Test description for issue ${id}`,
  pageNumber,
  matterhornCheckpoint,
  wcagCriteria,
});

const createMockAuditResult = (overrides?: Partial<PdfAuditResult>): PdfAuditResult => ({
  id: 'audit-1',
  jobId: 'job-123',
  fileName: 'test-document.pdf',
  fileSize: 1024000,
  pageCount: 10,
  score: 75,
  status: 'completed',
  createdAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:05:00Z',
  issues: [
    createMockIssue('1', 1, 'critical', '01-003', ['1.3.1']),
    createMockIssue('2', 1, 'serious', '07-001', ['1.1.1']),
    createMockIssue('3', 3, 'moderate', '07-001', ['1.1.1', '4.1.2']),
    createMockIssue('4', 5, 'minor', '01-003', ['2.4.2']),
  ],
  matterhornSummary: mockMatterhornSummary,
  metadata: {
    pdfVersion: '1.7',
    isTagged: true,
    hasStructureTree: true,
    title: 'Test Document',
    author: 'Test Author',
  },
  ...overrides,
});

const renderWithRouter = (jobId: string = 'job-123') => {
  // Create a new QueryClient for each test with retry disabled for stability
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pdf/audit/${jobId}`]}>
        <Routes>
          <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
          <Route path="/pdf" element={<div>Upload page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PdfAuditResultsPage', () => {
  const mockApi = api as Mocked<typeof api>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading spinner initially', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      expect(screen.getByText('Loading audit results...')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('fetches audit result on mount', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter('job-123');

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/audit/result');
      });
    });

    it('displays audit result data after loading', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      expect(screen.getByText('75')).toBeInTheDocument(); // Score
      expect(screen.getByText(/10 pages/)).toBeInTheDocument();
      expect(screen.getByText(/PDF 1.7/)).toBeInTheDocument();
      expect(screen.getByText('Tagged')).toBeInTheDocument();
    });

    it('handles missing job ID', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/pdf/audit/']}>
            <Routes>
              <Route path="/pdf/audit/" element={<PdfAuditResultsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Invalid job ID/)).toBeInTheDocument();
      });
    });

    it('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('the error state\'s "Return to Upload" button still navigates to /pdf (regression: shares a renamed handler with the toolbar Re-run Audit button)', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter();

      const returnButton = await screen.findByRole('button', { name: 'Return to Upload' });
      fireEvent.click(returnButton);

      expect(await screen.findByText('Upload page')).toBeInTheDocument();
    });
  });

  describe('Polling for Processing Jobs', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.skip('displays polling state when job is processing', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: { status: 'processing' } },
      });

      renderWithRouter();

      // Flush pending timers to ensure component renders
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      }, { timeout: 5000 });
    }, 10000);

    it.skip('polls for updates when job is processing', async () => {
      const processingResponse = { data: { data: { status: 'processing' } } };
      const completedResponse = { data: { data: createMockAuditResult() } };

      mockApi.get
        .mockResolvedValueOnce(processingResponse)
        .mockResolvedValueOnce(processingResponse)
        .mockResolvedValueOnce(completedResponse);

      renderWithRouter();

      // Flush initial render timers
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Fast-forward 5 seconds and flush
      await vi.advanceTimersByTimeAsync(5000);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      }, { timeout: 5000 });

      // Fast-forward another 5 seconds and flush
      await vi.advanceTimersByTimeAsync(5000);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });

      // Should now show completed result
      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      }, { timeout: 5000 });
    }, 15000);

    it.skip('allows manual status check during polling', async () => {
      mockApi.get.mockResolvedValue({ data: { data: { status: 'processing' } } });

      renderWithRouter();

      // Flush initial timers
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      }, { timeout: 5000 });

      const checkButton = screen.getByRole('button', { name: /check status/i });
      fireEvent.click(checkButton);

      // Flush timers after button click
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2); // Initial + manual check
      }, { timeout: 5000 });
    }, 10000);
  });

  describe('Component Integration', () => {
    it('renders MatterhornSummary with data', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('matterhorn-summary')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Checkpoints: 31')).toBeInTheDocument();
    });

    it('renders PdfPageNavigator with page count', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-navigator')).toBeInTheDocument();
      });

      expect(screen.getByText('Pages: 10')).toBeInTheDocument();
    });

    it('renders PdfPreviewPanel with PDF URL', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter('job-456');

      await waitFor(() => {
        expect(screen.getByTestId('pdf-preview-panel')).toBeInTheDocument();
      });

      expect(screen.getByText(/PDF URL:.*job-456/)).toBeInTheDocument();
    });

    it('renders issue cards for all issues', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('issue-card-2')).toBeInTheDocument();
        expect(screen.getByTestId('issue-card-3')).toBeInTheDocument();
        expect(screen.getByTestId('issue-card-4')).toBeInTheDocument();
      });
    });
  });

  describe('Issue Filtering', () => {
    it('displays filter button', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
      });
    });

    it('toggles filter panel when filter button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      expect(screen.getByPlaceholderText('Search issues...')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /severity/i })).toBeInTheDocument();
    }, 10000);

    it('filters issues by severity', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-1')).toBeInTheDocument();
      });

      // Open filters
      fireEvent.click(screen.getByRole('button', { name: /filters/i }));

      // Select critical severity
      const severitySelect = screen.getAllByRole('combobox')[0];
      await userEvent.selectOptions(severitySelect, 'critical');

      // Should only show critical issue
      await waitFor(() => {
        expect(screen.getByText(/Issues \(1\)/)).toBeInTheDocument();
      });
    });

    it.skip('filters issues by search text', async () => {
      const mockResult = createMockAuditResult({
        issues: [
          createMockIssue('1', 1, 'critical'),
          { ...createMockIssue('2', 1, 'serious'), message: 'Missing alt text' },
          createMockIssue('3', 3, 'moderate'),
        ],
      });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-1')).toBeInTheDocument();
      });

      // Open filters
      fireEvent.click(screen.getByRole('button', { name: /filters/i }));

      // Search for "alt text"
      const searchInput = screen.getByPlaceholderText('Search issues...');
      fireEvent.change(searchInput, { target: { value: 'alt text' } });

      // Should only show matching issue
      await waitFor(() => {
        expect(screen.getByText(/Issues \(1\)/)).toBeInTheDocument();
      }, { timeout: 5000 });
    }, 10000);

    it.skip('clears all filters when clear button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-1')).toBeInTheDocument();
      });

      // Open filters and apply severity filter
      fireEvent.click(screen.getByRole('button', { name: /filters/i }));
      const severitySelect = screen.getAllByRole('combobox')[0];
      await userEvent.selectOptions(severitySelect, 'critical');

      await waitFor(() => {
        expect(screen.getByText(/Issues \(1\)/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      // Should show all issues again
      await waitFor(() => {
        expect(screen.getByText(/Issues \(4\)/)).toBeInTheDocument();
      }, { timeout: 5000 });
    }, 10000);
  });

  describe('Page Navigation', () => {
    it('updates current page when page navigator changes page', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Current: 1')).toBeInTheDocument();
      });

      // Use getAllByRole since there might be multiple "Go to Page 3" buttons
      const goToPageButton = screen.getAllByRole('button', { name: /go to page 3/i })[0];
      fireEvent.click(goToPageButton);

      await waitFor(() => {
        expect(screen.getByText('Current: 3')).toBeInTheDocument();
      });
    });

    it('updates current page when preview panel changes page', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Current Page: 1')).toBeInTheDocument();
      });

      const changePageButton = screen.getByRole('button', { name: /change page/i });
      fireEvent.click(changePageButton);

      expect(screen.getByText('Current Page: 2')).toBeInTheDocument();
    });
  });

  describe('Issue Selection', () => {
    it('updates selected issue when issue is clicked in preview', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('pdf-preview-panel')).toBeInTheDocument();
      });

      const selectIssueButton = screen.getByRole('button', { name: /select issue/i });
      fireEvent.click(selectIssueButton);

      // Issue selection state is internal, but we can verify the button works
      expect(selectIssueButton).toBeInTheDocument();
    });

    it.skip('navigates to issue page when issue card page is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-3')).toBeInTheDocument();
      });

      const goToPageButton = screen.getAllByRole('button', { name: /go to page/i })[2];
      fireEvent.click(goToPageButton);

      await waitFor(() => {
        expect(screen.getByText('Current: 3')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Actions', () => {
    it.skip('downloads report when download button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });
      mockApi.get.mockResolvedValueOnce({ data: { report: 'data' } });

      // Render first, before mocking DOM methods
      renderWithRouter('job-123');

      // Mock createElement and appendChild after render
      const mockLink = {
        click: vi.fn(),
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/report', expect.any(Object));
      });
    });

    it.skip('shares results link when share button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      // Render first
      renderWithRouter();

      // Mock clipboard API and alert after render
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(),
        },
      });
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }, { timeout: 5000 });

      expect(window.alert).toHaveBeenCalledWith('Results link copied to clipboard!');
    });
  });

  describe('Score Display', () => {
    it.skip('displays score with appropriate color for high score', async () => {
      const mockResult = createMockAuditResult({ score: 95 });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        const scoreElement = screen.getByText('95');
        expect(scoreElement).toHaveClass('text-green-600');
      });
    });

    it('displays score with appropriate color for medium score', async () => {
      const mockResult = createMockAuditResult({ score: 75 });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        const scoreElement = screen.getByText('75');
        expect(scoreElement).toHaveClass('text-yellow-600');
      });
    });

    it.skip('displays score with appropriate color for low score', async () => {
      const mockResult = createMockAuditResult({ score: 45 });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        const scoreElement = screen.getByText('45');
        expect(scoreElement).toHaveClass('text-red-600');
      });
    });
  });

  describe('Auto-tag status sync', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;
    const emptyAiResponse = { data: { data: { suggestions: [], analyzed: 0, total: 0, status: 'complete' } } };

    it('fetches auto-tag status exactly once per job (regression: applyAutoTagStatus must not re-trigger its own effect)', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      // applyAutoTagStatus writes a new auditResult object into state on a
      // terminal status, and the effect that fetches auto-tag status lists
      // auditResult as a dependency — without the ref guard this refires
      // forever. Give any runaway loop room to spin before asserting.
      await waitFor(() => {
        expect(mockApi.get.mock.calls.some(([url]) => url === statusUrl)).toBe(true);
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      const statusCalls = mockApi.get.mock.calls.filter(([url]) => url === statusUrl);
      expect(statusCalls).toHaveLength(1);
    });

    it('shows the tagger-source badge once the auto-tag status resolves', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'seam-c' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText(/Auto-tagged: Seam-C \(YOLO\)/)).toBeInTheDocument();
      });
    });

    it('shows a neutral "Already tagged" badge — not the alarming failed badge — when auto-tag is skipped because the document already had structure', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'skipped', skipReason: 'already-tagged' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText('Already tagged')).toBeInTheDocument();
      });
      expect(screen.queryByText('Auto-tag failed')).not.toBeInTheDocument();
    });

    it('shows no header badge for a no-tagger-configured skip (kept low-key)', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'skipped', skipReason: 'no-tagger-configured' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });
      expect(screen.queryByText('Auto-tag failed')).not.toBeInTheDocument();
      expect(screen.queryByText('Already tagged')).not.toBeInTheDocument();
    });

    it('retry still polls the status endpoint and updates the header badge on completion', async () => {
      const mockResult = createMockAuditResult({
        autoTagStatus: 'failed',
        autoTagError: 'Adobe API timeout',
        taggerSource: null,
      });

      let statusCallCount = 0;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) {
          statusCallCount += 1;
          if (statusCallCount === 1) {
            return Promise.resolve({ data: { data: { status: 'failed', error: 'Adobe API timeout' } } });
          }
          if (statusCallCount === 2) {
            return Promise.resolve({ data: { data: { status: 'processing' } } });
          }
          return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        }
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockResolvedValue({ data: { data: {} } });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText('Auto-tag failed')).toBeInTheDocument();
      });

      const retryButton = await screen.findByRole('button', { name: /^retry$/i });

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(retryButton);
          // Retry POST kicks off; the poll interval (5s) runs until terminal.
          await vi.advanceTimersByTimeAsync(5000); // -> 'processing'
          await vi.advanceTimersByTimeAsync(5000); // -> 'complete'
        });

        expect(statusCallCount).toBeGreaterThanOrEqual(3);
      } finally {
        vi.useRealTimers();
      }

      await waitFor(() => {
        expect(screen.getByText(/Auto-tagged: Adobe AutoTag/)).toBeInTheDocument();
      });
    });
  });

  describe('Apply Fixes bulk-apply trigger', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;

    const mockAiResponse = (suggestions: Array<{ issueId: string; applyMode: string; status: string }>) => ({
      data: {
        data: {
          suggestions: suggestions.map((s, i) => ({
            id: `sugg-${i}`,
            jobId,
            issueId: s.issueId,
            suggestionType: 'alt-text',
            value: 'A description',
            guidance: null,
            confidence: 0.9,
            rationale: 'because',
            model: 'gemini',
            applyMode: s.applyMode,
            status: s.status,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          })),
          analyzed: suggestions.length,
          total: suggestions.length,
          status: 'complete',
        },
      },
    });

    it('counts both approved and pending apply-to-pdf suggestions toward the bulk-apply button, excluding guidance-only', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(mockAiResponse([
          { issueId: '1', applyMode: 'apply-to-pdf', status: 'approved' },
          { issueId: '2', applyMode: 'apply-to-pdf', status: 'approved' },
          { issueId: '3', applyMode: 'apply-to-pdf', status: 'pending' },
          { issueId: '4', applyMode: 'guidance-only', status: 'approved' },
        ]));
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByRole('button', { name: /Apply Fixes \(3\)/ })).toBeInTheDocument();
    });

    it('shows the bulk-apply button for a freshly-analyzed job where nothing has been individually approved yet (regression: was unreachable)', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(mockAiResponse([
          { issueId: '1', applyMode: 'apply-to-pdf', status: 'pending' },
        ]));
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByRole('button', { name: /Apply Fixes \(1\)/ })).toBeInTheDocument();
    });

    it('hides the bulk-apply button when there are no eligible apply-to-pdf suggestions at all', async () => {
      const mockResult = createMockAuditResult();

      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(mockAiResponse([
          { issueId: '1', applyMode: 'guidance-only', status: 'pending' },
        ]));
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /Apply Fixes/ })).not.toBeInTheDocument();
    });
  });

  describe('Post-fix validation completion refreshes the full page', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;
    const oneEligibleAiResponse = {
      data: {
        data: {
          suggestions: [{
            id: 'sugg-1',
            jobId,
            issueId: '1',
            suggestionType: 'alt-text',
            value: 'A description',
            guidance: null,
            confidence: 0.9,
            rationale: 'because',
            model: 'gemini',
            applyMode: 'apply-to-pdf',
            status: 'pending',
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          }],
          analyzed: 1,
          total: 1,
          status: 'complete',
        },
      },
    };

    beforeEach(() => {
      // PdfStatsCards persists each card's expand/collapse state to
      // localStorage — clear it so the Issues card (Total Issues, the
      // post-fix validation banner) starts expanded, as it does by default.
      localStorage.clear();
    });

    it('re-pulls Total Issues/Score once post-fix validation completes, without needing a manual reload (regression: used to stay frozen)', async () => {
      const preFixResult = createMockAuditResult({ score: 75, issues: createMockAuditResult().issues });
      const postFixResult = createMockAuditResult({ score: 90, issues: createMockAuditResult().issues.slice(0, 2) });

      let auditCallCount = 0;
      let statusCallCount = 0;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) {
          auditCallCount += 1;
          return Promise.resolve({ data: { data: auditCallCount === 1 ? preFixResult : postFixResult } });
        }
        if (url === statusUrl) {
          statusCallCount += 1;
          if (statusCallCount === 1) {
            return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
          }
          return Promise.resolve({
            data: {
              data: {
                status: 'complete',
                taggerSource: 'adobe',
                postRemediationStatus: 'complete',
                postRemediationAudit: { runAt: '2026-08-26T00:00:00.000Z', resolved: 12, remaining: 1092, regressions: 0, resolutionRate: 1.09 },
              },
            },
          });
        }
        if (url === aiUrl) return Promise.resolve(oneEligibleAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByText('75')).toBeInTheDocument();
      const applyFixesButton = await screen.findByRole('button', { name: /Apply Fixes \(1\)/ });

      // The poll interval must be created under fake timers, or advancing
      // fake time afterward has no effect on it — so switch before the
      // clicks that start it, matching the "retry" polling test above.
      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(applyFixesButton);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'Mock Apply All' }));
          await vi.advanceTimersByTimeAsync(5000);
        });
      } finally {
        vi.useRealTimers();
      }

      await waitFor(() => {
        expect(auditCallCount).toBe(2);
      });
      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument();
      });
      expect(screen.queryByText('75')).not.toBeInTheDocument();
    });

    it('does not re-pull the audit result when post-fix validation fails, keeping the last known-good numbers', async () => {
      const preFixResult = createMockAuditResult({ score: 75 });

      let auditCallCount = 0;
      let statusCallCount = 0;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) {
          auditCallCount += 1;
          return Promise.resolve({ data: { data: preFixResult } });
        }
        if (url === statusUrl) {
          statusCallCount += 1;
          if (statusCallCount === 1) {
            return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
          }
          return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe', postRemediationStatus: 'failed' } } });
        }
        if (url === aiUrl) return Promise.resolve(oneEligibleAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByText('75')).toBeInTheDocument();
      const applyFixesButton = await screen.findByRole('button', { name: /Apply Fixes \(1\)/ });

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(applyFixesButton);
        });
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'Mock Apply All' }));
          await vi.advanceTimersByTimeAsync(5000);
        });
      } finally {
        vi.useRealTimers();
      }

      await waitFor(() => {
        expect(screen.getByText('Post-fix validation failed')).toBeInTheDocument();
      });
      expect(auditCallCount).toBe(1);
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('Re-run AI Analysis (primary button row)', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;
    const completeAiResponse = {
      data: {
        data: {
          suggestions: [],
          analyzed: 0,
          total: 0,
          status: 'complete',
          stats: {
            gemini: { totalTokens: 100, estimatedCostUsd: 0.01 },
            claude: { totalTokens: 0, estimatedCostUsd: 0 },
            totalTokens: 100,
            totalCostUsd: 0.01,
          },
        },
      },
    };

    function mockCommonGets() {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(completeAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
    }

    beforeEach(() => {
      localStorage.clear();
    });

    it('POSTs with no overrides when the color-contrast checkbox is left unchecked', async () => {
      mockCommonGets();
      mockApi.post.mockResolvedValue({ data: { data: { status: 'processing', total: 5, message: 'started' } } });

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      // The initial fetchAiSuggestions() request must resolve (enabling the
      // button) before clicking it — done under real timers, since waitFor's
      // polling doesn't work under fake ones.
      await waitFor(() => expect(rerunButton).not.toBeDisabled());
      const aiCallsBefore = mockApi.get.mock.calls.filter(([url]) => url === aiUrl).length;

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(rerunButton);
          await vi.advanceTimersByTimeAsync(3000);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(mockApi.post).toHaveBeenCalledWith(aiUrl, undefined);
      const aiCallsAfter = mockApi.get.mock.calls.filter(([url]) => url === aiUrl).length;
      expect(aiCallsAfter).toBeGreaterThan(aiCallsBefore);
    });

    it('POSTs the colorContrastMode override when the checkbox is checked first', async () => {
      mockCommonGets();
      mockApi.post.mockResolvedValue({ data: { data: { status: 'processing', total: 5, message: 'started' } } });

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      await waitFor(() => expect(rerunButton).not.toBeDisabled());
      fireEvent.click(screen.getByRole('checkbox', { name: 'Include color-contrast auto-fix on re-run' }));

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(rerunButton);
          await vi.advanceTimersByTimeAsync(3000);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(mockApi.post).toHaveBeenCalledWith(aiUrl, { overrides: { colorContrastMode: 'apply-to-pdf' } });
    });

    it('clicking the checkbox label text toggles it exactly once (regression: a native <label> would double-toggle via its own click-forwarding to the nested button)', async () => {
      mockCommonGets();
      renderWithRouter(jobId);

      await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      const checkbox = screen.getByRole('checkbox', { name: 'Include color-contrast auto-fix on re-run' });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(screen.getByText('Include color-contrast auto-fix'));
      expect(checkbox).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(screen.getByText('Include color-contrast auto-fix'));
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('disables the button while the trigger request is in flight, then hands off to the Analyzing state on success', async () => {
      mockCommonGets();
      let resolvePost!: (value: unknown) => void;
      mockApi.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      await waitFor(() => expect(rerunButton).not.toBeDisabled());

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(rerunButton);
        });

        expect(screen.getByRole('button', { name: /Re-running…/ })).toBeDisabled();

        await act(async () => {
          resolvePost({ data: { data: { status: 'processing', total: 5, message: 'started' } } });
          await vi.advanceTimersByTimeAsync(0);
        });

        // On success the handler sets isAnalyzingAi(true) — the button stays
        // present (it lives in the button row now, not gated by the AI
        // Analysis card's internal render branch) but disables with a tooltip.
        expect(screen.getByRole('button', { name: 'Re-run AI Analysis' })).toBeDisabled();
        expect(screen.getByText(/Analyzing/)).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('re-enables the button and does not crash if the trigger request fails', async () => {
      mockCommonGets();
      mockApi.post.mockRejectedValue(new Error('500'));

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      await waitFor(() => expect(rerunButton).not.toBeDisabled());
      await act(async () => {
        fireEvent.click(rerunButton);
      });

      expect(mockApi.post).toHaveBeenCalledWith(aiUrl, undefined);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Re-run AI Analysis' })).not.toBeDisabled();
      });
    });

    it('is disabled (not hidden) from page load when AI analysis is already running (regression: the old link used to disappear entirely here — the relocated button stays visible, disabled, with an explanatory title)', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve({ data: { data: { suggestions: [], analyzed: 2, total: 5, status: 'processing' } } });
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      expect(rerunButton).toBeDisabled();
      expect(rerunButton).toHaveAttribute('title', 'AI analysis is already running');
    });

    it('stays disabled until the initial AI status request resolves, even if that takes a while (regression: isAnalyzingAi starts false, so a slow initial fetch used to leave the button clickable before the real status was known)', async () => {
      const mockResult = createMockAuditResult();
      let resolveAiStatus!: (value: unknown) => void;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return new Promise((resolve) => { resolveAiStatus = resolve; });
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      const rerunButton = await screen.findByRole('button', { name: 'Re-run AI Analysis' });
      expect(rerunButton).toBeDisabled();
      expect(rerunButton).toHaveAttribute('title', 'Loading AI analysis status…');

      await act(async () => {
        resolveAiStatus(completeAiResponse);
      });

      await waitFor(() => {
        expect(rerunButton).not.toBeDisabled();
      });
      expect(rerunButton).not.toHaveAttribute('title');
    });
  });

  describe('Category and AI action filters', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;

    type CategorizedIssue = PdfAuditIssue & { category: string };

    const issueA: CategorizedIssue = { ...createMockIssueLike('a', 1, 'structure') };
    const issueB: CategorizedIssue = { ...createMockIssueLike('b', 2, 'contrast') };
    const issueC: CategorizedIssue = { ...createMockIssueLike('c', 3, 'table-structure') };
    const issueD: CategorizedIssue = { ...createMockIssueLike('d', 4, 'contrast') };

    function createMockIssueLike(id: string, pageNumber: number, category: string): CategorizedIssue {
      return {
        id,
        ruleId: `RULE-${id}`,
        severity: 'moderate',
        message: `Test issue ${id}`,
        description: `Test description for issue ${id}`,
        pageNumber,
        category,
      } as CategorizedIssue;
    }

    function mockAiSuggestion(issueId: string, applyMode: string, status: string) {
      return {
        id: `sugg-${issueId}`,
        jobId,
        issueId,
        suggestionType: 'alt-text',
        value: 'A description',
        guidance: null,
        confidence: 0.9,
        rationale: 'because',
        model: 'gemini',
        applyMode,
        status,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };
    }

    function setupMocks() {
      // b: fixable now (apply-to-pdf, pending). c: guidance-only. d: already applied (apply-to-pdf, applied).
      const mockResult = createMockAuditResult({ issues: [issueA, issueB, issueC, issueD] });
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) {
          return Promise.resolve({
            data: {
              data: {
                suggestions: [
                  mockAiSuggestion('b', 'apply-to-pdf', 'pending'),
                  mockAiSuggestion('c', 'guidance-only', 'pending'),
                  mockAiSuggestion('d', 'apply-to-pdf', 'applied'),
                ],
                analyzed: 3,
                total: 3,
                status: 'complete',
              },
            },
          });
        }
        return Promise.resolve({ data: { data: {} } });
      });
    }

    function visibleIssueIds(): string[] {
      return screen.getAllByTestId(/^issue-card-/).map((el) => el.getAttribute('data-testid')!.replace('issue-card-', ''));
    }

    it('renders category chips with live counts, omitting categories with no issues', async () => {
      setupMocks();
      renderWithRouter(jobId);

      await screen.findByText('test-document.pdf');

      expect(await screen.findByRole('button', { name: 'Structure (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Contrast (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tables (1)' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Metadata/ })).not.toBeInTheDocument();
    });

    it('renders live counts on every AI action chip', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      // b: apply-to-pdf/pending (fixable). c: guidance-only. d: apply-to-pdf/applied.
      expect(await screen.findByRole('button', { name: 'All (3)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fixable now (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guidance only (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Applied (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rejected (0)' })).toBeInTheDocument();
    });

    it('multi-selects categories as a union, and toggling one off narrows back', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      const contrastChip = await screen.findByRole('button', { name: 'Contrast (2)' });
      fireEvent.click(contrastChip);
      await waitFor(() => {
        expect(visibleIssueIds().sort()).toEqual(['b', 'd']);
      });

      const structureChip = screen.getByRole('button', { name: 'Structure (1)' });
      fireEvent.click(structureChip);
      await waitFor(() => {
        expect(visibleIssueIds().sort()).toEqual(['a', 'b', 'd']);
      });

      fireEvent.click(contrastChip);
      await waitFor(() => {
        expect(visibleIssueIds().sort()).toEqual(['a']);
      });
    });

    it('"Fixable now" shows only apply-to-pdf suggestions not yet applied/rejected', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      fireEvent.click(await screen.findByRole('button', { name: 'Fixable now (1)' }));
      await waitFor(() => {
        expect(visibleIssueIds()).toEqual(['b']);
      });
    });

    it('"Applied" and "Guidance only" each isolate the matching suggestions', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      fireEvent.click(await screen.findByRole('button', { name: 'Applied (1)' }));
      await waitFor(() => {
        expect(visibleIssueIds()).toEqual(['d']);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guidance only (1)' }));
      await waitFor(() => {
        expect(visibleIssueIds()).toEqual(['c']);
      });
    });

    it('combines a category chip and the AI action filter with AND, not OR', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      fireEvent.click(await screen.findByRole('button', { name: 'Contrast (2)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fixable now (1)' }));

      await waitFor(() => {
        // Contrast has b (pending) and d (applied) — only b is still fixable.
        expect(visibleIssueIds()).toEqual(['b']);
      });
    });

    it('shows a dismissible checkpoint pill when a Matterhorn checkpoint is clicked, unchanged mechanism', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      fireEvent.click(screen.getByText('Click Checkpoint'));

      expect(await screen.findByText('Checkpoint 01')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Clear checkpoint 01 filter'));
      await waitFor(() => {
        expect(screen.queryByText('Checkpoint 01')).not.toBeInTheDocument();
      });
    });

    it('Clear resets categories and AI action along with the rest of the filters', async () => {
      setupMocks();
      renderWithRouter(jobId);
      await screen.findByText('test-document.pdf');

      fireEvent.click(await screen.findByRole('button', { name: 'Contrast (2)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fixable now (1)' }));
      await waitFor(() => {
        expect(visibleIssueIds()).toEqual(['b']);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

      await waitFor(() => {
        expect(visibleIssueIds().sort()).toEqual(['a', 'b', 'c', 'd']);
      });
    });
  });

  describe('Re-run Audit (current job)', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;
    const reauditUrl = `/pdf/${jobId}/remediation/re-audit-current`;
    const emptyAiResponse = { data: { data: { suggestions: [], analyzed: 0, total: 0, status: 'complete' } } };

    it('re-runs the audit in place (no navigation away) and refreshes the displayed results — regression: used to just navigate to /pdf', async () => {
      let auditCallCount = 0;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) {
          auditCallCount += 1;
          const score = auditCallCount === 1 ? 75 : 90;
          return Promise.resolve({ data: { data: createMockAuditResult({ score }) } });
        }
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockResolvedValue({ data: { data: {} } });

      renderWithRouter(jobId);

      await screen.findByText('75');

      fireEvent.click(screen.getByRole('button', { name: 'Re-run Audit' }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(reauditUrl);
      });
      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument();
      });

      expect(auditCallCount).toBe(2);
      expect(screen.queryByText('Upload page')).not.toBeInTheDocument();
    });

    it('shows a disabled "Re-running…" state while the request is in flight, then re-enables', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      let resolvePost!: (value: unknown) => void;
      mockApi.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));

      renderWithRouter(jobId);

      const reRunButton = await screen.findByRole('button', { name: 'Re-run Audit' });
      fireEvent.click(reRunButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Re-running…/ })).toBeDisabled();
      });

      await act(async () => {
        resolvePost({ data: { data: {} } });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Re-run Audit' })).not.toBeDisabled();
      });
    });

    it('re-fetches job flags after a manual Re-run Audit succeeds, so the checklist picks up the new lastReauditAt (regression: manual re-audits never touch postRemediationAudit, so this was the only freshness signal available)', async () => {
      const jobsUrl = `/jobs/${jobId}`;
      const mockResult = createMockAuditResult();
      let jobsCallCount = 0;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        if (url === jobsUrl) {
          jobsCallCount += 1;
          return Promise.resolve({ data: { data: { output: { lastReauditAt: `2026-08-2${jobsCallCount}T00:00:00.000Z` } } } });
        }
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockResolvedValue({ data: { data: {} } });

      renderWithRouter(jobId);

      const reRunButton = await screen.findByRole('button', { name: 'Re-run Audit' });
      await waitFor(() => {
        expect(jobsCallCount).toBe(1);
      });

      fireEvent.click(reRunButton);

      await waitFor(() => {
        expect(jobsCallCount).toBe(2);
      });
    });

    it('shows an error toast and re-enables the button if the re-audit request fails', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe' } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockRejectedValue(new Error('500'));

      renderWithRouter(jobId);

      const reRunButton = await screen.findByRole('button', { name: 'Re-run Audit' });
      fireEvent.click(reRunButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Re-run Audit' })).not.toBeDisabled();
      });
    });
  });

  describe('Manual remediation time log', () => {
    const jobId = 'job-123';
    const auditUrl = `/pdf/job/${jobId}/audit/result`;
    const statusUrl = `/pdf/${jobId}/auto-tag/status`;
    const aiUrl = `/pdf/${jobId}/ai-analysis`;
    const timeUrl = `/pdf/${jobId}/manual-remediation-time`;
    const emptyAiResponse = { data: { data: { suggestions: [], analyzed: 0, total: 0, status: 'complete' } } };

    it('is visible and usable with zero guidance-only items pending (regression: must not be gated on checklist step 4)', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        // No pending guidance-only suggestions and no acknowledgment — step 4
        // would read "Done", not "Not started"/"skipped" — the affordance
        // must still show up regardless.
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe', manualRemediationMs: 25 * 60000 } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByText(/25m/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Log time' })).toBeInTheDocument();
    });

    it('logs time and updates the running total shown on the page', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        if (url === statusUrl) return Promise.resolve({ data: { data: { status: 'complete', taggerSource: 'adobe', manualRemediationMs: 0 } } });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockImplementation((url: string) => {
        if (url === timeUrl) return Promise.resolve({ data: { data: { totalMinutes: 30, log: [] } } });
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      expect(await screen.findByText(/0m/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Log time' }));
      fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '30' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(timeUrl, { minutes: 30 });
      });
      await waitFor(() => {
        expect(screen.getByText(/30m/)).toBeInTheDocument();
      });
    });

    it('preserves a submitted total against a slower auto-tag status fetch, whether it resolves before or after the submit (regression: onLogged used to silently drop the total when autoTagInfo was still null, and a late status response could overwrite a fresher submitted total)', async () => {
      const mockResult = createMockAuditResult();
      let resolveStatus!: (value: unknown) => void;
      mockApi.get.mockImplementation((url: string) => {
        if (url === auditUrl) return Promise.resolve({ data: { data: mockResult } });
        // Still in flight when the operator submits — autoTagInfo is null.
        if (url === statusUrl) return new Promise((resolve) => { resolveStatus = resolve; });
        if (url === aiUrl) return Promise.resolve(emptyAiResponse);
        return Promise.resolve({ data: { data: {} } });
      });
      mockApi.post.mockImplementation((url: string) => {
        if (url === timeUrl) return Promise.resolve({ data: { data: { totalMinutes: 20, log: [] } } });
        return Promise.resolve({ data: { data: {} } });
      });

      renderWithRouter(jobId);

      const logTimeButton = await screen.findByRole('button', { name: 'Log time' });
      fireEvent.click(logTimeButton);
      fireEvent.change(screen.getByPlaceholderText('Minutes'), { target: { value: '20' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText(/20m/)).toBeInTheDocument();
      });

      // The status fetch finally resolves with an older (lower) total — must
      // not stomp the fresher submitted value.
      await act(async () => {
        resolveStatus({ data: { data: { status: 'complete', taggerSource: 'adobe', manualRemediationMs: 0 } } });
      });

      expect(screen.getByText(/20m/)).toBeInTheDocument();
    });
  });
});
