import { api, ApiResponse } from './api';
import type { 
  AltTextGenerationResult, 
  ImageType, 
  DocumentContext,
  AltTextFlag 
} from '@/types/alt-text.types';

function generateMockResult(imageId: string, fileName?: string): AltTextGenerationResult {
  const baseMock = {
    shortAlt: '[Demo Mode] Image requires backend AI service for accurate description',
    extendedAlt: 'This is a placeholder description. Connect the backend alt-text API endpoints to enable real AI-powered image analysis using Google Gemini or similar vision models. The actual service will analyze image content, detect objects, text, faces, and generate context-aware descriptions.',
    confidence: 50,
    flags: ['NEEDS_MANUAL_REVIEW'] as AltTextFlag[],
  };
  
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('chart') || lowerName.includes('graph') || lowerName.includes('data')) {
      baseMock.shortAlt = `[Demo] Chart/graph image: ${fileName}`;
      baseMock.flags = ['DATA_VISUALIZATION', 'NEEDS_MANUAL_REVIEW'];
      baseMock.confidence = 60;
    } else if (lowerName.includes('photo') || lowerName.includes('img') || lowerName.includes('pic')) {
      baseMock.shortAlt = `[Demo] Photo image: ${fileName}`;
      baseMock.confidence = 55;
    } else if (lowerName.includes('diagram') || lowerName.includes('flow')) {
      baseMock.shortAlt = `[Demo] Diagram image: ${fileName}`;
      baseMock.flags = ['COMPLEX_IMAGE', 'NEEDS_MANUAL_REVIEW'];
      baseMock.confidence = 55;
    } else {
      baseMock.shortAlt = `[Demo] Uploaded image: ${fileName}`;
    }
  }
  
  return {
    imageId,
    shortAlt: baseMock.shortAlt,
    extendedAlt: baseMock.extendedAlt,
    confidence: baseMock.confidence,
    flags: baseMock.flags,
    aiModel: 'demo-mode (backend unavailable)',
    generatedAt: new Date().toISOString(),
    needsReview: true,
  };
}

function generateMockContext(): DocumentContext {
  return {
    documentTitle: 'Sample Educational Document',
    chapterTitle: 'Chapter 3: Visual Learning',
    textBefore: 'The following figure illustrates the key concepts discussed in this section.',
    textAfter: 'Pay attention to the relationship between the visual elements and the data they represent.',
    nearestHeading: 'Understanding Data Visualization',
    caption: 'Figure 3.2: Quarterly performance metrics',
    pageNumber: 42,
  };
}

export const altTextService = {
  async generate(imageId: string, jobId: string): Promise<AltTextGenerationResult> {
    try {
      const response = await api.post<ApiResponse<AltTextGenerationResult>>('/alt-text/generate', {
        imageId,
        jobId,
      });
      return response.data.data;
    } catch (error) {
      console.warn('Alt text API unavailable, using demo mode:', error);
      await new Promise(resolve => setTimeout(resolve, 800));
      return generateMockResult(imageId);
    }
  },

  async generateContextual(imageId: string, jobId: string): Promise<{
    contextAware: AltTextGenerationResult;
    standalone: AltTextGenerationResult;
    context: DocumentContext;
    needsReview: boolean;
  }> {
    try {
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
    } catch (error) {
      console.warn('Alt text contextual API unavailable, using demo mode:', error);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const standalone = generateMockResult(imageId);
      const contextAware = {
        ...standalone,
        shortAlt: standalone.shortAlt + ' (with document context)',
        confidence: Math.min(standalone.confidence + 8, 98),
      };
      
      return {
        contextAware,
        standalone,
        context: generateMockContext(),
        needsReview: standalone.confidence < 70,
      };
    }
  },

  async generateFromFile(file: File, jobId: string, imageId?: string): Promise<AltTextGenerationResult> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('jobId', jobId);
      if (imageId) formData.append('imageId', imageId);
      
      const response = await api.post<ApiResponse<AltTextGenerationResult>>('/alt-text/generate-from-buffer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    } catch (error) {
      console.warn('Alt text file upload API unavailable, using demo mode:', error);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedId = imageId || `uploaded-${Date.now()}`;
      return generateMockResult(generatedId, file.name);
    }
  },

  async classifyImage(imageId: string, jobId: string): Promise<{
    imageId: string;
    imageType: ImageType;
    needsSpecializedDescription: boolean;
  }> {
    try {
      const response = await api.post<ApiResponse<{
        imageId: string;
        imageType: ImageType;
        needsSpecializedDescription: boolean;
      }>>('/alt-text/classify', {
        imageId,
        jobId,
      });
      return response.data.data;
    } catch (error) {
      console.warn('Alt text classify API unavailable, using demo mode:', error);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const types: ImageType[] = ['PHOTO', 'BAR_CHART', 'DIAGRAM', 'INFOGRAPHIC', 'FLOWCHART'];
      const index = Math.abs(imageId.charCodeAt(0) % types.length);
      const imageType = types[index];
      
      return {
        imageId,
        imageType,
        needsSpecializedDescription: ['BAR_CHART', 'DIAGRAM', 'FLOWCHART'].includes(imageType),
      };
    }
  },

  async generateChartDescription(imageId: string, jobId: string): Promise<{
    imageId: string;
    chartType: string;
    description: string;
    dataPoints?: Array<{ label: string; value: number }>;
  }> {
    try {
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
    } catch (error) {
      console.warn('Alt text chart API unavailable, using demo mode:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        imageId,
        chartType: 'bar',
        description: 'A bar chart showing quarterly performance data with four data points. The highest value appears in Q2, followed by Q4, Q1, and Q3 in descending order.',
        dataPoints: [
          { label: 'Q1', value: 12 },
          { label: 'Q2', value: 19 },
          { label: 'Q3', value: 8 },
          { label: 'Q4', value: 15 },
        ],
      };
    }
  },
};
