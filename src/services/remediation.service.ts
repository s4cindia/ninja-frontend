import { api, ApiResponse } from './api';
import type { RemediationResultsData } from '@/types/remediation.types';

export async function getRemediationResults(jobId: string): Promise<RemediationResultsData> {
  const response = await api.get<ApiResponse<RemediationResultsData>>(`/jobs/${jobId}/remediation/results`);
  return response.data.data;
}

export async function triggerReAudit(jobId: string): Promise<unknown> {
  const response = await api.post(`/jobs/${jobId}/remediation/re-audit`);
  return response.data;
}

export async function runRemediationAgain(jobId: string): Promise<unknown> {
  const response = await api.post(`/jobs/${jobId}/remediation/retry`);
  return response.data;
}
