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

    let jobs: Job[];
    let pagination: JobsListResponse['pagination'];

    // Expected backend response: { data: { jobs: [...], pagination: { total, page, limit, pages } } }
    if (Array.isArray(responseData.data)) {
      console.warn('[jobs.service] Non-standard response: responseData.data is an array, expected { jobs, pagination }', { responseData });
      jobs = responseData.data;
    } else if (responseData.data?.jobs) {
      jobs = responseData.data.jobs;
    } else {
      console.warn('[jobs.service] Non-standard response: responseData.data.jobs is absent', { responseData });
      jobs = [];
    }

    if (responseData.data?.pagination) {
      pagination = responseData.data.pagination;
    } else if (responseData.pagination) {
      console.warn('[jobs.service] Non-standard response: using responseData.pagination instead of responseData.data.pagination', { responseData });
      pagination = responseData.pagination;
    } else {
      console.warn('[jobs.service] Non-standard response: pagination is absent, using fallback', { responseData });
      const total = responseData.total ?? responseData.data?.total;
      const limit = filters?.limit || 20;
      pagination = {
        page: filters?.page || 1,
        limit,
        total: total ?? 0,
        pages: (total !== undefined && limit) ? Math.ceil(total / limit) : 1,
      };
    }

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
