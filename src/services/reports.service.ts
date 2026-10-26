import { api, ApiResponse } from './api';
import type {
  ThroughputReport,
  ThroughputReportFilters,
  TeamActivityReport,
  TeamActivityReportFilters,
  CostReport,
  CostReportFilters,
  CostRoundTrend,
  ReliabilityReport,
  ReliabilityReportFilters,
} from '@/types/reports.types';

export type TeamActivityScope = 'admin' | 'self';

export const reportsService = {
  // GET /admin/reports/throughput -- ADMIN-only, tenant-scoped. from/to
  // default to a 30-day window ending now when omitted; groupBy defaults to
  // 'day'. Backend rejects (422) a range over 90 days or from > to.
  async getThroughputReport(filters?: ThroughputReportFilters): Promise<ThroughputReport> {
    const res = await api.get<ApiResponse<ThroughputReport>>('/admin/reports/throughput', {
      params: filters,
    });
    return res.data.data;
  },

  // Two call sites share this identical response shape: 'admin' hits
  // /admin/reports/team-activity (ADMIN, whole tenant); 'self' hits
  // /jobs/team/review-activity (TEAM_LEADER/VIEWER, own team roster only --
  // 403 NOT_TEAM_LEADER_OR_VIEWER if the caller doesn't qualify, same as
  // /jobs/team -- see isNotTeamLeaderOrViewerError in team.service.ts).
  async getTeamActivityReport(
    scope: TeamActivityScope,
    filters?: TeamActivityReportFilters
  ): Promise<TeamActivityReport> {
    const url = scope === 'admin' ? '/admin/reports/team-activity' : '/jobs/team/review-activity';
    const res = await api.get<ApiResponse<TeamActivityReport>>(url, { params: filters });
    return res.data.data;
  },

  // GET /admin/reports/cost -- ADMIN-only, tenant-scoped, same date-range
  // defaults/limits as the other report endpoints.
  async getCostReport(filters?: CostReportFilters): Promise<CostReport> {
    const res = await api.get<ApiResponse<CostReport>>('/admin/reports/cost', { params: filters });
    return res.data.data;
  },

  // GET /admin/reports/cost/:jobId/rounds -- per-round cost drill-down for
  // one job, full history (no date range). 404s if the job doesn't exist or
  // belongs to another tenant.
  async getCostRoundTrend(jobId: string): Promise<CostRoundTrend> {
    const res = await api.get<ApiResponse<CostRoundTrend>>(`/admin/reports/cost/${jobId}/rounds`);
    return res.data.data;
  },

  // GET /admin/reports/reliability -- ADMIN-only, tenant-scoped, same
  // date-range convention as the other report endpoints.
  async getReliabilityReport(filters?: ReliabilityReportFilters): Promise<ReliabilityReport> {
    const res = await api.get<ApiResponse<ReliabilityReport>>('/admin/reports/reliability', {
      params: filters,
    });
    return res.data.data;
  },
};
