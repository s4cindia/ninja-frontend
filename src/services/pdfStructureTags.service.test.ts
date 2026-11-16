import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfStructureTagsService } from './pdfStructureTags.service';
import { api } from './api';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

vi.mock('./api', () => ({
  api: { get: vi.fn(), patch: vi.fn() },
}));

const mockApi = api as Mocked<typeof api>;

const ELEMENT: StructureTagElement = {
  elementId: '12-0',
  tag: 'H1',
  pageNumber: 1,
  bbox: { x: 100, y: 292, width: 70, height: 0, pageWidth: 612, pageHeight: 792 },
};

describe('pdfStructureTagsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStructureTagsForPage GETs the correct endpoint with the page as a query param and unwraps the response envelope', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: [ELEMENT] } });

    const result = await pdfStructureTagsService.getStructureTagsForPage('job-123', 3);

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job-123/structure-tags', { params: { page: 3 } });
    expect(result).toEqual([ELEMENT]);
  });

  it('retagStructureElement PATCHes the correct endpoint with the new tag and unwraps the response envelope', async () => {
    const updated = { ...ELEMENT, tag: 'H2' };
    mockApi.patch.mockResolvedValueOnce({ data: { success: true, data: updated } });

    const result = await pdfStructureTagsService.retagStructureElement('job-123', '12-0', 'H2');

    expect(mockApi.patch).toHaveBeenCalledWith('/pdf/job-123/structure-tags/12-0', { newTag: 'H2' });
    expect(result).toEqual(updated);
  });

  it('encodes jobId and elementId in the URL', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    mockApi.patch.mockResolvedValueOnce({ data: { success: true, data: ELEMENT } });

    await pdfStructureTagsService.getStructureTagsForPage('job/with slash', 1);
    await pdfStructureTagsService.retagStructureElement('job/with slash', 'el/id', 'H2');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job%2Fwith%20slash/structure-tags', { params: { page: 1 } });
    expect(mockApi.patch).toHaveBeenCalledWith('/pdf/job%2Fwith%20slash/structure-tags/el%2Fid', { newTag: 'H2' });
  });
});
