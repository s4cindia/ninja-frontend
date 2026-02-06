import { api } from './api';
import type {
  ReferenceListResult,
  ReferenceEntry,
  GenerateReferenceListRequest
} from '@/types/reference-list.types';

export const referenceListService = {
  async fetch(
    documentId: string,
    styleCode: string = 'apa7'
  ): Promise<ReferenceListResult | null> {
    const response = await api.get(
      `/citation/document/${documentId}/reference-list`,
      { params: { styleCode } }
    );
    return response.data.data ?? null;
  },

  async generate(
    documentId: string,
    request: GenerateReferenceListRequest
  ): Promise<ReferenceListResult> {
    const response = await api.post(
      `/citation/document/${documentId}/reference-list/generate`,
      request
    );
    return response.data.data;
  },

  async updateEntry(
    entryId: string,
    updates: Partial<ReferenceEntry>
  ): Promise<ReferenceEntry> {
    const response = await api.patch(`/citation/reference-list/${entryId}`, updates);
    return response.data.data;
  },

  async finalize(
    documentId: string,
    styleCode: string
  ): Promise<{ status: string; formattedList: string; entryCount: number }> {
    const response = await api.post(
      `/citation/document/${documentId}/reference-list/finalize`,
      { styleCode }
    );
    return response.data.data;
  }
};
