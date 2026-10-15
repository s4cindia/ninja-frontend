import type { PdfBatchItemStatus } from '@/types/pdfBatch.types';

export type PdfBatchItemStatusIconKind = 'waiting' | 'budget-wait' | 'active' | 'done' | 'failed' | 'skipped';

export interface PdfBatchItemStatusMeta {
  label: string;
  /** Short explanation shown under the label — especially important for the budget-wait states, so it's clear the item isn't stuck. */
  description: string;
  icon: PdfBatchItemStatusIconKind;
  variant: 'default' | 'info' | 'warning' | 'success' | 'error';
}

const STATUS_META: Record<PdfBatchItemStatus, PdfBatchItemStatusMeta> = {
  UPLOADED: {
    label: 'Uploaded',
    description: 'Waiting to start',
    icon: 'waiting',
    variant: 'default',
  },
  QUEUED_FOR_BUDGET: {
    label: 'Queued for audit',
    description: 'Waiting for processing capacity',
    icon: 'budget-wait',
    variant: 'warning',
  },
  AUDITING: {
    label: 'Auditing',
    description: 'Running the accessibility audit',
    icon: 'active',
    variant: 'info',
  },
  AUDITED: {
    label: 'Audited',
    description: 'Audit complete, about to be queued for remediation',
    icon: 'waiting',
    variant: 'info',
  },
  HELD_FOR_BUDGET: {
    label: 'Queued for remediation',
    description: 'Waiting for capacity to start remediation',
    icon: 'budget-wait',
    variant: 'warning',
  },
  REMEDIATING: {
    label: 'Remediating',
    description: 'Multi-round AI remediation in progress — can take 30–90+ minutes',
    icon: 'active',
    variant: 'info',
  },
  REMEDIATED: {
    label: 'Remediated',
    description: 'Done',
    icon: 'done',
    variant: 'success',
  },
  FAILED: {
    label: 'Failed',
    description: 'Processing failed',
    icon: 'failed',
    variant: 'error',
  },
  SKIPPED: {
    label: 'Skipped',
    description: 'Skipped',
    icon: 'skipped',
    variant: 'default',
  },
};

export function getPdfBatchItemStatusMeta(status: PdfBatchItemStatus): PdfBatchItemStatusMeta {
  return STATUS_META[status];
}

export function isBudgetWaitStatus(status: PdfBatchItemStatus): boolean {
  return STATUS_META[status].icon === 'budget-wait';
}
