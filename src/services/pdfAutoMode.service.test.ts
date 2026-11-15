import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfAutoModeService } from './pdfAutoMode.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
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

  it('getAutoModeStatus passes pendingFullAutoMode through unchanged (ninja-backend#825)', async () => {
    const status = {
      mode: 'manual' as const,
      autoStatus: null,
      autoStopReason: null,
      autoRoundsCompleted: 0,
      autoMaxRounds: 10,
      autoCostSpentUsd: 0,
      autoCostLimitUsd: 2,
      pendingFullAutoMode: true,
    };
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: status } });

    const result = await pdfAutoModeService.getAutoModeStatus('job-123');

    expect(result).toEqual(status);
  });

  it('getJobSettings GETs the correct endpoint and unwraps the response envelope', async () => {
    const settings = {
      fullAutoMode: { override: true, tenantDefault: false, effective: true },
      autoEscalateOnStall: { override: null, tenantDefault: false, effective: false },
    };
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: settings } });

    const result = await pdfAutoModeService.getJobSettings('job-123');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job-123/settings');
    expect(result).toEqual(settings);
  });

  it('updateJobSettings PATCHes the correct endpoint with the given body and unwraps the response envelope', async () => {
    const updated = {
      fullAutoMode: { override: null, tenantDefault: false, effective: false },
      autoEscalateOnStall: { override: true, tenantDefault: false, effective: true },
    };
    mockApi.patch.mockResolvedValueOnce({ data: { success: true, data: updated } });

    const result = await pdfAutoModeService.updateJobSettings('job-123', { fullAutoMode: null, autoEscalateOnStall: true });

    expect(mockApi.patch).toHaveBeenCalledWith('/pdf/job-123/settings', { fullAutoMode: null, autoEscalateOnStall: true });
    expect(result).toEqual(updated);
  });
});
