import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfBatchService } from '@/services/pdfBatch.service';
import type { AddPdfBatchItemsRequestItem, CreatePdfBatchRequest, StartPdfBatchRequest } from '@/types/pdfBatch.types';
import { getErrorMessage } from '@/services/api';
import toast from 'react-hot-toast';

const BATCH_KEY = (batchId: string) => ['pdf-batch', batchId] as const;
const BATCHES_KEY = (page: number, status?: string) => ['pdf-batches', page, status] as const;

const NON_TERMINAL_BATCH_STATUSES = ['QUEUED', 'PROCESSING'];

export function useCreatePdfBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePdfBatchRequest) => pdfBatchService.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-batches'] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to create batch');
    },
  });
}

export function useAddPdfBatchItems(batchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: AddPdfBatchItemsRequestItem[]) => {
      if (!batchId) return Promise.reject(new Error('Batch ID is required'));
      return pdfBatchService.addItems(batchId, items);
    },
    onSuccess: () => {
      if (batchId) queryClient.invalidateQueries({ queryKey: BATCH_KEY(batchId) });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to add files to batch');
    },
  });
}

export function useRemovePdfBatchItem(batchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => {
      if (!batchId) return Promise.reject(new Error('Batch ID is required'));
      return pdfBatchService.removeItem(batchId, itemId);
    },
    onSuccess: () => {
      if (batchId) queryClient.invalidateQueries({ queryKey: BATCH_KEY(batchId) });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to remove file');
    },
  });
}

export function useStartPdfBatch(batchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides?: StartPdfBatchRequest) => {
      if (!batchId) return Promise.reject(new Error('Batch ID is required'));
      return pdfBatchService.startBatch(batchId, overrides);
    },
    onSuccess: () => {
      if (batchId) queryClient.invalidateQueries({ queryKey: BATCH_KEY(batchId) });
      toast.success('Batch processing started');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to start batch');
    },
  });
}

export function useCancelPdfBatch(batchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!batchId) return Promise.reject(new Error('Batch ID is required'));
      return pdfBatchService.cancelBatch(batchId);
    },
    onSuccess: () => {
      if (batchId) queryClient.invalidateQueries({ queryKey: BATCH_KEY(batchId) });
      queryClient.invalidateQueries({ queryKey: ['pdf-batches'] });
      toast.success('Batch cancelled');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to cancel batch');
    },
  });
}

/**
 * Polls every 5s while the batch has work left to do, same "poll only
 * while something could still change" principle as the EPUB useBatch hook
 * and the PDF single-job useAutoModeStatus hook. A PDF batch can legitimately
 * run for hours (each item is a full multi-round Auto Mode remediation), so
 * this is a long-lived poll, not a quick one.
 */
export function usePdfBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: BATCH_KEY(batchId ?? ''),
    queryFn: () => pdfBatchService.getBatch(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => (
      NON_TERMINAL_BATCH_STATUSES.includes(query.state.data?.status ?? '') ? 5000 : false
    ),
  });
}

export function usePdfBatches(page: number = 1, status?: string) {
  return useQuery({
    queryKey: BATCHES_KEY(page, status),
    queryFn: () => pdfBatchService.listBatches(page, 20, status),
  });
}

/**
 * Suggested cost limit to seed AutoModeStartControl's popover on the batch
 * "Start Processing" step, instead of its hardcoded $2 default. Tenant-wide
 * (see pdfBatchService.getBudgetEstimate's own doc comment), not polled --
 * a one-time fetch is enough.
 */
export function useBatchBudgetEstimate(batchId: string | undefined) {
  return useQuery({
    queryKey: ['pdf-batch-budget-estimate', batchId ?? ''] as const,
    queryFn: () => pdfBatchService.getBudgetEstimate(batchId!),
    enabled: !!batchId,
  });
}
