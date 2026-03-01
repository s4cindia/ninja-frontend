import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';

const QUERY_KEY = ['notifications'];

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationService.getUnread(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
