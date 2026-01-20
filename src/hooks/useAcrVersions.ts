import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { 
  VersionEntry, 
  VersionComparison,
  VersionHistoryData 
} from '@/types/version.types';

interface VersionHistoryResponse {
  success: boolean;
  data: VersionEntry[];
  total: number;
}

interface VersionDetailsResponse {
  success: boolean;
  data: {
    version: number;
    createdAt: string;
    createdBy: string;
    changeLog?: Array<{
      field: string;
      previousValue: unknown;
      newValue: unknown;
      reason?: string;
    }>;
  };
}

interface VersionCompareResponse {
  success: boolean;
  data: VersionComparison;
}

export function useVersionHistory(acrId: string): VersionHistoryData {
  // Extract the jobId from the acrId if it follows the pattern "acr-{jobId}"
  const jobId = acrId.startsWith('acr-') ? acrId.slice(4) : acrId;
  
  const query = useQuery({
    queryKey: ['acr-versions', acrId],
    queryFn: async () => {
      // Try the acrId first, then fall back to jobId-based endpoint
      try {
        const response = await api.get<VersionHistoryResponse>(`/acr/${acrId}/versions`);
        return response.data.data;
      } catch (error) {
        // If the acrId format doesn't work, try with the extracted jobId
        if (jobId !== acrId) {
          try {
            const fallbackResponse = await api.get<VersionHistoryResponse>(`/acr/${jobId}/versions`);
            return fallbackResponse.data.data;
          } catch (fallbackError) {
            console.warn('[useVersionHistory] Fallback fetch failed:', fallbackError);
            return [];
          }
        }
        // Log error for debugging, return empty array for graceful degradation
        console.warn('[useVersionHistory] Failed to fetch versions:', error);
        return [];
      }
    },
    enabled: !!acrId && acrId !== 'demo',
    retry: false, // Don't retry on failure to avoid unnecessary API calls
  });

  return {
    versions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

export function useVersionDetails(acrId: string, version: number | null) {
  return useQuery({
    queryKey: ['acr-version-details', acrId, version],
    queryFn: async () => {
      const response = await api.get<VersionDetailsResponse>(`/acr/${acrId}/versions/${version}`);
      const rawData = response.data.data;

      const changes = (rawData.changeLog || []).map((change) => {
        const fieldParts = change.field.split('.');
        let criterionId: string | undefined;
        let fieldName: string;

        if (fieldParts[0] === 'criteria' && fieldParts.length >= 3) {
          criterionId = `${fieldParts[1]}.${fieldParts[2]}`;
          fieldName = fieldParts.slice(3).join('.') || 'conformanceLevel';
        } else {
          fieldName = change.field;
        }

        return {
          field: fieldName,
          criterionId,
          criterionName: undefined,
          oldValue: String(change.previousValue ?? ''),
          newValue: String(change.newValue ?? ''),
          reason: change.reason,
        };
      });

      return {
        version: rawData.version,
        createdAt: rawData.createdAt,
        createdBy: rawData.createdBy,
        changeSummary: rawData.changeLog?.[0]?.reason || `${changes.length} changes`,
        changeCount: changes.length,
        changes,
      };
    },
    enabled: !!acrId && version !== null,
  });
}

export function useCompareVersions(acrId: string, v1: number | null, v2: number | null) {
  return useQuery({
    queryKey: ['acr-version-compare', acrId, v1, v2],
    queryFn: async () => {
      const response = await api.get<VersionCompareResponse>(`/acr/${acrId}/compare?v1=${v1}&v2=${v2}`);
      return response.data.data;
    },
    enabled: !!acrId && v1 !== null && v2 !== null,
  });
}
