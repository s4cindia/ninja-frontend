import { CONFIDENCE_THRESHOLDS } from '@/types/citation.types';

export function normalizeConfidence(confidence: number): number {
  const normalized = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  return Math.max(0, Math.min(100, normalized));
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  const normalized = normalizeConfidence(confidence);
  if (normalized >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (normalized >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  return level === 'high' ? 'text-green-600' :
         level === 'medium' ? 'text-yellow-600' : 'text-red-600';
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const BARE_DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;

export function isBareDoi(value: string): boolean {
  return BARE_DOI_PATTERN.test(value);
}

export function normalizeDoiUrl(doi: string): string {
  if (doi.startsWith('http://') || doi.startsWith('https://')) {
    return doi;
  }
  if (isBareDoi(doi)) {
    return `https://doi.org/${doi}`;
  }
  return doi;
}

export function validateId(id: unknown, context: string): asserts id is string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`Invalid ${context}: must be a non-empty string`);
  }
}
