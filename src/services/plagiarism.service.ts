/**
 * Plagiarism Check Service
 *
 * API client for plagiarism check endpoints
 */

import { api } from './api';
import type {
  PlagiarismCheckJob,
  PlagiarismMatch,
  PlagiarismMatchesResponse,
  PlagiarismSummary,
  PlagiarismMatchFilters,
} from '@/types/plagiarism';

export const plagiarismService = {
  /**
   * Start a plagiarism check
   */
  async startCheck(documentId: string): Promise<{ jobId: string; created: boolean; status: string }> {
    const response = await api.post<{ success: boolean; data: { jobId: string; created: boolean; status: string } }>(
      '/plagiarism/check',
      { documentId }
    );
    return response.data.data;
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<PlagiarismCheckJob> {
    const response = await api.get<{ success: boolean; data: PlagiarismCheckJob }>(
      `/plagiarism/job/${jobId}`
    );
    return response.data.data;
  },

  /**
   * Get matches for a document (filtered, paginated)
   */
  async getMatches(documentId: string, filters?: PlagiarismMatchFilters): Promise<PlagiarismMatchesResponse> {
    const params = new URLSearchParams();
    if (filters?.matchType) params.append('matchType', filters.matchType);
    if (filters?.classification) params.append('classification', filters.classification);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page !== undefined) params.append('page', String(filters.page));
    if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/plagiarism/document/${documentId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ success: boolean; data: PlagiarismMatchesResponse }>(url);
    return response.data.data;
  },

  /**
   * Get summary grouped by type/classification/status
   */
  async getSummary(documentId: string): Promise<PlagiarismSummary> {
    const response = await api.get<{ success: boolean; data: PlagiarismSummary }>(
      `/plagiarism/document/${documentId}/summary`
    );
    return response.data.data;
  },

  /**
   * Review a single match
   */
  async reviewMatch(
    matchId: string,
    status: 'CONFIRMED_PLAGIARISM' | 'FALSE_POSITIVE' | 'PROPERLY_ATTRIBUTED' | 'DISMISSED',
    reviewNotes?: string
  ): Promise<PlagiarismMatch> {
    const response = await api.post<{ success: boolean; data: PlagiarismMatch }>(
      `/plagiarism/match/${matchId}/review`,
      { status, reviewNotes }
    );
    return response.data.data;
  },

  /**
   * Bulk review multiple matches
   */
  async bulkReview(
    matchIds: string[],
    status: 'CONFIRMED_PLAGIARISM' | 'FALSE_POSITIVE' | 'PROPERLY_ATTRIBUTED' | 'DISMISSED'
  ): Promise<{ updated: number }> {
    const response = await api.post<{ success: boolean; data: { updated: number } }>(
      '/plagiarism/matches/bulk',
      { matchIds, status }
    );
    return response.data.data;
  },
};
