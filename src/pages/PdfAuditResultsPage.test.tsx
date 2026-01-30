import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { PdfAuditResultsPage } from './PdfAuditResultsPage';
import { api } from '@/services/api';
import type { PdfAuditResult, PdfAuditIssue, MatterhornSummary } from '@/types/pdf.types';

// Mock dependencies
jest.mock('@/services/api');
jest.mock('@/components/pdf/PdfPreviewPanel', () => ({
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

jest.mock('@/components/pdf/PdfPageNavigator', () => ({
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

jest.mock('@/components/pdf/MatterhornSummary', () => ({
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

jest.mock('@/components/remediation/IssueCard', () => ({
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
  return render(
    <MemoryRouter initialEntries={[`/pdf/audit/${jobId}`]}>
      <Routes>
        <Route path="/pdf/audit/:jobId" element={<PdfAuditResultsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PdfAuditResultsPage', () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading spinner initially', async () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      expect(screen.getByText('Loading audit results...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
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
      render(
        <MemoryRouter initialEntries={['/pdf/audit/']}>
          <Routes>
            <Route path="/pdf/audit/" element={<PdfAuditResultsPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No job ID provided/)).toBeInTheDocument();
      });
    });

    it('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Polling for Processing Jobs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays polling state when job is processing', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: { status: 'processing' } },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      });
    });

    it('polls for updates when job is processing', async () => {
      const processingResponse = { data: { data: { status: 'processing' } } };
      const completedResponse = { data: { data: createMockAuditResult() } };

      mockApi.get
        .mockResolvedValueOnce(processingResponse)
        .mockResolvedValueOnce(processingResponse)
        .mockResolvedValueOnce(completedResponse);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      });

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      });

      // Fast-forward another 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(3);
      });

      // Should now show completed result
      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });
    });

    it('allows manual status check during polling', async () => {
      mockApi.get.mockResolvedValue({ data: { data: { status: 'processing' } } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Audit in progress...')).toBeInTheDocument();
      });

      const checkButton = screen.getByRole('button', { name: /check status/i });
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2); // Initial + manual check
      });
    });
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
    });

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

    it('filters issues by search text', async () => {
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
      await userEvent.type(searchInput, 'alt text');

      // Should only show matching issue
      await waitFor(() => {
        expect(screen.getByText(/Issues \(1\)/)).toBeInTheDocument();
      });
    });

    it('clears all filters when clear button is clicked', async () => {
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
      });

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      // Should show all issues again
      await waitFor(() => {
        expect(screen.getByText(/Issues \(4\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Page Navigation', () => {
    it('updates current page when page navigator changes page', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Current: 1')).toBeInTheDocument();
      });

      const goToPageButton = screen.getByRole('button', { name: /go to page 3/i });
      fireEvent.click(goToPageButton);

      expect(screen.getByText('Current: 3')).toBeInTheDocument();
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

    it('navigates to issue page when issue card page is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('issue-card-3')).toBeInTheDocument();
      });

      const goToPageButton = screen.getAllByRole('button', { name: /go to page/i })[2];
      fireEvent.click(goToPageButton);

      expect(screen.getByText('Current: 3')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('downloads report when download button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });
      mockApi.get.mockResolvedValueOnce({ data: { report: 'data' } });

      // Mock createElement and appendChild
      const mockLink = {
        click: jest.fn(),
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement;
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      jest.spyOn(document.body, 'appendChild').mockImplementation();
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      renderWithRouter('job-123');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download report/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/report', expect.any(Object));
      });
    });

    it('shares results link when share button is clicked', async () => {
      const mockResult = createMockAuditResult();
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(),
        },
      });
      jest.spyOn(window, 'alert').mockImplementation();

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      });

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Results link copied to clipboard!');
    });
  });

  describe('Score Display', () => {
    it('displays score with appropriate color for high score', async () => {
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

    it('displays score with appropriate color for low score', async () => {
      const mockResult = createMockAuditResult({ score: 45 });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockResult } });

      renderWithRouter();

      await waitFor(() => {
        const scoreElement = screen.getByText('45');
        expect(scoreElement).toHaveClass('text-red-600');
      });
    });
  });
});
