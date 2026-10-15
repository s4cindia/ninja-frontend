import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45_000)).toBe('45s');
  });

  it('formats sub-hour durations as minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('2m 5s');
  });

  it('formats hour-plus durations as hours and minutes (dropping seconds)', () => {
    expect(formatDuration(3_725_000)).toBe('1h 2m');
  });

  it('clamps negative durations to 0s rather than throwing or showing a negative number', () => {
    expect(formatDuration(-500)).toBe('0s');
  });
});
