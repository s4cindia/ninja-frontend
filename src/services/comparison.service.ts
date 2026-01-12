import { api } from './api';
import type { ComparisonData, ComparisonFilters, RemediationChange } from '@/types/comparison';

export interface SpineItem {
  id: string;
  href: string;
  mediaType: string;
  order: number;
  title?: string;
}

export interface SpineItemContent {
  spineItem: SpineItem;
  html: string;
  css: string[];
  baseHref: string;
}

export interface ChangeHighlight {
  xpath: string;
  cssSelector?: string;
  description?: string;
}

export interface SpineItemWithChange {
  spineItem: SpineItem;
  beforeContent: SpineItemContent;
  afterContent: SpineItemContent;
  change: {
    id: string;
    changeNumber: number;
    description: string;
    changeType: string;
    severity: string | null;
  };
  highlightData: ChangeHighlight;
}

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

export async function getSpineItems(jobId: string): Promise<SpineItem[]> {
  const response = await api.get(`/jobs/${jobId}/comparison/spine`);
  return response.data;
}

export async function getVisualComparison(
  jobId: string,
  changeId: string
): Promise<SpineItemWithChange> {
  const response = await api.get(`/jobs/${jobId}/comparison/changes/${changeId}/visual`);
  return response.data;
}

export async function getSpineItemContent(
  jobId: string,
  spineItemId: string,
  version: 'original' | 'remediated'
): Promise<SpineItemContent> {
  const response = await api.get(`/jobs/${jobId}/comparison/spine/${spineItemId}`, {
    params: { version }
  });
  return response.data;
}
