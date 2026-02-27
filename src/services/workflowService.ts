import { api, ApiResponse } from './api';

/** Phase 1: simple per-gate mode string. Phase 2: extended object. */
export type GatePolicyMode = 'auto-accept' | 'conditional' | 'require-manual';

export interface PolicyConditions {
  minConfidence?: number;  // 0.0–1.0
  issueTypeRules?: Record<string, 'auto-accept' | 'auto-reject' | 'manual'>;
}

export interface ConditionalGatePolicy {
  mode: GatePolicyMode;
  conditions?: PolicyConditions;
}

/**
 * Phase 1 (string): 'auto-accept' | 'require-manual'
 * Phase 2 (object): { mode: 'conditional', conditions: { minConfidence?, issueTypeRules? } }
 */
export type BatchGatePolicy = 'auto-accept' | 'require-manual' | ConditionalGatePolicy;

/** Error handling strategy when a workflow within a batch fails. */
export type BatchErrorStrategy = 'pause-batch' | 'continue-others' | 'fail-batch';

/**
 * Auto-approval policy stored on a batch run.
 * Determines which HITL gates are skipped and how errors are handled.
 */
export interface BatchAutoApprovalPolicy {
  gates: {
    AI_REVIEW?: BatchGatePolicy;
    REMEDIATION_REVIEW?: BatchGatePolicy;
    CONFORMANCE_REVIEW?: BatchGatePolicy;
    ACR_SIGNOFF?: BatchGatePolicy;
  };
  onError: BatchErrorStrategy;
}

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
  stateData?: Record<string, unknown>;
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
  autoApprovalPolicy?: BatchAutoApprovalPolicy | null;
}

export interface AcrBatchConfig {
  vendor: string;
  contactEmail: string;
  edition: 'VPAT2.5-WCAG' | 'VPAT2.5-508' | 'VPAT2.5-EU' | 'VPAT2.5-INT';
  mode: 'individual' | 'aggregate';
  aggregationStrategy: 'conservative' | 'optimistic';
}

/** Response from GET /workflows/batch/:batchId (agentic workflow batch) */
export interface AgenticBatchDashboard {
  id: string;
  name: string;
  totalFiles: number;
  status: string;
  metrics: {
    perStage: Record<string, number>;
    perGate: Record<string, number>;
    completedCount: number;
    failedCount: number;
    errorCount: number;
  };
  startedAt: string;
  completedAt?: string;
  autoApprovalPolicy?: BatchAutoApprovalPolicy | null;
  acrConfig?: AcrBatchConfig | null;
  failedWorkflows?: Array<{ id: string; filename: string; errorMessage: string | null }>;
  completedWorkflows?: Array<{
    workflowId: string;
    filename: string;
    acrJobId: string | null;
    jobId: string | null;
    remediatedFileName: string | null;
    fileType: 'epub' | 'pdf';
  }>;
  hitlWaiting?: Array<{ workflowId: string; filename: string; gate: string; reviewUrl: string }>;
}

export interface AIReviewDecision {
  itemId: string;
  decision: 'ACCEPT' | 'REJECT' | 'MODIFY' | 'OVERRIDE' | 'MANUAL_FIX';
  modifiedValue?: unknown;
  justification?: string;
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

  async submitRemediationReview(
    workflowId: string,
    notes?: string
  ): Promise<{ gateComplete: boolean }> {
    const response = await api.post<ApiResponse<{ gateComplete: boolean; message: string }>>(
      `/workflows/${workflowId}/hitl/remediation-review`,
      { notes }
    );
    return response.data.data;
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
    concurrency?: number,
    autoApprovalPolicy?: BatchAutoApprovalPolicy,
    acrConfig?: AcrBatchConfig
  ): Promise<{ batchId: string; workflowCount: number; autoApprovalPolicy?: BatchAutoApprovalPolicy | null }> {
    const response = await api.post<{ batchId: string; workflowCount: number; autoApprovalPolicy?: BatchAutoApprovalPolicy | null }>(
      '/workflows/batch',
      { name, fileIds, concurrency, autoApprovalPolicy, acrConfig }
    );
    return response.data;
  },

  async getBatchDashboard(batchId: string): Promise<BatchDashboard> {
    const response = await api.get<ApiResponse<BatchDashboard>>(`/workflows/batch/${batchId}`);
    return response.data.data;
  },

  async getAgenticBatchDashboard(batchId: string): Promise<AgenticBatchDashboard> {
    const response = await api.get<AgenticBatchDashboard>(`/workflows/batch/${batchId}`);
    return response.data;
  },

  async pauseBatch(batchId: string): Promise<{ pausedCount: number }> {
    const response = await api.post<{ success: boolean; pausedCount: number }>(`/workflows/batch/${batchId}/pause`);
    return response.data;
  },

  async resumeBatch(batchId: string): Promise<{ resumedCount: number }> {
    const response = await api.post<{ success: boolean; resumedCount: number }>(`/workflows/batch/${batchId}/resume`);
    return response.data;
  },

  async retryFailedBatch(batchId: string): Promise<{ retriedCount: number }> {
    const response = await api.post<{ success: boolean; retriedCount: number }>(`/workflows/batch/${batchId}/retry-failed`);
    return response.data;
  },
};
