import { api } from './api';
import type {
  EditorialDocumentListResult,
  EditorialDocumentOverview,
} from '@/types/editorial-document.types';

export const editorialDocumentService = {
  async list(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<EditorialDocumentListResult> {
    const response = await api.get('/editorial/documents', { params });
    return response.data.data;
  },

  async getOverview(documentId: string): Promise<EditorialDocumentOverview> {
    const response = await api.get(`/editorial/document/${documentId}/overview`);
    return response.data.data;
  },
};
