import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Search, MinusCircle, AlertTriangle, CheckCircle, LayoutGrid, Table, HelpCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { fetchAcrAnalysis, CriterionConfidence } from '@/services/api';
import { AnalysisSummaryCards } from './AnalysisSummaryCards';
import { CriterionCard } from './CriterionCard';
import { ExpandableSection } from './ExpandableSection';
import { CriteriaTable, CriterionRow } from './CriteriaTable';

interface ConfidenceDashboardProps {
  jobId: string;
  onVerifyClick?: (criterionId: string) => void;
  onCriteriaLoaded?: (criteria: CriterionConfidence[]) => void;
}

type HybridStatus = 'fail' | 'needs_verification' | 'likely_na' | 'pass';

type StatusGroup = 'pass' | 'fail' | 'needs_review' | 'not_applicable';

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

function getStatusGroup(criterion: CriterionConfidence): StatusGroup {
  if (criterion.status === 'not_applicable' || criterion.status === 'not_tested') {
    return 'not_applicable';
  }
  if (criterion.status === 'fail') {
    return 'fail';
  }
  if (criterion.needsVerification || criterion.status === 'not_tested') {
    return 'needs_review';
  }
  return 'pass';
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
  
  return {
    id: c.id || `criterion-${index}`,
    criterionId,
    name: c.name || 'Unknown Criterion',
    level: c.level || 'A',
    confidenceScore: typeof c.confidenceScore === 'number' && !isNaN(c.confidenceScore) ? c.confidenceScore : 0,
    status: c.status || 'not_tested',
    needsVerification: c.needsVerification ?? true,
    remarks: c.remarks,
    automatedChecks: Array.isArray(c.automatedChecks) ? c.automatedChecks : [],
    manualChecks: Array.isArray(c.manualChecks) ? c.manualChecks : [],
    evidence,
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

function categorizeCriteria(criteria: CriterionAnalysis[]) {
  const issues: CriterionAnalysis[] = [];
  const needsVerification: CriterionAnalysis[] = [];
  const likelyNA: CriterionAnalysis[] = [];

  criteria.forEach(criterion => {
    if (criterion.status === 'fail' && criterion.evidence) {
      issues.push(criterion);
    } else if (criterion.status === 'likely_na') {
      likelyNA.push(criterion);
    } else if (criterion.status === 'needs_verification' || (criterion.status === 'fail' && !criterion.evidence)) {
      needsVerification.push(criterion);
    }
  });

  return { issues, needsVerification, likelyNA };
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
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="criterion-detail-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4">
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

    fetchAcrAnalysis(jobId)
      .then((response) => {
        if (!cancelled) {
          console.log('[ACR Step 3] Analysis data from API:', response);
          const normalizedCriteria = (response.criteria || []).map((c, i) => normalizeCriterion(c, i));
          setCriteria(normalizedCriteria);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ACR Step 3] API error, falling back to mock data:', err);
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
    const categorized = categorizeCriteria(transformed);
    const tableRows = transformed.map(convertToTableRow);
    return { ...categorized, transformed, tableRows };
  }, [criteria]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const { issues, needsVerification, likelyNA, tableRows, transformed } = analysisData;

  const handleViewDetails = (criterionRow: CriterionRow) => {
    const analysis = transformed.find(c => c.id === criterionRow.id);
    if (analysis) {
      setSelectedCriterion(analysis);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <AnalysisSummaryCards
          issuesCount={issues.length}
          verificationCount={needsVerification.length}
          naCount={likelyNA.length}
        />
        
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg" role="group" aria-label="View mode">
          <button
            onClick={() => {
              setViewMode('cards');
              setSelectedCriterion(null);
            }}
            aria-pressed={viewMode === 'cards'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'cards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
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
      <div className="space-y-4">
        <ExpandableSection
          title="Issues Found"
          count={issues.length}
          icon={<AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />}
          defaultExpanded={true}
          headerColor="bg-red-50"
        >
          {issues.length === 0 ? (
            <p className="text-sm text-gray-600">
              No violations found in automated audit.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Evidence from automated audit
              </p>
              {issues.map(criterion => (
                <CriterionCard
                  key={criterion.id}
                  number={criterion.number}
                  name={criterion.name}
                  level={criterion.level}
                  confidence={criterion.confidence}
                  status={criterion.status}
                  evidence={criterion.evidence}
                  onViewDetails={() => setSelectedCriterion(criterion)}
                  onViewFiles={criterion.evidence?.affectedFiles ? () => console.log('View files', criterion.id) : undefined}
                />
              ))}
            </>
          )}
        </ExpandableSection>

        <ExpandableSection
          title="Manual Verification Required"
          count={needsVerification.length}
          icon={<Search className="h-5 w-5 text-orange-600" aria-hidden="true" />}
          defaultExpanded={false}
          headerColor="bg-orange-50"
        >
          {needsVerification.length === 0 ? (
            <p className="text-sm text-gray-600">
              No criteria require manual verification.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                No automated evidence - human testing required
              </p>
              {needsVerification.map(criterion => (
                <CriterionCard
                  key={criterion.id}
                  number={criterion.number}
                  name={criterion.name}
                  level={criterion.level}
                  confidence={criterion.confidence}
                  status={criterion.status}
                  onViewDetails={() => setSelectedCriterion(criterion)}
                  onMarkReviewed={() => {
                    if (onVerifyClick) {
                      onVerifyClick(criterion.number);
                    }
                  }}
                />
              ))}
            </>
          )}
        </ExpandableSection>

        <ExpandableSection
          title="Likely Not Applicable"
          count={likelyNA.length}
          icon={<MinusCircle className="h-5 w-5 text-gray-600" aria-hidden="true" />}
          defaultExpanded={false}
          headerColor="bg-gray-50"
        >
          {likelyNA.length === 0 ? (
            <p className="text-sm text-gray-600">
              All criteria appear applicable to this content.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Content type suggests these may not apply
              </p>
              {likelyNA.map(criterion => (
                <CriterionCard
                  key={criterion.id}
                  number={criterion.number}
                  name={criterion.name}
                  level={criterion.level}
                  confidence={criterion.confidence}
                  status={criterion.status}
                  onViewDetails={() => setSelectedCriterion(criterion)}
                />
              ))}
            </>
          )}
        </ExpandableSection>
      </div>
      )}

      {selectedCriterion && (
        <CriterionDetailModal
          criterion={selectedCriterion}
          onClose={() => setSelectedCriterion(null)}
        />
      )}
    </div>
  );
}
