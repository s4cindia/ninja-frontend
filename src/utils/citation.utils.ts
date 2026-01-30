export function normalizeConfidence(confidence: number): number {
  return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateId(id: unknown, context: string): asserts id is string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`Invalid ${context}: must be a non-empty string`);
  }
}
