import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getCalibrationZones,
  confirmZone,
  correctZone,
  rejectZone,
  confirmAllGreen,
  runAutoAnnotation,
  runAiAnnotation,
  runComparison,
  getComparisonReport,
  getAiAnnotationReport,
  getAnnotationGuide,
  getAnnotationFeedback,
  getAggregateComparison,
  type CalibrationZone,
} from '../services/zone-correction.service';

export const ZONE_KEYS = {
  zones: (runId: string, params?: object) =>
    ['calibration', 'zones', runId, params] as const,
};

const ZONE_PAGE_SIZE = 2000;
// Defensive guard: stop draining after this many pages.
// Hitting it implies the backend cursor isn't terminating — bug to investigate,
// not a normal condition. At ZONE_PAGE_SIZE=2000 this caps at 100k zones.
const ZONE_MAX_PAGES = 50;

export function useCalibrationZones(
  runId: string,
  params?: { bucket?: string; limit?: number }
) {
  const pageSize = params?.limit ?? ZONE_PAGE_SIZE;
  const bucket = params?.bucket;

  const query = useInfiniteQuery({
    queryKey: ZONE_KEYS.zones(runId, params),
    queryFn: ({ pageParam }) =>
      getCalibrationZones(runId, {
        bucket,
        limit: pageSize,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!runId,
  });

  const pagesLoaded = query.data?.pages.length ?? 0;
  const hitMaxPages = pagesLoaded >= ZONE_MAX_PAGES && (query.hasNextPage ?? false);

  // Auto-drain: keep fetching pages until exhausted or guard hits.
  useEffect(() => {
    if (
      query.hasNextPage &&
      !query.isFetchingNextPage &&
      pagesLoaded < ZONE_MAX_PAGES
    ) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, pagesLoaded, query]);

  // Surface guard hits so we notice cursor-loop bugs in staging.
  useEffect(() => {
    if (hitMaxPages) {
      console.warn(
        `[useCalibrationZones] Hit ZONE_MAX_PAGES=${ZONE_MAX_PAGES} for run ${runId}; ` +
          'backend nextCursor may not be terminating.'
      );
    }
  }, [hitMaxPages, runId]);

  // Flatten pages so consumers see CalibrationZone[].
  const zones = useMemo<CalibrationZone[]>(
    () => query.data?.pages.flatMap((p) => p.zones) ?? [],
    [query.data]
  );

  return {
    zones,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingMore: query.isFetchingNextPage,
    isComplete:
      !query.isLoading && !query.isError && (query.hasNextPage === false || hitMaxPages),
    pagesLoaded,
    hitMaxPages,
  };
}

export function useConfirmZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmZone,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useCorrectZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      zoneId,
      payload,
    }: {
      zoneId: string;
      payload: { newLabel: string; correctionReason?: string; bbox?: object };
    }) => correctZone(zoneId, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useRejectZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ zoneId, correctionReason }: { zoneId: string; correctionReason?: string }) =>
      rejectZone(zoneId, correctionReason ? { correctionReason } : undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useConfirmAllGreen(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmAllGreen(runId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useAutoAnnotate(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runAutoAnnotation(runId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useAiAnnotate(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options?: { dryRun?: boolean }) => runAiAnnotation(runId, options),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useRunComparison(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runComparison(runId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comparison-report', runId] });
    },
  });
}

export function useComparisonReport(runId: string) {
  return useQuery({
    queryKey: ['comparison-report', runId],
    queryFn: () => getComparisonReport(runId),
    enabled: !!runId,
  });
}

export function useAiAnnotationReport(runId: string) {
  return useQuery({
    queryKey: ['ai-annotation-report', runId],
    queryFn: () => getAiAnnotationReport(runId),
    enabled: !!runId,
  });
}

export function useAnnotationGuide(runId: string) {
  return useQuery({
    queryKey: ['annotation-guide', runId],
    queryFn: () => getAnnotationGuide(runId),
    enabled: !!runId,
  });
}

export function useAnnotationFeedback(runId: string) {
  return useQuery({
    queryKey: ['annotation-feedback', runId],
    queryFn: () => getAnnotationFeedback(runId),
    enabled: !!runId,
  });
}

export function useAggregateComparison(options?: { documentIds?: string[]; fromDate?: string }) {
  return useQuery({
    queryKey: ['aggregate-comparison', options],
    queryFn: () => getAggregateComparison(options),
  });
}
