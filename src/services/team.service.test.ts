import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { isReviewBlockedError } from './team.service';

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
