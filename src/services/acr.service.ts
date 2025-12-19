import { api, ApiResponse } from './api';
import type { 
  AcrEdition, 
  EditionDetails,
  AcrDocument,
  CredibilityValidation,
  FinalizationStatus,
  GenerateRemarksRequest,
  GenerateRemarksResponse,
  UpdateCriterionRequest,
} from '@/types/acr.types';

export const acrService = {
  async getEditions(): Promise<AcrEdition[]> {
    const response = await api.get<ApiResponse<AcrEdition[]>>('/acr/editions');
    return response.data.data;
  },

  async getEditionDetails(edition: string): Promise<EditionDetails> {
    const response = await api.get<ApiResponse<EditionDetails>>(`/acr/editions/${edition}`);
    return response.data.data;
  },

  async getDocument(jobId: string): Promise<AcrDocument> {
    const response = await api.get<AcrDocument>(`/acr/${jobId}`);
    return response.data;
  },

  async updateCriterion(
    jobId: string,
    criterionId: string,
    data: UpdateCriterionRequest
  ): Promise<void> {
    await api.patch(`/acr/${jobId}/criteria/${criterionId}`, data);
  },

  async generateRemarks(data: GenerateRemarksRequest): Promise<GenerateRemarksResponse> {
    const response = await api.post<GenerateRemarksResponse>('/acr/generate-remarks', data);
    return response.data;
  },

  async validateCredibility(jobId: string): Promise<CredibilityValidation> {
    const response = await api.post<CredibilityValidation>(`/acr/${jobId}/validate-credibility`);
    return response.data;
  },

  async getFinalizationStatus(jobId: string): Promise<FinalizationStatus> {
    const response = await api.get<FinalizationStatus>(`/acr/${jobId}/can-finalize`);
    return response.data;
  },

  async finalizeDocument(jobId: string): Promise<void> {
    await api.post(`/acr/${jobId}/finalize`);
  },
};
