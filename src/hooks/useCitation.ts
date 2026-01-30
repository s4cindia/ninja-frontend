import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationService, CitationServiceError } from '@/services/citation.service';
import { CITATION_STALE_TIME } from '@/config/query.config';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

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
  return useQuery<PaginatedCitations, CitationServiceError>({
    queryKey: [...citationKeys.byJob(jobId), filters],
    queryFn: () => citationService.getByJob(jobId, filters),
    enabled: !!jobId,
    staleTime: CITATION_STALE_TIME,
  });
}

/**
 * Hook to get citations by document ID
 */
export function useCitationsByDocument(documentId: string, filters?: CitationFilters) {
  return useQuery<PaginatedCitations, CitationServiceError>({
    queryKey: [...citationKeys.byDocument(documentId), filters],
    queryFn: () => citationService.getByDocument(documentId, filters),
    enabled: !!documentId,
    staleTime: CITATION_STALE_TIME,
  });
}

/**
 * Hook to get a single citation with details
 */
export function useCitation(citationId: string) {
  return useQuery<Citation, CitationServiceError>({
    queryKey: citationKeys.detail(citationId),
    queryFn: () => citationService.getById(citationId),
    enabled: !!citationId,
    staleTime: CITATION_STALE_TIME,
  });
}

/**
 * Hook to get citation component history
 */
export function useCitationComponents(citationId: string) {
  return useQuery<CitationComponent[], CitationServiceError>({
    queryKey: citationKeys.components(citationId),
    queryFn: () => citationService.getComponents(citationId),
    enabled: !!citationId,
    staleTime: CITATION_STALE_TIME,
  });
}

/**
 * Hook to get citation statistics
 */
export function useCitationStats(documentId: string) {
  return useQuery<CitationStats, CitationServiceError>({
    queryKey: citationKeys.stats(documentId),
    queryFn: () => citationService.getStats(documentId),
    enabled: !!documentId,
    staleTime: CITATION_STALE_TIME,
  });
}

/**
 * Hook to detect citations from file upload
 * 
 * @example
 * const { mutate, isPending } = useDetectCitations();
 * const abortController = useRef<AbortController>();
 * 
 * const handleUpload = (file: File) => {
 *   abortController.current = new AbortController();
 *   mutate({ file, signal: abortController.current.signal });
 * };
 * 
 * // Cleanup on unmount
 * useEffect(() => () => abortController.current?.abort(), []);
 */
export function useDetectCitations() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, CitationServiceError, { file: File; signal?: AbortSignal }>({
    mutationFn: ({ file, signal }) => citationService.detectFromFile(file, signal),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
    },
  });
}

/**
 * Hook to detect citations from existing job
 * 
 * @example
 * const { mutate, isPending } = useDetectCitationsFromJob();
 * const abortController = useRef<AbortController>();
 * 
 * const handleDetect = (jobId: string) => {
 *   abortController.current = new AbortController();
 *   mutate({ jobId, signal: abortController.current.signal });
 * };
 * 
 * // Cleanup on unmount
 * useEffect(() => () => abortController.current?.abort(), []);
 */
export function useDetectCitationsFromJob() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, CitationServiceError, { jobId: string; signal?: AbortSignal }>({
    mutationFn: ({ jobId, signal }) => citationService.detectFromJob(jobId, signal),
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

  return useMutation<CitationComponent, CitationServiceError, string>({
    mutationFn: (citationId: string) => citationService.parse(citationId),
    onSuccess: async (_data, citationId) => {
      // Invalidate all citation-related queries to avoid race conditions
      // where getQueryData might return stale data before refetch completes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: citationKeys.detail(citationId) }),
        queryClient.invalidateQueries({ queryKey: citationKeys.components(citationId) }),
        // Invalidate all document/job lists and stats since we don't know which document this belongs to
        queryClient.invalidateQueries({ queryKey: citationKeys.all, exact: false }),
      ]);
    },
  });
}

/**
 * Hook to parse all citations in a document
 * 
 * @example
 * const { mutate, isPending } = useParseAllCitations();
 * const abortController = useRef<AbortController>();
 * 
 * const handleParseAll = (documentId: string) => {
 *   abortController.current = new AbortController();
 *   mutate({ documentId, signal: abortController.current.signal });
 * };
 * 
 * // Cleanup on unmount
 * useEffect(() => () => abortController.current?.abort(), []);
 */
export function useParseAllCitations() {
  const queryClient = useQueryClient();

  return useMutation<BulkParseResult, CitationServiceError, { documentId: string; signal?: AbortSignal }>({
    mutationFn: ({ documentId, signal }) => citationService.parseAll(documentId, signal),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
      queryClient.invalidateQueries({ queryKey: citationKeys.stats(data.documentId) });
    },
  });
}
