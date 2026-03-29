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

export interface AiAnnotationReportData {
  runs: {
    id: string;
    calibrationRunId: string;
    model: string;
    status: string;
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
    createdAt: string;
    completedAt: string;
  }[];
  totalAiAnnotatedZones: number;
  aiOverriddenByHuman: number;
  zones: unknown[];
}

export const getAiAnnotationReport = async (
  runId: string
): Promise<AiAnnotationReportData> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/ai-annotation-report`)).data.data;

export interface ComparisonResult {
  comparisonId: string;
  calibrationRunId: string;
  totalZones: number;
  comparableZones: number;
  agreementCount: number;
  disagreementCount: number;
  agreementRate: number;
  cohensKappa: number | null;
  perTypeAccuracy: Record<string, number>;
  perBucketAccuracy: Record<string, number>;
  confidenceCalibration: Array<{
    bucket: string;
    predicted: number;
    actual: number;
    count: number;
  }>;
  commonMistakes: Array<{
    from: string;
    to: string;
    count: number;
  }>;
  zoneDetails: Array<{
    zoneId: string;
    pageNumber: number;
    type: string;
    reconciliationBucket: string | null;
    humanDecision: string;
    humanLabel: string;
    aiDecision: string;
    aiLabel: string;
    aiConfidence: number;
    agrees: boolean;
  }>;
  durationMs: number;
}

export const runComparison = async (
  runId: string
): Promise<ComparisonResult> =>
  (await api.post(`/calibration/runs/${encodeURIComponent(runId)}/compare`)).data.data;

export const getComparisonReport = async (
  runId: string
): Promise<{ comparisons: ComparisonResult[] }> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/comparison-report`)).data.data;

export interface AnnotationGuideData {
  pages: {
    pageNumber: number;
    title: string;
    zoneCount: number;
    markdown: string;
  }[];
  generatedAt: string;
}

export const getAnnotationGuide = async (
  runId: string
): Promise<AnnotationGuideData> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/annotation-guide`)).data.data;

// ── Feedback ──

export interface FeedbackData {
  calibrationRunId: string;
  totalAiAnnotated: number;
  totalHumanOverrides: number;
  overrideRate: number;
  overridesByType: Array<{ aiLabel: string; humanLabel: string; count: number }>;
  overridesByDecision: {
    aiConfirmedHumanCorrected: number;
    aiConfirmedHumanRejected: number;
    aiCorrectedHumanConfirmed: number;
    aiCorrectedHumanCorrected: number;
    aiCorrectedHumanRejected: number;
    aiRejectedHumanConfirmed: number;
    aiRejectedHumanCorrected: number;
  };
  averageOverriddenConfidence: number;
  confidenceDistribution: Array<{
    bucket: string;
    overrides: number;
    total: number;
    overrideRate: number;
  }>;
}

export const getAnnotationFeedback = async (
  runId: string
): Promise<FeedbackData> =>
  (await api.get(`/calibration/runs/${encodeURIComponent(runId)}/feedback`)).data.data;

// ── Bulk AI Annotation ──

export interface BulkAiAnnotationResult {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  results: Array<{
    calibrationRunId: string;
    documentId: string;
    documentName: string;
    status: string;
    result?: { totalZones: number; annotatedZones: number };
  }>;
  totalZones: number;
  totalAnnotated: number;
  totalCostUsd: number;
  totalDurationMs: number;
}

export const runBulkAiAnnotation = async (options: {
  documentIds?: string[];
  runIds?: string[];
  confidenceThreshold?: number;
  dryRun?: boolean;
}): Promise<BulkAiAnnotationResult> =>
  (await api.post('/calibration/ai-annotate-batch', options)).data.data;

// ── Aggregate Comparison ──

export interface AggregateComparisonResult {
  totalRuns: number;
  totalComparableZones: number;
  overallAgreementRate: number;
  overallCohensKappa: number | null;
  perRunSummary: Array<{
    calibrationRunId: string;
    documentName: string;
    publisher: string;
    comparableZones: number;
    agreementRate: number;
    cohensKappa: number | null;
    createdAt: string;
  }>;
  perTypeAccuracy: Record<string, { agree: number; total: number; rate: number }>;
  perBucketAccuracy: Record<string, { agree: number; total: number; rate: number }>;
  perPublisherAccuracy: Record<string, { agree: number; total: number; rate: number }>;
  topMistakes: Array<{ from: string; to: string; count: number }>;
  promptVersionStats: Array<{
    promptVersion: string;
    runs: number;
    avgAgreementRate: number;
    avgCohensKappa: number | null;
  }>;
  timeSavingsEstimate?: {
    avgHumanTimePerZoneMs: number;
    avgAiAssistedTimePerZoneMs: number;
    estimatedSpeedup: number;
  };
}

export const getAggregateComparison = async (options?: {
  documentIds?: string[];
  fromDate?: string;
}): Promise<AggregateComparisonResult> =>
  (await api.post('/calibration/comparison/aggregate', options ?? {})).data.data;

// ── Training Export ──

export interface TrainingExportResult {
  documents: unknown[];
  stats: {
    totalDocuments: number;
    totalZones: number;
    zonesWithHumanLabel: number;
    zonesWithAiLabel: number;
    zonesRejected: number;
    byPublisher: Record<string, number>;
  };
}

export const exportTrainingData = async (options: {
  documentIds?: string[];
  minConfidence?: number;
  includeAiOnly?: boolean;
}): Promise<TrainingExportResult> =>
  (await api.post('/calibration/export-training', options)).data.data;
