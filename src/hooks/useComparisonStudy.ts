import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparisonStudyService, uploadComparisonPdf, uploadExternalPacReportFile } from '@/services/comparisonStudy.service';
import type { ComparisonTrialContentType, ComparisonTrialMode, AutoColorContrastMode, ExternalPacReportSummary } from '@/types/comparisonStudy.types';

const TRIALS_KEY = ['comparison-study', 'trials'] as const;

const KEYS = {
  trials: (params?: { status?: string; contentType?: string }) => [...TRIALS_KEY, params] as const,
  trial: (id: string) => ['comparison-study', 'trial', id] as const,
  report: (id: string) => ['comparison-study', 'report', id] as const,
  aggregate: () => ['comparison-study', 'aggregate-report'] as const,
  pacReport: (trialId: string) => ['comparison-study', 'pac-report', trialId] as const,
  manualFixes: (trialId: string) => ['comparison-study', 'manual-fixes', trialId] as const,
};

const PAGE_SIZE = 20;

export function useComparisonTrialsInfinite(params?: { status?: string; contentType?: string }) {
  return useInfiniteQuery({
    queryKey: KEYS.trials(params),
    queryFn: ({ pageParam }) =>
      comparisonStudyService.listTrials({ ...params, limit: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useComparisonTrial(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.trial(id ?? ''),
    queryFn: () => comparisonStudyService.getTrial(id!),
    enabled: !!id,
  });
}

export function useTrialReport(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.report(id ?? ''),
    queryFn: () => comparisonStudyService.getTrialReport(id!),
    enabled: !!id,
    // A 404 here (no comparison report yet — the trial hasn't been
    // validated) is an expected, terminal state for most trials, not a
    // transient failure — retrying it 3x (the app-wide default) just delays
    // isLoading settling to false for no benefit.
    retry: false,
  });
}

export function useAggregateReport() {
  return useQuery({
    queryKey: KEYS.aggregate(),
    queryFn: () => comparisonStudyService.getAggregateReport(),
  });
}

export function useRegisterTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, contentType }: { file: File; contentType: ComparisonTrialContentType }) => {
      const s3Key = await uploadComparisonPdf(file);
      return comparisonStudyService.registerTrial({
        sourceFileName: file.name,
        sourceS3Key: s3Key,
        contentType,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRIALS_KEY });
    },
  });
}

export function useLogPdfxtData(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pdfxtS3Key?: string;
      pdfxtTimeMs?: number;
      pdfxtPageCount?: number;
      pdfxtCostUsd?: number;
    }) => comparisonStudyService.logPdfxtData(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.trial(id) });
      qc.invalidateQueries({ queryKey: TRIALS_KEY });
    },
  });
}

/** 409 if mode is changed while autoStatus === 'running' — surface that to the caller, don't swallow it. */
export function useUpdateAutoModeConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      mode?: ComparisonTrialMode;
      autoMaxRounds?: number;
      autoCostLimitUsd?: number;
      autoColorContrastMode?: AutoColorContrastMode;
    }) => comparisonStudyService.updateAutoModeConfig(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.trial(id) });
      qc.invalidateQueries({ queryKey: TRIALS_KEY });
    },
  });
}

export function useValidateTrial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => comparisonStudyService.validateTrial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.trial(id) });
      qc.invalidateQueries({ queryKey: KEYS.report(id) });
      qc.invalidateQueries({ queryKey: TRIALS_KEY });
      qc.invalidateQueries({ queryKey: KEYS.aggregate() });
    },
  });
}

export function useDeleteTrial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => comparisonStudyService.deleteTrial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRIALS_KEY });
    },
  });
}

/**
 * For callers outside this file that need to invalidate a trial's cached
 * data after something changed it server-side without going through one of
 * the mutations above — e.g. PdfAuditResultsPage's Auto Mode progress
 * effect, which needs the trial's taggerSource/aiFixesAppliedCount/
 * manualFixesRequiredCount to refresh as rounds complete. Keeps the actual
 * query-key shape encapsulated here rather than leaking KEYS/TRIALS_KEY
 * into unrelated pages.
 */
export function useInvalidateComparisonTrial() {
  const qc = useQueryClient();
  return (trialId: string) => {
    qc.invalidateQueries({ queryKey: KEYS.trial(trialId) });
    qc.invalidateQueries({ queryKey: TRIALS_KEY });
  };
}

/** null (not an error) means no External PAC Report has been attached to this trial yet. */
export function useExternalPacReport(trialId: string | undefined) {
  return useQuery({
    queryKey: KEYS.pacReport(trialId ?? ''),
    queryFn: () => comparisonStudyService.getExternalPacReport(trialId!),
    enabled: !!trialId,
  });
}

export function useUploadExternalPacReport(trialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, summary }: { file: File; summary: ExternalPacReportSummary }) => {
      await uploadExternalPacReportFile(trialId, file);
      return comparisonStudyService.confirmExternalPacReportUpload(trialId, {
        originalFileName: file.name,
        mimeType: file.type || 'application/pdf',
        summary,
      });
    },
    onSuccess: (report) => {
      // Seed the cache with the response directly, not just invalidate —
      // invalidate alone leaves a window where the query is stale but not
      // yet refetched, during which the upload form could still be showing
      // (double-submit risk).
      qc.setQueryData(KEYS.pacReport(trialId), report);
      qc.invalidateQueries({ queryKey: KEYS.pacReport(trialId) });
    },
  });
}

export function useDeleteExternalPacReport(trialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => comparisonStudyService.deleteExternalPacReport(trialId),
    onSuccess: () => {
      // Same reasoning as the upload mutation above — seed null directly so
      // the deleted report doesn't keep showing until the invalidated query
      // gets around to refetching.
      qc.setQueryData(KEYS.pacReport(trialId), null);
      qc.invalidateQueries({ queryKey: KEYS.pacReport(trialId) });
    },
  });
}

/**
 * Lazy — only fetches once `enabled` (the modal being open), not on every
 * report-page load. staleTime: 0 (overriding the app-wide 5-minute
 * default) so reopening the modal after remediating/re-auditing always
 * refetches instead of serving a list from before those fixes landed.
 */
export function useManualFixes(trialId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.manualFixes(trialId ?? ''),
    queryFn: () => comparisonStudyService.getManualFixes(trialId!),
    enabled: enabled && !!trialId,
    staleTime: 0,
  });
}
