/**
 * PDF Remediation Service
 *
 * API service for PDF remediation workflow
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type {
  RemediationPlan,
  UpdateTaskStatusRequest,
  UpdateTaskStatusResponse,
  AutoRemediationResult,
  ReauditComparisonResult,
} from '@/types/pdf-remediation.types';

/**
 * Create a remediation plan from audit results
 */
export async function createRemediationPlan(jobId: string): Promise<RemediationPlan> {
  const response = await api.post(`/pdf/${jobId}/remediation/plan`);
  return response.data.data || response.data;
}

/**
 * Get existing remediation plan
 */
export async function getRemediationPlan(jobId: string): Promise<RemediationPlan> {
  const response = await api.get(`/pdf/${jobId}/remediation/plan`);
  return response.data.data || response.data;
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  jobId: string,
  taskId: string,
  request: UpdateTaskStatusRequest
): Promise<UpdateTaskStatusResponse> {
  const response = await api.patch(`/pdf/${jobId}/remediation/tasks/${taskId}`, request);
  return response.data.data || response.data;
}

/**
 * Execute auto-remediation for a job
 * Automatically fixes issues that don't require user input (metadata, language, etc.)
 */
export async function executeAutoRemediation(jobId: string): Promise<AutoRemediationResult> {
  const response = await api.post(`/pdf/${jobId}/remediation/execute`);
  return response.data.data || response.data;
}

/**
 * Download remediated PDF file
 */
export async function downloadRemediatedPdf(jobId: string): Promise<Blob> {
  const response = await api.get(`/pdf/${jobId}/remediation/download`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * React Query hook for downloading remediated PDF
 *
 * @param jobId - Job ID to download remediated PDF for
 * @returns Query result with cached Blob data
 */
export function useDownloadRemediatedPdf(jobId: string) {
  return useQuery({
    queryKey: ['pdf-remediation-download', jobId],
    queryFn: () => downloadRemediatedPdf(jobId),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes - PDFs don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for potential re-download
  });
}

/**
 * Preview what will change before applying a quick fix
 */
async function previewFix(jobId: string, issueId: string, field: string, value: string) {
  const response = await api.get(
    `/pdf/${jobId}/remediation/preview/${issueId}`,
    {
      params: { field, value },
    }
  );
  return response.data;
}

/**
 * Apply a quick fix to a specific issue
 */
async function applyQuickFix(jobId: string, issueId: string, field: string, value: string) {
  const response = await api.post(
    `/pdf/${jobId}/remediation/quick-fix/${issueId}`,
    { field, value }
  );
  return response.data;
}

/**
 * Re-audit a remediated PDF file
 */
async function reauditPdf(jobId: string, file: File): Promise<ReauditComparisonResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/pdf/${jobId}/remediation/re-audit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  // Unlike this file's other endpoints (which fall back to response.data for
  // ones that don't wrap), this one must unwrap unconditionally: the
  // envelope's own top-level `success` happens to be a field name collision
  // with ReauditComparisonResult's `success` (a semantically different flag
  // — "did the comparison itself succeed", not "did the HTTP request
  // succeed") that a `|| response.data` fallback would silently mask, since
  // both objects have a `success` key and neither is ever falsy/undefined
  // in a way that would trigger the fallback.
  return response.data.data;
}

export const pdfRemediationService = {
  createRemediationPlan,
  getRemediationPlan,
  updateTaskStatus,
  executeAutoRemediation,
  downloadRemediatedPdf,
  previewFix,
  applyQuickFix,
  reauditPdf,
};
