import { api } from './api';

export type AnnotationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'BLOCKED';

export const ANNOTATION_STATUSES: ReadonlyArray<AnnotationStatus> = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'COMPLETED',
  'BLOCKED',
];

export const STATUS_LABELS: Record<AnnotationStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  COMPLETED: 'Complete',
  BLOCKED: 'Blocked',
};

export interface CorpusStatusAnnotator {
  userId: string | null;
  displayName: string;
  email: string | null;
}

export interface CorpusStatusRow {
  serialNumber: number;
  documentId: string;
  filename: string;
  pageCount: number;
  pagesAnnotated: number;
  status: AnnotationStatus;
  statusOverride: AnnotationStatus | null;
  primaryAnnotator: CorpusStatusAnnotator | null;
  otherAnnotatorCount: number;
  hoursSpent: number;
  lastUpdatedAt: string | null;
  statusNote: string | null;
}

export interface CorpusStatusResponse {
  rows: CorpusStatusRow[];
  generatedAt: string;
}

export interface UpdateCorpusStatusPayload {
  /** Pass null to clear the override and fall back to the derived status. */
  statusOverride?: AnnotationStatus | null;
  /** Max 500 characters; backend trims and validates. */
  statusNote?: string;
}

export const fetchCorpusStatus = async (): Promise<CorpusStatusResponse> =>
  (await api.get('/calibration/corpus-status')).data.data;

export const updateCorpusStatus = async (
  documentId: string,
  payload: UpdateCorpusStatusPayload,
): Promise<CorpusStatusRow> =>
  (
    await api.put(
      `/admin/corpus/documents/${encodeURIComponent(documentId)}/status`,
      payload,
    )
  ).data.data;
