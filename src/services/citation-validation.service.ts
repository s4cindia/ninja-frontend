import { api } from './api';
import type {
  CitationStyle,
  ValidationResult,
  ValidationViolation,
  ValidateDocumentRequest
} from '@/types/citation-validation.types';

export const citationValidationService = {
  async getStyles(): Promise<CitationStyle[]> {
    const response = await api.get('/citation/styles');
    return response.data.data;
  },

  async validateDocument(
    documentId: string,
    request: ValidateDocumentRequest
  ): Promise<ValidationResult> {
    const response = await api.post(`/citation/document/${documentId}/validate`, request);
    return response.data.data;
  },

  async getValidations(
    documentId: string,
    filters?: {
      status?: string;
      severity?: string;
      violationType?: string;
    }
  ): Promise<ValidationViolation[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.violationType) params.append('violationType', filters.violationType);

    const response = await api.get(
      `/citation/document/${documentId}/validations?${params.toString()}`
    );
    return response.data.data;
  },

  async acceptValidation(validationId: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/accept`);
  },

  async rejectValidation(validationId: string, reason?: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/reject`, { reason });
  },

  async editValidation(validationId: string, correctedText: string): Promise<void> {
    await api.post(`/citation/validation/${validationId}/edit`, { correctedText });
  },

  async batchCorrect(
    documentId: string,
    violationType: string,
    applyAll: boolean = true
  ): Promise<{ correctedCount: number; skippedCount: number }> {
    const response = await api.post(`/citation/document/${documentId}/correct/batch`, {
      violationType,
      applyAll
    });
    return response.data.data;
  },

  async getChangeHistory(
    documentId: string
  ): Promise<Array<{
    id: string;
    validationId: string;
    originalText: string;
    correctedText: string;
    changeType: 'accept' | 'reject' | 'edit';
    createdAt: string;
  }>> {
    const response = await api.get(`/citation/document/${documentId}/changes`);
    return response.data.data;
  },

  async revertChange(changeId: string): Promise<void> {
    await api.post(`/citation/change/${changeId}/revert`);
  }
};
