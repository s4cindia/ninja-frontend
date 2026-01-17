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

export const SEVERITY_CONFIG: Record<SeverityLevel, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconName: 'alert-circle' | 'alert-triangle' | 'info';
}> = {
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconName: 'alert-circle',
  },
  serious: {
    label: 'Serious',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    iconName: 'alert-triangle',
  },
  moderate: {
    label: 'Moderate',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    iconName: 'alert-triangle',
  },
  minor: {
    label: 'Minor',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconName: 'info',
  },
} as const;

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#eab308';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Poor';
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

export function parseJobOutput(output: unknown): JobOutput | null {
  if (!output || typeof output !== 'object') return null;

  const obj = output as Record<string, unknown>;
  const summary = obj.summary as Record<string, unknown> | undefined;

  return {
    jobId: (obj.jobId as string) || '',
    score: typeof obj.score === 'number' ? obj.score : 0,
    isValid: Boolean(obj.isValid),
    isAccessible: Boolean(obj.isAccessible),
    fileName: (obj.fileName as string) || 'Unknown',
    epubVersion: (obj.epubVersion as string) || '',
    auditedAt: (obj.auditedAt as string) || '',
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
