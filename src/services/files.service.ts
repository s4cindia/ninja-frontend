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
    const response = await api.get<ApiResponse<FilesListResponse>>('/files', { params });
    return response.data.data;
  },

  async get(id: string): Promise<FileItem> {
    const response = await api.get<ApiResponse<FileItem>>(`/files/${id}`);
    return response.data.data;
  },

  async upload(file: File): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<FileItem>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
};
