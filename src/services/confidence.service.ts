import { api } from './api';
import { ConfidenceWithIssuesResponse } from '@/types/confidence.types';

export const confidenceService = {
  async getConfidenceWithIssues(
    jobId: string,
    edition?: string
  ): Promise<ConfidenceWithIssuesResponse> {
    const params = edition ? { edition } : {};
    const response = await api.get(`/confidence/job/${jobId}/issues`, { params });
    return response.data;
  }
};
