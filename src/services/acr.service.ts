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
import type {
  BatchAcrGenerationRequest,
  BatchAcrGenerationResult,
  BatchAcrDocument,
  BatchAcrHistory,
  BatchAcrExportResult,
} from '@/types/batch-acr.types';

export const EDITION_CODE_MAP: Record<string, string> = {
  'VPAT2.5-508': 'section508',
  'VPAT2.5-WCAG': 'wcag',
  'VPAT2.5-EU': 'eu',
  'VPAT2.5-INT': 'international',
  'section508': 'section508',
  'wcag': 'wcag',
  'eu': 'eu',
  'international': 'international',
};

export function normalizeEditionCode(edition: string): string {
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

  async generateBatchAcr(
    request: BatchAcrGenerationRequest
  ): Promise<BatchAcrGenerationResult> {
    const response = await api.post<ApiResponse<BatchAcrGenerationResult>>(
      '/acr/batch/generate',
      request
    );
    return response.data.data;
  },

  async getBatchAcr(batchAcrId: string): Promise<BatchAcrDocument> {
    const response = await api.get<ApiResponse<BatchAcrDocument>>(
      `/acr/batch/${batchAcrId}`
    );
    return response.data.data;
  },

  async exportBatchAcr(
    batchAcrId: string,
    format: 'pdf' | 'docx' | 'html',
    includeMethodology: boolean = true
  ): Promise<BatchAcrExportResult> {
    const response = await api.post<ApiResponse<BatchAcrExportResult>>(
      `/acr/batch/${batchAcrId}/export`,
      { format, includeMethodology }
    );
    return response.data.data;
  },

  async getBatchAcrHistory(batchId: string): Promise<BatchAcrHistory> {
    const response = await api.get<ApiResponse<BatchAcrHistory>>(
      `/acr/batch/${batchId}/history`
    );
    return response.data.data;
  },
};
