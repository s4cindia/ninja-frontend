/**
 * PDF Batch — types for the PDF-native batch system (ninja-backend#677).
 *
 * Deliberately separate from the EPUB Batch/BatchFile types (batch.types.ts):
 * PDF batches process items with real concurrency, weighted against a
 * per-tenant budget, rather than strictly one-at-a-time like EPUB batch.
 */

import type { StartAutoModeOverrides } from '@/services/pdfAutoMode.service';

export type PdfBatchStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Lifecycle order: UPLOADED -> QUEUED_FOR_BUDGET -> AUDITING -> AUDITED ->
 * HELD_FOR_BUDGET -> REMEDIATING -> REMEDIATED, with FAILED/SKIPPED as
 * alternate terminal states. The two *_FOR_BUDGET states mean the item is
 * genuinely waiting its turn for the tenant's weighted concurrency budget,
 * not stuck — worth a distinct UI treatment from "actively processing".
 */
export type PdfBatchItemStatus =
  | 'UPLOADED'
  | 'QUEUED_FOR_BUDGET'
  | 'AUDITING'
  | 'AUDITED'
  | 'HELD_FOR_BUDGET'
  | 'REMEDIATING'
  | 'REMEDIATED'
  | 'FAILED'
  | 'SKIPPED';

export const BUDGET_WAIT_STATUSES: readonly PdfBatchItemStatus[] = ['QUEUED_FOR_BUDGET', 'HELD_FOR_BUDGET'];
export const ACTIVE_STATUSES: readonly PdfBatchItemStatus[] = ['AUDITING', 'REMEDIATING'];
export const TERMINAL_ITEM_STATUSES: readonly PdfBatchItemStatus[] = ['REMEDIATED', 'FAILED', 'SKIPPED'];

export interface PdfBatchListItem {
  batchId: string;
  name: string | null;
  status: PdfBatchStatus;
  totalFiles: number;
  createdAt: string;
}

export interface PdfBatchListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PdfBatchListResponse {
  batches: PdfBatchListItem[];
  pagination: PdfBatchListPagination;
}

export interface CreatePdfBatchRequest {
  name?: string;
}

export interface CreatePdfBatchResponse {
  batchId: string;
  name: string | null;
  status: 'DRAFT';
  totalFiles: number;
  createdAt: string;
}

export interface AddPdfBatchItemsRequestItem {
  sourceFileId: string;
}

export interface AddedPdfBatchItem {
  itemId: string;
  fileName: string;
  originalName: string;
  /** BigInt serialized as a string by the backend. */
  fileSize: string;
  status: 'UPLOADED';
}

export interface AddPdfBatchItemsResponse {
  itemsAdded: number;
  items: AddedPdfBatchItem[];
}

/**
 * Optional per-batch Auto Mode overrides, applied uniformly to every item's
 * own remediation run (each item still gets its own independent
 * budget/round count, not a shared pool across the batch). Same shape as
 * the single-file job-native endpoint's own StartAutoModeOverrides
 * (pdfAutoMode.service.ts) -- reused rather than duplicated.
 */
export type StartPdfBatchRequest = StartAutoModeOverrides;

export interface StartPdfBatchResponse {
  batchId: string;
  status: 'QUEUED';
  totalFiles: number;
  startedAt: string;
}

export interface CancelPdfBatchResponse {
  batchId: string;
  status: 'CANCELLED';
}

export interface PdfBatchItem {
  itemId: string;
  fileName: string;
  originalName: string;
  /** BigInt serialized as a string by the backend. */
  fileSize: string;
  status: PdfBatchItemStatus;
  auditScore?: number | null;
  issuesFound?: number | null;
  pageCount?: number | null;
  issuesAutoFixed?: number | null;
  issuesGuidanceOnly?: number | null;
  remediatedFilePath?: string | null;
  error?: string | null;
  uploadedAt: string;
  auditCompletedAt?: string | null;
  remediationCompletedAt?: string | null;
  /**
   * Loose reference to Job.id (ninja-backend#678) — lets the frontend reuse
   * the existing single-job `GET /pdf/:jobId/remediation/download` endpoint
   * for this item's remediated file, since pdf-batch has no download route
   * of its own. Optional until #678 is live on staging.
   */
  auditJobId?: string | null;
  /** Anchors a live elapsed-time indicator while status === 'AUDITING' (ninja-backend#678). */
  auditStartedAt?: string | null;
  /** Anchors a live elapsed-time indicator while status === 'REMEDIATING' (ninja-backend#678). */
  remediationStartedAt?: string | null;
}

/**
 * Computed live via a groupBy on the backend, not a stored counter — trust
 * this over summing/deriving counts from `items` client-side.
 */
export type PdfBatchItemStatusCounts = Partial<Record<PdfBatchItemStatus, number>>;

export interface PdfBatchDetail {
  batchId: string;
  name: string | null;
  status: PdfBatchStatus;
  totalFiles: number;
  statusCounts: PdfBatchItemStatusCounts;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  items: PdfBatchItem[];
}
