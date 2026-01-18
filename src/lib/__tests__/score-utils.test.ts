import { describe, it, expect } from 'vitest';
import { SCORE_WEIGHTS, calculateScoreBreakdown } from '../score-utils';

describe('score-utils', () => {
  describe('SCORE_WEIGHTS', () => {
    it('should have correct weight values', () => {
      expect(SCORE_WEIGHTS.critical).toBe(25);
      expect(SCORE_WEIGHTS.serious).toBe(10);
      expect(SCORE_WEIGHTS.moderate).toBe(5);
      expect(SCORE_WEIGHTS.minor).toBe(1);
    });
  });

  describe('calculateScoreBreakdown', () => {
    it('should return perfect score for zero issues', () => {
      const result = calculateScoreBreakdown({
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      });

      expect(result.finalScore).toBe(100);
      expect(result.totalDeduction).toBe(0);
      expect(result.deductions.critical.count).toBe(0);
      expect(result.deductions.critical.points).toBe(0);
    });

    it('should calculate deductions correctly for critical issues', () => {
      const result = calculateScoreBreakdown({
        critical: 2,
        serious: 0,
        moderate: 0,
        minor: 0,
      });

      expect(result.deductions.critical.count).toBe(2);
      expect(result.deductions.critical.points).toBe(50);
      expect(result.totalDeduction).toBe(50);
      expect(result.finalScore).toBe(50);
    });

    it('should calculate deductions correctly for serious issues', () => {
      const result = calculateScoreBreakdown({
        critical: 0,
        serious: 3,
        moderate: 0,
        minor: 0,
      });

      expect(result.deductions.serious.count).toBe(3);
      expect(result.deductions.serious.points).toBe(30);
      expect(result.totalDeduction).toBe(30);
      expect(result.finalScore).toBe(70);
    });

    it('should calculate deductions correctly for moderate issues', () => {
      const result = calculateScoreBreakdown({
        critical: 0,
        serious: 0,
        moderate: 4,
        minor: 0,
      });

      expect(result.deductions.moderate.count).toBe(4);
      expect(result.deductions.moderate.points).toBe(20);
      expect(result.totalDeduction).toBe(20);
      expect(result.finalScore).toBe(80);
    });

    it('should calculate deductions correctly for minor issues', () => {
      const result = calculateScoreBreakdown({
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 10,
      });

      expect(result.deductions.minor.count).toBe(10);
      expect(result.deductions.minor.points).toBe(10);
      expect(result.totalDeduction).toBe(10);
      expect(result.finalScore).toBe(90);
    });

    it('should calculate combined deductions for mixed issues', () => {
      const result = calculateScoreBreakdown({
        critical: 1,
        serious: 2,
        moderate: 3,
        minor: 5,
      });

      expect(result.deductions.critical.points).toBe(25);
      expect(result.deductions.serious.points).toBe(20);
      expect(result.deductions.moderate.points).toBe(15);
      expect(result.deductions.minor.points).toBe(5);
      expect(result.totalDeduction).toBe(65);
      expect(result.finalScore).toBe(35);
    });

    it('should clamp score to 0 when deductions exceed 100', () => {
      const result = calculateScoreBreakdown({
        critical: 5,
        serious: 0,
        moderate: 0,
        minor: 0,
      });

      expect(result.totalDeduction).toBe(125);
      expect(result.finalScore).toBe(0);
    });

    it('should include weights in the result', () => {
      const result = calculateScoreBreakdown({
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
      });

      expect(result.weights).toEqual(SCORE_WEIGHTS);
    });
  });
});
