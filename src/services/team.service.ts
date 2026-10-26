import axios from 'axios';
import { api, ApiResponse } from './api';
import type { TeamJob, TeamReviewOutcome } from '@/types/team.types';

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

  // POST /jobs/:jobId/team-review -- TEAM_LEADER-only (an ADMIN may also
  // write one; a VIEWER-only teammate is server-rejected with a 403 whose
  // message is fine to surface directly, since there's no client-side way
  // to distinguish TEAM_LEADER from VIEWER ahead of time). Returns the raw
  // created row, with no nested reviewer -- refetch the job's audit result
  // to pick up the new entry in its joined `teamReviews` history instead of
  // trying to merge this response into it.
  async submitTeamReview(
    jobId: string,
    body: { outcome: TeamReviewOutcome; notes?: string }
  ): Promise<TeamReviewSubmitResponse> {
    const res = await api.post<ApiResponse<TeamReviewSubmitResponse>>(
      `/jobs/${encodeURIComponent(jobId)}/team-review`,
      body
    );
    return res.data.data;
  },
};

export interface TeamReviewSubmitResponse {
  id: string;
  jobId: string;
  reviewedBy: string;
  reviewedAt: string;
  outcome: TeamReviewOutcome;
  notes: string | null;
}

// True when `error` is the specific 403 GET /jobs/team returns for a caller
// who isn't a TEAM_LEADER/VIEWER on any team -- an expected "not applicable
// to you" outcome MyTeamPage shows as an empty state, not a load failure.
export function isNotTeamLeaderOrViewerError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;
  const data = error.response.data as { error?: { code?: string } } | undefined;
  return data?.error?.code === 'NOT_TEAM_LEADER_OR_VIEWER';
}
