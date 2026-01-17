import { AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react';

export interface IssueSummary {
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface DisplayIssue {
  id: string;
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  location: string;
  element?: string;
  autoFixable: boolean;
  fixCode?: string;
  /** WCAG criteria - normalized to comma-separated string from array */
  wcagCriteria?: string;
  suggestion?: string;
}

/**
 * Generates a unique fallback ID using crypto API or timestamp fallback
 */
function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `issue-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Safely gets a string value from an unknown object property
 */
function safeString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Safely gets a boolean value from an unknown object property
 */
function safeBoolean(value: unknown, fallback: boolean = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Maps a backend issue to a display-friendly format with defensive type checking
 */
export function mapToDisplayIssue(issue: unknown): DisplayIssue {
  if (!issue || typeof issue !== 'object') {
    return {
      id: generateFallbackId(),
      code: '',
      severity: 'minor',
      description: 'Unknown issue',
      location: 'Unknown',
      autoFixable: false,
    };
  }

  const i = issue as Record<string, unknown>;

  const rawSeverity = safeString(i.severity, 'minor');
  const validSeverities = ['critical', 'serious', 'moderate', 'minor'] as const;
  const severity = validSeverities.includes(rawSeverity as typeof validSeverities[number])
    ? (rawSeverity as DisplayIssue['severity'])
    : 'minor';

  let wcagCriteria: string | undefined;
  if (Array.isArray(i.wcagCriteria)) {
    wcagCriteria = i.wcagCriteria.filter(c => typeof c === 'string').join(', ');
  } else if (typeof i.wcagCriteria === 'string') {
    wcagCriteria = i.wcagCriteria;
  }

  return {
    id: safeString(i.id) || generateFallbackId(),
    code: safeString(i.code),
    severity,
    description: safeString(i.message) || safeString(i.description) || 'Unknown issue',
    location: safeString(i.location, 'Unknown'),
    element: safeString(i.element) || undefined,
    autoFixable: safeBoolean(i.autoFixable) || safeString(i.fixType) === 'autofix',
    fixCode: safeString(i.fixCode) || undefined,
    wcagCriteria,
    suggestion: safeString(i.suggestion) || undefined,
  };
}

export function mapIssuesToDisplay(issues: unknown[]): DisplayIssue[] {
  if (!Array.isArray(issues)) return [];
  return issues.map((issue) => mapToDisplayIssue(issue));
}

export interface JobOutput {
  jobId: string;
  score: number;
  isValid: boolean;
  isAccessible: boolean;
  fileName: string;
  epubVersion: string;
  auditedAt: string;
  summary: IssueSummary;
  combinedIssues: DisplayIssue[];
}

export type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor';

export interface SeverityConfig {
  icon: LucideIcon;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  order: number;
}

export const SEVERITY_CONFIG: Record<SeverityLevel, SeverityConfig> = {
  critical: {
    icon: AlertCircle,
    label: 'Critical',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    order: 0,
  },
  serious: {
    icon: AlertTriangle,
    label: 'Serious',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    order: 1,
  },
  moderate: {
    icon: AlertTriangle,
    label: 'Moderate',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    order: 2,
  },
  minor: {
    icon: Info,
    label: 'Minor',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    order: 3,
  },
};

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'serious', 'moderate', 'minor'];

export function getSeverityConfig(severity: string): SeverityConfig {
  const normalized = severity.toLowerCase() as SeverityLevel;
  return SEVERITY_CONFIG[normalized] || SEVERITY_CONFIG.minor;
}

// Score range constants
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

// Score thresholds for color coding and labels
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
} as const;

// Unified score color configuration
export interface ScoreColorConfig {
  stroke: string;
  bg: string;
  text: string;
  label: string;
}

export const SCORE_COLORS: Record<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', ScoreColorConfig> = {
  EXCELLENT: { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', label: 'Excellent' },
  GOOD: { stroke: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Good' },
  FAIR: { stroke: '#eab308', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Needs Work' },
  POOR: { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'Poor' },
} as const;

export function getScoreColorConfig(score: number): ScoreColorConfig {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return SCORE_COLORS.EXCELLENT;
  if (score >= SCORE_THRESHOLDS.GOOD) return SCORE_COLORS.GOOD;
  if (score >= SCORE_THRESHOLDS.FAIR) return SCORE_COLORS.FAIR;
  return SCORE_COLORS.POOR;
}

export function getScoreColor(score: number): string {
  return getScoreColorConfig(score).stroke;
}

export function getScoreLabel(score: number): string {
  return getScoreColorConfig(score).label;
}

export function isValidJobOutput(output: unknown): output is JobOutput {
  if (!output || typeof output !== 'object') return false;

  const obj = output as Record<string, unknown>;

  const hasValidScore = obj.score === undefined || typeof obj.score === 'number';
  const hasValidAccessible = obj.isAccessible === undefined || typeof obj.isAccessible === 'boolean';
  const hasValidSummary = obj.summary === undefined || typeof obj.summary === 'object';
  const hasValidIssues = obj.combinedIssues === undefined || Array.isArray(obj.combinedIssues);

  return hasValidScore && hasValidAccessible && hasValidSummary && hasValidIssues;
}

const SAFE_URL_PROTOCOLS = ['http:', 'https:'];
const SAFE_RELATIVE_PREFIXES = ['/', './', '../'];

/**
 * Validates a URL string for safe protocols and patterns
 */
function isUrlSafe(url: string): boolean {
  const trimmed = url.trim();
  
  if (SAFE_RELATIVE_PREFIXES.some(prefix => trimmed.startsWith(prefix))) {
    return true;
  }
  
  try {
    const parsed = new URL(trimmed);
    return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safely extracts downloadUrl from job output with proper type and security validation.
 * Rejects unsafe protocols (javascript:, data:, vbscript:, etc.) and malformed URLs.
 */
export function extractDownloadUrl(output: unknown): string | undefined {
  if (typeof output !== 'object' || output === null) {
    return undefined;
  }
  
  const obj = output as Record<string, unknown>;
  
  if (!('downloadUrl' in obj) || typeof obj.downloadUrl !== 'string') {
    return undefined;
  }
  
  const url = obj.downloadUrl;
  
  if (!isUrlSafe(url)) {
    return undefined;
  }
  
  return url;
}

export function parseJobOutput(output: unknown): JobOutput | null {
  if (!output || typeof output !== 'object') return null;

  const obj = output as Record<string, unknown>;
  const summary = obj.summary as Record<string, unknown> | undefined;

  return {
    jobId: typeof obj.jobId === 'string' ? obj.jobId : '',
    score: typeof obj.score === 'number' ? obj.score : 0,
    isValid: Boolean(obj.isValid),
    isAccessible: Boolean(obj.isAccessible),
    fileName: typeof obj.fileName === 'string' ? obj.fileName : 'Unknown',
    epubVersion: typeof obj.epubVersion === 'string' ? obj.epubVersion : '',
    auditedAt: typeof obj.auditedAt === 'string' ? obj.auditedAt : '',
    summary: {
      total: (summary?.total as number) ?? 0,
      critical: (summary?.critical as number) ?? 0,
      serious: (summary?.serious as number) ?? 0,
      moderate: (summary?.moderate as number) ?? 0,
      minor: (summary?.minor as number) ?? 0,
    },
    combinedIssues: Array.isArray(obj.combinedIssues) 
      ? mapIssuesToDisplay(obj.combinedIssues) 
      : [],
  };
}
