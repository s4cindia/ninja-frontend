import { api, ApiResponse } from './api';

export interface Job {
  id: string;
  type: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface JobsListResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface JobStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  averageProcessingTime?: number;
}

export const jobsService = {
  async getJobs(filters?: JobFilters): Promise<JobsListResponse> {
    const response = await api.get('/jobs', { params: filters });
    const responseData = response.data;

    const jobs = Array.isArray(responseData.data) ? responseData.data : responseData.data?.jobs || [];
    const pagination = responseData.pagination || responseData.data?.pagination || {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      total: jobs.length,
      pages: 1,
    };

    return { jobs, pagination };
  },

  async getJob(jobId: string): Promise<Job> {
    const response = await api.get<ApiResponse<Job>>(`/jobs/${jobId}`);
    return response.data.data;
  },

  async getJobStats(): Promise<JobStats> {
    const response = await api.get<ApiResponse<JobStats>>('/jobs/stats');
    return response.data.data;
  },

  async cancelJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  },
};
