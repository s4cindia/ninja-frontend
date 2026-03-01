import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationService } from '@/services/notification.service';

export function useNotificationToast() {
  const queryClient = useQueryClient();
  // null = not yet seeded; Set = IDs seen since mount
  const seenIds = useRef<Set<string> | null>(null);

  const { data: notifications = [], isSuccess } = useQuery({
    queryKey: ['notifications', 'global'],
    queryFn: () => notificationService.getUnread(),
    refetchInterval: 8_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    // Wait for the first real server response before seeding.
    // Without this, notifications=[] on the initial render seeds an empty set,
    // and all existing notifications look "new" when the query resolves.
    if (!isSuccess) return;

    // First successful fetch: seed so we don't toast for pre-existing notifications
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n.id));
      return;
    }

    for (const n of notifications) {
      if (seenIds.current.has(n.id)) continue;

      seenIds.current.add(n.id);

      const message = (
        <div>
          <p className="font-semibold text-sm">{n.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
        </div>
      );

      if (n.type === 'SYSTEM_ALERT') {
        toast(message, { duration: 8000, position: 'bottom-left', icon: '⚠️' });
      } else if (n.type === 'BATCH_COMPLETED' || n.type === 'JOB_COMPLETED') {
        toast.success(message, { duration: 6000, position: 'bottom-left' });
      } else {
        toast.error(message, { duration: 6000, position: 'bottom-left' });
      }

      // Refresh the bell badge immediately
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [notifications, isSuccess, queryClient]);
}
