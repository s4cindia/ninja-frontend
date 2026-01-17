export interface IssueSummary {
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface AccessibilityIssue {
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

export interface JobOutput {
  jobId: string;
  score: number;
  isValid: boolean;
  isAccessible: boolean;
  fileName: string;
  epubVersion: string;
  auditedAt: string;
  summary: IssueSummary;
  combinedIssues: AccessibilityIssue[];
}

export type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor';

export const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: '🔴',
  },
  serious: {
    label: 'Serious',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: '🟠',
  },
  moderate: {
    label: 'Moderate',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: '🟡',
  },
  minor: {
    label: 'Minor',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: '🔵',
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
