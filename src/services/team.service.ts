import axios from 'axios';
import { api, ApiResponse } from './api';
import type { TeamJob } from '@/types/team.types';

export interface TeamJobsResponse {
  jobs: TeamJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TeamJobFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export const teamService = {
  // GET /jobs/team -- every job owned by anyone on a team the caller is a
  // TEAM_LEADER or VIEWER on. 403s with NOT_TEAM_LEADER_OR_VIEWER if the
  // caller isn't on any team in either of those roles -- useTeamJobs treats
  // that as an expected, non-retried outcome rather than a transient error.
  async listTeamJobs(filters?: TeamJobFilters): Promise<TeamJobsResponse> {
    const res = await api.get<ApiResponse<TeamJobsResponse>>('/jobs/team', {
      params: filters,
    });
    return res.data.data;
  },
};

// True when `error` is the specific 403 GET /jobs/team returns for a caller
// who isn't a TEAM_LEADER/VIEWER on any team -- an expected "not applicable
// to you" outcome MyTeamPage shows as an empty state, not a load failure.
export function isNotTeamLeaderOrViewerError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;
  const data = error.response.data as { error?: { code?: string } } | undefined;
  return data?.error?.code === 'NOT_TEAM_LEADER_OR_VIEWER';
}
