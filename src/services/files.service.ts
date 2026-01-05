import { api, ApiResponse } from './api';

export interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface FilesListResponse {
  files: FileItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export const filesService = {
  async list(params?: { page?: number; limit?: number; status?: string }): Promise<FilesListResponse> {
    const response = await api.get('/files', { params });
    const responseData = response.data;

    const files = Array.isArray(responseData.data) ? responseData.data : responseData.data?.files || [];
    const pagination = responseData.pagination || responseData.data?.pagination || {
      page: 1,
      limit: 20,
      total: files.length,
      pages: 1,
    };

    return { files, pagination };
  },

  async get(id: string): Promise<FileItem> {
    const response = await api.get<ApiResponse<FileItem>>(`/files/${id}`);
    return response.data.data;
  },

  async upload(file: File): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<FileItem>>('/files/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  },

  async getStats(): Promise<FileStats> {
    const response = await api.get<ApiResponse<FileStats>>('/files/stats');
    return response.data.data;
  },

  async triggerAudit(fileId: string): Promise<{ jobId: string; fileId: string; status: string }> {
    const response = await api.post(`/files/${fileId}/audit`);
    return response.data.data;
  },

  async bulkDelete(fileIds: string[]): Promise<{ deleted: number; failed: number; errors?: Array<{ fileId: string; error: string }> }> {
    const response = await api.post('/files/bulk/delete', { fileIds });
    return response.data.data;
  },

  async bulkAudit(fileIds: string[]): Promise<{ total: number; successful: number; failed: number; results: Array<{ fileId: string; jobId?: string; error?: string }> }> {
    const response = await api.post('/files/bulk/audit', { fileIds });
    return response.data.data;
  },

  async getFileArtifacts(fileId: string): Promise<Array<{ id: string; type: string; name: string; createdAt: string; data: unknown }>> {
    const response = await api.get(`/files/${fileId}/artifacts`);
    return response.data.data;
  },
};
