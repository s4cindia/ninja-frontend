import { CONFIDENCE_THRESHOLDS } from '@/types/citation.types';

/**
 * Normalizes confidence values to a 0-100 percentage scale.
 * 
 * **When to use:**
 * - Always call this before displaying confidence values to users
 * - Always call this before comparing against CONFIDENCE_THRESHOLDS
 * - Call once at the entry point of a component, not in nested functions
 * 
 * **Input handling:**
 * - Values 0-1 (floats from ML models): multiplied by 100 → 0-100%
 * - Values 0-100 (already percentages): kept as-is
 * - Values outside 0-100: clamped to valid range
 * 
 * @example
 * normalizeConfidence(0.85)  // → 85
 * normalizeConfidence(85)    // → 85
 * normalizeConfidence(0)     // → 0 (not treated as falsy)
 * normalizeConfidence(1.5)   // → 100 (clamped)
 */
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

/**
 * Whitelist of trusted domains for academic/citation links.
 * Protects against open redirect attacks by only allowing links to known scholarly sources.
 */
const TRUSTED_CITATION_DOMAINS = [
  'doi.org',
  'dx.doi.org',
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'scholar.google.com',
  'jstor.org',
  'springer.com',
  'link.springer.com',
  'wiley.com',
  'onlinelibrary.wiley.com',
  'sciencedirect.com',
  'elsevier.com',
  'nature.com',
  'science.org',
  'ieee.org',
  'ieeexplore.ieee.org',
  'acm.org',
  'dl.acm.org',
  'arxiv.org',
  'researchgate.net',
  'academia.edu',
  'semanticscholar.org',
  'crossref.org',
  'orcid.org',
  'worldcat.org',
] as const;

/**
 * Checks if a URL points to a trusted academic/citation domain.
 * Returns true if the URL is safe AND the domain is whitelisted.
 */
export function isTrustedCitationUrl(url: string): boolean {
  if (!isSafeUrl(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return TRUSTED_CITATION_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
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
