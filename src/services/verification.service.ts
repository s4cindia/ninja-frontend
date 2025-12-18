import { api } from './api';
import type { 
  VerificationQueueData, 
  VerificationSubmission, 
  BulkVerificationSubmission,
  VerificationFilters 
} from '@/types/verification.types';

export const verificationService = {
  async getQueue(jobId: string, filters?: VerificationFilters): Promise<VerificationQueueData> {
    const params = new URLSearchParams();
    if (filters?.severity?.length) {
      params.append('severity', filters.severity.join(','));
    }
    if (filters?.confidenceLevel?.length) {
      params.append('confidenceLevel', filters.confidenceLevel.join(','));
    }
    if (filters?.status?.length) {
      params.append('status', filters.status.join(','));
    }
    const queryString = params.toString();
    const url = `/verification/${jobId}/queue${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<VerificationQueueData>(url);
    return response.data;
  },

  async submitVerification(data: VerificationSubmission): Promise<void> {
    await api.post(`/verification/verify/${data.itemId}`, {
      status: data.status,
      method: data.method,
      notes: data.notes,
    });
  },

  async submitBulkVerification(data: BulkVerificationSubmission): Promise<void> {
    await api.post('/verification/bulk', data);
  },
};
