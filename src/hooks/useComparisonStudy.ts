import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparisonStudyService, uploadComparisonPdf } from '@/services/comparisonStudy.service';
import type { ComparisonTrialContentType } from '@/types/comparisonStudy.types';

const TRIALS_KEY = ['comparison-study', 'trials'] as const;

const KEYS = {
  trials: (params?: { status?: string; contentType?: string }) => [...TRIALS_KEY, params] as const,
  trial: (id: string) => ['comparison-study', 'trial', id] as const,
  report: (id: string) => ['comparison-study', 'report', id] as const,
  aggregate: () => ['comparison-study', 'aggregate-report'] as const,
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
