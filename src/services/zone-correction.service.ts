import { api } from './api';

export interface CalibrationZone {
  id: string;
  calibrationRunId: string;
  pageNumber: number;
  bounds: { x: number; y: number; w: number; h: number } | null;
  type: string;
  source: string;
  reconciliationBucket: 'GREEN' | 'AMBER' | 'RED';
  doclingLabel?: string;
  doclingConfidence?: number;
  pdfxtLabel?: string;
  operatorVerified: boolean;
  operatorLabel?: string;
  tableStructure?: { thead: unknown; tbody: unknown };
  isArtefact: boolean;
  confidence?: number;
  verifiedBy?: string;
  aiConfidence?: number;
  aiReason?: string;
}

export interface ZonesResponse {
  zones: CalibrationZone[];
  nextCursor?: string;
}

export const getCalibrationZones = async (
  runId: string,
  params?: { bucket?: string; limit?: number; cursor?: string }
): Promise<ZonesResponse> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/zones`, { params })).data.data;

export const confirmZone = async (
  zoneId: string
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${encodeURIComponent(zoneId)}/confirm`)).data.data;

export const correctZone = async (
  zoneId: string,
  payload: { newLabel: string; correctionReason?: string; bbox?: object }
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${encodeURIComponent(zoneId)}/correct`, payload)).data.data;

export const rejectZone = async (
  zoneId: string,
  payload?: { correctionReason?: string }
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${encodeURIComponent(zoneId)}/reject`, payload)).data.data;

export const confirmAllGreen = async (
  runId: string
): Promise<{ confirmedCount: number }> =>
  (await api.post(`/calibration/runs/${encodeURIComponent(runId)}/confirm-all-green`)).data.data;

export interface AutoAnnotationResult {
  runId: string;
  patternsApplied: {
    pattern: string;
    description: string;
    confirmed: number;
    corrected: number;
    rejected: number;
    skipped: number;
    details: string[];
  }[];
  totalConfirmed: number;
  totalCorrected: number;
  totalRejected: number;
  totalSkipped: number;
  durationMs: number;
}

export const runAutoAnnotation = async (
  runId: string,
  patterns?: string[]
): Promise<AutoAnnotationResult> =>
  (await api.post(
    `/calibration/runs/${encodeURIComponent(runId)}/auto-annotate`,
    patterns ? { patterns } : undefined
  )).data.data;

export interface AiAnnotationResult {
  runId: string;
  aiRunId: string;
  totalZones: number;
  annotatedZones: number;
  skippedZones: number;
  confirmedCount: number;
  correctedCount: number;
  rejectedCount: number;
  highConfCount: number;
  medConfCount: number;
  lowConfCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
}

export const runAiAnnotation = async (
  runId: string,
  options?: { dryRun?: boolean }
): Promise<AiAnnotationResult> =>
  (await api.post(
    `/calibration/runs/${encodeURIComponent(runId)}/ai-annotate`,
    options,
  )).data.data;

export const getAiAnnotationReport = async (
  runId: string
): Promise<unknown> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/ai-annotation-report`)).data.data;
