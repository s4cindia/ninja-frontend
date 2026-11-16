/**
 * Structure Tag QC Review Service
 *
 * Job-scoped endpoints for the page-by-page structure-tag review feature,
 * gated by the Full QC toggle (see JobSettingsResponse.fullQC in
 * pdfAutoMode.types.ts / useJobSettings in hooks/useAutoMode.ts).
 */

import { api } from './api';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

/** GET /pdf/:jobId/structure-tags?page=N -- every structure element on that page. */
export async function getStructureTagsForPage(jobId: string, page: number): Promise<StructureTagElement[]> {
  const response = await api.get(`/pdf/${encodeURIComponent(jobId)}/structure-tags`, { params: { page } });
  return response.data.data;
}

/** PATCH /pdf/:jobId/structure-tags/:elementId -- retags a single element, applied immediately. */
export async function retagStructureElement(jobId: string, elementId: string, newTag: string): Promise<StructureTagElement> {
  const response = await api.patch(
    `/pdf/${encodeURIComponent(jobId)}/structure-tags/${encodeURIComponent(elementId)}`,
    { newTag }
  );
  return response.data.data;
}

export const pdfStructureTagsService = {
  getStructureTagsForPage,
  retagStructureElement,
};
