import { describe, it, expect } from 'vitest';
import {
  parseJobOutput,
  isValidJobOutput,
  mapToDisplayIssue,
  getSeverityConfig,
  getScoreColor,
  getScoreLabel,
} from '../job-output.types';

describe('job-output.types', () => {
  describe('isValidJobOutput', () => {
    it('returns true for valid job output', () => {
      const valid = {
        score: 85,
        isAccessible: true,
        summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
        combinedIssues: [],
      };
      expect(isValidJobOutput(valid)).toBe(true);
    });

    it('returns true for output with optional fields undefined', () => {
      const valid = {};
      expect(isValidJobOutput(valid)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidJobOutput(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidJobOutput(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isValidJobOutput('string')).toBe(false);
      expect(isValidJobOutput(123)).toBe(false);
    });

    it('returns false for invalid score type', () => {
      expect(isValidJobOutput({ score: 'high' })).toBe(false);
    });

    it('returns false for invalid isAccessible type', () => {
      expect(isValidJobOutput({ isAccessible: 'yes' })).toBe(false);
    });

    it('returns false for invalid combinedIssues type', () => {
      expect(isValidJobOutput({ combinedIssues: 'not an array' })).toBe(false);
    });
  });

  describe('parseJobOutput', () => {
    it('parses valid job output object', () => {
      const input = {
        jobId: 'job-123',
        score: 90,
        isValid: true,
        isAccessible: true,
        fileName: 'test.epub',
        summary: { total: 5, critical: 1, serious: 2, moderate: 1, minor: 1 },
        combinedIssues: [],
      };
      const result = parseJobOutput(input);
      expect(result).not.toBeNull();
      expect(result?.score).toBe(90);
      expect(result?.jobId).toBe('job-123');
      expect(result?.fileName).toBe('test.epub');
    });

    it('returns null for null input', () => {
      expect(parseJobOutput(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseJobOutput(undefined)).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(parseJobOutput('string')).toBeNull();
      expect(parseJobOutput(123)).toBeNull();
    });

    it('provides defaults for missing fields', () => {
      const result = parseJobOutput({});
      expect(result).not.toBeNull();
      expect(result?.score).toBe(0);
      expect(result?.fileName).toBe('Unknown');
      expect(result?.jobId).toBe('');
      expect(result?.combinedIssues).toEqual([]);
    });

    it('parses summary correctly', () => {
      const input = {
        summary: { total: 10, critical: 2, serious: 3, moderate: 3, minor: 2 },
      };
      const result = parseJobOutput(input);
      expect(result?.summary.total).toBe(10);
      expect(result?.summary.critical).toBe(2);
    });
  });

  describe('mapToDisplayIssue', () => {
    it('maps raw issue to display issue', () => {
      const raw = {
        id: '123',
        severity: 'critical',
        message: 'Test message',
        wcagCriteria: '1.1.1',
        location: 'page-1',
      };
      const result = mapToDisplayIssue(raw);
      expect(result.id).toBe('123');
      expect(result.severity).toBe('critical');
      expect(result.description).toBe('Test message');
      expect(result.location).toBe('page-1');
    });

    it('uses description field if message not available', () => {
      const raw = {
        severity: 'minor',
        description: 'Alt description',
      };
      const result = mapToDisplayIssue(raw);
      expect(result.description).toBe('Alt description');
    });

    it('handles missing optional fields', () => {
      const raw = { severity: 'minor', message: 'Test' };
      const result = mapToDisplayIssue(raw);
      expect(result.wcagCriteria).toBeUndefined();
      expect(result.element).toBeUndefined();
    });

    it('generates fallback id when missing', () => {
      const raw = { severity: 'minor', message: 'Test' };
      const result = mapToDisplayIssue(raw);
      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe('string');
    });

    it('normalizes invalid severity to minor', () => {
      const raw = { severity: 'unknown', message: 'Test' };
      const result = mapToDisplayIssue(raw);
      expect(result.severity).toBe('minor');
    });

    it('handles null input gracefully', () => {
      const result = mapToDisplayIssue(null);
      expect(result.severity).toBe('minor');
      expect(result.description).toBe('Unknown issue');
    });

    it('handles wcagCriteria array', () => {
      const raw = {
        severity: 'minor',
        message: 'Test',
        wcagCriteria: ['1.1.1', '2.1.1'],
      };
      const result = mapToDisplayIssue(raw);
      expect(result.wcagCriteria).toBe('1.1.1, 2.1.1');
    });
  });

  describe('getSeverityConfig', () => {
    it('returns correct config for critical', () => {
      const config = getSeverityConfig('critical');
      expect(config.label).toBe('Critical');
      expect(config.order).toBe(0);
    });

    it('returns correct config for serious', () => {
      const config = getSeverityConfig('serious');
      expect(config.label).toBe('Serious');
      expect(config.order).toBe(1);
    });

    it('returns correct config for moderate', () => {
      const config = getSeverityConfig('moderate');
      expect(config.label).toBe('Moderate');
      expect(config.order).toBe(2);
    });

    it('returns correct config for minor', () => {
      const config = getSeverityConfig('minor');
      expect(config.label).toBe('Minor');
      expect(config.order).toBe(3);
    });

    it('returns minor config for unknown severity', () => {
      const config = getSeverityConfig('unknown');
      expect(config.label).toBe('Minor');
    });

    it('is case insensitive', () => {
      expect(getSeverityConfig('CRITICAL').label).toBe('Critical');
      expect(getSeverityConfig('Serious').label).toBe('Serious');
    });
  });

  describe('getScoreColor', () => {
    it('returns green hex for score >= 90', () => {
      expect(getScoreColor(90)).toBe('#22c55e');
      expect(getScoreColor(95)).toBe('#22c55e');
      expect(getScoreColor(100)).toBe('#22c55e');
    });

    it('returns yellow hex for score >= 70 and < 90', () => {
      expect(getScoreColor(70)).toBe('#eab308');
      expect(getScoreColor(85)).toBe('#eab308');
      expect(getScoreColor(89)).toBe('#eab308');
    });

    it('returns red hex for score < 70', () => {
      expect(getScoreColor(69)).toBe('#ef4444');
      expect(getScoreColor(50)).toBe('#ef4444');
      expect(getScoreColor(0)).toBe('#ef4444');
    });
  });

  describe('getScoreLabel', () => {
    it('returns Excellent for score >= 90', () => {
      expect(getScoreLabel(90)).toBe('Excellent');
      expect(getScoreLabel(100)).toBe('Excellent');
    });

    it('returns Good for score >= 70 and < 90', () => {
      expect(getScoreLabel(70)).toBe('Good');
      expect(getScoreLabel(89)).toBe('Good');
    });

    it('returns Needs Work for score >= 50 and < 70', () => {
      expect(getScoreLabel(50)).toBe('Needs Work');
      expect(getScoreLabel(69)).toBe('Needs Work');
    });

    it('returns Poor for score < 50', () => {
      expect(getScoreLabel(49)).toBe('Poor');
      expect(getScoreLabel(0)).toBe('Poor');
    });
  });
});
