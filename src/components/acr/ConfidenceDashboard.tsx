import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, LayoutGrid, Table, HelpCircle, ChevronDown, BookOpen, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { fetchAcrAnalysis, CriterionConfidence } from '@/services/api';
import { CriteriaTable, CriterionRow } from './CriteriaTable';
import { WcagDocumentationModal } from './WcagDocumentationModal';
import { CriterionDetailsModal } from './CriterionDetailsModal';
import { useConfidenceWithIssues } from '@/hooks/useConfidence';
import { IssueMapping, RemediatedIssue, OtherIssuesData, NaSuggestion } from '@/types/confidence.types';
import { confidenceService } from '@/services/confidence.service';

interface ConfidenceDashboardProps {
  jobId: string;
  onVerifyClick?: (criterionId: string) => void;
  onCriteriaLoaded?: (criteria: CriterionConfidence[]) => void;
}

type HybridStatus = 'fail' | 'needs_verification' | 'likely_na' | 'pass';

type StatusGroup = 'pass' | 'fail' | 'needs_review' | 'not_applicable';

type ConfidenceGroup = 'high' | 'medium' | 'low' | 'manual';

/** Confidence boost for partially remediated criteria (some issues remain) */
const CONFIDENCE_BOOST_PARTIAL = 50;
/** Confidence boost for fully remediated criteria (all issues fixed) */
const CONFIDENCE_BOOST_COMPLETE = 85;

interface CriterionAnalysisEvidence {
  source: string;
  description: string;
  affectedFiles?: string[];
  issueCount?: number;
  auditIssues?: BackendAuditIssue[];
}

interface CriterionAnalysis {
  id: string;
  number: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidence: number;
  status: HybridStatus;
  evidence?: CriterionAnalysisEvidence;
  automatedChecks?: { id: string; description: string; passed: boolean }[];
  manualChecks?: string[];
}

const mockCriteria: CriterionConfidence[] = [
  { 
    id: '1', 
    criterionId: '1.1.1', 
    name: 'Non-text Content', 
    level: 'A', 
    confidenceScore: 95, 
    status: 'pass', 
    needsVerification: false,
    automatedChecks: [
      { id: '1a', description: 'Alt text presence verified for all images', passed: true },
      { id: '1b', description: 'Decorative images marked with empty alt', passed: true },
      { id: '1c', description: 'Form inputs have accessible labels', passed: true },
    ],
    manualChecks: ['Verify alt text quality and accuracy', 'Check complex images have long descriptions']
  },
  { 
    id: '2', 
    criterionId: '1.2.1', 
    name: 'Audio-only and Video-only', 
    level: 'A', 
    confidenceScore: 0, 
    status: 'not_applicable', 
    needsVerification: false,
    automatedChecks: [],
    manualChecks: ['Determine if media content exists']
  },
  { 
    id: '3', 
    criterionId: '1.3.1', 
    name: 'Info and Relationships', 
    level: 'A', 
    confidenceScore: 0, 
    status: 'fail', 
    needsVerification: true,
    automatedChecks: [
      { id: '3a', description: '9 tables missing header cells across 8 files', passed: false },
    ],
    manualChecks: ['Review semantic markup accuracy']
  },
  { 
    id: '4', 
    criterionId: '1.4.1', 
    name: 'Use of Color', 
    level: 'A', 
    confidenceScore: 45, 
    status: 'pass', 
    needsVerification: true,
    automatedChecks: [],
    manualChecks: ['Verify information conveyed by color has text alternative', 'Check form error states use more than color']
  },
  { 
    id: '5', 
    criterionId: '1.4.3', 
    name: 'Contrast (Minimum)', 
    level: 'AA', 
    confidenceScore: 98, 
    status: 'pass', 
    needsVerification: false,
    automatedChecks: [
      { id: '5a', description: 'Text contrast ratio >= 4.5:1 verified', passed: true },
      { id: '5b', description: 'Large text contrast ratio >= 3:1 verified', passed: true },
    ],
    manualChecks: ['Verify contrast on images with text overlay']
  },
  { 
    id: '6', 
    criterionId: '2.1.1', 
    name: 'Keyboard', 
    level: 'A', 
    confidenceScore: 60, 
    status: 'pass', 
    needsVerification: true,
    automatedChecks: [],
    manualChecks: ['Test all interactive elements with keyboard only', 'Verify custom widgets are fully operable']
  },
  { 
    id: '7', 
    criterionId: '2.4.1', 
    name: 'Bypass Blocks', 
    level: 'A', 
    confidenceScore: 0, 
    status: 'not_applicable', 
    needsVerification: false,
    automatedChecks: [],
    manualChecks: ['Determine if skip navigation is needed']
  },
  { 
    id: '8', 
    criterionId: '4.1.2', 
    name: 'Name, Role, Value', 
    level: 'A', 
    confidenceScore: 0, 
    status: 'fail', 
    needsVerification: true,
    automatedChecks: [
      { id: '8a', description: 'Affected by table structure issues', passed: false },
    ],
    manualChecks: ['Verify custom controls have accessible names']
  },
];

const WCAG_NAME_TO_ID: Record<string, string> = {
  'Non-text Content': '1.1.1',
  'Audio-only and Video-only': '1.2.1',
  'Captions (Prerecorded)': '1.2.2',
  'Audio Description or Media Alternative': '1.2.3',
  'Captions (Live)': '1.2.4',
  'Audio Description (Prerecorded)': '1.2.5',
  'Info and Relationships': '1.3.1',
  'Meaningful Sequence': '1.3.2',
  'Sensory Characteristics': '1.3.3',
  'Orientation': '1.3.4',
  'Identify Input Purpose': '1.3.5',
  'Use of Color': '1.4.1',
  'Audio Control': '1.4.2',
  'Contrast (Minimum)': '1.4.3',
  'Resize Text': '1.4.4',
  'Images of Text': '1.4.5',
  'Contrast (Enhanced)': '1.4.6',
  'Reflow': '1.4.10',
  'Non-text Contrast': '1.4.11',
  'Text Spacing': '1.4.12',
  'Content on Hover or Focus': '1.4.13',
  'Keyboard': '2.1.1',
  'No Keyboard Trap': '2.1.2',
  'Character Key Shortcuts': '2.1.4',
  'Timing Adjustable': '2.2.1',
  'Pause, Stop, Hide': '2.2.2',
  'Three Flashes or Below Threshold': '2.3.1',
  'Bypass Blocks': '2.4.1',
  'Page Titled': '2.4.2',
  'Focus Order': '2.4.3',
  'Link Purpose (In Context)': '2.4.4',
  'Link Purpose': '2.4.4',
  'Multiple Ways': '2.4.5',
  'Headings and Labels': '2.4.6',
  'Focus Visible': '2.4.7',
  'Location': '2.4.8',
  'Pointer Gestures': '2.5.1',
  'Pointer Cancellation': '2.5.2',
  'Label in Name': '2.5.3',
  'Motion Actuation': '2.5.4',
  'Language of Page': '3.1.1',
  'Language of Parts': '3.1.2',
  'On Focus': '3.2.1',
  'On Input': '3.2.2',
  'Consistent Navigation': '3.2.3',
  'Consistent Identification': '3.2.4',
  'Error Identification': '3.3.1',
  'Labels or Instructions': '3.3.2',
  'Error Suggestion': '3.3.3',
  'Error Prevention (Legal, Financial, Data)': '3.3.4',
  'Parsing': '4.1.1',
  'Name, Role, Value': '4.1.2',
  'Status Messages': '4.1.3',
};

const STATUS_CONFIG: Record<StatusGroup, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  pass: {
    label: 'PASSED',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  fail: {
    label: 'FAILED',
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700'
  },
  needs_review: {
    label: 'NEEDS REVIEW',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700'
  },
  not_applicable: {
    label: 'NOT APPLICABLE',
    icon: HelpCircle,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600'
  },
};

const SECTION_CONFIG: Record<ConfidenceGroup, {
  label: string;
  bgColor: string;
  dotColor: string;
}> = {
  high: {
    label: 'High Confidence',
    bgColor: 'bg-green-50/50',
    dotColor: 'bg-green-500'
  },
  medium: {
    label: 'Medium Confidence',
    bgColor: 'bg-yellow-50/50',
    dotColor: 'bg-yellow-500'
  },
  low: {
    label: 'Low Confidence',
    bgColor: 'bg-orange-50/50',
    dotColor: 'bg-orange-500'
  },
  manual: {
    label: 'Manual Review Required',
    bgColor: 'bg-gray-50/50',
    dotColor: 'bg-gray-400'
  },
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-500';
  if (confidence >= 50) return 'bg-yellow-500';
  if (confidence > 0) return 'bg-orange-500';
  return 'bg-gray-400';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High';
  if (confidence >= 50) return 'Medium';
  if (confidence > 0) return 'Low';
  return 'Manual';
}

function getStatusGroup(criterion: CriterionConfidence): StatusGroup {
  if (criterion.status === 'not_applicable') {
    return 'not_applicable';
  }
  if (criterion.status === 'fail') {
    return 'fail';
  }
  if (criterion.needsVerification) {
    return 'needs_review';
  }
  return 'pass';
}

function getConfidenceGroup(criterion: CriterionConfidence): ConfidenceGroup {
  if (criterion.confidenceScore >= 80) return 'high';
  if (criterion.confidenceScore >= 50) return 'medium';
  if (criterion.confidenceScore > 0) return 'low';
  return 'manual';
}

function isDemoJob(jobId: string): boolean {
  return !jobId || jobId === 'demo' || jobId === 'new' || jobId.startsWith('upload-') || jobId.startsWith('demo-');
}

function isValidWcagId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === '' || value.includes('earl:') || value.includes('@type')) return false;
  return /^\d+\.\d+(\.\d+)?$/.test(value);
}

function extractNestedId(obj: Record<string, unknown>): string | null {
  if (obj.id && isValidWcagId(obj.id)) return obj.id;
  if (obj.wcagId && isValidWcagId(obj.wcagId)) return obj.wcagId;
  if (obj.criterionId && isValidWcagId(obj.criterionId)) return obj.criterionId;
  return null;
}

function extractCriterionId(c: Partial<CriterionConfidence>, index: number): string {
  if (c.criterionId && isValidWcagId(c.criterionId)) return c.criterionId;
  if (c.id && isValidWcagId(c.id)) return c.id;
  if (c.name && WCAG_NAME_TO_ID[c.name]) return WCAG_NAME_TO_ID[c.name];
  
  const rawData = c as Record<string, unknown>;
  
  if (rawData.criterion && typeof rawData.criterion === 'object' && rawData.criterion !== null) {
    const nestedId = extractNestedId(rawData.criterion as Record<string, unknown>);
    if (nestedId) return nestedId;
  }
  if (rawData.criterion && isValidWcagId(rawData.criterion)) return rawData.criterion as string;
  if (rawData.wcagCriterion && isValidWcagId(rawData.wcagCriterion)) return rawData.wcagCriterion as string;
  
  return `${index + 1}.0.0`;
}

interface BackendAuditIssue {
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  affectedFiles?: string[];
  issueCount?: number;
}

interface BackendEvidence {
  source?: string;
  description?: string;
  affectedFiles?: string[];
  issueCount?: number;
  auditIssues?: BackendAuditIssue[];
}

interface NormalizedCriterion extends CriterionConfidence {
  evidence?: BackendEvidence;
}

function normalizeCriterion(c: Partial<CriterionConfidence>, index: number): NormalizedCriterion {
  const criterionId = extractCriterionId(c, index);
  const rawData = c as Record<string, unknown>;
  
  let evidence: BackendEvidence | undefined;
  if (rawData.evidence && typeof rawData.evidence === 'object') {
    const e = rawData.evidence as BackendEvidence;
    evidence = {
      source: e.source || 'epub_audit',
      description: e.description,
      affectedFiles: e.affectedFiles,
      issueCount: e.issueCount,
      auditIssues: Array.isArray(e.auditIssues) ? e.auditIssues : undefined,
    };
  }
  
  const rawConfidence = c.confidence ?? c.confidenceScore;
  const confidenceScore = typeof rawConfidence === 'number' && !isNaN(rawConfidence) ? rawConfidence : 0;
  
  return {
    id: c.id || `criterion-${index}`,
    criterionId,
    name: c.name || 'Unknown Criterion',
    level: c.level || 'A',
    confidenceScore,
    status: c.status || 'not_tested',
    needsVerification: c.needsVerification ?? true,
    remarks: c.remarks,
    automatedChecks: Array.isArray(c.automatedChecks) ? c.automatedChecks : [],
    manualChecks: Array.isArray(c.manualChecks) ? c.manualChecks : [],
    evidence,
    naSuggestion: c.naSuggestion,
  };
}

function determineHybridStatus(criterion: NormalizedCriterion): HybridStatus {
  if (criterion.status === 'fail') {
    return 'fail';
  }
  if (criterion.status === 'not_applicable' || criterion.status === 'not_tested') {
    return 'likely_na';
  }
  if (criterion.confidenceScore >= 80) {
    return 'pass';
  }
  return 'needs_verification';
}

function transformToCriterionAnalysis(criterion: NormalizedCriterion): CriterionAnalysis {
  const hybridStatus = determineHybridStatus(criterion);
  
  let evidence: CriterionAnalysis['evidence'] | undefined;
  
  const hasBackendEvidence = criterion.evidence && 
    (criterion.evidence.description || criterion.evidence.auditIssues?.length);
  
  if (hasBackendEvidence && criterion.evidence) {
    evidence = {
      source: criterion.evidence.source || 'epub_audit',
      description: criterion.evidence.description || 'Audit issues found',
      affectedFiles: criterion.evidence.affectedFiles,
      issueCount: criterion.evidence.issueCount,
      auditIssues: criterion.evidence.auditIssues,
    };
  } else {
    const failedChecks = criterion.automatedChecks?.filter(c => !c.passed) || [];
    if (failedChecks.length > 0) {
      const syntheticIssues: BackendAuditIssue[] = failedChecks.map(check => ({
        code: `CHECK-${check.id.toUpperCase()}`,
        severity: 'serious' as const,
        message: check.description,
        issueCount: 1,
      }));
      evidence = {
        source: 'epub_audit',
        description: failedChecks.map(c => c.description).join('; '),
        issueCount: failedChecks.length,
        auditIssues: syntheticIssues,
      };
    }
  }

  return {
    id: criterion.id,
    number: criterion.criterionId,
    name: criterion.name,
    level: criterion.level,
    confidence: criterion.confidenceScore,
    status: hybridStatus,
    evidence,
    automatedChecks: criterion.automatedChecks,
    manualChecks: criterion.manualChecks,
  };
}

function convertToTableRow(criterion: CriterionAnalysis): CriterionRow {
  return {
    id: criterion.id,
    number: criterion.number,
    name: criterion.name,
    level: criterion.level,
    confidence: criterion.confidence,
    status: criterion.status,
    evidence: criterion.evidence ? {
      source: criterion.evidence.source,
      description: criterion.evidence.description,
      affectedFiles: criterion.evidence.affectedFiles,
      issueCount: criterion.evidence.issueCount,
      auditIssues: criterion.evidence.auditIssues,
    } : undefined,
    automatedChecks: criterion.automatedChecks,
    manualTest: criterion.manualChecks && criterion.manualChecks.length > 0 ? {
      title: 'Manual Testing Required',
      whatToCheck: criterion.manualChecks,
    } : undefined,
  };
}

interface CriterionDetailModalProps {
  criterion: CriterionAnalysis;
  onClose: () => void;
}

function CriterionDetailModal({ criterion, onClose }: CriterionDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    const getFocusableElements = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled'));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="criterion-detail-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 id="criterion-detail-title" className="text-lg font-semibold text-gray-900">
            {criterion.number} - {criterion.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full"
            aria-label="Close detail modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Level</p>
              <p className="font-medium">{criterion.level}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confidence</p>
              <p className="font-medium">{criterion.confidence}%</p>
            </div>
            {criterion.evidence && (
              <div>
                <p className="text-sm text-gray-500">Evidence</p>
                <p className="font-medium">{criterion.evidence.description}</p>
              </div>
            )}
            {criterion.automatedChecks && criterion.automatedChecks.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Automated Checks</p>
                <ul className="space-y-1">
                  {criterion.automatedChecks.map((check) => (
                    <li key={check.id} className="flex items-start gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={check.passed ? 'text-gray-600' : 'text-red-700'}>
                        {check.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {criterion.manualChecks && criterion.manualChecks.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Manual Checks Needed</p>
                <ul className="space-y-1">
                  {criterion.manualChecks.map((check, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-orange-500">•</span>
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'cards' | 'table';

export function ConfidenceDashboard({ jobId, onVerifyClick, onCriteriaLoaded }: ConfidenceDashboardProps) {
  const [isLoading, setIsLoading] = useState(!isDemoJob(jobId));
  const [criteria, setCriteria] = useState<NormalizedCriterion[]>(
    isDemoJob(jobId) ? mockCriteria.map((c, i) => normalizeCriterion(c, i)) : []
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<CriterionAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedStatusSections, setExpandedStatusSections] = useState<Set<StatusGroup>>(new Set(['fail', 'needs_review']));
  const [expandedConfidenceSections, setExpandedConfidenceSections] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [docsCriterion, setDocsCriterion] = useState<{ id: string; name: string } | null>(null);
  const [detailsCriterion, setDetailsCriterion] = useState<CriterionConfidence | null>(null);
  const [showOnlyWithIssues, setShowOnlyWithIssues] = useState(false);
  const [showOtherIssues, setShowOtherIssues] = useState(false);
  const otherIssuesRef = useRef<HTMLDivElement>(null);
  const [otherIssues, setOtherIssues] = useState<OtherIssuesData | null>(null);

  const { data: confidenceData } = useConfidenceWithIssues(jobId, undefined, { enabled: !isDemoJob(jobId) });

  const { issuesByCriterion, remediatedCriteriaCount } = useMemo(() => {
    const map = new Map<string, { 
      issues: IssueMapping[]; 
      count: number;
      remediatedIssues?: RemediatedIssue[];
      remediatedCount?: number;
    }>();
    let remediatedCount = 0;
    if (confidenceData?.criteria) {
      for (const c of confidenceData.criteria) {
        const remediatedIssues = c.remediatedIssues || c.fixedIssues;
        // Field priority for fixed count: explicit count > array length > 0
        // Backend may send fixedCount, remediatedCount, or just the issues array
        const fixedCount = c.fixedCount ?? c.remediatedCount ?? remediatedIssues?.length ?? 0;
        // Field priority for remaining issues: issueCount > remainingCount > array length > 0
        // Backend may update issueCount after remediation, or provide remainingCount separately
        const remainingIssueCount = c.issueCount ?? c.remainingCount ?? c.relatedIssues?.length ?? 0;
        
        const hasRelatedIssues = c.relatedIssues && c.relatedIssues.length > 0;
        const hasRemediatedIssues = remediatedIssues && remediatedIssues.length > 0;
        // Also include criteria with only counts (no arrays) for status boosting
        // Include remainingCount check to properly track criteria with pending issues
        const hasCountsOnly = fixedCount > 0 || (c.fixedCount != null) || (c.remediatedCount != null) || (c.remainingCount != null);
        
        if (hasRelatedIssues || hasRemediatedIssues || hasCountsOnly) {
          map.set(c.criterionId, {
            issues: c.relatedIssues || [],
            count: remainingIssueCount,
            remediatedIssues: remediatedIssues || [],
            remediatedCount: fixedCount,
          });
          // Only count as remediated if there are fixes AND no remaining issues
          if (fixedCount > 0 && remainingIssueCount === 0) {
            remediatedCount++;
          }
        }
      }
    }
    return { issuesByCriterion: map, remediatedCriteriaCount: remediatedCount };
  }, [confidenceData]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (criteria.length > 0 && onCriteriaLoaded) {
      onCriteriaLoaded(criteria);
    }
  }, [criteria, onCriteriaLoaded]);

  useEffect(() => {
    if (isDemoJob(jobId)) {
      setCriteria(mockCriteria.map((c, i) => normalizeCriterion(c, i)));
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Fetch ACR analysis (required) and confidence data (optional enhancement)
    // ACR analysis failure is critical and will show error state
    // Confidence service failure is graceful - we continue with ACR data only
    const acrPromise = fetchAcrAnalysis(jobId);
    const confidencePromise = confidenceService.getConfidenceWithIssues(jobId).catch(err => {
      if (import.meta.env.DEV) {
        console.warn('[ACR Step 3] Confidence service failed, continuing with ACR data only:', err);
      }
      return null;
    });

    Promise.all([acrPromise, confidencePromise])
      .then(([acrResponse, confidenceResponse]) => {
        if (!cancelled) {
          // Build a map of naSuggestion data from confidence response
          const naSuggestionMap = new Map<string, NaSuggestion>();
          if (confidenceResponse?.criteria) {
            for (const c of confidenceResponse.criteria) {
              if (c.naSuggestion) {
                naSuggestionMap.set(c.criterionId, c.naSuggestion);
              }
            }
          }
          
          // Merge naSuggestion into criteria during normalization
          const normalizedCriteria = (acrResponse.criteria || []).map((c, i) => {
            const criterionId = extractCriterionId(c, i);
            const naSuggestion = naSuggestionMap.get(criterionId) || c.naSuggestion;
            return normalizeCriterion({ ...c, naSuggestion: naSuggestion as CriterionConfidence['naSuggestion'] }, i);
          });
          setCriteria(normalizedCriteria);
          
          if (confidenceResponse?.otherIssues) {
            setOtherIssues(confidenceResponse.otherIssues);
          } else if (acrResponse.otherIssues) {
            // Validate and normalize legacy format to canonical OtherIssuesData
            const legacy = acrResponse.otherIssues;
            if (
              typeof legacy === 'object' &&
              legacy !== null &&
              Array.isArray((legacy as { issues?: unknown }).issues)
            ) {
              const issues = (legacy as { issues: unknown[] }).issues;
              setOtherIssues({
                count: (legacy as { count?: number }).count ?? issues.length,
                pendingCount: (legacy as { pendingCount?: number }).pendingCount,
                fixedCount: (legacy as { fixedCount?: number }).fixedCount,
                issues: issues.map(issue => {
                  const i = issue as Record<string, unknown>;
                  return {
                    code: String(i.code ?? ''),
                    message: String(i.message ?? ''),
                    location: i.location ? String(i.location) : undefined,
                    severity: (['critical', 'serious', 'moderate', 'minor'].includes(String(i.severity)) 
                      ? String(i.severity) 
                      : 'moderate') as 'critical' | 'serious' | 'moderate' | 'minor',
                    status: i.status as 'pending' | 'fixed' | 'failed' | 'skipped' | undefined,
                    remediationInfo: i.remediationInfo as OtherIssuesData['issues'][0]['remediationInfo'],
                  };
                }),
              });
            }
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.error('[ACR Step 3] API error, falling back to mock data:', err);
          }
          setError('Failed to load analysis data. Showing demo data.');
          setCriteria(mockCriteria.map((c, i) => normalizeCriterion(c, i)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const analysisData = useMemo(() => {
    const transformed = criteria.map(transformToCriterionAnalysis);
    const tableRows = transformed.map(convertToTableRow);
    return { transformed, tableRows };
  }, [criteria]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const { tableRows, transformed } = analysisData;

  /**
   * Filter criteria for "Has Issues" view.
   * Priority order (first match wins):
   * 1. issuesByCriterion - Most reliable, derived from audit issue mapping
   * 2. issueCount/remainingCount - Direct counts from criterion data
   * 3. hasIssues flag - Backend-provided flag
   * 4. needsVerification - Items requiring human verification
   * 5. status === 'fail' - Failing criteria status
   */
  const filteredCriteria = showOnlyWithIssues
    ? criteria.filter(c => {
        // Priority 1: Check issuesByCriterion (most reliable source)
        const issueInfo = issuesByCriterion.get(c.criterionId);
        if (issueInfo && issueInfo.count > 0) return true;
        
        // Priority 2: Check issueCount/remainingCount from criterion
        if ((c.issueCount || 0) > 0 || (c.remainingCount || 0) > 0) return true;
        
        // Priority 3: Check hasIssues flag from backend
        if (c.hasIssues === true) return true;
        
        // Priority 4: Include items needing verification
        if (c.needsVerification === true) return true;
        
        // Priority 5: Check for failing status
        if (c.status === 'fail') return true;
        
        return false;
      })
    : criteria;

  // Group by status first, then by confidence within each status
  const hybridGroupedCriteria: Record<StatusGroup, Record<ConfidenceGroup, CriterionConfidence[]>> = {
    pass: { high: [], medium: [], low: [], manual: [] },
    fail: { high: [], medium: [], low: [], manual: [] },
    needs_review: { high: [], medium: [], low: [], manual: [] },
    not_applicable: { high: [], medium: [], low: [], manual: [] },
  };

  filteredCriteria.forEach(c => {
    const statusGroup = getStatusGroup(c);
    const confidenceGroup = getConfidenceGroup(c);
    hybridGroupedCriteria[statusGroup][confidenceGroup].push(c);
  });

  // Calculate counts for each status group (use filteredCriteria for display)
  // Status count calculation with frontend boost for remediated criteria
  // NOTE: This is a temporary UX improvement until backend updates status to 'pass'.
  // When all issues for a criterion are remediated (remediatedCount > 0, count === 0),
  // we display it as "pass" even if backend hasn't updated yet.
  // See: docs/BACKEND_ACR_REMEDIATION_SPEC.md for backend sync requirements.
  const statusCounts: Record<StatusGroup, number> = {
    pass: 0,
    fail: 0,
    needs_review: 0,
    not_applicable: 0,
  };

  filteredCriteria.forEach(c => {
    const issueInfo = issuesByCriterion.get(c.criterionId);
    const isFullyRemediated = issueInfo?.remediatedCount && 
                              issueInfo.remediatedCount > 0 && 
                              issueInfo.count === 0;
    
    if (isFullyRemediated) {
      // Temporary boost: treat fully remediated as pass until backend sync
      statusCounts.pass++;
    } else {
      const statusGroup = getStatusGroup(c);
      statusCounts[statusGroup]++;
    }
  });

  // Calculate overall confidence - boost score for remediated criteria if backend hasn't updated
  const overallConfidence = criteria.length > 0
    ? Math.round(criteria.reduce((sum, c) => {
        // If this criterion has remediated issues but still shows 0 confidence,
        // give it a minimum boost since remediation occurred
        const issueInfo = issuesByCriterion.get(c.criterionId);
        if (issueInfo?.remediatedCount && issueInfo.remediatedCount > 0 && c.confidenceScore === 0) {
          const hasRemainingIssues = issueInfo.count > 0;
          return sum + (hasRemainingIssues ? CONFIDENCE_BOOST_PARTIAL : CONFIDENCE_BOOST_COMPLETE);
        }
        return sum + c.confidenceScore;
      }, 0) / criteria.length)
    : 0;

  // Count criteria needing verification - exclude fully remediated criteria
  const needsVerificationCount = criteria.filter(c => {
    const issueInfo = issuesByCriterion.get(c.criterionId);
    const isFullyRemediated = issueInfo?.remediatedCount && 
                              issueInfo.remediatedCount > 0 && 
                              issueInfo.count === 0;
    if (isFullyRemediated) return false;
    return c.needsVerification;
  }).length;


  const handleViewDetails = (criterionRow: CriterionRow) => {
    const analysis = transformed.find(c => c.id === criterionRow.id);
    if (analysis) {
      setSelectedCriterion(analysis);
    }
  };

  const toggleStatusSection = (status: StatusGroup) => {
    setExpandedStatusSections(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const toggleConfidenceSection = (key: string) => {
    setExpandedConfidenceSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Inline CriterionRow component for the new layout
  const CriterionRowDisplay = ({
    criterion,
    isExpanded,
    onToggle,
    onVerifyClick: onVerify,
    onViewDocs,
    onCriterionClick,
    issueData,
  }: {
    criterion: CriterionConfidence;
    isExpanded: boolean;
    onToggle: () => void;
    onVerifyClick?: (criterionId: string) => void;
    onViewDocs?: (criterionId: string, name: string) => void;
    onCriterionClick?: (criterion: CriterionConfidence) => void;
    issueData?: { 
      issues: IssueMapping[]; 
      count: number;
      remediatedIssues?: RemediatedIssue[];
      remediatedCount?: number;
    };
  }) => {
    const levelColors: Record<string, string> = {
      A: 'bg-blue-100 text-blue-700',
      AA: 'bg-purple-100 text-purple-700',
      AAA: 'bg-indigo-100 text-indigo-700',
    };

    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          type="button"
          onClick={() => {
            if (onCriterionClick) {
              onCriterionClick(criterion);
            } else {
              onToggle();
            }
          }}
          className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="flex items-center gap-3">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', levelColors[criterion.level] || 'bg-gray-100 text-gray-700')}>
              {criterion.level}
            </span>
            <span className="font-medium text-gray-900">{criterion.criterionId}</span>
            {/* Show icon if there are any issues (pending or remediated) */}
            {issueData && (issueData.count > 0 || (issueData.remediatedCount && issueData.remediatedCount > 0)) && (
              <span title={`${issueData.count} pending, ${issueData.remediatedCount || 0} fixed`}>
                {issueData.count > 0 ? (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
              </span>
            )}
            <span className="text-gray-600">{criterion.name}</span>
            {/* N/A Suggestion indicator */}
            {criterion.naSuggestion && (
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                title={`AI suggests N/A (${criterion.naSuggestion.confidence}% confidence)`}
              >
                <Lightbulb className="h-3 w-3" aria-hidden="true" />
                N/A
              </span>
            )}
            {/* Issue count badges - show both pending and remediated */}
            {issueData && (issueData.count > 0 || (issueData.remediatedCount && issueData.remediatedCount > 0)) && (
              <span className="inline-flex items-center gap-1">
                {issueData.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {issueData.count} pending
                  </span>
                )}
                {issueData.remediatedCount && issueData.remediatedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {issueData.remediatedCount} fixed
                  </span>
                )}
              </span>
            )}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{criterion.confidenceScore}%</span>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
          </span>
        </button>
        {isExpanded && (
          <div className="px-6 py-4 bg-gray-50 space-y-3">
            {criterion.automatedChecks && criterion.automatedChecks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Automated Checks</p>
                <div className="space-y-1">
                  {criterion.automatedChecks.map((check, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={check.passed ? 'text-gray-600' : 'text-red-700'}>{check.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {criterion.manualChecks && criterion.manualChecks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Manual Checks Needed</p>
                <ul className="space-y-1">
                  {criterion.manualChecks.map((check, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-orange-500">•</span>
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {issueData && issueData.issues.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                <p className="font-medium text-gray-700">Related Issue:</p>
                <p className="truncate">{issueData.issues[0].message}</p>
                <p className="text-gray-400 mt-1">
                  {issueData.issues[0].filePath}
                </p>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              {onViewDocs && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocs(criterion.criterionId, criterion.name);
                  }}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  View WCAG Docs
                </Button>
              )}
              {criterion.needsVerification && onVerify && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify(criterion.criterionId);
                  }}
                >
                  Mark as Reviewed
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const statusOrder: StatusGroup[] = ['fail', 'needs_review', 'pass', 'not_applicable'];
  const confidenceOrder: ConfidenceGroup[] = ['high', 'medium', 'low', 'manual'];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500 mb-1">Overall Confidence</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className={cn('h-3 rounded-full transition-all', getConfidenceColor(overallConfidence))}
                style={{ width: `${overallConfidence}%` }}
              />
            </div>
            <span className="text-lg font-semibold">{overallConfidence}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{getConfidenceLabel(overallConfidence)} confidence</p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500 mb-1">Criteria Evaluated</p>
          <p className="text-2xl font-semibold">{criteria.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {statusCounts.pass} passed, {statusCounts.fail} failed
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500 mb-1">Needs Verification</p>
          <p className="text-2xl font-semibold text-orange-600">{needsVerificationCount}</p>
          <p className="text-xs text-gray-500 mt-1">criteria require human review</p>
        </div>

        {remediatedCriteriaCount > 0 && (
          <div className="bg-white rounded-lg border p-4 border-green-200 bg-green-50">
            <p className="text-sm text-gray-500 mb-1">Remediated</p>
            <p className="text-2xl font-semibold text-green-600">{remediatedCriteriaCount}</p>
            <p className="text-xs text-gray-500 mt-1">criteria with fixed issues</p>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Accessibility Criteria Analysis</h3>
          {(() => {
            // Use summary.criteriaWithIssuesCount from API if available, otherwise calculate
            const criteriaWithIssuesCount = confidenceData?.summary?.criteriaWithIssuesCount ?? 
              criteria.filter(c => {
                // Check hasIssues flag from backend first
                if (c.hasIssues === true) return true;
                if (c.hasIssues === false) return false;
                // Fallback to issueCount, remainingCount, or status-based detection
                const hasIssueCount = (c.issueCount || 0) > 0 || (c.remainingCount || 0) > 0;
                const hasFailingStatus = c.status === 'fail' || c.needsVerification;
                const issueInfo = issuesByCriterion.get(c.criterionId);
                const hasRelatedIssues = issueInfo && issueInfo.count > 0;
                return hasIssueCount || hasFailingStatus || hasRelatedIssues;
              }).length;

            return (
              <button
                className={cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center',
                  showOnlyWithIssues
                    ? 'bg-red-100 text-red-800 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                onClick={() => setShowOnlyWithIssues(!showOnlyWithIssues)}
                aria-pressed={showOnlyWithIssues}
              >
                <AlertCircle className="mr-1 h-4 w-4" />
                Has Issues
                {criteriaWithIssuesCount > 0 && (
                  <span className={cn(
                    'ml-2 px-1.5 py-0.5 rounded-full text-xs',
                    showOnlyWithIssues ? 'bg-red-200' : 'bg-red-100'
                  )}>
                    {criteriaWithIssuesCount}
                  </span>
                )}
              </button>
            );
          })()}
          {otherIssues && otherIssues.count > 0 && (
            <button
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center',
                showOtherIssues
                  ? 'bg-orange-100 text-orange-800 border-2 border-orange-500'
                  : 'bg-gray-100 text-orange-600 hover:bg-orange-50'
              )}
              onClick={() => {
                const newShowOtherIssues = !showOtherIssues;
                setShowOtherIssues(newShowOtherIssues);
                if (newShowOtherIssues) {
                  setShowOnlyWithIssues(false);
                  // Auto-scroll to Other Issues section after state update
                  setTimeout(() => {
                    otherIssuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Other Issues
              <span className="ml-2 px-1.5 py-0.5 bg-orange-200 rounded-full text-xs">
                {otherIssues.count}
              </span>
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg" role="group" aria-label="View mode">
          <button
            onClick={() => {
              setViewMode('cards');
              setSelectedCriterion(null);
            }}
            aria-pressed={viewMode === 'cards'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500',
              viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Cards
          </button>
          <button
            onClick={() => {
              setViewMode('table');
              setSelectedCriterion(null);
            }}
            aria-pressed={viewMode === 'table'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500',
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Table className="h-4 w-4" aria-hidden="true" />
            Table
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <CriteriaTable
          criteria={tableRows}
          mode="preview"
          onViewDetails={handleViewDetails}
          showFilters={true}
        />
      ) : (
        /* Status-Based Grouped Criteria */
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-gray-500">Grouped by status with confidence levels</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">A</span>
                  Basic
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">AA</span>
                  Standard
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">AAA</span>
                  Enhanced
                </span>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {statusOrder.map((statusGroup) => {
              const statusCount = statusCounts[statusGroup];
              if (statusCount === 0) return null;

              const statusConfig = STATUS_CONFIG[statusGroup];
              const isStatusExpanded = expandedStatusSections.has(statusGroup);
              const StatusIcon = statusConfig.icon;

              return (
                <div key={statusGroup}>
                  {/* Status Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleStatusSection(statusGroup)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 transition-colors',
                      statusConfig.bgColor,
                      'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <StatusIcon className={cn('h-5 w-5', statusConfig.textColor)} />
                      <span className={cn('font-semibold', statusConfig.textColor)}>
                        {statusConfig.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({statusCount} {statusCount === 1 ? 'criterion' : 'criteria'})
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-gray-500 transition-transform duration-200',
                        isStatusExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Confidence Sub-sections within Status Group */}
                  {isStatusExpanded && (
                    <div className={cn('border-l-4', statusConfig.borderColor)}>
                      {confidenceOrder.map((confidenceGroup) => {
                        const items = hybridGroupedCriteria[statusGroup][confidenceGroup];
                        if (items.length === 0) return null;

                        const confidenceConfig = SECTION_CONFIG[confidenceGroup];
                        const sectionKey = `${statusGroup}-${confidenceGroup}`;
                        const isConfidenceExpanded = expandedConfidenceSections.has(sectionKey);

                        return (
                          <div key={confidenceGroup}>
                            {/* Confidence Sub-header */}
                            <button
                              type="button"
                              onClick={() => toggleConfidenceSection(sectionKey)}
                              className={cn(
                                'w-full flex items-center justify-between px-6 py-2.5 transition-colors',
                                confidenceConfig.bgColor,
                                'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
                                'border-b border-gray-100'
                              )}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className={cn('w-2.5 h-2.5 rounded-full', confidenceConfig.dotColor)} />
                                <span className="text-sm font-medium text-gray-700">{confidenceConfig.label}</span>
                                <span className="text-xs text-gray-500">
                                  ({items.length} {items.length === 1 ? 'item' : 'items'})
                                </span>
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 text-gray-400 transition-transform duration-200',
                                  isConfidenceExpanded && 'rotate-180'
                                )}
                              />
                            </button>

                            {/* Criteria Rows */}
                            {isConfidenceExpanded && (
                              <div>
                                {items.map((criterion) => {
                                  const issueData = issuesByCriterion.get(criterion.criterionId);
                                  return (
                                  <CriterionRowDisplay
                                    key={criterion.id}
                                    criterion={criterion}
                                    isExpanded={expandedRows.has(criterion.id)}
                                    onToggle={() => toggleRow(criterion.id)}
                                    onVerifyClick={onVerifyClick}
                                    onViewDocs={(id, name) => setDocsCriterion({ id, name })}
                                    onCriterionClick={(crit) => setDetailsCriterion(crit)}
                                    issueData={issueData}
                                  />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Display other issues when filtered */}
      {showOtherIssues && otherIssues && otherIssues.count > 0 && (
        <div ref={otherIssuesRef} className="mt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Other Quality Issues (Non-WCAG)
            </h3>
            <span className="text-sm text-gray-500">
              These are structural or validation issues that don't map to specific WCAG criteria
            </span>
          </div>

          {/* Summary counts if available */}
          {(otherIssues.pendingCount !== undefined || otherIssues.fixedCount !== undefined) && (
            <div className="flex gap-4 mb-4">
              {(otherIssues.pendingCount ?? 0) > 0 && (
                <span className="text-sm text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                  {otherIssues.pendingCount} pending
                </span>
              )}
              {(otherIssues.fixedCount ?? 0) > 0 && (
                <span className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  {otherIssues.fixedCount} fixed
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {otherIssues.issues.map((issue, idx) => {
              const isFixed = issue.status === 'fixed';
              return (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-lg',
                  isFixed 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-orange-50 border border-orange-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-sm font-mono px-2 py-0.5 rounded',
                        isFixed 
                          ? 'text-green-700 bg-green-100' 
                          : 'text-orange-700 bg-orange-100'
                      )}>
                        {issue.code}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        issue.severity === 'serious' && 'bg-red-100 text-red-700',
                        issue.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
                        issue.severity === 'minor' && 'bg-blue-100 text-blue-700'
                      )}>
                        {issue.severity}
                      </span>
                      {isFixed && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          <CheckCircle className="h-3 w-3" />
                          Fixed
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-sm mb-2',
                      isFixed ? 'text-gray-600 line-through' : 'text-gray-900'
                    )}>
                      <span className="sr-only">{isFixed ? 'Fixed: ' : ''}</span>
                      {issue.message}
                    </p>
                    {issue.location && (
                      <p className="text-xs text-gray-500 font-mono">
                        Location: {issue.location}
                      </p>
                    )}
                    {/* Show remediation details for fixed issues */}
                    {isFixed && issue.remediationInfo && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">Fix applied:</span> {issue.remediationInfo.description}
                        </p>
                        {issue.remediationInfo.details && 
                         typeof issue.remediationInfo.details === 'object' &&
                         Object.keys(issue.remediationInfo.details).length > 0 && (
                          <div className="mt-2 text-xs text-green-700 bg-green-100/50 p-2 rounded font-mono">
                            {Object.entries(issue.remediationInfo.details).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span>{' '}
                                {typeof value === 'object' && value !== null
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const dateStr = issue.remediationInfo.completedAt;
                          if (!dateStr) return null;
                          const date = new Date(dateStr);
                          if (isNaN(date.getTime())) return null;
                          return (
                            <p className="text-xs text-gray-500 mt-1">
                              Fixed at: {date.toLocaleString()}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {selectedCriterion && (
        <CriterionDetailModal
          criterion={selectedCriterion}
          onClose={() => setSelectedCriterion(null)}
        />
      )}

      {docsCriterion && (
        <WcagDocumentationModal
          criterionId={docsCriterion.id}
          criterionName={docsCriterion.name}
          isOpen={!!docsCriterion}
          onClose={() => setDocsCriterion(null)}
        />
      )}

      {detailsCriterion && (
        <CriterionDetailsModal
          criterion={detailsCriterion}
          relatedIssues={issuesByCriterion.get(detailsCriterion.criterionId)?.issues}
          remediatedIssues={issuesByCriterion.get(detailsCriterion.criterionId)?.remediatedIssues}
          jobId={jobId}
          isOpen={!!detailsCriterion}
          onClose={() => setDetailsCriterion(null)}
          onVerifyClick={onVerifyClick}
          mode="interactive"
        />
      )}
    </div>
  );
}
