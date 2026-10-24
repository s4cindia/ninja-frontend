import { describe, it, expect } from 'vitest';
import { computeUploadProgressStats, formatBytes } from './uploadProgress';

describe('computeUploadProgressStats', () => {
  it('returns a null ETA before any bytes have transferred', () => {
    const stats = computeUploadProgressStats(0, 100_000_000, 0);
    expect(stats.percentage).toBe(0);
    expect(stats.remaining).toBe(100_000_000);
    expect(stats.etaMs).toBeNull();
  });

  it('computes percentage, remaining, and ETA assuming a constant rate', () => {
    // 50MB of 100MB in 10s -> 50%, 50MB remaining, ~10s more at the same rate
    const stats = computeUploadProgressStats(50_000_000, 100_000_000, 10_000);
    expect(stats.percentage).toBe(50);
    expect(stats.remaining).toBe(50_000_000);
    expect(stats.etaMs).toBeCloseTo(10_000, -1);
  });

  it('clamps to 100% / 0 remaining when loaded reaches or exceeds total', () => {
    const stats = computeUploadProgressStats(120_000_000, 100_000_000, 20_000);
    expect(stats.percentage).toBe(100);
    expect(stats.remaining).toBe(0);
    expect(stats.loaded).toBe(100_000_000);
  });

  it('does not divide by zero when total is 0', () => {
    const stats = computeUploadProgressStats(0, 0, 5_000);
    expect(stats.percentage).toBe(0);
    expect(stats.remaining).toBe(0);
    expect(stats.etaMs).toBeNull();
  });

  it('clamps negative loaded/elapsed inputs instead of producing negative output', () => {
    const stats = computeUploadProgressStats(-5, 100, -1);
    expect(stats.loaded).toBe(0);
    expect(stats.elapsedMs).toBe(0);
    expect(stats.etaMs).toBeNull();
  });
});

describe('formatBytes', () => {
  it('formats sub-KB sizes as whole bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats sub-MB sizes as KB with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats MB-and-up sizes as MB with one decimal', () => {
    expect(formatBytes(345_600_000)).toBe('329.6 MB');
  });
});
