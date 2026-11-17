import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HandoffNoteModal } from './HandoffNoteModal';
import { formatHandoffNote } from './handoff-note-text';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { HandoffNote } from '@/types/pdf-remediation.types';

vi.mock('@/services/pdf-remediation.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/pdf-remediation.service')>(
    '@/services/pdf-remediation.service'
  );
  return {
    ...actual,
    pdfRemediationService: {
      ...actual.pdfRemediationService,
      getHandoffNote: vi.fn(),
    },
  };
});

const mockGetHandoffNote = pdfRemediationService.getHandoffNote as unknown as ReturnType<typeof vi.fn>;

function buildNote(overrides?: Partial<HandoffNote>): HandoffNote {
  return {
    fileName: 'Karsaklian_189165_9781606497623.pdf',
    generatedAt: '2026-11-17T12:00:00.000Z',
    score: 97,
    totalRemaining: 2,
    remainingIssues: [
      { code: 'TOC-STRUCTURE-MISSING', disposition: 'manual', count: 5 },
      { code: 'MATTERHORN-13-001', disposition: 'auto-resolved', count: 2 },
    ],
    autoRemediation: {
      roundsCompleted: 2,
      maxRounds: 10,
      stopReason: 'converged',
      costSpentUsd: 0.0198,
      stoppedAt: '2026-11-17T04:44:50.000Z',
    },
    teamReview: null,
    ...overrides,
  };
}

describe('HandoffNoteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('does not fetch while closed', () => {
    render(<HandoffNoteModal isOpen={false} onClose={vi.fn()} jobId="job-1" />);
    expect(mockGetHandoffNote).not.toHaveBeenCalled();
  });

  it('does not fetch on open either -- requires the confirmation checkbox first', () => {
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);
    expect(mockGetHandoffNote).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('keeps Generate disabled until the confirmation checkbox is checked', () => {
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);
    expect(screen.getByRole('button', { name: /generate handoff note/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /generate handoff note/i })).toBeEnabled();
  });

  it('fetches only after the checkbox is checked and Generate is clicked', async () => {
    mockGetHandoffNote.mockResolvedValue(buildNote());
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));

    await waitFor(() => expect(mockGetHandoffNote).toHaveBeenCalledWith('job-1'));
    await screen.findByText('Karsaklian_189165_9781606497623.pdf');
  });

  it('shows a loading state while the fetch is in flight', async () => {
    let resolve!: (v: HandoffNote) => void;
    mockGetHandoffNote.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));

    expect(await screen.findByText('Generating…')).toBeInTheDocument();
    resolve(buildNote());
    await waitFor(() => expect(screen.queryByText('Generating…')).not.toBeInTheDocument());
  });

  it('shows an error message instead of crashing when the fetch fails', async () => {
    mockGetHandoffNote.mockRejectedValue(new Error('network blip'));
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));

    expect(await screen.findByText('network blip')).toBeInTheDocument();
  });

  it('shows the remaining-issues breakdown with human-readable disposition labels', async () => {
    mockGetHandoffNote.mockResolvedValue(buildNote());
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));

    expect(await screen.findByText('TOC-STRUCTURE-MISSING')).toBeInTheDocument();
    expect(screen.getByText(/×5 — needs manual review/)).toBeInTheDocument();
    expect(screen.getByText(/×2 — ready, pending your approval/)).toBeInTheDocument();
  });

  it('shows the most recent team review when present', async () => {
    mockGetHandoffNote.mockResolvedValue(buildNote({
      teamReview: { outcome: 'OK', reviewedAt: '2026-11-17T05:00:00.000Z', reviewedBy: 'Ambai Venkatesa', notes: null },
    }));
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));

    expect(await screen.findByText(/Ambai Venkatesa/)).toBeInTheDocument();
  });

  it('copies the formatted note, including the confirmation line, to the clipboard', async () => {
    const note = buildNote();
    mockGetHandoffNote.mockResolvedValue(note);
    render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));
    await screen.findByText('Karsaklian_189165_9781606497623.pdf');

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(formatHandoffNote(note, true)));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('resets the checkbox and any previously generated note when reopened', async () => {
    mockGetHandoffNote.mockResolvedValue(buildNote());
    const { rerender } = render(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));
    await screen.findByText('Karsaklian_189165_9781606497623.pdf');

    rerender(<HandoffNoteModal isOpen={false} onClose={vi.fn()} jobId="job-1" />);
    rerender(<HandoffNoteModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(screen.queryByText('Karsaklian_189165_9781606497623.pdf')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onClose when Cancel is clicked before generating', () => {
    const onClose = vi.fn();
    render(<HandoffNoteModal isOpen onClose={onClose} jobId="job-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Close is clicked after generating', async () => {
    mockGetHandoffNote.mockResolvedValue(buildNote());
    const onClose = vi.fn();
    render(<HandoffNoteModal isOpen onClose={onClose} jobId="job-1" />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate handoff note/i }));
    await screen.findByText('Karsaklian_189165_9781606497623.pdf');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
