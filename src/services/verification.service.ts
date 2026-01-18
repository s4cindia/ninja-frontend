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
  if (lower === 'pending' || lower === 'PENDING') return 'pending';
  if (lower === 'verified_pass' || lower === 'verified' || lower === 'pass') return 'verified_pass';
  if (lower === 'verified_fail' || lower === 'fail') return 'verified_fail';
  if (lower === 'verified_partial' || lower === 'partial') return 'verified_partial';
  if (lower === 'deferred') return 'deferred';
  return 'pending';
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
        automatedResult: (item.automatedResult?.toLowerCase() || 'warning') as 'pass' | 'fail' | 'warning' | 'not_tested',
        automatedNotes: item.automatedNotes || (hasIssues ? `${item.relatedIssues?.length} issue(s) detected` : ''),
        status: normalizeStatus(item.status),
        history: [],
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

    const summary = apiData.summary || { total: items.length, pending: items.length, verified: 0 };
    
    return {
      items,
      totalCount: summary.total,
      pendingCount: summary.pending,
      verifiedCount: summary.verified,
      deferredCount: 0,
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
};
