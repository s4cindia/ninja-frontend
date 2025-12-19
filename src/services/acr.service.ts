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
    const response = await api.get<ApiResponse<AcrDocument>>(`/acr/${jobId}`);
    return response.data.data;
  },

  async updateCriterion(
    jobId: string,
    criterionId: string,
    data: UpdateCriterionRequest
  ): Promise<void> {
    await api.patch<ApiResponse<void>>(`/acr/${jobId}/criteria/${criterionId}`, data);
  },

  async generateRemarks(data: GenerateRemarksRequest): Promise<GenerateRemarksResponse> {
    const response = await api.post<ApiResponse<GenerateRemarksResponse>>('/acr/generate-remarks', data);
    return response.data.data;
  },

  async validateCredibility(jobId: string): Promise<CredibilityValidation> {
    const response = await api.post<ApiResponse<CredibilityValidation>>(`/acr/${jobId}/validate-credibility`);
    return response.data.data;
  },

  async getFinalizationStatus(jobId: string): Promise<FinalizationStatus> {
    const response = await api.get<ApiResponse<FinalizationStatus>>(`/acr/${jobId}/can-finalize`);
    return response.data.data;
  },

  async finalizeDocument(jobId: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/acr/${jobId}/finalize`);
  },
};
