import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { isReviewBlockedError, teamService } from './team.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: { get: vi.fn() },
}));

const mockApiGet = vi.mocked(api.get);

function axiosError(status: number, code?: string) {
  const err = new axios.AxiosError('request failed');
  err.response = {
    status,
    data: code ? { success: false, error: { code } } : {},
  } as never;
  return err;
}

describe('isReviewBlockedError', () => {
  it('is true for a 403 with code BLOCKED_NEEDS_CORRECTION', () => {
    expect(isReviewBlockedError(axiosError(403, 'BLOCKED_NEEDS_CORRECTION'))).toBe(true);
  });

  it('is false for a 403 with a different code', () => {
    expect(isReviewBlockedError(axiosError(403, 'NOT_FOUND'))).toBe(false);
  });

  it('is false for a non-403 status, even with the right code', () => {
    expect(isReviewBlockedError(axiosError(404, 'BLOCKED_NEEDS_CORRECTION'))).toBe(false);
  });

  it('is false for a non-axios error', () => {
    expect(isReviewBlockedError(new Error('plain error'))).toBe(false);
  });
});

describe('listTeamExecutives', () => {
  it('GETs /jobs/team/executives and returns the roster', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          executives: [
            { userId: 'exec-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', teamId: 'team-1', teamName: 'Cell A' },
          ],
        },
      },
    });

    const result = await teamService.listTeamExecutives();

    expect(mockApiGet).toHaveBeenCalledWith('/jobs/team/executives');
    expect(result.executives).toEqual([
      { userId: 'exec-1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', teamId: 'team-1', teamName: 'Cell A' },
    ]);
  });
});
