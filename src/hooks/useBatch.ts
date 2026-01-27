import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { batchService } from '@/services/batch.service';
import type {
  CreateBatchRequest,
  StartBatchRequest,
  GenerateAcrRequest,
  BatchSSEEvent,
} from '@/types/batch.types';
import toast from 'react-hot-toast';

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBatchRequest) => batchService.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create batch');
    },
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, files }: { batchId: string; files: File[] }) =>
      batchService.uploadFiles(batchId, files),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      toast.success('Files uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload files');
    },
  });
}

export function useRemoveFile(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => batchService.removeFile(batchId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      toast.success('File removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove file');
    },
  });
}

export function useStartBatch(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: StartBatchRequest) => {
      if (!batchId) {
        return Promise.reject(new Error('Batch ID is required'));
      }
      return batchService.startBatch(batchId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      toast.success('Batch processing started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start batch');
    },
  });
}

export function useBatch(batchId: string | null | undefined) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => batchService.getBatch(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PROCESSING' || data?.status === 'QUEUED') {
        return 5000;
      }
      return false;
    },
  });
}

export function useBatches(page: number = 1, status?: string) {
  return useQuery({
    queryKey: ['batches', page, status],
    queryFn: () => batchService.listBatches(page, 20, status),
  });
}

export function useCancelBatch(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!batchId) {
        return Promise.reject(new Error('Batch ID is required'));
      }
      return batchService.cancelBatch(batchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel batch');
    },
  });
}

export function useGenerateAcr(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateAcrRequest) => batchService.generateAcr(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      toast.success('ACR generation started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate ACR');
    },
  });
}

export function useExportBatch(batchId: string) {
  return useMutation({
    mutationFn: () => batchService.exportBatch(batchId),
    onSuccess: (data) => {
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success('Export ready for download');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export batch');
    },
  });
}

export function useApplyQuickFixes(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => batchService.applyQuickFixes(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply quick-fixes');
    },
  });
}

export function useBatchFile(batchId: string | undefined, fileId: string | undefined) {
  return useQuery({
    queryKey: ['batch-file', batchId, fileId],
    queryFn: () => batchService.getBatchFile(batchId!, fileId!),
    enabled: !!batchId && !!fileId,
  });
}

export function useBatchSSE(
  batchId: string | undefined,
  onEvent: (event: BatchSSEEvent) => void
) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const stableOnEvent = useCallback(onEvent, [onEvent]);

  useEffect(() => {
    if (!batchId) return;

    eventSourceRef.current = batchService.subscribeToBatch(batchId, (event) => {
      stableOnEvent(event as BatchSSEEvent);
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
    });

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [batchId, stableOnEvent, queryClient]);
}
