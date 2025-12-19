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

const MOCK_STATS: DashboardStats = {
  totalFiles: 24,
  filesProcessed: 18,
  filesPending: 4,
  filesFailed: 2,
  averageComplianceScore: 87,
};

const MOCK_ACTIVITY: RecentActivity[] = [
  {
    id: '1',
    type: 'compliance',
    description: 'ACR report finalized',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    fileName: 'Algebra_2_Chapter_5.pdf',
  },
  {
    id: '2',
    type: 'validation',
    description: 'Accessibility validation completed',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    fileName: 'Chemistry_Lab_Manual.epub',
  },
  {
    id: '3',
    type: 'upload',
    description: 'New file uploaded',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    fileName: 'Biology_Unit_3.pdf',
  },
  {
    id: '4',
    type: 'compliance',
    description: 'ACR report generated',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    fileName: 'English_Literature_Guide.pdf',
  },
  {
    id: '5',
    type: 'validation',
    description: 'Accessibility check started',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    fileName: 'Physics_Workbook.pdf',
  },
];

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return response.data.data;
    } catch {
      return MOCK_STATS;
    }
  },

  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    try {
      const response = await api.get<ApiResponse<RecentActivity[]>>('/dashboard/activity', {
        params: { limit },
      });
      return response.data.data;
    } catch {
      return MOCK_ACTIVITY.slice(0, limit);
    }
  },

  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await api.get<ApiResponse<DashboardData>>('/dashboard');
      return response.data.data;
    } catch {
      return {
        stats: MOCK_STATS,
        recentActivity: MOCK_ACTIVITY,
      };
    }
  },
};
