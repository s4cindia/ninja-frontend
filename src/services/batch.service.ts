import { api, ApiResponse } from './api';
import type {
  Batch,
  BatchFile,
  BatchListResponse,
  CreateBatchRequest,
  StartBatchRequest,
  GenerateAcrRequest,
  BatchExportResponse,
} from '@/types/batch.types';
import type { BatchAcrGenerationResult } from '@/types/batch-acr.types';

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

    await api.post(`${BASE_URL}/${batchId}/files`, formData);
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

  async generateAcr(batchId: string, data: GenerateAcrRequest): Promise<BatchAcrGenerationResult> {
    const response = await api.post<ApiResponse<BatchAcrGenerationResult>>(
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

  async applyQuickFixes(batchId: string): Promise<{
    success: boolean;
    filesProcessed: number;
    issuesFixed: number;
  }> {
    const response = await api.post<ApiResponse<{
      success: boolean;
      filesProcessed: number;
      issuesFixed: number;
    }>>(`${BASE_URL}/${batchId}/quick-fixes/apply`);
    return response.data.data;
  },

  async getBatchFile(batchId: string, fileId: string): Promise<BatchFile> {
    const response = await api.get<ApiResponse<BatchFile>>(
      `${BASE_URL}/${batchId}/files/${fileId}`
    );
    return response.data.data;
  },

  subscribeToBatch(
    batchId: string,
    onEvent: (event: unknown) => void
  ): EventSource {
    // Use configured API base URL from environment or axios defaults
    const getApiBaseUrl = (): string => {
      // Try environment variable first, then axios defaults, then fallback
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        return envUrl.replace(/\/$/, ''); // Remove trailing slash
      }
      const axiosBase = api.defaults.baseURL;
      if (axiosBase) {
        return axiosBase.replace(/\/$/, '');
      }
      return '/api/v1';
    };
    
    const createEventSource = (): EventSource => {
      const token = localStorage.getItem('token');
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/sse/subscribe?channel=batch:${batchId}${tokenParam}`;
      return new EventSource(url);
    };

    let eventSource = createEventSource();
    let backoffMs = 1000;
    const maxBackoffMs = 30000;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const reconnect = () => {
      if (reconnectTimeout) return;
      
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        eventSource = createEventSource();
        setupHandlers(eventSource);
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
      }, backoffMs);
    };

    const setupHandlers = (es: EventSource) => {
      es.onopen = () => {
        backoffMs = 1000;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      es.onerror = () => {
        es.close();
        reconnect();
      };
    };

    setupHandlers(eventSource);

    const originalClose = eventSource.close.bind(eventSource);
    eventSource.close = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      originalClose();
    };

    return eventSource;
  },

  async applyFileQuickFixes(
    batchId: string,
    fileId: string,
    quickFixes: Array<{ issueCode: string; value: string }>
  ): Promise<{ success: boolean; appliedFixes: number; updatedFile: BatchFile }> {
    const response = await api.post<
      ApiResponse<{ success: boolean; appliedFixes: number; updatedFile: BatchFile }>
    >(`${BASE_URL}/${batchId}/files/${fileId}/apply-quick-fixes`, { quickFixes });
    return response.data.data;
  },
};
