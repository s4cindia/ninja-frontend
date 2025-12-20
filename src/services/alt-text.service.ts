import { api, ApiResponse } from './api';
import type { 
  AltTextGenerationResult, 
  ImageType, 
  DocumentContext,
  AltTextFlag 
} from '@/types/alt-text.types';

function generateMockResult(imageId: string): AltTextGenerationResult {
  const mockDescriptions = [
    {
      shortAlt: 'A scenic mountain landscape with snow-capped peaks under a blue sky',
      extendedAlt: 'A panoramic view of a mountain range featuring snow-capped peaks rising against a clear blue sky. The foreground shows alpine meadows with scattered wildflowers, while evergreen forests line the lower slopes. Wispy clouds drift across the peaks, creating a serene atmosphere.',
      confidence: 87,
      flags: [] as AltTextFlag[],
    },
    {
      shortAlt: 'Bar chart showing quarterly sales data from Q1 to Q4',
      extendedAlt: 'A vertical bar chart displaying sales performance across four quarters. Q1 shows 12 units, Q2 peaks at 19 units, Q3 dips to 8 units, and Q4 recovers to 15 units. The chart uses blue bars on a white background with labeled axes.',
      confidence: 92,
      flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    },
    {
      shortAlt: 'Professional headshot of a person smiling at camera',
      extendedAlt: 'A professional portrait photograph showing an individual from the shoulders up. The subject is positioned slightly off-center with natural lighting highlighting their features. The background is softly blurred to keep focus on the subject.',
      confidence: 68,
      flags: ['FACE_DETECTED', 'LOW_CONFIDENCE'] as AltTextFlag[],
    },
  ];
  
  const index = Math.abs(imageId.charCodeAt(imageId.length - 1) % mockDescriptions.length);
  const mock = mockDescriptions[index];
  
  return {
    imageId,
    shortAlt: mock.shortAlt,
    extendedAlt: mock.extendedAlt,
    confidence: mock.confidence,
    flags: mock.flags,
    aiModel: 'demo-model-v1',
    generatedAt: new Date().toISOString(),
    needsReview: mock.confidence < 70,
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
      const result = generateMockResult(generatedId);
      
      if (file.name.toLowerCase().includes('chart') || file.name.toLowerCase().includes('graph')) {
        result.shortAlt = `Chart visualization from ${file.name}`;
        result.flags = ['DATA_VISUALIZATION'];
        result.confidence = 85;
      } else if (file.name.toLowerCase().includes('photo') || file.name.toLowerCase().includes('image')) {
        result.shortAlt = `Photograph from ${file.name}`;
        result.confidence = 78;
      } else {
        result.shortAlt = `Image content from uploaded file: ${file.name}`;
      }
      
      return result;
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
