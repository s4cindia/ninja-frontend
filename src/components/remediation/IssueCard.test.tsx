import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueCard, type AiAnalysis } from './IssueCard';
import { api } from '@/services/api';
import type { PdfAuditIssue } from '@/types/pdf.types';

// Keeps the real (pure) getErrorMessage/getRemediationCycleLockDetails/
// remediationCycleSourceMessage — a blanket automock would stub these to
// return undefined, making tests of the 409-lock-conflict handling meaningless.
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Mock EPUB/Generic issue
const mockEpubIssue = {
  id: 'issue-1',
  code: 'EPUB-001',
  message: 'Missing alternative text for image',
  severity: 'critical',
  confidence: 0.98,
  fixType: 'autofix' as const,
  status: 'pending',
  location: 'chapter1.xhtml, line 42',
  source: 'js-auditor',
};

// Mock PDF issue
const mockPdfIssue: PdfAuditIssue = {
  id: 'pdf-issue-1',
  ruleId: 'PDF-ALT-001',
  severity: 'critical',
  message: 'Image missing alternative text',
  description: 'Figure element does not have alternative text',
  pageNumber: 5,
  elementPath: '/Document/Page[5]/Figure[1]',
  matterhornCheckpoint: '01-003',
  wcagCriteria: ['1.1.1'],
  suggestedFix: 'Add Alt attribute to Figure element',
};

describe('IssueCard', () => {
  describe('EPUB/Generic Issues', () => {
    it('renders basic EPUB issue information', () => {
      renderWithQuery(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('EPUB-001')).toBeInTheDocument();
      expect(screen.getByText('Missing alternative text for image')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('displays location for EPUB issues', () => {
      renderWithQuery(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('chapter1.xhtml, line 42')).toBeInTheDocument();
    });

    it('shows confidence badge for EPUB issues', () => {
      renderWithQuery(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('98% confident')).toBeInTheDocument();
    });

    it('shows fix type badge for EPUB issues', () => {
      renderWithQuery(<IssueCard issue={mockEpubIssue} />);

      expect(screen.getByText('Auto-Fix')).toBeInTheDocument();
    });

    it('applies severity-based styling', () => {
      const { container } = renderWithQuery(<IssueCard issue={mockEpubIssue} />);

      const card = container.querySelector('.border-red-200.bg-red-50');
      expect(card).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockEpubIssue} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockEpubIssue} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('PDF Issues', () => {
    it('renders basic PDF issue information', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('PDF-ALT-001')).toBeInTheDocument();
      expect(screen.getByText('Image missing alternative text')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('displays PDF icon for PDF issues', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      const icon = screen.getByLabelText('PDF issue');
      expect(icon).toBeInTheDocument();
    });

    it('displays page number badge', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('Page 5')).toBeInTheDocument();
    });

    it('displays element path instead of location', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      expect(screen.getByText('/Document/Page[5]/Figure[1]')).toBeInTheDocument();
    });

    it('shows Matterhorn checkpoint when showMatterhorn is true', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} showMatterhorn={true} />);

      expect(screen.getByText('01-003')).toBeInTheDocument();
    });

    it('hides Matterhorn checkpoint when showMatterhorn is false', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} showMatterhorn={false} />);

      expect(screen.queryByText('01-003')).not.toBeInTheDocument();
    });

    it('calls onPageClick when page badge is clicked', () => {
      const onPageClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockPdfIssue} onPageClick={onPageClick} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).toHaveBeenCalledWith(5);
    });

    it('does not trigger onPageClick when page badge click is disabled', () => {
      const onPageClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).not.toHaveBeenCalled();
    });

    it('opens Matterhorn documentation link in new tab', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} showMatterhorn={true} />);

      const link = screen.getByText('01-003').closest('a');
      expect(link).toHaveAttribute('href', 'https://www.pdfa.org/resource/the-matterhorn-protocol/');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not show fix type or confidence badges for PDF issues', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} />);

      expect(screen.queryByText('Auto-Fix')).not.toBeInTheDocument();
      expect(screen.queryByText(/confident/)).not.toBeInTheDocument();
    });

    it('handles PDF issue without page number', () => {
      const issueWithoutPage = { ...mockPdfIssue, pageNumber: undefined };
      renderWithQuery(<IssueCard issue={issueWithoutPage} />);

      expect(screen.queryByText(/^Page \d+$/)).not.toBeInTheDocument();
    });

    it('handles PDF issue without Matterhorn checkpoint', () => {
      const issueWithoutMatterhorn = { ...mockPdfIssue, matterhornCheckpoint: undefined };
      renderWithQuery(<IssueCard issue={issueWithoutMatterhorn} showMatterhorn={true} />);

      expect(screen.queryByText(/01-003/)).not.toBeInTheDocument();
    });

    it('stops event propagation when page badge is clicked', () => {
      const onClick = vi.fn();
      const onPageClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockPdfIssue} onClick={onClick} onPageClick={onPageClick} />);

      const pageBadge = screen.getByText('Page 5');
      fireEvent.click(pageBadge);

      expect(onPageClick).toHaveBeenCalledWith(5);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('stops event propagation when Matterhorn link is clicked', () => {
      const onClick = vi.fn();
      renderWithQuery(<IssueCard issue={mockPdfIssue} onClick={onClick} showMatterhorn={true} />);

      const matterhornLink = screen.getByText('01-003');
      fireEvent.click(matterhornLink);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Different Severity Levels', () => {
    it.each([
      ['critical', 'bg-red-50', 'bg-red-100'],
      ['serious', 'bg-orange-50', 'bg-orange-100'],
      ['moderate', 'bg-yellow-50', 'bg-yellow-100'],
      ['minor', 'bg-blue-50', 'bg-blue-100'],
    ])('applies correct styling for %s severity', (severity, bgClass, badgeClass) => {
      const issue = { ...mockEpubIssue, severity };
      const { container } = renderWithQuery(<IssueCard issue={issue} />);

      expect(container.querySelector(`.${bgClass}`)).toBeInTheDocument();
      expect(container.querySelector(`.${badgeClass}`)).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithQuery(
        <IssueCard issue={mockEpubIssue} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles issue without optional fields', () => {
      const minimalIssue = {
        id: 'minimal-1',
        code: 'TEST-001',
        message: 'Test issue',
        severity: 'minor',
        status: 'pending',
      };

      renderWithQuery(<IssueCard issue={minimalIssue} />);

      expect(screen.getByText('TEST-001')).toBeInTheDocument();
      expect(screen.getByText('Test issue')).toBeInTheDocument();
    });
  });

  describe('Comparison Study remediation-timer wiring', () => {
    const mockApi = api as Mocked<typeof api>;
    const mockAiSuggestion: AiAnalysis = {
      id: 'ai-1',
      jobId: 'job-1',
      issueId: 'pdf-issue-1',
      suggestionType: 'alt-text',
      value: 'A description',
      guidance: null,
      confidence: 0.92,
      rationale: 'because',
      model: 'gemini',
      applyMode: 'apply-to-pdf',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    beforeEach(() => {
      mockApi.post.mockReset();
      mockApi.patch.mockReset();
    });

    it('calls recordApplied after a successful Apply', async () => {
      mockApi.post.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'applied' } } });
      const recordApplied = vi.fn();
      renderWithQuery(
        <IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} recordApplied={recordApplied} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => expect(recordApplied).toHaveBeenCalledTimes(1));
    });

    it('calls recordSuggestionDecision("rejected") after a successful Dismiss', async () => {
      mockApi.patch.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'rejected' } } });
      const recordSuggestionDecision = vi.fn();
      renderWithQuery(
        <IssueCard
          issue={mockPdfIssue}
          jobId="job-1"
          aiSuggestion={mockAiSuggestion}
          recordSuggestionDecision={recordSuggestionDecision}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      await waitFor(() => expect(recordSuggestionDecision).toHaveBeenCalledWith('rejected'));
    });

    it('does not record a decision when the resulting status is neither approved nor rejected', async () => {
      // Guards the "check the actual status, don't assume" requirement — this
      // mutation may be reused for other transitions, so a response that isn't
      // a clean approve/reject must not be misrecorded as either.
      mockApi.patch.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'pending' } } });
      const recordSuggestionDecision = vi.fn();
      renderWithQuery(
        <IssueCard
          issue={mockPdfIssue}
          jobId="job-1"
          aiSuggestion={mockAiSuggestion}
          recordSuggestionDecision={recordSuggestionDecision}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

      await waitFor(() => expect(mockApi.patch).toHaveBeenCalled());
      expect(recordSuggestionDecision).not.toHaveBeenCalled();
    });

    it('does not throw when recorder props are omitted (IssueCard is also used outside Comparison Study)', async () => {
      mockApi.post.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'applied' } } });
      renderWithQuery(<IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} />);

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => expect(mockApi.post).toHaveBeenCalled());
    });
  });

  describe('Remediation-cycle lock gating', () => {
    const mockApi = api as Mocked<typeof api>;
    const mockAiSuggestion: AiAnalysis = {
      id: 'ai-1',
      jobId: 'job-1',
      issueId: 'pdf-issue-1',
      suggestionType: 'alt-text',
      value: 'A description',
      guidance: null,
      confidence: 0.92,
      rationale: 'because',
      model: 'gemini',
      applyMode: 'apply-to-pdf',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    beforeEach(() => {
      mockApi.post.mockReset();
      mockApi.patch.mockReset();
    });

    it('regression: the Apply button is disabled and explains what is running when remediationCycleInProgress is true — Approve/Dismiss stay enabled since they do not touch the PDF', () => {
      renderWithQuery(
        <IssueCard
          issue={mockPdfIssue}
          jobId="job-1"
          aiSuggestion={mockAiSuggestion}
          remediationCycleInProgress={true}
          remediationCycleSource="apply_all"
        />
      );

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeDisabled();
      expect(applyButton).toHaveAttribute('title', expect.stringMatching(/Applying fixes is still in progress/));
      expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Dismiss' })).not.toBeDisabled();
    });

    it('regression: a 409 REMEDIATION_CYCLE_IN_PROGRESS error on Apply shows a transient message and notifies the caller to re-poll, instead of a generic failure toast', async () => {
      mockApi.post.mockRejectedValue({
        isAxiosError: true,
        message: 'Conflict',
        response: { status: 409, data: { error: { code: 'REMEDIATION_CYCLE_IN_PROGRESS', message: 'locked', details: { source: 'apply_single' } } } },
      });
      const onApplyError = vi.fn();
      renderWithQuery(
        <IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} onApplyError={onApplyError} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => expect(onApplyError).toHaveBeenCalledTimes(1));
    });

    it('regression: a non-lock Apply error still notifies the caller to re-poll (any error could mean a cycle just started server-side)', async () => {
      mockApi.post.mockRejectedValue({ isAxiosError: true, message: 'Network Error', response: undefined });
      const onApplyError = vi.fn();
      renderWithQuery(
        <IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} onApplyError={onApplyError} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => expect(onApplyError).toHaveBeenCalledTimes(1));
    });
  });

  describe('Approve action (issue #295 — Apply All Approved was unreachable)', () => {
    const mockApi = api as Mocked<typeof api>;
    const mockAiSuggestion: AiAnalysis = {
      id: 'ai-1',
      jobId: 'job-1',
      issueId: 'pdf-issue-1',
      suggestionType: 'alt-text',
      value: 'A description',
      guidance: null,
      confidence: 0.92,
      rationale: 'because',
      model: 'gemini',
      applyMode: 'apply-to-pdf',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    beforeEach(() => {
      mockApi.post.mockReset();
      mockApi.patch.mockReset();
    });

    it('shows Approve, Apply, and Dismiss for a pending apply-to-pdf suggestion', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} />);

      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });

    it('clicking Approve PATCHes status: approved', async () => {
      mockApi.patch.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'approved' } } });
      renderWithQuery(<IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} />);

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith('/pdf/job-1/ai-analysis/pdf-issue-1', { status: 'approved' });
      });
    });

    it('records an "accepted" suggestion decision after approving', async () => {
      mockApi.patch.mockResolvedValue({ data: { data: { ...mockAiSuggestion, status: 'approved' } } });
      const recordSuggestionDecision = vi.fn();
      renderWithQuery(
        <IssueCard
          issue={mockPdfIssue}
          jobId="job-1"
          aiSuggestion={mockAiSuggestion}
          recordSuggestionDecision={recordSuggestionDecision}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

      await waitFor(() => expect(recordSuggestionDecision).toHaveBeenCalledWith('accepted'));
    });

    it('shows an Approved indicator with Apply/Dismiss still available, and no Approve button, once approved', () => {
      renderWithQuery(
        <IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={{ ...mockAiSuggestion, status: 'approved' }} />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    });
  });

  describe('disableManualActions (Comparison Study Auto Mode)', () => {
    const mockAiSuggestion: AiAnalysis = {
      id: 'ai-1',
      jobId: 'job-1',
      issueId: 'pdf-issue-1',
      suggestionType: 'alt-text',
      value: 'A description',
      guidance: null,
      confidence: 0.92,
      rationale: 'because',
      model: 'gemini',
      applyMode: 'apply-to-pdf',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    it('disables Approve, Apply, and Dismiss when disableManualActions is true, with an explanatory title', () => {
      renderWithQuery(
        <IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} disableManualActions={true} />
      );

      const approveButton = screen.getByRole('button', { name: 'Approve' });
      const applyButton = screen.getByRole('button', { name: 'Apply' });
      const dismissButton = screen.getByRole('button', { name: 'Dismiss' });

      expect(approveButton).toBeDisabled();
      expect(applyButton).toBeDisabled();
      expect(dismissButton).toBeDisabled();
      expect(approveButton).toHaveAttribute('title', expect.stringMatching(/Auto Remediation is running/));
      expect(applyButton).toHaveAttribute('title', expect.stringMatching(/Auto Remediation is running/));
      expect(dismissButton).toHaveAttribute('title', expect.stringMatching(/Auto Remediation is running/));
    });

    it('disables the already-approved state\'s Apply/Dismiss too, not just the pending Approve button', () => {
      renderWithQuery(
        <IssueCard
          issue={mockPdfIssue}
          jobId="job-1"
          aiSuggestion={{ ...mockAiSuggestion, status: 'approved' }}
          disableManualActions={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();
    });

    it('leaves Approve, Apply, and Dismiss enabled when disableManualActions is false (default)', () => {
      renderWithQuery(<IssueCard issue={mockPdfIssue} jobId="job-1" aiSuggestion={mockAiSuggestion} />);

      expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Dismiss' })).not.toBeDisabled();
    });
  });
});
