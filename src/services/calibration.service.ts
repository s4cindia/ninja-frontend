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
  taggedPdfPath?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'COMPLETE';
  bootstrapJobs?: Array<{ id: string; status: string; completedAt?: string; error?: string }>;
  calibrationRuns?: Array<{ id: string; runDate: string; completedAt?: string; summary?: Record<string, unknown> }>;
  annotationProgress?: {
    totalZones: number;
    annotatedZones: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  };
}

export type CorpusDocumentStatus =
  | 'PENDING'
  | 'TAGGED'
  | 'QUEUED'
  | 'COMPLETED'
  | 'FAILED';

export function getCorpusDocumentStatus(
  doc: CorpusDocument
): CorpusDocumentStatus {
  // Check calibration runs first (from "Run zone extraction")
  const latestCalibration = doc.calibrationRuns?.[0];
  if (latestCalibration) {
    if (latestCalibration.completedAt) {
      const status = (latestCalibration.summary as Record<string, unknown>)?.status;
      return status === 'FAILED' ? 'FAILED' : 'COMPLETED';
    }
    return 'QUEUED';
  }

  // Fall back to bootstrap jobs
  const latestRun = doc.bootstrapJobs?.[0];
  if (!latestRun) {
    return doc.taggedPdfPath ? 'TAGGED' : 'PENDING';
  }
  const normalizedStatus = latestRun.status.toUpperCase();
  if (normalizedStatus === 'FAILED') return 'FAILED';
  if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'COMPLETE') return 'COMPLETED';
  if (latestRun.completedAt) return 'COMPLETED';
  if (latestRun.error) return 'FAILED';
  return 'QUEUED';
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

export const uploadTaggedPdf = async (
  documentId: string,
  file: File
): Promise<{ documentId: string; taggedPdfPath: string }> => {
  const encodedId = encodeURIComponent(documentId);

  // Step 1: Get presigned S3 upload URL from backend
  const presignRes = await api.post(
    `/admin/corpus/documents/${encodedId}/tagged-pdf-upload-url`
  );
  const { uploadUrl, s3Key } = presignRes.data.data as {
    uploadUrl: string;
    s3Key: string;
  };

  // Step 2: Upload PDF directly to S3 (bypasses CloudFront WAF)
  const s3Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
  });
  if (!s3Res.ok) {
    throw new Error(`S3 upload failed: ${s3Res.status}`);
  }

  // Step 3: Confirm upload — backend persists the taggedPdfPath
  const confirmRes = await api.post(
    `/admin/corpus/documents/${encodedId}/tagged-pdf-confirm`,
    { s3Key }
  );
  return confirmRes.data.data;
};

export const triggerCorpusCalibrationRun = async (
  documentId: string
): Promise<{ runId: string; status: string }> =>
  (await api.post(`/admin/corpus/documents/${encodeURIComponent(documentId)}/run`)).data.data;

export const resetCorpus = async (): Promise<{
  deletedDocuments: number;
  deletedCalibrationRuns: number;
  deletedBootstrapJobs: number;
  deletedZones: number;
}> =>
  (await api.post('/admin/corpus/reset')).data.data;
