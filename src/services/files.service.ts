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

    const response = await api.post<ApiResponse<FileItem>>('/files/upload', formData);
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
};
