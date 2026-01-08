import { api } from './api';
import type { ComparisonData, ComparisonFilters, RemediationChange } from '@/types/comparison';

export async function getComparison(
  jobId: string,
  params?: { page?: number; limit?: number }
): Promise<ComparisonData> {
  const response = await api.get(`/jobs/${jobId}/comparison`, { params });
  return response.data.data;
}

export async function getChangeById(
  jobId: string,
  changeId: string
): Promise<RemediationChange> {
  const response = await api.get(`/jobs/${jobId}/comparison/changes/${changeId}`);
  return response.data.data;
}

export async function getChangesByFilter(
  jobId: string,
  filters: ComparisonFilters
): Promise<ComparisonData> {
  const response = await api.get(`/jobs/${jobId}/comparison/filter`, { params: filters });
  return response.data.data;
}
