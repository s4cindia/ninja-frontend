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

const EDITION_CODE_MAP: Record<string, string> = {
  'VPAT2.5-508': 'section508',
  'VPAT2.5-WCAG': 'wcag',
  'VPAT2.5-EU': 'eu',
  'VPAT2.5-INT': 'international',
  'section508': 'section508',
  'wcag': 'wcag',
  'eu': 'eu',
  'international': 'international',
};

function normalizeEditionCode(edition: string): string {
  return EDITION_CODE_MAP[edition] || edition.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const acrService = {
  async getEditions(): Promise<AcrEdition[]> {
    const response = await api.get<ApiResponse<AcrEdition[]>>('/acr/editions');
    return response.data.data;
  },

  async getEditionDetails(edition: string): Promise<EditionDetails> {
    const normalizedEdition = normalizeEditionCode(edition);
    const response = await api.get<ApiResponse<EditionDetails>>(`/acr/editions/${normalizedEdition}`);
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
