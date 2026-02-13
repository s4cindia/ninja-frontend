/**
 * PDF Remediation Service
 *
 * API service for PDF remediation workflow
 */

import { api } from './api';
import type {
  RemediationPlan,
  UpdateTaskStatusRequest,
  UpdateTaskStatusResponse,
  AutoRemediationResult,
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

export const pdfRemediationService = {
  createRemediationPlan,
  getRemediationPlan,
  updateTaskStatus,
  executeAutoRemediation,
};
