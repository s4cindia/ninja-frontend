import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { api } from '../api';
import {
  fetchCorpusStatus,
  updateCorpusStatus,
  ANNOTATION_STATUSES,
  STATUS_LABELS,
} from '../corpus-status.service';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('corpus-status.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCorpusStatus calls GET /calibration/corpus-status and returns unwrapped data', async () => {
    const mockResponse = {
      rows: [
        {
          serialNumber: 1,
          documentId: 'doc-1',
          filename: 'Aulakh.pdf',
          pageCount: 295,
          pagesAnnotated: 295,
          status: 'COMPLETED',
          statusOverride: null,
          primaryAnnotator: { userId: 'u1', displayName: 'Poornakala U', email: 'p@example.com' },
          otherAnnotatorCount: 0,
          hoursSpent: 5.5,
          lastUpdatedAt: '2026-04-29T10:00:00Z',
          statusNote: null,
        },
      ],
      generatedAt: '2026-05-08T12:00:00Z',
    };
    (api.get as Mock).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await fetchCorpusStatus();

    expect(api.get).toHaveBeenCalledWith('/calibration/corpus-status');
    expect(result).toEqual(mockResponse);
    expect(result.rows[0].status).toBe('COMPLETED');
  });

  it('updateCorpusStatus PUTs to the right path and encodes documentId', async () => {
    const mockRow = {
      serialNumber: 2,
      documentId: 'doc/with/slashes',
      filename: 'Foo.pdf',
      pageCount: 100,
      pagesAnnotated: 50,
      status: 'BLOCKED' as const,
      statusOverride: 'BLOCKED' as const,
      primaryAnnotator: null,
      otherAnnotatorCount: 0,
      hoursSpent: 0,
      lastUpdatedAt: '2026-05-08T12:00:00Z',
      statusNote: 'Engineering investigation pending',
    };
    (api.put as Mock).mockResolvedValueOnce({ data: { data: mockRow } });

    const result = await updateCorpusStatus('doc/with/slashes', {
      statusOverride: 'BLOCKED',
      statusNote: 'Engineering investigation pending',
    });

    expect(api.put).toHaveBeenCalledWith(
      '/admin/corpus/documents/doc%2Fwith%2Fslashes/status',
      { statusOverride: 'BLOCKED', statusNote: 'Engineering investigation pending' },
    );
    expect(result).toEqual(mockRow);
  });

  it('updateCorpusStatus accepts null statusOverride to clear', async () => {
    (api.put as Mock).mockResolvedValueOnce({ data: { data: {} } });
    await updateCorpusStatus('doc-1', { statusOverride: null });
    expect(api.put).toHaveBeenCalledWith(
      '/admin/corpus/documents/doc-1/status',
      { statusOverride: null },
    );
  });

  it('exports the 5 expected statuses', () => {
    expect(ANNOTATION_STATUSES).toEqual([
      'NOT_STARTED',
      'IN_PROGRESS',
      'PENDING_REVIEW',
      'COMPLETED',
      'BLOCKED',
    ]);
  });

  it('exports human-readable labels for each status', () => {
    expect(STATUS_LABELS.NOT_STARTED).toBe('Not Started');
    expect(STATUS_LABELS.IN_PROGRESS).toBe('In Progress');
    expect(STATUS_LABELS.PENDING_REVIEW).toBe('Pending Review');
    expect(STATUS_LABELS.COMPLETED).toBe('Complete');
    expect(STATUS_LABELS.BLOCKED).toBe('Blocked');
  });
});
