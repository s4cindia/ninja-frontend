import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface ReportVersion {
  id: string;
  versionNumber: number;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
  totalCriteria: number;
  applicableCriteria: number;
  passedCriteria: number;
  failedCriteria: number;
  naCriteria: number;
  documentType?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ReportData {
  acrJobId: string;
  jobId: string;
  edition: string;
  documentTitle?: string;
  documentType?: string;
  status: string;
  executiveSummary?: string;
  conformanceLevel?: string;
  summary: {
    totalCriteria: number;
    applicableCriteria: number;
    passedCriteria: number;
    failedCriteria: number;
    naCriteria: number;
  };
  criteria: Record<string, unknown>[];
  naCriteria: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all versions for a job
 */
export function useAcrVersions(jobId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ['acr-versions', jobId],
    queryFn: async () => {
      const response = await api.get<{ data: ReportVersion[] }>(`/acr/report/${jobId}/versions`);
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 30000, // Default 30 seconds
  });
}

/**
 * Fetch specific version by acrJobId
 */
export function useAcrVersion(acrJobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['acr-version', acrJobId],
    queryFn: async () => {
      const response = await api.get<{ data: ReportData }>(`/acr/report/version/${acrJobId}`);
      return response.data.data;
    },
    enabled: options?.enabled ?? false, // Only fetch when explicitly enabled
  });
}

// Aliases for compatibility with existing components
export const useVersionHistory = useAcrVersions;
export const useVersionDetails = useAcrVersion;

/**
 * Compare two versions (for VersionComparison.tsx compatibility)
 */
export function useCompareVersions(acrId: string, version1: number, version2: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['compare-versions', acrId, version1, version2],
    queryFn: async () => {
      // This is a placeholder - the actual comparison happens in VersionCompareModal
      // which uses useAcrVersion to fetch both versions individually
      const response = await api.get<{ data: Record<string, unknown> }>(`/acr/${acrId}/compare?v1=${version1}&v2=${version2}`);
      return response.data.data;
    },
    enabled: options?.enabled ?? false,
  });
}
