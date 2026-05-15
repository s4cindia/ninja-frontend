import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { api } from '../api';
import { issueDismissalService } from '../issue-dismissal.service';

vi.mock('../api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const DISMISSAL = {
  id: 'd-1',
  jobId: 'job-1',
  code: 'PRH-HASHTAG-NOT-CAMEL-CASE',
  location: 'OEBPS/Text/c1.xhtml',
  instanceKey: 'abc123',
  dismissedBy: 'user-1',
  dismissedAt: '2026-05-15T09:00:00Z',
  reason: 'Intentional brand hashtag',
};

describe('issueDismissalService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list() calls GET and returns the dismissals array', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: { dismissals: [DISMISSAL] } } });
    const result = await issueDismissalService.list('job-1');
    expect(api.get).toHaveBeenCalledWith('/jobs/job-1/issues/dismissals');
    expect(result).toEqual([DISMISSAL]);
  });

  it('create() POSTs the payload and returns the new dismissal', async () => {
    (api.post as Mock).mockResolvedValueOnce({ data: { data: { dismissal: DISMISSAL } } });
    const result = await issueDismissalService.create('job-1', {
      code: 'PRH-HASHTAG-NOT-CAMEL-CASE',
      location: 'OEBPS/Text/c1.xhtml',
      message: '#nytbestseller not in PascalCase',
      reason: 'Intentional brand hashtag',
    });
    expect(api.post).toHaveBeenCalledWith('/jobs/job-1/issues/dismissals', expect.objectContaining({ code: 'PRH-HASHTAG-NOT-CAMEL-CASE' }));
    expect(result.id).toBe('d-1');
  });

  it('remove() DELETEs by id with an encoded path', async () => {
    (api.delete as Mock).mockResolvedValueOnce({});
    await issueDismissalService.remove('job-1', 'd-1');
    expect(api.delete).toHaveBeenCalledWith('/jobs/job-1/issues/dismissals/d-1');
  });
});
