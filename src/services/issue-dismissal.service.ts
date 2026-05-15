import { api } from './api';

export interface IssueDismissal {
  id: string;
  jobId: string;
  code: string;
  /** Empty string for location-less issues — mirrors the backend default. */
  location: string;
  instanceKey: string;
  dismissedBy: string;
  dismissedAt: string;
  reason?: string;
}

export interface CreateDismissalPayload {
  code: string;
  location: string;
  message: string;
  /** Optional operator note; max 280 chars. */
  reason?: string;
}

export const issueDismissalService = {
  list: async (jobId: string): Promise<IssueDismissal[]> => {
    const eid = encodeURIComponent(jobId);
    const res = await api.get<{ success: boolean; data: { dismissals: IssueDismissal[] } }>(
      `/jobs/${eid}/issues/dismissals`,
    );
    return res.data.data.dismissals;
  },

  create: async (jobId: string, payload: CreateDismissalPayload): Promise<IssueDismissal> => {
    const eid = encodeURIComponent(jobId);
    const res = await api.post<{ success: boolean; data: { dismissal: IssueDismissal } }>(
      `/jobs/${eid}/issues/dismissals`,
      payload,
    );
    return res.data.data.dismissal;
  },

  remove: async (jobId: string, dismissalId: string): Promise<void> => {
    const eid = encodeURIComponent(jobId);
    await api.delete(`/jobs/${eid}/issues/dismissals/${encodeURIComponent(dismissalId)}`);
  },
};
