import { api, ApiResponse } from './api';

export interface WorkflowStatus {
  id: string;
  fileId: string;
  currentState: string;
  phase: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
  loopCount: number;
  createdBy: string;
  batchId?: string;
}

export interface WorkflowEvent {
  id: string;
  workflowId: string;
  type: string;
  from?: string;
  to?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface BatchDashboard {
  batchId: string;
  name: string;
  status: string;
  workflowCount: number;
  completedCount: number;
  failedCount: number;
  inProgressCount: number;
  createdAt: string;
  workflows: WorkflowStatus[];
}

export interface AIReviewDecision {
  itemId: string;
  decision: 'approve' | 'reject' | 'modify';
  notes?: string;
}

export interface ConformanceDecision {
  criterionId: string;
  decision: 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable';
  notes?: string;
}

export const workflowService = {
  async startWorkflow(
    fileId: string,
    vpatEditions?: string[]
  ): Promise<{ workflowId: string; currentState: string }> {
    const response = await api.post<ApiResponse<{ workflowId: string; currentState: string }>>(
      '/workflows',
      { fileId, vpatEditions }
    );
    return response.data.data;
  },

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const response = await api.get<ApiResponse<WorkflowStatus>>(`/workflows/${workflowId}`);
    return response.data.data;
  },

  async getTimeline(
    workflowId: string
  ): Promise<{ workflowId: string; events: WorkflowEvent[] }> {
    const response = await api.get<ApiResponse<{ workflowId: string; events: WorkflowEvent[] }>>(
      `/workflows/${workflowId}/timeline`
    );
    return response.data.data;
  },

  async pauseWorkflow(workflowId: string): Promise<void> {
    await api.post(`/workflows/${workflowId}/pause`);
  },

  async resumeWorkflow(workflowId: string): Promise<void> {
    await api.post(`/workflows/${workflowId}/resume`);
  },

  async cancelWorkflow(workflowId: string): Promise<void> {
    await api.post(`/workflows/${workflowId}/cancel`);
  },

  async retryWorkflow(workflowId: string): Promise<void> {
    await api.post(`/workflows/${workflowId}/retry`);
  },

  async submitAIReview(
    workflowId: string,
    decisions: AIReviewDecision[]
  ): Promise<{ gateComplete: boolean }> {
    const response = await api.post<ApiResponse<{ gateComplete: boolean }>>(
      `/workflows/${workflowId}/hitl/ai-review`,
      { decisions }
    );
    return response.data.data;
  },

  async submitRemediationFix(
    workflowId: string,
    itemId: string,
    fixDetail: unknown
  ): Promise<void> {
    await api.post(`/workflows/${workflowId}/hitl/remediation-fix`, { itemId, fixDetail });
  },

  async submitConformanceReview(
    workflowId: string,
    decisions: ConformanceDecision[]
  ): Promise<{ gateComplete: boolean }> {
    const response = await api.post<ApiResponse<{ gateComplete: boolean }>>(
      `/workflows/${workflowId}/hitl/conformance-review`,
      { decisions }
    );
    return response.data.data;
  },

  async submitACRSignoff(
    workflowId: string,
    attestation: { text: string; confirmed: true },
    notes?: string
  ): Promise<void> {
    await api.post(`/workflows/${workflowId}/hitl/acr-signoff`, { attestation, notes });
  },

  async startBatch(
    name: string,
    fileIds: string[],
    concurrency?: number
  ): Promise<{ batchId: string; workflowCount: number }> {
    const response = await api.post<ApiResponse<{ batchId: string; workflowCount: number }>>(
      '/workflows/batch',
      { name, fileIds, concurrency }
    );
    return response.data.data;
  },

  async getBatchDashboard(batchId: string): Promise<BatchDashboard> {
    const response = await api.get<ApiResponse<BatchDashboard>>(`/workflows/batch/${batchId}`);
    return response.data.data;
  },
};
