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
    onSuccess: async (data, citationId) => {
      console.log('[useParseCitation] Parse succeeded for:', citationId, 'Component:', data);
      
      // Update the specific citation in the cache with the new primaryComponentId
      queryClient.setQueriesData(
        { predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'citations' },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object') return oldData;
          
          // Handle PaginatedCitations structure
          if ('items' in oldData && Array.isArray((oldData as { items: unknown[] }).items)) {
            const paginatedData = oldData as { items: Citation[] };
            return {
              ...paginatedData,
              items: paginatedData.items.map((citation: Citation) =>
                citation.id === citationId
                  ? { ...citation, primaryComponentId: data.id, primaryComponent: data }
                  : citation
              ),
            };
          }
          
          // Handle single Citation
          if ('id' in oldData && (oldData as Citation).id === citationId) {
            return { ...oldData, primaryComponentId: data.id, primaryComponent: data };
          }
          
          return oldData;
        }
      );
      
      // Also refetch stats to update the counts
      await queryClient.refetchQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'citations' && key[1] === 'stats';
        },
      });
      
      console.log('[useParseCitation] Cache updated and stats refetched');
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
