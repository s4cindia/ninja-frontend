import { api, ApiResponse } from './api';
import type {
  Batch,
  BatchListResponse,
  CreateBatchRequest,
  StartBatchRequest,
  GenerateAcrRequest,
  BatchExportResponse,
} from '@/types/batch.types';

const BASE_URL = '/batch';

export const batchService = {
  async createBatch(data: CreateBatchRequest): Promise<{ batchId: string }> {
    const response = await api.post<ApiResponse<{ batchId: string }>>(BASE_URL, data);
    return response.data.data;
  },

  async uploadFiles(batchId: string, files: File[]): Promise<void> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    await api.post(`${BASE_URL}/${batchId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async removeFile(batchId: string, fileId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${batchId}/files/${fileId}`);
  },

  async startBatch(batchId: string, data?: StartBatchRequest): Promise<void> {
    await api.post(`${BASE_URL}/${batchId}/start`, data);
  },

  async getBatch(batchId: string): Promise<Batch> {
    const response = await api.get<ApiResponse<Batch>>(`${BASE_URL}/${batchId}`);
    return response.data.data;
  },

  async listBatches(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<BatchListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    const response = await api.get<ApiResponse<BatchListResponse>>(
      `${BASE_URL}?${params}`
    );
    return response.data.data;
  },

  async cancelBatch(batchId: string): Promise<void> {
    await api.post(`${BASE_URL}/${batchId}/cancel`);
  },

  async generateAcr(batchId: string, data: GenerateAcrRequest): Promise<unknown> {
    const response = await api.post<ApiResponse<unknown>>(
      `${BASE_URL}/${batchId}/acr/generate`,
      data
    );
    return response.data.data;
  },

  async exportBatch(batchId: string): Promise<BatchExportResponse> {
    const response = await api.post<ApiResponse<BatchExportResponse>>(
      `${BASE_URL}/${batchId}/export`,
      {
        format: 'zip',
        includeOriginals: false,
        includeComparisons: true,
      }
    );
    return response.data.data;
  },

  async getFileDownloadUrl(batchId: string, fileId: string): Promise<string> {
    const response = await api.get<ApiResponse<{ downloadUrl: string }>>(
      `${BASE_URL}/${batchId}/files/${fileId}/download`
    );
    return response.data.data.downloadUrl;
  },

  subscribeToBatch(
    batchId: string,
    onEvent: (event: unknown) => void
  ): EventSource {
    const token = localStorage.getItem('token');
    const eventSource = new EventSource(
      `/api/v1/sse/subscribe?channel=batch:${batchId}&token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return eventSource;
  },
};
