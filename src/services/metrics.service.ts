import { api } from './api';

export interface WorkflowMetrics {
  totalElapsedMs: number | null;
  machineTimeMs: number;
  humanWaitMs: number;
  humanActiveMs: number;
  idleTimeMs: number | null;
  gateCount: number;
  autoApprovedCount: number;
  manualReviewCount: number;
  stateBreakdown: Record<string, number>;
}

export interface StateTimelineRow {
  state: string;
  type: 'machine' | 'hitl' | 'terminal' | 'other';
  enteredAt: string;
  exitedAt: string | null;
  durationMs: number | null;
}

export interface GateBreakdownRow {
  gate: string;
  enteredAt: string;
  reviewStartedAt: string | null;
  reviewSubmittedAt: string | null;
  waitMs: number | null;
  activeMs: number | null;
  autoApproved: boolean;
  reviewerId: string | null;
  sessionCount: number;
}

export interface WorkflowDetailReport {
  workflowId: string;
  currentState: string;
  startedAt: string;
  completedAt: string | null;
  metrics: WorkflowMetrics | null;
  stateTimeline: StateTimelineRow[];
  gateBreakdown: GateBreakdownRow[];
}

export interface BatchFileRow {
  workflowId: string;
  filename: string;
  fileType: string;
  currentState: string;
  totalElapsedMs: number | null;
  machineTimeMs: number;
  humanWaitMs: number;
  humanActiveMs: number;
  gateCount: number;
  autoApprovedCount: number;
  openGateEnteredAt: string | null;
}

export interface BatchSummary {
  totalElapsedMs: number | null;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalMachineMs: number;
  totalHumanWaitMs: number;
  totalHumanActiveMs: number;
  avgWorkflowTimeMs: number | null;
  autoApprovalRate: number | null;
  humanTimeSavedMs: number | null;
}

export interface BatchDetailReport {
  batchId: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summary: BatchSummary | null;
  files: BatchFileRow[];
}

export interface WorkflowSummaryRow {
  workflowId: string;
  filename: string;
  fileType: string;
  workflowType: string;
  currentState: string;
  startedAt: string;
  completedAt: string | null;
  totalElapsedMs: number | null;
  machineTimeMs: number;
  humanWaitMs: number;
  humanActiveMs: number;
  autoApprovalRate: number | null;
}

export interface AggregateKpis {
  avgWorkflowTimeMs: number | null;
  avgMachineTimeMs: number | null;
  avgHumanWaitMs: number | null;
  totalHumanTimeSavedMs: number;
  autoApprovalRate: number | null;
  p50ElapsedMs: number | null;
  p90ElapsedMs: number | null;
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
}

export interface AggregateReport {
  kpis: AggregateKpis;
  rows: WorkflowSummaryRow[];
}

export interface AggregateFilters {
  from?: string;
  to?: string;
  workflowType?: 'MANUAL' | 'AGENTIC';
  fileType?: string;
}

class MetricsService {
  async getWorkflowDetailReport(workflowId: string): Promise<WorkflowDetailReport> {
    const response = await api.get<{ success: boolean; data: WorkflowDetailReport }>(
      `/metrics/workflows/${workflowId}`
    );
    return response.data.data;
  }

  async getBatchDetailReport(batchId: string, fileType?: string): Promise<BatchDetailReport> {
    const params = fileType ? `?fileType=${encodeURIComponent(fileType)}` : '';
    const response = await api.get<{ success: boolean; data: BatchDetailReport }>(
      `/metrics/batches/${batchId}${params}`
    );
    return response.data.data;
  }

  async getAggregateReport(filters: AggregateFilters = {}): Promise<AggregateReport> {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.workflowType) params.set('workflowType', filters.workflowType);
    if (filters.fileType) params.set('fileType', filters.fileType);
    const qs = params.toString();
    const response = await api.get<{ success: boolean; data: AggregateReport }>(
      `/metrics/aggregate${qs ? `?${qs}` : ''}`
    );
    return response.data.data;
  }

  getExportCsvUrl(filters: AggregateFilters = {}): string {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.workflowType) params.set('workflowType', filters.workflowType);
    if (filters.fileType) params.set('fileType', filters.fileType);
    const qs = params.toString();
    const base = import.meta.env.VITE_API_URL || '/api/v1';
    return `${base}/metrics/aggregate/export${qs ? `?${qs}` : ''}`;
  }
}

export const metricsService = new MetricsService();

// --- ML Bootstrap Metrics (Sprint ML-3) ---

export interface ClassAPResult {
  zoneType: string;
  ap: number;
  groundTruthCount: number;
  predictionCount: number;
  insufficientData: boolean;
}

export interface MAPResult {
  overallMAP: number;
  perClass: ClassAPResult[];
  insufficientDataWarnings: string[];
  groundTruthTotal: number;
  predictionTotal: number;
}

export interface MAPSnapshot {
  runId: string;
  runDate: string;
  overallMAP: number;
  perClass: ClassAPResult[];
}

export interface PhaseGateCriterion {
  id: string;
  label: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  currentValue: string;
  threshold: string;
  tooltip: string;
}

export interface PhaseGateStatus {
  criteria: PhaseGateCriterion[];
  overallStatus: 'GREEN' | 'AMBER' | 'RED';
  readyForPhase2: boolean;
}

export const getMAPHistory = async (): Promise<MAPSnapshot[]> =>
  (await api.get('/ml-metrics/metrics/map/history')).data.data;

export const getPhaseGate = async (): Promise<PhaseGateStatus> =>
  (await api.get('/ml-metrics/metrics/phase-gate')).data.data;
