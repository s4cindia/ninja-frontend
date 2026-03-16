import { api } from './api';

export interface CorpusDocument {
  id: string;
  filename: string;
  s3Path: string;
  publisher?: string;
  contentType?: string;
  pageCount?: number;
  language: string;
  isScanned: boolean;
  uploadedAt: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'COMPLETE';
}

export interface CalibrationRun {
  id: string;
  documentId: string;
  runDate: string;
  completedAt?: string;
  durationMs?: number;
  doclingZoneCount?: number;
  pdfxtZoneCount?: number;
  greenCount?: number;
  amberCount?: number;
  redCount?: number;
  summary?: object;
}

export interface CorpusStats {
  totalDocuments: number;
  totalRuns: number;
  totalConfirmedZones: number;
  averageAgreementRate: number;
  byPublisher: Record<string, number>;
  byContentType: Record<string, number>;
}

export interface CalibrationRunResult {
  status: string;
  message: string;
}

export const getCorpusDocuments = async (params?: {
  limit?: number;
  cursor?: string;
  publisher?: string;
  contentType?: string;
}): Promise<{ documents: CorpusDocument[]; nextCursor?: string }> =>
  (await api.get('/calibration/corpus-docs', { params })).data.data;

export const startCalibration = async (payload: {
  documentId: string;
  fileId: string;
}): Promise<CalibrationRunResult> =>
  (await api.post('/calibration/run', payload)).data.data;

export const getCalibrationRuns = async (params?: {
  documentId?: string;
  limit?: number;
  cursor?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{ runs: CalibrationRun[]; nextCursor?: string }> =>
  (await api.get('/calibration/runs', { params })).data.data;

export const getCalibrationRun = async (
  runId: string
): Promise<CalibrationRun> =>
  (await api.get(`/calibration/runs/${runId}`)).data.data;

export const getCorpusStats = async (): Promise<CorpusStats> =>
  (await api.get('/calibration/corpus-stats')).data.data;
