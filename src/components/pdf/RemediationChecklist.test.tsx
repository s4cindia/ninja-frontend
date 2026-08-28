import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemediationChecklist } from './RemediationChecklist';
import { api } from '@/services/api';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { AiAnalysis } from '@/components/remediation/IssueCard';
import type { ComparisonTrialWithJob } from '@/types/comparisonStudy.types';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});
vi.mock('@/services/comparisonStudy.service');

const mockApi = api as Mocked<typeof api>;
const mockService = vi.mocked(comparisonStudyService);

function suggestion(overrides: Partial<AiAnalysis>): AiAnalysis {
  return {
    id: overrides.id ?? 's-1',
    jobId: 'job-123',
    issueId: overrides.issueId ?? 'issue-1',
    suggestionType: 'alt-text',
    value: 'a description',
    guidance: null,
    confidence: 0.9,
    rationale: 'because',
    model: 'gemini',
    applyMode: 'apply-to-pdf',
    status: 'pending',
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

function suggestionsMap(items: AiAnalysis[]): Map<string, AiAnalysis> {
  const map = new Map<string, AiAnalysis>();
  items.forEach(s => map.set(s.issueId, s));
  return map;
}

const baseProps = {
  jobId: 'job-123',
  aiAnalysisStatus: null as string | null,
  aiSuggestions: new Map<string, AiAnalysis>(),
  guidanceAcknowledgment: null,
  onGuidanceAcknowledged: vi.fn(),
  acrGenerated: false,
  pacReportGenerated: false,
  comparisonTrialId: null as string | null,
  userRole: 'ADMIN',
};

describe('RemediationChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('step 1 is always done, step 2 reflects aiAnalysisStatus', () => {
    render(<RemediationChecklist {...baseProps} aiAnalysisStatus="processing" />);

    expect(screen.getByText('1. Initial audit complete')).toBeInTheDocument();
    const step2Row = screen.getByText('2. Run AI Analysis').closest('div')!.parentElement!;
    expect(step2Row).toHaveTextContent('In progress');
  });

  it('step 3 is not-started until AI analysis completes, then reflects pending eligible suggestions', () => {
    const { rerender } = render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="processing"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'applied' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 3 stays in progress for an approved-but-not-yet-applied fix (regression: must not report done before Apply Fixes runs)', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'approved' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('In progress');
  });

  it('step 4 shows a live remaining count and a disabled confirm button until a note is entered', async () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([
          suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' }),
          suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'pending' }),
        ])}
      />
    );

    expect(screen.getByPlaceholderText('2 guidance-only item(s) remain — reason:')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Acknowledge & skip' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('2 guidance-only item(s) remain — reason:'), {
      target: { value: 'out of scope for this trial' },
    });
    expect(confirmButton).not.toBeDisabled();
  });

  it('submitting the guidance note POSTs to the acknowledgment endpoint and reports the result upward', async () => {
    const onAck = vi.fn();
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          note: 'out of scope',
          remainingCount: 1,
          acknowledgedAt: '2026-08-28T02:10:00.000Z',
          acknowledgedBy: 'user_abc123',
        },
      },
    });

    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
        onGuidanceAcknowledged={onAck}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('1 guidance-only item(s) remain — reason:'), {
      target: { value: 'out of scope' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge & skip' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/pdf/job-123/ai-analysis/guidance-acknowledgment',
        { note: 'out of scope' }
      );
    });
    expect(onAck).toHaveBeenCalledWith({
      note: 'out of scope',
      remainingCount: 1,
      acknowledgedAt: '2026-08-28T02:10:00.000Z',
      acknowledgedBy: 'user_abc123',
    });
  });

  it('shows step 4 as acknowledged (not fully done) when guidance items remain but an acknowledgment exists', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
        guidanceAcknowledgment={{
          note: 'SME review needed',
          remainingCount: 1,
          acknowledgedAt: '2026-08-28T02:10:00.000Z',
          acknowledgedBy: 'user_abc123',
        }}
      />
    );

    expect(screen.getByText('4. Resolve guidance-only items').closest('div')!.parentElement).toHaveTextContent('Acknowledged');
    expect(screen.getByText(/SME review needed/)).toBeInTheDocument();
  });

  it('step 5 reflects postRemediationStatus', () => {
    const { rerender } = render(<RemediationChecklist {...baseProps} postRemediationStatus={undefined} />);
    expect(screen.getByText('5. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('Not started');

    rerender(<RemediationChecklist {...baseProps} postRemediationStatus="pending" />);
    expect(screen.getByText('5. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(<RemediationChecklist {...baseProps} postRemediationStatus="complete" />);
    expect(screen.getByText('5. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 6 only shows Done once both ACR and PAC report are generated', () => {
    const { rerender } = render(<RemediationChecklist {...baseProps} acrGenerated pacReportGenerated={false} />);
    expect(screen.getByText('6. Generate compliance artifacts').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(<RemediationChecklist {...baseProps} acrGenerated pacReportGenerated />);
    expect(screen.getByText('6. Generate compliance artifacts').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 7 does not render when there is no linked comparison trial', () => {
    render(<RemediationChecklist {...baseProps} comparisonTrialId={null} />);
    expect(screen.queryByText(/Mark comparison trial complete/)).not.toBeInTheDocument();
  });

  it('step 7 renders, fetches trial status, and confirms via the validate endpoint for an admin/operator', async () => {
    const trial = { id: 'ct_xyz789', status: 'pdfxt_logged' } as ComparisonTrialWithJob;
    mockService.getTrial.mockResolvedValueOnce(trial);
    mockService.validateTrial.mockResolvedValueOnce({ ...trial, status: 'validated' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="ADMIN" />);

    await waitFor(() => {
      expect(mockService.getTrial).toHaveBeenCalledWith('ct_xyz789');
    });
    expect(screen.getByText(/7\. Mark comparison trial complete/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark trial complete' }));

    await waitFor(() => {
      expect(mockService.validateTrial).toHaveBeenCalledWith('ct_xyz789');
    });
    await waitFor(() => {
      expect(screen.getByText('7. Mark comparison trial complete').closest('div')!.parentElement).toHaveTextContent('Done');
    });
  });

  it('step 7 disables the confirm button and explains why for a non-admin/operator role', async () => {
    mockService.getTrial.mockResolvedValueOnce({ id: 'ct_xyz789', status: 'registered' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="VIEWER" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark trial complete' })).toBeDisabled();
    });
    expect(screen.getByText('Requires an Admin or Operator role.')).toBeInTheDocument();
  });

  it('step 7 disables the confirm button for an admin/operator until pdfxt data is logged (mirrors the trial workspace guard)', async () => {
    mockService.getTrial.mockResolvedValueOnce({ id: 'ct_xyz789', status: 'registered' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="ADMIN" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark trial complete' })).toBeDisabled();
    });
    expect(screen.getByText('Log pdfxt data first.')).toBeInTheDocument();
    expect(mockService.validateTrial).not.toHaveBeenCalled();
  });

  it('marks the first incomplete step as "Recommended next"', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus={null}
      />
    );

    // Step 1 is always done, so step 2 (Run AI Analysis) should be next.
    const step2Container = screen.getByText('2. Run AI Analysis').closest('div')!.parentElement!;
    expect(step2Container).toHaveTextContent('Recommended next');
    const step1Container = screen.getByText('1. Initial audit complete').closest('div')!.parentElement!;
    expect(step1Container).not.toHaveTextContent('Recommended next');
  });
});
