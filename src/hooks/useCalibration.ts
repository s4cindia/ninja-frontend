import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCorpusDocuments,
  startCalibration,
  getCalibrationRun,
  getCalibrationRuns,
  getCorpusStats,
  uploadTaggedPdf,
  triggerCorpusCalibrationRun,
} from '../services/calibration.service';
import type { CorpusDocument } from '../services/calibration.service';
import { annotationReportService } from '../services/annotation-report.service';

export const CALIBRATION_KEYS = {
  documents: (params?: object) => ['calibration', 'documents', params] as const,
  runs: (params?: object) => ['calibration', 'runs', params] as const,
  stats: () => ['calibration', 'stats'] as const,
  run: (id: string) => ['calibration', 'run', id] as const,
};

export function useCorpusDocuments(params?: {
  publisher?: string;
  contentType?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: CALIBRATION_KEYS.documents(params),
    queryFn: () => getCorpusDocuments(params),
  });
}

export function useStartCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startCalibration,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration', 'documents'] });
      qc.invalidateQueries({ queryKey: ['calibration', 'runs'] });
    },
  });
}

export function useCalibrationRuns(params?: {
  documentId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: CALIBRATION_KEYS.runs(params),
    queryFn: () => getCalibrationRuns(params),
  });
}

export function useCalibrationRun(runId: string) {
  return useQuery({
    queryKey: CALIBRATION_KEYS.run(runId),
    queryFn: () => getCalibrationRun(runId),
    enabled: !!runId,
  });
}

export function useCorpusStats() {
  return useQuery({
    queryKey: CALIBRATION_KEYS.stats(),
    queryFn: getCorpusStats,
  });
}

export function useUploadTaggedPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: File }) =>
      uploadTaggedPdf(documentId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration', 'documents'] });
    },
  });
}

export function useTriggerCorpusCalibrationRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => triggerCorpusCalibrationRun(documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calibration', 'documents'] });
      qc.invalidateQueries({ queryKey: ['calibration', 'runs'] });
    },
  });
}

export function useReopenAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => annotationReportService.reopenAnnotation(runId),
    onSuccess: () => {
      // Reopen flips the doc out of COMPLETE and clears the run's completion
      // signals, so refresh both the document queue and the runs lists.
      qc.invalidateQueries({ queryKey: ['calibration', 'documents'] });
      qc.invalidateQueries({ queryKey: ['calibration', 'runs'] });
    },
  });
}

export function useCorpusDocumentsWithPolling(params?: {
  publisher?: string;
  contentType?: string;
}) {
  return useQuery({
    queryKey: CALIBRATION_KEYS.documents(params),
    queryFn: () => getCorpusDocuments(params),
    refetchInterval: (query) => {
      const docs = (query.state.data as { documents: CorpusDocument[] } | undefined)?.documents ?? [];
      const hasActive = docs.some((d: CorpusDocument) => {
        const latestRun = d.calibrationRuns?.[0];
        if (latestRun && !latestRun.completedAt) return true;
        const latestJob = d.bootstrapJobs?.[0];
        if (latestJob && !['COMPLETED', 'COMPLETE', 'FAILED'].includes(latestJob.status.toUpperCase())) return true;
        return false;
      });
      return hasActive ? 5000 : false;
    },
  });
}

const PAGE_SIZE = 25;

// Cursor-paginated variant of the document queue, for the "Load more" control.
// Separate from useCorpusDocumentsWithPolling so ZoneReviewWorkspace's
// useCorpusDocuments stays untouched. Polling refetches all loaded pages.
export function useCorpusDocumentsInfinite(params?: {
  publisher?: string;
  contentType?: string;
}) {
  return useInfiniteQuery({
    queryKey: [...CALIBRATION_KEYS.documents(params), 'infinite'],
    queryFn: ({ pageParam }) =>
      getCorpusDocuments({ ...params, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: (query) => {
      const pages =
        (query.state.data as { pages: { documents: CorpusDocument[] }[] } | undefined)?.pages ?? [];
      const docs = pages.flatMap((p) => p.documents);
      const hasActive = docs.some((d) => {
        const latestRun = d.calibrationRuns?.[0];
        if (latestRun && !latestRun.completedAt) return true;
        const latestJob = d.bootstrapJobs?.[0];
        if (latestJob && !['COMPLETED', 'COMPLETE', 'FAILED'].includes(latestJob.status.toUpperCase())) return true;
        return false;
      });
      return hasActive ? 5000 : false;
    },
  });
}
