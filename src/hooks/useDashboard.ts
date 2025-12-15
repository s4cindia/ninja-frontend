import { useQuery } from '@tanstack/react-query';
import { dashboardService, DashboardStats, RecentActivity, DashboardData } from '@/services/dashboard.service';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery<RecentActivity[]>({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => dashboardService.getRecentActivity(limit),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboard(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
