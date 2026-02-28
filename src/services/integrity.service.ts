/**
 * Integrity Check Service
 *
 * API client for integrity check endpoints
 */

import { api } from './api';
import type {
  IntegrityCheckJob,
  IntegrityIssue,
  IntegrityIssuesResponse,
  IntegritySummaryMap,
  IntegrityIssueFilters,
  StartIntegrityCheckInput,
} from '@/types/integrity';

export const integrityService = {
  /**
   * Start an integrity check
   */
  async startCheck(input: StartIntegrityCheckInput): Promise<{ jobId: string; status: string; message: string }> {
    const response = await api.post<{ success: boolean; data: { jobId: string; status: string; message: string } }>(
      '/integrity/check',
      input
    );
    return response.data.data;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IntegrityCheckJob> {
    const response = await api.get<{ success: boolean; data: IntegrityCheckJob }>(
      `/integrity/job/${jobId}`
    );
    return response.data.data;
  },

  /**
   * Get issues for a document (filtered, paginated)
   */
  async getIssues(documentId: string, filters?: IntegrityIssueFilters): Promise<IntegrityIssuesResponse> {
    const params = new URLSearchParams();
    if (filters?.checkType) params.append('checkType', filters.checkType);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page !== undefined) params.append('page', String(filters.page));
    if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/integrity/document/${documentId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ success: boolean; data: IntegrityIssuesResponse }>(url);
    return response.data.data;
  },

  /**
   * Get summary grouped by check type
   */
  async getSummary(documentId: string): Promise<IntegritySummaryMap> {
    const response = await api.get<{ success: boolean; data: IntegritySummaryMap }>(
      `/integrity/document/${documentId}/summary`
    );
    return response.data.data;
  },

  /**
   * Apply fix to an issue
   */
  async applyFix(issueId: string): Promise<IntegrityIssue> {
    const response = await api.post<{ success: boolean; data: IntegrityIssue }>(
      `/integrity/issue/${issueId}/fix`
    );
    return response.data.data;
  },

  /**
   * Ignore an issue
   */
  async ignoreIssue(issueId: string, reason?: string): Promise<IntegrityIssue> {
    const response = await api.post<{ success: boolean; data: IntegrityIssue }>(
      `/integrity/issue/${issueId}/ignore`,
      reason ? { reason } : {}
    );
    return response.data.data;
  },

  /**
   * Bulk action on multiple issues
   */
  async bulkAction(issueIds: string[], action: 'fix' | 'ignore'): Promise<{ updated: number }> {
    const response = await api.post<{ success: boolean; data: { updated: number } }>(
      '/integrity/issues/bulk',
      { issueIds, action }
    );
    return response.data.data;
  },
};
