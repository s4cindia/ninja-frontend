import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesService, FilesListResponse } from '@/services/files.service';

export function useFiles(
  params?: { page?: number; limit?: number; status?: string },
  options?: { autoRefreshWhileProcessing?: boolean }
) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => filesService.list(params),
    refetchInterval: (query) => {
      if (!options?.autoRefreshWhileProcessing) return false;
      const data = query.state.data as FilesListResponse | undefined;
      const hasProcessing = data?.files?.some((f) => f.status === 'PROCESSING') ?? false;
      return hasProcessing ? 5000 : false;
    },
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: () => filesService.get(id),
    enabled: !!id,
  });
}

export function useFileStats() {
  return useQuery({
    queryKey: ['fileStats'],
    queryFn: () => filesService.getStats(),
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => filesService.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileStats'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileStats'] });
    },
  });
}

export function useTriggerAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => filesService.triggerAudit(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileIds: string[]) => filesService.bulkDelete(fileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileStats'] });
    },
  });
}

export function useBulkAuditFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileIds: string[]) => filesService.bulkAudit(fileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useFileArtifacts(fileId: string | null) {
  return useQuery({
    queryKey: ['fileArtifacts', fileId],
    queryFn: () => filesService.getFileArtifacts(fileId!),
    enabled: !!fileId,
  });
}
