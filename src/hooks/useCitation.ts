import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationService } from '@/services/citation.service';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Query keys for cache management
export const citationKeys = {
  all: ['citations'] as const,
  byDocument: (documentId: string) => [...citationKeys.all, 'document', documentId] as const,
  byJob: (jobId: string) => [...citationKeys.all, 'job', jobId] as const,
  detail: (id: string) => [...citationKeys.all, 'detail', id] as const,
  components: (id: string) => [...citationKeys.all, 'components', id] as const,
  stats: (documentId: string) => [...citationKeys.all, 'stats', documentId] as const,
};

/**
 * Hook to get citations by job ID
 */
export function useCitationsByJob(jobId: string, filters?: CitationFilters) {
  return useQuery<PaginatedCitations>({
    queryKey: [...citationKeys.byJob(jobId), filters],
    queryFn: () => citationService.getByJob(jobId, filters),
    enabled: !!jobId,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to get citations by document ID
 */
export function useCitationsByDocument(documentId: string, filters?: CitationFilters) {
  return useQuery<PaginatedCitations>({
    queryKey: [...citationKeys.byDocument(documentId), filters],
    queryFn: () => citationService.getByDocument(documentId, filters),
    enabled: !!documentId,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to get a single citation with details
 */
export function useCitation(citationId: string) {
  return useQuery<Citation>({
    queryKey: citationKeys.detail(citationId),
    queryFn: () => citationService.getById(citationId),
    enabled: !!citationId,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to get citation component history
 */
export function useCitationComponents(citationId: string) {
  return useQuery<CitationComponent[]>({
    queryKey: citationKeys.components(citationId),
    queryFn: () => citationService.getComponents(citationId),
    enabled: !!citationId,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to get citation statistics
 */
export function useCitationStats(documentId: string) {
  return useQuery<CitationStats>({
    queryKey: citationKeys.stats(documentId),
    queryFn: () => citationService.getStats(documentId),
    enabled: !!documentId,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to detect citations from file upload
 */
export function useDetectCitations() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, Error, File>({
    mutationFn: (file: File) => citationService.detectFromFile(file),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
    },
  });
}

/**
 * Hook to detect citations from existing job
 */
export function useDetectCitationsFromJob() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, Error, string>({
    mutationFn: (jobId: string) => citationService.detectFromJob(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
    },
  });
}

/**
 * Hook to parse a single citation
 */
export function useParseCitation() {
  const queryClient = useQueryClient();

  return useMutation<CitationComponent, Error, string>({
    mutationFn: (citationId: string) => citationService.parse(citationId),
    onSuccess: (_data, citationId) => {
      // Update citation detail cache
      queryClient.invalidateQueries({ queryKey: citationKeys.detail(citationId) });
      queryClient.invalidateQueries({ queryKey: citationKeys.components(citationId) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: citationKeys.all });
    },
  });
}

/**
 * Hook to parse all citations in a document
 */
export function useParseAllCitations() {
  const queryClient = useQueryClient();

  return useMutation<BulkParseResult, Error, string>({
    mutationFn: (documentId: string) => citationService.parseAll(documentId),
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
      queryClient.invalidateQueries({ queryKey: citationKeys.stats(data.documentId) });
    },
  });
}
