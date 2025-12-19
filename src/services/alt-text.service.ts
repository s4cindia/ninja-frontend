import { api, ApiResponse } from './api';
import type { 
  AltTextGenerationResult, 
  ImageType, 
  DocumentContext 
} from '@/types/alt-text.types';

export const altTextService = {
  async generate(imageId: string, jobId: string): Promise<AltTextGenerationResult> {
    const response = await api.post<ApiResponse<AltTextGenerationResult>>('/alt-text/generate', {
      imageId,
      jobId,
    });
    return response.data.data;
  },

  async generateContextual(imageId: string, jobId: string): Promise<{
    contextAware: AltTextGenerationResult;
    standalone: AltTextGenerationResult;
    context: DocumentContext;
    needsReview: boolean;
  }> {
    const response = await api.post<ApiResponse<{
      contextAware: AltTextGenerationResult;
      standalone: AltTextGenerationResult;
      context: DocumentContext;
      needsReview: boolean;
    }>>('/alt-text/generate-contextual', {
      imageId,
      jobId,
    });
    return response.data.data;
  },

  async generateFromFile(file: File, jobId: string, imageId?: string): Promise<AltTextGenerationResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('jobId', jobId);
    if (imageId) formData.append('imageId', imageId);
    
    const response = await api.post<ApiResponse<AltTextGenerationResult>>('/alt-text/generate-from-buffer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async classifyImage(imageId: string, jobId: string): Promise<{
    imageId: string;
    imageType: ImageType;
    needsSpecializedDescription: boolean;
  }> {
    const response = await api.post<ApiResponse<{
      imageId: string;
      imageType: ImageType;
      needsSpecializedDescription: boolean;
    }>>('/alt-text/classify', {
      imageId,
      jobId,
    });
    return response.data.data;
  },

  async generateChartDescription(imageId: string, jobId: string): Promise<{
    imageId: string;
    chartType: string;
    description: string;
    dataPoints?: Array<{ label: string; value: number }>;
  }> {
    const response = await api.post<ApiResponse<{
      imageId: string;
      chartType: string;
      description: string;
      dataPoints?: Array<{ label: string; value: number }>;
    }>>('/alt-text/generate-chart', {
      imageId,
      jobId,
    });
    return response.data.data;
  },
};
