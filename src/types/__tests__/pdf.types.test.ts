import { describe, it, expect } from 'vitest';
import {
  isPdfAuditStatus,
  isMatterhornCheckpointStatus,
  isPdfMetadata,
  isPdfAuditIssue,
  isPdfAuditResult,
  isPdfAuditResponse,
  isPdfAuditListResponse,
  PDF_AUDIT_STATUSES,
  MATTERHORN_CHECKPOINT_STATUSES,
  type PdfMetadata,
  type PdfAuditIssue,
  type PdfAuditResult,
  type PdfAuditResponse,
  type PdfAuditListResponse,
} from '../pdf.types';

describe('pdf.types', () => {
  describe('Constants', () => {
    it('PDF_AUDIT_STATUSES contains all valid statuses', () => {
      expect(PDF_AUDIT_STATUSES).toEqual(['pending', 'processing', 'completed', 'failed']);
    });

    it('MATTERHORN_CHECKPOINT_STATUSES contains all valid statuses', () => {
      expect(MATTERHORN_CHECKPOINT_STATUSES).toEqual(['passed', 'failed', 'not-applicable']);
    });
  });

  describe('isPdfAuditStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isPdfAuditStatus('pending')).toBe(true);
      expect(isPdfAuditStatus('processing')).toBe(true);
      expect(isPdfAuditStatus('completed')).toBe(true);
      expect(isPdfAuditStatus('failed')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isPdfAuditStatus('invalid')).toBe(false);
      expect(isPdfAuditStatus('PENDING')).toBe(false);
      expect(isPdfAuditStatus('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isPdfAuditStatus(null)).toBe(false);
      expect(isPdfAuditStatus(undefined)).toBe(false);
      expect(isPdfAuditStatus(123)).toBe(false);
      expect(isPdfAuditStatus({})).toBe(false);
    });
  });

  describe('isMatterhornCheckpointStatus', () => {
    it('returns true for valid checkpoint statuses', () => {
      expect(isMatterhornCheckpointStatus('passed')).toBe(true);
      expect(isMatterhornCheckpointStatus('failed')).toBe(true);
      expect(isMatterhornCheckpointStatus('not-applicable')).toBe(true);
    });

    it('returns false for invalid checkpoint statuses', () => {
      expect(isMatterhornCheckpointStatus('invalid')).toBe(false);
      expect(isMatterhornCheckpointStatus('pending')).toBe(false);
      expect(isMatterhornCheckpointStatus('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isMatterhornCheckpointStatus(null)).toBe(false);
      expect(isMatterhornCheckpointStatus(undefined)).toBe(false);
      expect(isMatterhornCheckpointStatus(123)).toBe(false);
    });
  });

  describe('isPdfMetadata', () => {
    it('returns true for valid PdfMetadata', () => {
      const validMetadata: PdfMetadata = {
        pdfVersion: '1.7',
        isTagged: true,
        hasStructureTree: true,
      };
      expect(isPdfMetadata(validMetadata)).toBe(true);
    });

    it('returns true for PdfMetadata with optional fields', () => {
      const validMetadata: PdfMetadata = {
        title: 'Test Document',
        author: 'John Doe',
        creator: 'Word',
        producer: 'Adobe PDF',
        pdfVersion: '2.0',
        isTagged: false,
        hasStructureTree: false,
        language: 'en',
      };
      expect(isPdfMetadata(validMetadata)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      expect(isPdfMetadata({})).toBe(false);
      expect(isPdfMetadata({ pdfVersion: '1.7' })).toBe(false);
      expect(isPdfMetadata({ isTagged: true })).toBe(false);
      expect(isPdfMetadata({ hasStructureTree: true })).toBe(false);
    });

    it('returns false for invalid field types', () => {
      expect(isPdfMetadata({ pdfVersion: 123, isTagged: true, hasStructureTree: true })).toBe(false);
      expect(isPdfMetadata({ pdfVersion: '1.7', isTagged: 'yes', hasStructureTree: true })).toBe(false);
      expect(isPdfMetadata({ pdfVersion: '1.7', isTagged: true, hasStructureTree: 'yes' })).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isPdfMetadata(null)).toBe(false);
      expect(isPdfMetadata(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isPdfMetadata('string')).toBe(false);
      expect(isPdfMetadata(123)).toBe(false);
      expect(isPdfMetadata([])).toBe(false);
    });
  });

  describe('isPdfAuditIssue', () => {
    it('returns true for valid PdfAuditIssue', () => {
      const validIssue: PdfAuditIssue = {
        id: 'issue-123',
        ruleId: 'rule-001',
        severity: 'critical',
        message: 'Missing alt text',
        description: 'Image does not have alternative text',
      };
      expect(isPdfAuditIssue(validIssue)).toBe(true);
    });

    it('returns true for PdfAuditIssue with optional fields', () => {
      const validIssue: PdfAuditIssue = {
        id: 'issue-123',
        ruleId: 'rule-001',
        severity: 'serious',
        message: 'Missing alt text',
        description: 'Image does not have alternative text',
        pageNumber: 5,
        elementPath: '/Document/P[1]/Figure[0]',
        wcagCriteria: ['1.1.1', '4.1.2'],
        matterhornCheckpoint: '01-001',
        suggestedFix: 'Add alt text to the image',
      };
      expect(isPdfAuditIssue(validIssue)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      expect(isPdfAuditIssue({})).toBe(false);
      expect(isPdfAuditIssue({ id: 'issue-123' })).toBe(false);
      expect(isPdfAuditIssue({ id: 'issue-123', ruleId: 'rule-001' })).toBe(false);
    });

    it('returns false for invalid field types', () => {
      expect(isPdfAuditIssue({
        id: 123,
        ruleId: 'rule-001',
        severity: 'critical',
        message: 'Test',
        description: 'Test',
      })).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isPdfAuditIssue(null)).toBe(false);
      expect(isPdfAuditIssue(undefined)).toBe(false);
    });
  });

  describe('isPdfAuditResult', () => {
    const validMetadata: PdfMetadata = {
      pdfVersion: '1.7',
      isTagged: true,
      hasStructureTree: true,
    };

    const validResult: PdfAuditResult = {
      id: 'audit-123',
      jobId: 'job-456',
      fileName: 'test.pdf',
      fileSize: 1024000,
      pageCount: 10,
      score: 85,
      status: 'completed',
      createdAt: '2024-01-15T10:30:00.000Z',
      issues: [],
      matterhornSummary: {
        totalCheckpoints: 100,
        passed: 85,
        failed: 10,
        notApplicable: 5,
        categories: [],
      },
      metadata: validMetadata,
    };

    it('returns true for valid PdfAuditResult', () => {
      expect(isPdfAuditResult(validResult)).toBe(true);
    });

    it('returns true for PdfAuditResult with optional fields', () => {
      const resultWithOptionals = {
        ...validResult,
        completedAt: '2024-01-15T10:35:00.000Z',
      };
      expect(isPdfAuditResult(resultWithOptionals)).toBe(true);
    });

    it('returns false for missing required fields', () => {
      expect(isPdfAuditResult({})).toBe(false);
      expect(isPdfAuditResult({ id: 'audit-123' })).toBe(false);
    });

    it('returns false for invalid status', () => {
      const invalidResult = { ...validResult, status: 'invalid-status' };
      expect(isPdfAuditResult(invalidResult)).toBe(false);
    });

    it('returns false for invalid metadata', () => {
      const invalidResult = { ...validResult, metadata: {} };
      expect(isPdfAuditResult(invalidResult)).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isPdfAuditResult(null)).toBe(false);
      expect(isPdfAuditResult(undefined)).toBe(false);
    });
  });

  describe('isPdfAuditResponse', () => {
    const validMetadata: PdfMetadata = {
      pdfVersion: '1.7',
      isTagged: true,
      hasStructureTree: true,
    };

    const validResult: PdfAuditResult = {
      id: 'audit-123',
      jobId: 'job-456',
      fileName: 'test.pdf',
      fileSize: 1024000,
      pageCount: 10,
      score: 85,
      status: 'completed',
      createdAt: '2024-01-15T10:30:00.000Z',
      issues: [],
      matterhornSummary: {
        totalCheckpoints: 100,
        passed: 85,
        failed: 10,
        notApplicable: 5,
        categories: [],
      },
      metadata: validMetadata,
    };

    it('returns true for successful response', () => {
      const successResponse: PdfAuditResponse = {
        success: true,
        data: validResult,
      };
      expect(isPdfAuditResponse(successResponse)).toBe(true);
    });

    it('returns true for error response', () => {
      const errorResponse: PdfAuditResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Audit result not found',
        },
      };
      expect(isPdfAuditResponse(errorResponse)).toBe(true);
    });

    it('returns true for error response with details', () => {
      const errorResponse: PdfAuditResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: ['Field required: fileName'],
        },
      };
      expect(isPdfAuditResponse(errorResponse)).toBe(true);
    });

    it('returns false for invalid success response (missing data)', () => {
      expect(isPdfAuditResponse({ success: true })).toBe(false);
    });

    it('returns false for invalid error response (missing error)', () => {
      expect(isPdfAuditResponse({ success: false })).toBe(false);
    });

    it('returns false for malformed error object', () => {
      expect(isPdfAuditResponse({
        success: false,
        error: { code: 'ERROR' }, // missing message
      })).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isPdfAuditResponse(null)).toBe(false);
      expect(isPdfAuditResponse(undefined)).toBe(false);
    });

    it('returns false for missing success field', () => {
      expect(isPdfAuditResponse({ data: validResult })).toBe(false);
    });
  });

  describe('isPdfAuditListResponse', () => {
    const validMetadata: PdfMetadata = {
      pdfVersion: '1.7',
      isTagged: true,
      hasStructureTree: true,
    };

    const validResult: PdfAuditResult = {
      id: 'audit-123',
      jobId: 'job-456',
      fileName: 'test.pdf',
      fileSize: 1024000,
      pageCount: 10,
      score: 85,
      status: 'completed',
      createdAt: '2024-01-15T10:30:00.000Z',
      issues: [],
      matterhornSummary: {
        totalCheckpoints: 100,
        passed: 85,
        failed: 10,
        notApplicable: 5,
        categories: [],
      },
      metadata: validMetadata,
    };

    it('returns true for successful list response', () => {
      const successResponse: PdfAuditListResponse = {
        success: true,
        data: [validResult],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
        },
      };
      expect(isPdfAuditListResponse(successResponse)).toBe(true);
    });

    it('returns true for empty list response', () => {
      const successResponse: PdfAuditListResponse = {
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
        },
      };
      expect(isPdfAuditListResponse(successResponse)).toBe(true);
    });

    it('returns true for error response', () => {
      const errorResponse: PdfAuditListResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
      expect(isPdfAuditListResponse(errorResponse)).toBe(true);
    });

    it('returns false for invalid success response (missing pagination)', () => {
      expect(isPdfAuditListResponse({
        success: true,
        data: [validResult],
      })).toBe(false);
    });

    it('returns false for invalid success response (data not array)', () => {
      expect(isPdfAuditListResponse({
        success: true,
        data: validResult,
        pagination: { total: 1, page: 1, limit: 10 },
      })).toBe(false);
    });

    it('returns false for invalid error response', () => {
      expect(isPdfAuditListResponse({
        success: false,
        error: 'Error message', // should be object
      })).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isPdfAuditListResponse(null)).toBe(false);
      expect(isPdfAuditListResponse(undefined)).toBe(false);
    });
  });
});
