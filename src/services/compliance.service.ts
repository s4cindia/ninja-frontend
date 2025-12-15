import { api, ApiResponse } from './api';

export type ConformanceLevel = 'Supports' | 'Partially Supports' | 'Does Not Support' | 'Not Applicable';

export interface Section508Criterion {
  criterionId: string;
  title: string;
  wcagMapping: string[];
  conformanceLevel: ConformanceLevel;
  remarks: string;
}

export interface BestMeetsGuidance {
  criterionId: string;
  currentStatus: ConformanceLevel;
  bestMeetsLanguage: string;
  improvementPath?: string;
}

export interface Section508MappingResult {
  overallCompliance: number;
  criteriaResults: Section508Criterion[];
  bestMeetsGuidance: BestMeetsGuidance[];
  competitivePositioning: string;
}

export interface FpcCriterion {
  id: string;
  title: string;
  description: string;
  wcagMapping: string[];
  status: ConformanceLevel;
  remarks: string;
  testMethod: string;
}

export interface FpcValidationResult {
  criteria: FpcCriterion[];
  summary: {
    applicable: number;
    supported: number;
    partiallySupported: number;
  };
}

export const complianceService = {
  async mapToSection508(fileId: string): Promise<Section508MappingResult> {
    const response = await api.post<ApiResponse<Section508MappingResult>>(
      '/compliance/section508/map', 
      { jobId: fileId }
    );
    return response.data.data;
  },

  async validateFpc(fileId: string): Promise<FpcValidationResult> {
    const response = await api.post<ApiResponse<FpcValidationResult>>(
      '/compliance/fpc/validate', 
      { jobId: fileId }
    );
    return response.data.data;
  },

  async getFpcDefinitions(): Promise<FpcCriterion[]> {
    const response = await api.get<ApiResponse<FpcCriterion[]>>('/compliance/fpc/definitions');
    return response.data.data;
  },
};
