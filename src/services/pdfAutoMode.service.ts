/**
 * PDF Auto Mode Service
 *
 * Job-scoped endpoints for "Auto Mode" — the backend loop that runs
 * analyze -> auto-approve -> apply -> re-audit on its own, for any job the
 * caller owns (originally Comparison-Study-trial-exclusive; the backend now
 * supports a second, trial-free path too — see StartAutoModeOverrides). Not
 * to be confused with usePdfAutoRemediation (an unrelated single-shot
 * auto-fix concept already in pdf-remediation.service.ts).
 */

import { api } from './api';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';

/**
 * Per-run overrides for a job with no linked Comparison Study trial — a
 * trial-linked job ignores these and keeps using the trial's own
 * pre-configured autoMaxRounds/autoCostLimitUsd/autoColorContrastMode
 * (set via PATCH .../trials/:id/auto-mode instead).
 */
export interface StartAutoModeOverrides {
  autoMaxRounds?: number;
  autoCostLimitUsd?: number;
  autoColorContrastMode?: 'guidance-only' | 'disabled' | 'apply-to-pdf';
}

/**
 * 400 if the job has a trial that isn't in auto mode, 409 if already
 * running. `overrides` is ignored server-side for a trial-linked job
 * (it keeps using the trial's own pre-configured settings) — only a job
 * with no trial at all honors them.
 */
export async function startAutoMode(jobId: string, overrides?: StartAutoModeOverrides): Promise<void> {
  await api.post(`/pdf/${encodeURIComponent(jobId)}/auto-mode/start`, overrides);
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
