import { api } from './api';
import type { 
  VerificationQueueData, 
  VerificationSubmission, 
  BulkVerificationSubmission,
  VerificationFilters 
} from '@/types/verification.types';

interface ApiIssue {
  code: string;
  message: string;
  severity: string;
  location?: string;
  status?: string;
  fixedAt?: string;
  fixMethod?: string;
}

interface ApiHistoryEntry {
  status: string;
  method: string;
  notes: string;
  verifiedBy: string;
  verifiedAt: string;
}

interface ApiQueueItem {
  id: string;
  criterionId: string;
  criterionName: string;
  level?: 'A' | 'AA' | 'AAA';
  status: string;
  confidenceLevel?: string;
  confidenceScore?: number;
  severity?: string;
  automatedResult?: string;
  automatedNotes?: string;
  relatedIssues?: ApiIssue[];
  fixedIssues?: ApiIssue[];
  history?: ApiHistoryEntry[];
}

interface ApiQueueResponse {
  success: boolean;
  data: {
    items: ApiQueueItem[];
    summary: {
      total: number;
      pending: number;
      verified: number;
    };
  };
}

const VALID_STATUSES = ['pending', 'verified_pass', 'verified_fail', 'verified_partial', 'deferred'] as const;
const VALID_CONFIDENCE_LEVELS = ['high', 'medium', 'low', 'manual'] as const;
const VALID_SEVERITIES = ['critical', 'serious', 'moderate', 'minor'] as const;

function normalizeStatus(status: string): typeof VALID_STATUSES[number] {
  const lower = status?.toLowerCase();
  if (lower === 'pending') return 'pending';
  if (lower === 'verified_pass' || lower === 'verified' || lower === 'pass') return 'verified_pass';
  if (lower === 'verified_fail' || lower === 'fail') return 'verified_fail';
  if (lower === 'verified_partial' || lower === 'partial') return 'verified_partial';
  if (lower === 'deferred') return 'deferred';
  return 'pending';
}

const VALID_AUTOMATED_RESULTS = ['pass', 'fail', 'warning', 'not_tested'] as const;

function normalizeAutomatedResult(result: string | undefined): typeof VALID_AUTOMATED_RESULTS[number] {
  const lower = result?.toLowerCase();
  if (lower === 'pass') return 'pass';
  if (lower === 'fail') return 'fail';
  if (lower === 'warning') return 'warning';
  if (lower === 'not_tested') return 'not_tested';
  return 'warning';
}

const VALID_VERIFICATION_METHODS = ['NVDA 2024.1', 'JAWS 2024', 'VoiceOver', 'Manual Review', 'Keyboard Only', 'Axe DevTools', 'WAVE'] as const;

function normalizeVerificationMethod(method: string | undefined): typeof VALID_VERIFICATION_METHODS[number] {
  if (!method) return 'Manual Review';
  if (VALID_VERIFICATION_METHODS.includes(method as typeof VALID_VERIFICATION_METHODS[number])) {
    return method as typeof VALID_VERIFICATION_METHODS[number];
  }
  return 'Manual Review';
}

function normalizeHistoryStatus(status: string): 'verified_pass' | 'verified_fail' | 'verified_partial' | 'deferred' {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return 'verified_pass';
  return normalized as 'verified_pass' | 'verified_fail' | 'verified_partial' | 'deferred';
}

function normalizeConfidenceLevel(level: string | undefined): typeof VALID_CONFIDENCE_LEVELS[number] {
  const lower = level?.toLowerCase();
  if (lower === 'high') return 'high';
  if (lower === 'medium') return 'medium';
  if (lower === 'low') return 'low';
  if (lower === 'manual' || lower === 'manual_required') return 'manual';
  return 'medium';
}

function normalizeSeverity(severity: string | undefined): typeof VALID_SEVERITIES[number] {
  const lower = severity?.toLowerCase();
  if (lower === 'critical') return 'critical';
  if (lower === 'serious') return 'serious';
  if (lower === 'moderate') return 'moderate';
  if (lower === 'minor') return 'minor';
  return 'moderate';
}

export const verificationService = {
  async getQueue(jobId: string, filters?: VerificationFilters): Promise<VerificationQueueData> {
    const params = new URLSearchParams();
    if (filters?.severity?.length) {
      params.append('severity', filters.severity.join(','));
    }
    if (filters?.confidenceLevel?.length) {
      params.append('confidenceLevel', filters.confidenceLevel.join(','));
    }
    if (filters?.status?.length) {
      params.append('status', filters.status.join(','));
    }
    const queryString = params.toString();
    const url = `/verification/${jobId}/queue${queryString ? `?${queryString}` : ''}`;
    const response = await api.get<ApiQueueResponse>(url);
    
    // Unwrap API response and map fields
    const apiData = response.data.data || response.data;
    const items = (apiData.items || []).map((item: ApiQueueItem) => {
      const hasIssues = (item.relatedIssues?.length || 0) > 0;
      
      return {
        id: item.id,
        criterionId: item.criterionId,
        criterionName: item.criterionName,
        wcagLevel: item.level || 'A',
        severity: normalizeSeverity(item.severity || (hasIssues ? item.relatedIssues?.[0]?.severity : undefined)),
        confidenceLevel: normalizeConfidenceLevel(item.confidenceLevel),
        confidenceScore: item.confidenceScore ?? 50,
        automatedResult: normalizeAutomatedResult(item.automatedResult),
        automatedNotes: item.automatedNotes || (hasIssues ? `${item.relatedIssues?.length} issue(s) detected` : ''),
        status: normalizeStatus(item.status),
        history: (item.history || []).map((h, idx) => ({
          id: `${item.id}-history-${idx}`,
          status: normalizeHistoryStatus(h.status),
          method: normalizeVerificationMethod(h.method),
          notes: h.notes || '',
          verifiedBy: h.verifiedBy || 'Unknown',
          verifiedAt: h.verifiedAt || new Date().toISOString(),
        })),
        issues: item.relatedIssues?.map(issue => ({
          id: issue.code,
          issueId: issue.code,
          ruleId: issue.code,
          message: issue.message,
          severity: normalizeSeverity(issue.severity),
          location: issue.location,
          filePath: issue.location,
        })),
        fixedIssues: item.fixedIssues?.map(issue => ({
          id: issue.code,
          issueId: issue.code,
          ruleId: issue.code,
          message: issue.message,
          severity: normalizeSeverity(issue.severity),
          location: issue.location,
          filePath: issue.location,
          fixedAt: issue.fixedAt,
          fixMethod: (issue.fixMethod === 'manual' ? 'manual' : 'automated') as 'automated' | 'manual',
        })),
        remainingCount: item.relatedIssues?.length || 0,
        fixedCount: item.fixedIssues?.length || 0,
      };
    });

    const summary = apiData.summary || { total: items.length, pending: items.length, verified: 0, deferred: 0 };
    const deferredCount = (summary as { deferred?: number }).deferred ?? 
      items.filter(item => item.status === 'deferred').length;
    
    return {
      items,
      totalCount: summary.total,
      pendingCount: summary.pending,
      verifiedCount: summary.verified,
      deferredCount,
    };
  },

  async submitVerification(data: VerificationSubmission): Promise<void> {
    await api.post(`/verification/verify/${data.itemId}`, {
      status: data.status,
      method: data.method,
      notes: data.notes,
    });
  },

  async submitBulkVerification(data: BulkVerificationSubmission): Promise<void> {
    await api.post('/verification/bulk', data);
  },

  async submitNaVerification(data: {
    criterionId: string;
    jobId: string;
    status: 'not_applicable';
    method: 'ai_suggested';
    notes: string;
  }): Promise<void> {
    await api.post('/verification/submit', data);
  },
};
