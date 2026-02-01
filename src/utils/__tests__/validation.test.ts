import { describe, it, expect } from 'vitest';
import { validateJobId, assertValidJobId } from '../validation';

describe('validateJobId', () => {
  describe('valid job IDs', () => {
    it('should accept alphanumeric job IDs', () => {
      expect(validateJobId('abc123')).toBe(true);
      expect(validateJobId('ABC123')).toBe(true);
      expect(validateJobId('AbC123')).toBe(true);
    });

    it('should accept job IDs with hyphens', () => {
      expect(validateJobId('job-001')).toBe(true);
      expect(validateJobId('abc-123-def')).toBe(true);
      expect(validateJobId('test-job-id')).toBe(true);
    });

    it('should accept job IDs with underscores', () => {
      expect(validateJobId('job_001')).toBe(true);
      expect(validateJobId('abc_123_def')).toBe(true);
      expect(validateJobId('test_job_id')).toBe(true);
    });

    it('should accept job IDs with mixed valid characters', () => {
      expect(validateJobId('abc-123_def')).toBe(true);
      expect(validateJobId('Job_ID-123')).toBe(true);
      expect(validateJobId('a1-b2_c3')).toBe(true);
    });

    it('should accept realistic job IDs', () => {
      expect(validateJobId('550e8400-e29b-41d4-a716-446655440000')).toBe(true); // UUID format
      expect(validateJobId('job_2024-01-15_001')).toBe(true);
      expect(validateJobId('pdf-audit-123abc')).toBe(true);
    });
  });

  describe('invalid job IDs - path traversal attempts', () => {
    it('should reject relative path traversal', () => {
      expect(validateJobId('../etc/passwd')).toBe(false);
      expect(validateJobId('../../secret')).toBe(false);
      expect(validateJobId('../')).toBe(false);
      expect(validateJobId('..')).toBe(false);
    });

    it('should reject absolute paths', () => {
      expect(validateJobId('/etc/passwd')).toBe(false);
      expect(validateJobId('/root')).toBe(false);
      expect(validateJobId('C:\\Windows\\System32')).toBe(false);
    });

    it('should reject forward slashes', () => {
      expect(validateJobId('job/123')).toBe(false);
      expect(validateJobId('path/to/file')).toBe(false);
    });

    it('should reject backslashes', () => {
      expect(validateJobId('job\\123')).toBe(false);
      expect(validateJobId('path\\to\\file')).toBe(false);
    });
  });

  describe('invalid job IDs - special characters', () => {
    it('should reject email-like patterns', () => {
      expect(validateJobId('job@123')).toBe(false);
      expect(validateJobId('user@domain.com')).toBe(false);
    });

    it('should reject file extensions', () => {
      expect(validateJobId('job.txt')).toBe(false);
      expect(validateJobId('file.pdf')).toBe(false);
      expect(validateJobId('script.js')).toBe(false);
    });

    it('should reject URLs', () => {
      expect(validateJobId('http://example.com')).toBe(false);
      expect(validateJobId('https://example.com/job')).toBe(false);
      expect(validateJobId('example.com')).toBe(false);
    });

    it('should reject other special characters', () => {
      expect(validateJobId('job!123')).toBe(false);
      expect(validateJobId('job#123')).toBe(false);
      expect(validateJobId('job$123')).toBe(false);
      expect(validateJobId('job%123')).toBe(false);
      expect(validateJobId('job&123')).toBe(false);
      expect(validateJobId('job*123')).toBe(false);
      expect(validateJobId('job+123')).toBe(false);
      expect(validateJobId('job=123')).toBe(false);
      expect(validateJobId('job?123')).toBe(false);
      expect(validateJobId('job~123')).toBe(false);
      expect(validateJobId('job`123')).toBe(false);
      expect(validateJobId('job|123')).toBe(false);
    });

    it('should reject parentheses and brackets', () => {
      expect(validateJobId('job(123)')).toBe(false);
      expect(validateJobId('job[123]')).toBe(false);
      expect(validateJobId('job{123}')).toBe(false);
    });

    it('should reject quotes', () => {
      expect(validateJobId("job'123")).toBe(false);
      expect(validateJobId('job"123')).toBe(false);
    });

    it('should reject whitespace', () => {
      expect(validateJobId('job 123')).toBe(false);
      expect(validateJobId('job\t123')).toBe(false);
      expect(validateJobId('job\n123')).toBe(false);
    });
  });

  describe('invalid job IDs - null/undefined/empty', () => {
    it('should reject null', () => {
      expect(validateJobId(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validateJobId(undefined)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateJobId('')).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('should narrow type from string | undefined to string', () => {
      const jobId: string | undefined = 'test-job-123';

      if (validateJobId(jobId)) {
        // TypeScript should know jobId is string here
        const length: number = jobId.length; // Should not error
        expect(length).toBeGreaterThan(0);
      }
    });
  });
});

describe('assertValidJobId', () => {
  it('should not throw for valid job IDs', () => {
    expect(() => assertValidJobId('abc-123_def')).not.toThrow();
    expect(() => assertValidJobId('job-001')).not.toThrow();
  });

  it('should throw for invalid job IDs', () => {
    expect(() => assertValidJobId('../etc/passwd')).toThrow('Invalid job ID format');
    expect(() => assertValidJobId('job@123')).toThrow('Invalid job ID format');
    expect(() => assertValidJobId('job.txt')).toThrow('Invalid job ID format');
  });

  it('should throw for null', () => {
    expect(() => assertValidJobId(null)).toThrow('Invalid job ID format');
  });

  it('should throw for undefined', () => {
    expect(() => assertValidJobId(undefined)).toThrow('Invalid job ID format');
  });

  it('should throw for empty string', () => {
    expect(() => assertValidJobId('')).toThrow('Invalid job ID format');
  });

  it('should assert type to string', () => {
    const jobId: string | undefined = 'test-job-123';

    assertValidJobId(jobId);
    // TypeScript should know jobId is string here
    const length: number = jobId.length; // Should not error
    expect(length).toBeGreaterThan(0);
  });
});
