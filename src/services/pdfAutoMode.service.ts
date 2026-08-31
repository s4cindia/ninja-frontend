/**
 * PDF Auto Mode Service
 *
 * Job-scoped endpoints for Comparison Study "Auto Mode" — the backend loop
 * that runs analyze -> auto-approve -> apply -> re-audit on its own. Not to
 * be confused with usePdfAutoRemediation (an unrelated single-shot
 * auto-fix concept already in pdf-remediation.service.ts).
 */

import { api } from './api';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

/** 400 if the job has no trial or the trial isn't in auto mode, 409 if already running. */
export async function startAutoMode(jobId: string): Promise<void> {
  await api.post(`/pdf/${encodeURIComponent(jobId)}/auto-mode/start`);
}

export async function getAutoModeStatus(jobId: string): Promise<AutoModeStatusResponse> {
  const response = await api.get(`/pdf/${encodeURIComponent(jobId)}/auto-mode/status`);
  return response.data.data;
}

/** Cooperative — honored after the current round finishes, never mid-round. */
export async function stopAutoMode(jobId: string): Promise<void> {
  await api.post(`/pdf/${encodeURIComponent(jobId)}/auto-mode/stop`);
}

export const pdfAutoModeService = {
  startAutoMode,
  getAutoModeStatus,
  stopAutoMode,
};
