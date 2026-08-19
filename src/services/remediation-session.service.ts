import { api } from './api';

export const remediationSessionService = {
  startSession: (jobId: string): Promise<{ sessionId: string }> =>
    api
      .post(`/pdf/${encodeURIComponent(jobId)}/remediation-session/start`)
      .then((r) => r.data.data),

  endSession: (
    jobId: string,
    sessionId: string,
    data: {
      activeMs: number;
      idleMs: number;
      issuesApplied: number;
      suggestionsAccepted: number;
      suggestionsRejected: number;
      bulkApplyUsed: boolean;
      sessionLog?: unknown;
    }
  ): Promise<{ sessionId: string }> =>
    api
      .post(
        `/pdf/${encodeURIComponent(jobId)}/remediation-session/${encodeURIComponent(sessionId)}/end`,
        data
      )
      .then((r) => r.data.data),
};
