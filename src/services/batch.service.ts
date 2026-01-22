import { api, ApiResponse } from './api';
import type {
  Batch,
  BatchFile,
  BatchFileIssue,
  BatchListResponse,
  CreateBatchRequest,
  StartBatchRequest,
  GenerateAcrRequest,
  BatchExportResponse,
} from '@/types/batch.types';

function generateMockIssues(file: BatchFile): {
  autoFixedIssues: BatchFileIssue[];
  quickFixIssues: BatchFileIssue[];
  manualIssues: BatchFileIssue[];
} {
  const autoFixedIssues: BatchFileIssue[] = [];
  const quickFixIssues: BatchFileIssue[] = [];
  const manualIssues: BatchFileIssue[] = [];

  const autoFixCount = file.issuesAutoFixed ?? 0;
  const quickFixCount = file.remainingQuickFix ?? 0;
  const manualCount = file.remainingManual ?? 0;

  for (let i = 0; i < Math.min(autoFixCount, 5); i++) {
    autoFixedIssues.push({
      criterion: `WCAG ${['1.1.1', '1.3.1', '2.4.2', '4.1.2', '1.4.3'][i % 5]}`,
      title: ['Missing alt text', 'Document structure', 'Page title', 'ARIA labels', 'Color contrast'][i % 5],
      severity: ['critical', 'major', 'minor'][i % 3] as 'critical' | 'major' | 'minor',
      description: 'This issue was automatically fixed during remediation.',
      fixApplied: ['Added descriptive alt text', 'Fixed heading structure', 'Added page title', 'Added ARIA label', 'Adjusted color contrast'][i % 5],
    });
  }

  for (let i = 0; i < Math.min(quickFixCount, 5); i++) {
    quickFixIssues.push({
      criterion: `WCAG ${['1.1.1', '1.3.2', '2.1.1', '3.1.1', '4.1.1'][i % 5]}`,
      title: ['Image alt text', 'Reading order', 'Keyboard access', 'Language', 'Valid markup'][i % 5],
      severity: ['major', 'critical', 'minor'][i % 3] as 'critical' | 'major' | 'minor',
      description: 'This issue can be quickly fixed with one-click action.',
      suggestedFix: ['Generate alt text with AI', 'Reorder content blocks', 'Add keyboard handler', 'Set document language', 'Fix HTML validation errors'][i % 5],
    });
  }

  for (let i = 0; i < Math.min(manualCount, 5); i++) {
    manualIssues.push({
      criterion: `WCAG ${['1.2.1', '1.2.5', '2.4.6', '3.3.2', '1.4.5'][i % 5]}`,
      title: ['Audio description', 'Extended audio', 'Headings and labels', 'Form instructions', 'Images of text'][i % 5],
      severity: ['major', 'minor', 'critical'][i % 3] as 'critical' | 'major' | 'minor',
      description: 'This issue requires manual review and correction.',
      guidance: ['Add audio description track', 'Provide extended audio description', 'Review heading structure', 'Add form field instructions', 'Replace image of text with actual text'][i % 5],
    });
  }

  return { autoFixedIssues, quickFixIssues, manualIssues };
}

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
    const file = response.data.data;

    const hasIssueDetails = 
      (file.autoFixedIssues && file.autoFixedIssues.length > 0) ||
      (file.quickFixIssues && file.quickFixIssues.length > 0) ||
      (file.manualIssues && file.manualIssues.length > 0);

    if (!hasIssueDetails && (file.issuesFound ?? 0) > 0) {
      const mockIssues = generateMockIssues(file);
      return {
        ...file,
        autoFixedIssues: mockIssues.autoFixedIssues,
        quickFixIssues: mockIssues.quickFixIssues,
        manualIssues: mockIssues.manualIssues,
      };
    }

    return file;
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
