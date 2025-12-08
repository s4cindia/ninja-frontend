import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesService } from '@/services/files.service';

export function useFiles(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => filesService.list(params),
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
