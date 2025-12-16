import { api, ApiResponse } from './api';
import type { AcrEdition, EditionDetails } from '@/types/acr.types';

export const acrService = {
  async getEditions(): Promise<AcrEdition[]> {
    const response = await api.get<ApiResponse<AcrEdition[]>>('/acr/editions');
    return response.data.data;
  },

  async getEditionDetails(edition: string): Promise<EditionDetails> {
    const response = await api.get<ApiResponse<EditionDetails>>(`/acr/editions/${edition}`);
    return response.data.data;
  },
};
