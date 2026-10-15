import { describe, it, expect } from 'vitest';
import { getPdfBatchItemStatusMeta, isBudgetWaitStatus } from './pdfBatchItemStatus';
import type { PdfBatchItemStatus } from '@/types/pdfBatch.types';

const ALL_STATUSES: PdfBatchItemStatus[] = [
  'UPLOADED',
  'QUEUED_FOR_BUDGET',
  'AUDITING',
  'AUDITED',
  'HELD_FOR_BUDGET',
  'REMEDIATING',
  'REMEDIATED',
  'FAILED',
  'SKIPPED',
];

describe('getPdfBatchItemStatusMeta', () => {
  it('has a meta entry for every status with a non-empty label and description', () => {
    for (const status of ALL_STATUSES) {
      const meta = getPdfBatchItemStatusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });

  it('gives both budget-wait states the distinct budget-wait icon, not the plain waiting icon used for UPLOADED', () => {
    expect(getPdfBatchItemStatusMeta('QUEUED_FOR_BUDGET').icon).toBe('budget-wait');
    expect(getPdfBatchItemStatusMeta('HELD_FOR_BUDGET').icon).toBe('budget-wait');
    expect(getPdfBatchItemStatusMeta('UPLOADED').icon).toBe('waiting');
  });

  it('gives both actively-processing states the spinner icon', () => {
    expect(getPdfBatchItemStatusMeta('AUDITING').icon).toBe('active');
    expect(getPdfBatchItemStatusMeta('REMEDIATING').icon).toBe('active');
  });

  it('marks REMEDIATED success, FAILED error, and SKIPPED neither', () => {
    expect(getPdfBatchItemStatusMeta('REMEDIATED').variant).toBe('success');
    expect(getPdfBatchItemStatusMeta('FAILED').variant).toBe('error');
    expect(getPdfBatchItemStatusMeta('SKIPPED').variant).toBe('default');
  });
});

describe('isBudgetWaitStatus', () => {
  it('is true only for the two budget-wait states', () => {
    const budgetWait = ALL_STATUSES.filter(isBudgetWaitStatus);
    expect(budgetWait.sort()).toEqual(['HELD_FOR_BUDGET', 'QUEUED_FOR_BUDGET']);
  });
});
