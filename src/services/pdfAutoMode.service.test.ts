import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfAutoModeService } from './pdfAutoMode.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const mockApi = api as Mocked<typeof api>;

describe('pdfAutoModeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('startAutoMode POSTs to the correct endpoint with no body when called with no overrides', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    await pdfAutoModeService.startAutoMode('job-123');

    expect(mockApi.post).toHaveBeenCalledWith('/pdf/job-123/auto-mode/start', undefined);
  });

  it('startAutoMode POSTs the overrides as the request body when provided — honored only for a job with no linked trial', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    await pdfAutoModeService.startAutoMode('job-123', {
      autoMaxRounds: 5,
      autoCostLimitUsd: 1.5,
      autoColorContrastMode: 'guidance-only',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/pdf/job-123/auto-mode/start', {
      autoMaxRounds: 5,
      autoCostLimitUsd: 1.5,
      autoColorContrastMode: 'guidance-only',
    });
  });

  it('stopAutoMode POSTs to the correct endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    await pdfAutoModeService.stopAutoMode('job-123');

    expect(mockApi.post).toHaveBeenCalledWith('/pdf/job-123/auto-mode/stop');
  });

  it('getAutoModeStatus GETs the correct endpoint and unwraps the response envelope', async () => {
    const status = {
      mode: 'auto' as const,
      autoStatus: 'running' as const,
      autoStopReason: null,
      autoRoundsCompleted: 3,
      autoMaxRounds: 10,
      autoCostSpentUsd: 0.42,
      autoCostLimitUsd: 2,
    };
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: status } });

    const result = await pdfAutoModeService.getAutoModeStatus('job-123');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job-123/auto-mode/status');
    expect(result).toEqual(status);
  });
});
