import { api, ApiResponse } from './api';

export interface DashboardStats {
  totalFiles: number;
  filesProcessed: number;
  filesPending: number;
  filesFailed: number;
  averageComplianceScore: number;
}

export interface RecentActivity {
  id: string;
  type: 'upload' | 'validation' | 'compliance';
  description: string;
  timestamp: string;
  fileId?: string;
  fileName?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data.data;
  },

  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    const response = await api.get<ApiResponse<RecentActivity[]>>('/dashboard/activity', {
      params: { limit },
    });
    return response.data.data;
  },

  async getDashboard(): Promise<DashboardData> {
    const response = await api.get<ApiResponse<DashboardData>>('/dashboard');
    return response.data.data;
  },
};
