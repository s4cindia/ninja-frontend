import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  toIsoDate,
  rangeLastNDays,
  defaultRange,
  rangeThisQuarter,
  clampDateRange,
} from '../corpusDateRange';

describe('corpusDateRange', () => {
  describe('toIsoDate', () => {
    it('formats as YYYY-MM-DD with zero padding', () => {
      expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
      expect(toIsoDate(new Date(2026, 3, 15))).toBe('2026-04-15');
      expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('rangeLastNDays', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 3, 15)); // 2026-04-15
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns today - N days through today for N=30', () => {
      const r = rangeLastNDays(30);
      expect(r.to).toBe('2026-04-15');
      expect(r.from).toBe('2026-03-16');
    });

    it('returns today - N days through today for N=90', () => {
      const r = rangeLastNDays(90);
      expect(r.to).toBe('2026-04-15');
      expect(r.from).toBe('2026-01-15');
    });

    it('handles month boundaries', () => {
      vi.setSystemTime(new Date(2026, 2, 5)); // 2026-03-05
      const r = rangeLastNDays(10);
      expect(r.to).toBe('2026-03-05');
      expect(r.from).toBe('2026-02-23');
    });

    it('handles year boundaries', () => {
      vi.setSystemTime(new Date(2026, 0, 5)); // 2026-01-05
      const r = rangeLastNDays(10);
      expect(r.to).toBe('2026-01-05');
      expect(r.from).toBe('2025-12-26');
    });

    it('N=0 yields a same-day range', () => {
      const r = rangeLastNDays(0);
      expect(r.from).toBe('2026-04-15');
      expect(r.to).toBe('2026-04-15');
    });
  });

  describe('defaultRange', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 3, 15));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('is exactly last 30 days through today', () => {
      const r = defaultRange();
      expect(r).toEqual({ from: '2026-03-16', to: '2026-04-15' });
    });
  });

  describe('rangeThisQuarter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('Q1: Jan 1 through today when today is in Jan-Mar', () => {
      vi.setSystemTime(new Date(2026, 1, 20)); // Feb 20
      const r = rangeThisQuarter();
      expect(r.from).toBe('2026-01-01');
      expect(r.to).toBe('2026-02-20');
    });

    it('Q2: Apr 1 through today when today is in Apr-Jun', () => {
      vi.setSystemTime(new Date(2026, 3, 15)); // Apr 15
      const r = rangeThisQuarter();
      expect(r.from).toBe('2026-04-01');
      expect(r.to).toBe('2026-04-15');
    });

    it('Q3: Jul 1 through today when today is in Jul-Sep', () => {
      vi.setSystemTime(new Date(2026, 8, 10)); // Sep 10
      const r = rangeThisQuarter();
      expect(r.from).toBe('2026-07-01');
      expect(r.to).toBe('2026-09-10');
    });

    it('Q4: Oct 1 through today when today is in Oct-Dec', () => {
      vi.setSystemTime(new Date(2026, 10, 5)); // Nov 5
      const r = rangeThisQuarter();
      expect(r.from).toBe('2026-10-01');
      expect(r.to).toBe('2026-11-05');
    });

    it('exact quarter start dates land on themselves', () => {
      vi.setSystemTime(new Date(2026, 3, 1)); // Apr 1
      const r = rangeThisQuarter();
      expect(r.from).toBe('2026-04-01');
      expect(r.to).toBe('2026-04-01');
    });
  });

  describe('clampDateRange', () => {
    const today = '2026-04-15';

    it('leaves an already-valid range alone', () => {
      expect(clampDateRange({ from: '2026-03-01', to: '2026-04-10' }, today)).toEqual({
        from: '2026-03-01',
        to: '2026-04-10',
      });
    });

    it('clamps a future `to` down to today', () => {
      expect(clampDateRange({ from: '2026-03-01', to: '2026-05-01' }, today)).toEqual({
        from: '2026-03-01',
        to: '2026-04-15',
      });
    });

    it('clamps a future `from` down to today', () => {
      expect(clampDateRange({ from: '2026-06-01', to: '2026-06-15' }, today)).toEqual({
        from: '2026-04-15',
        to: '2026-04-15',
      });
    });

    it('snaps `to` up to `from` when from > to', () => {
      // User types a `from` later than `to` — we snap `to` to `from`.
      expect(clampDateRange({ from: '2026-04-10', to: '2026-04-01' }, today)).toEqual({
        from: '2026-04-10',
        to: '2026-04-10',
      });
    });

    it('combines future-clamp and from>to snap', () => {
      // Both from and to are in the future; from > to. Everything collapses to today.
      expect(clampDateRange({ from: '2026-06-10', to: '2026-06-01' }, today)).toEqual({
        from: '2026-04-15',
        to: '2026-04-15',
      });
    });

    it('accepts a range ending exactly on today', () => {
      expect(clampDateRange({ from: '2026-04-01', to: '2026-04-15' }, today)).toEqual({
        from: '2026-04-01',
        to: '2026-04-15',
      });
    });
  });
});
