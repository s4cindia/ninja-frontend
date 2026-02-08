import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  AcrReportData,
  CriterionUpdateData,
  ReportMetadataUpdate,
  CriterionChangeLog
} from '@/types/acr-report.types';

/**
 * Hooks for ACR Report Review & Edit API
 * Focus: Pre-populated data from verification, minimal editing
 */

// Fetch complete report (pre-populated from verification)
export function useAcrReport(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['acr-report', jobId],
    queryFn: async () => {
      const response = await api.get<{ data: AcrReportData }>(`/acr/report/${jobId}`);
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30000, // 30 seconds
  });
}

// Update single criterion (minimal editing)
export function useUpdateCriterion(acrJobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ criterionId, updates }: { criterionId: string; updates: CriterionUpdateData }) => {
      const response = await api.patch(
        `/acr/report/${acrJobId}/criteria/${criterionId}`,
        updates
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate report query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['acr-report'] });
    },
  });
}

// Update report metadata (executive summary, etc.)
export function useUpdateReportMetadata(acrJobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ReportMetadataUpdate) => {
      const response = await api.patch(
        `/acr/report/${acrJobId}/metadata`,
        updates
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acr-report'] });
    },
  });
}

// Get criterion change history
export function useCriterionHistory(acrJobId: string, criterionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['criterion-history', acrJobId, criterionId],
    queryFn: async () => {
      const response = await api.get<{ data: CriterionChangeLog[] }>(
        `/acr/report/${acrJobId}/criteria/${criterionId}/history`
      );
      return response.data.data;
    },
    enabled: options?.enabled ?? false, // Only fetch when explicitly enabled
  });
}

// Approve report for export
export function useApproveReport(acrJobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/acr/report/${acrJobId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acr-report'] });
    },
  });
}

// Initialize report from verification data (import step)
export function useInitializeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      edition,
      verificationData,
      documentTitle,
    }: {
      jobId: string;
      edition: string;
      verificationData: Record<string, unknown>[];
      documentTitle?: string;
    }) => {
      const response = await api.post(`/acr/report/${jobId}/initialize`, {
        edition,
        verificationData,
        documentTitle,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acr-report'] });
    },
  });
}
