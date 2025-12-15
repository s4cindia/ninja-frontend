import { api, ApiResponse } from './api';

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'info';
export type IssueStatus = 'open' | 'fixed' | 'ignored';

export interface AccessibilityIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;
  status: IssueStatus;
  description: string;
  element: string;
  location: {
    page?: number;
    xpath?: string;
    selector?: string;
  };
  wcagCriteria: string[];
  recommendation: string;
  createdAt: string;
}

export interface ValidationResult {
  id: string;
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
    fixed: number;
    ignored: number;
  };
  issues: AccessibilityIssue[];
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ValidationListResponse {
  validations: ValidationResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const accessibilityService = {
  async getValidation(fileId: string): Promise<ValidationResult> {
    const response = await api.get<ApiResponse<ValidationResult>>(`/validations/${fileId}`);
    return response.data.data;
  },

  async listValidations(params?: { page?: number; limit?: number }): Promise<ValidationListResponse> {
    const response = await api.get<ApiResponse<ValidationListResponse>>('/validations', { params });
    return response.data.data;
  },

  async updateIssueStatus(
    fileId: string, 
    issueId: string, 
    status: IssueStatus
  ): Promise<AccessibilityIssue> {
    const response = await api.patch<ApiResponse<AccessibilityIssue>>(
      `/validations/${fileId}/issues/${issueId}`,
      { status }
    );
    return response.data.data;
  },

  async retryValidation(fileId: string): Promise<ValidationResult> {
    const response = await api.post<ApiResponse<ValidationResult>>(`/validations/${fileId}/retry`);
    return response.data.data;
  },
};
