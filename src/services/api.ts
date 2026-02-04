import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import type { ApplicabilitySuggestion } from '@/types/acr.types';

// Use environment variable for production, fallback to proxy path for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getAccessToken(): string | null {
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) return storeToken;
  
  try {
    const stored = localStorage.getItem('ninja-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.accessToken || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getAccessToken();
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Remove Content-Type for FormData so browser sets it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ 
  resolve: (token: string) => void; 
  reject: (err: unknown) => void 
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          setTokens(newAccessToken, newRefreshToken);
          processQueue(null, newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          logout();
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        const noTokenError = new Error('No refresh token available');
        processQueue(noTokenError, null);
        isRefreshing = false;
        logout();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(noTokenError);
      }
    }
    
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface CreateAcrAnalysisRequest {
  jobId: string;
  edition: string;
  documentTitle?: string;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.error?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export interface CriterionCheck {
  id: string;
  description: string;
  passed: boolean;
}

export interface CriterionIssue {
  issueId?: string;
  ruleId?: string;
  impact?: string;
  message: string;
  filePath?: string;
  location?: string;
  htmlSnippet?: string;
  suggestedFix?: string;
}

export interface FixedIssue extends CriterionIssue {
  fixedAt?: string;
  fixMethod?: 'automated' | 'manual';
}

export interface CriterionConfidence {
  id: string;
  criterionId: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidenceScore: number;
  confidence?: number;
  status: 'pass' | 'fail' | 'not_applicable' | 'not_tested';
  needsVerification: boolean;
  remarks?: string;
  automatedChecks: CriterionCheck[];
  manualChecks: string[];
  relatedIssues?: CriterionIssue[];
  issueCount?: number;
  fixedIssues?: FixedIssue[];
  remediatedIssues?: FixedIssue[];
  fixedCount?: number;
  remediatedCount?: number;
  remainingCount?: number;
  hasIssues?: boolean;
  naSuggestion?: ApplicabilitySuggestion;
}

export interface AcrAnalysisResponse {
  jobId: string;
  criteria: CriterionConfidence[];
  overallConfidence: number;
  analyzedAt: string;
  summary: {
    supports: number;
    partiallySupports: number;
    doesNotSupport: number;
    notApplicable: number;
  };
  otherIssues?: {
    count: number;
    pendingCount?: number;
    fixedCount?: number;
    issues: Array<{
      code: string;
      message: string;
      severity: string;
      location?: string;
      status?: 'pending' | 'fixed' | 'failed' | 'skipped';
      remediationInfo?: {
        description: string;
        fixedAt?: string;
        fixType?: 'auto' | 'manual';
        details?: Record<string, unknown>;
      };
    }>;
  };
}

export async function fetchAcrAnalysis(jobId: string): Promise<AcrAnalysisResponse> {
  const response = await api.get<ApiResponse<AcrAnalysisResponse>>(`/acr/analysis/${jobId}`);
  return response.data.data;
}

export async function createAcrAnalysis(data: CreateAcrAnalysisRequest) {
  const response = await api.post('/acr/analysis', data);
  return response.data;
}
