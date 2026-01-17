export type VerificationStatus = 'pending' | 'verified_pass' | 'verified_fail' | 'verified_partial' | 'deferred';
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'manual';
export type VerificationMethod = 'NVDA 2024.1' | 'JAWS 2024' | 'VoiceOver' | 'Manual Review' | 'Keyboard Only' | 'Axe DevTools' | 'WAVE';

export interface VerificationHistoryEntry {
  id: string;
  status: VerificationStatus;
  method: VerificationMethod;
  notes: string;
  verifiedBy: string;
  verifiedAt: string;
}

export interface VerificationIssue {
  id?: string;
  issueId?: string;
  ruleId?: string;
  impact?: string;
  message: string;
  severity?: Severity;
  location?: string;
  filePath?: string;
  html?: string;
  htmlSnippet?: string;
  suggestedFix?: string;
}

export interface FixedVerificationIssue extends VerificationIssue {
  fixedAt?: string;
  fixMethod?: 'automated' | 'manual';
}

export interface VerificationItem {
  id: string;
  criterionId: string;
  criterionName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: Severity;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  automatedResult: 'pass' | 'fail' | 'warning' | 'not_tested';
  automatedNotes: string;
  status: VerificationStatus;
  history: VerificationHistoryEntry[];
  issues?: VerificationIssue[];
  fixedIssues?: FixedVerificationIssue[];
  fixedCount?: number;
  remainingCount?: number;
}

export interface VerificationQueueData {
  items: VerificationItem[];
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  deferredCount: number;
}

export interface VerificationSubmission {
  itemId: string;
  status: VerificationStatus;
  method: VerificationMethod;
  notes: string;
}

export interface BulkVerificationSubmission {
  itemIds: string[];
  status: VerificationStatus;
  method: VerificationMethod;
  notes: string;
}

export interface VerificationFilters {
  severity?: Severity[];
  confidenceLevel?: ConfidenceLevel[];
  status?: VerificationStatus[];
}
