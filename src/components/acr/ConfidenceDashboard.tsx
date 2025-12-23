import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle, ChevronDown, Bot, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { fetchAcrAnalysis, CriterionConfidence } from '@/services/api';

interface ConfidenceDashboardProps {
  jobId: string;
  onVerifyClick?: (criterionId: string) => void;
}

type ConfidenceGroup = 'high' | 'medium' | 'low' | 'manual';

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
    confidenceScore: 72, 
    status: 'pass', 
    needsVerification: true,
    automatedChecks: [
      { id: '2a', description: 'Media elements detected', passed: true },
      { id: '2b', description: 'Transcript file references found', passed: false },
    ],
    manualChecks: ['Verify transcript accuracy', 'Test audio description availability', 'Confirm captions are synchronized']
  },
  { 
    id: '3', 
    criterionId: '1.3.1', 
    name: 'Info and Relationships', 
    level: 'A', 
    confidenceScore: 88, 
    status: 'pass', 
    needsVerification: false,
    automatedChecks: [
      { id: '3a', description: 'Heading hierarchy validated', passed: true },
      { id: '3b', description: 'Table headers properly marked', passed: true },
      { id: '3c', description: 'Form labels associated correctly', passed: true },
    ],
    manualChecks: ['Review semantic markup accuracy']
  },
  { 
    id: '4', 
    criterionId: '1.4.1', 
    name: 'Use of Color', 
    level: 'A', 
    confidenceScore: 45, 
    status: 'fail', 
    needsVerification: true,
    automatedChecks: [
      { id: '4a', description: 'Color-only indicators detected', passed: false },
      { id: '4b', description: 'Link differentiation checked', passed: false },
    ],
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
      { id: '5c', description: 'UI component contrast checked', passed: true },
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
    automatedChecks: [
      { id: '6a', description: 'Tab order follows logical sequence', passed: true },
      { id: '6b', description: 'No keyboard traps detected', passed: true },
      { id: '6c', description: 'Custom controls have keyboard handlers', passed: false },
    ],
    manualChecks: ['Test all interactive elements with keyboard only', 'Verify custom widgets are fully operable', 'Check modal dialogs trap focus correctly']
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
    criterionId: '2.4.4', 
    name: 'Link Purpose', 
    level: 'A', 
    confidenceScore: 82, 
    status: 'pass', 
    needsVerification: false,
    automatedChecks: [
      { id: '8a', description: 'Generic link text detected (e.g., "click here")', passed: true },
      { id: '8b', description: 'Links have descriptive text or aria-label', passed: true },
    ],
    manualChecks: ['Verify link purpose is clear in context']
  },
];

const SECTION_CONFIG: Record<ConfidenceGroup, { label: string; bgColor: string; dotColor: string; borderColor: string }> = {
  high: { label: 'HIGH Confidence (90%+)', bgColor: 'bg-green-50', dotColor: 'bg-green-500', borderColor: 'border-green-200' },
  medium: { label: 'MEDIUM Confidence (60-89%)', bgColor: 'bg-yellow-50', dotColor: 'bg-yellow-500', borderColor: 'border-yellow-200' },
  low: { label: 'LOW Confidence (<60%)', bgColor: 'bg-orange-50', dotColor: 'bg-orange-500', borderColor: 'border-orange-200' },
  manual: { label: 'MANUAL REQUIRED', bgColor: 'bg-red-50', dotColor: 'bg-red-500', borderColor: 'border-red-200' },
};

function getConfidenceGroup(criterion: CriterionConfidence): ConfidenceGroup {
  if (criterion.status === 'not_applicable' || criterion.status === 'not_tested') {
    return 'manual';
  }
  if (criterion.confidenceScore >= 90) return 'high';
  if (criterion.confidenceScore >= 60) return 'medium';
  return 'low';
}

function getConfidenceColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function getConfidenceLabel(score: number): string {
  if (score >= 90) return 'High';
  if (score >= 70) return 'Medium';
  if (score >= 50) return 'Low';
  return 'Very Low';
}

function getStatusIcon(status: CriterionConfidence['status']) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'fail':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'not_applicable':
      return <HelpCircle className="h-5 w-5 text-gray-400" />;
    case 'not_tested':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
}

interface CriterionRowProps {
  criterion: CriterionConfidence;
  isExpanded: boolean;
  onToggle: () => void;
  onVerifyClick?: (criterionId: string) => void;
}

function CriterionRow({ criterion, isExpanded, onToggle, onVerifyClick }: CriterionRowProps) {
  const hasDetails = criterion.automatedChecks.length > 0 || criterion.manualChecks.length > 0;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetails && onToggle()}
        disabled={!hasDetails}
        className={cn(
          'w-full px-4 py-3 flex items-center gap-4 text-left transition-colors',
          criterion.needsVerification && 'bg-orange-50/50',
          hasDetails && 'hover:bg-gray-50 cursor-pointer',
          !hasDetails && 'cursor-default'
        )}
      >
        <div className="flex-shrink-0">
          {getStatusIcon(criterion.status)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{criterion.criterionId}</span>
            <span className="text-sm text-gray-600 truncate">{criterion.name}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              criterion.level === 'A' && 'bg-blue-100 text-blue-700',
              criterion.level === 'AA' && 'bg-purple-100 text-purple-700',
              criterion.level === 'AAA' && 'bg-indigo-100 text-indigo-700'
            )}>
              {criterion.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {criterion.status !== 'not_applicable' && criterion.status !== 'not_tested' && (
            <div className="w-24">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full', getConfidenceColor(criterion.confidenceScore))}
                    style={{ width: `${criterion.confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-8">{criterion.confidenceScore}%</span>
              </div>
            </div>
          )}

          {criterion.needsVerification && onVerifyClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onVerifyClick(criterion.criterionId);
              }}
            >
              Verify
            </Button>
          )}

          {hasDetails && (
            <ChevronDown 
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} 
            />
          )}
        </div>
      </button>

      {isExpanded && hasDetails && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-9">
            {criterion.automatedChecks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-gray-900">Automated Checks</h4>
                </div>
                <ul className="space-y-2">
                  {criterion.automatedChecks.map((check) => (
                    <li key={check.id} className="flex items-start gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={cn(check.passed ? 'text-gray-600' : 'text-red-700')}>
                        {check.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {criterion.manualChecks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-orange-600" />
                  <h4 className="text-sm font-medium text-gray-900">Manual Checks Needed</h4>
                </div>
                <ul className="space-y-2">
                  {criterion.manualChecks.map((check, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="h-4 w-4 flex items-center justify-center text-orange-500 mt-0.5 flex-shrink-0">•</span>
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isDemoJob(jobId: string): boolean {
  return !jobId || jobId === 'demo' || jobId === 'new';
}

export function ConfidenceDashboard({ jobId, onVerifyClick }: ConfidenceDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<ConfidenceGroup>>(new Set(['high']));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(!isDemoJob(jobId));
  const [criteria, setCriteria] = useState<CriterionConfidence[]>(isDemoJob(jobId) ? mockCriteria : []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoJob(jobId)) {
      setCriteria(mockCriteria);
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
          setCriteria(response.criteria);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ACR Step 3] API error, falling back to mock data:', err);
          setError('Failed to load analysis data. Showing demo data.');
          setCriteria(mockCriteria);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const toggleSection = (group: ConfidenceGroup) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

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

  const groupedCriteria: Record<ConfidenceGroup, CriterionConfidence[]> = {
    high: [],
    medium: [],
    low: [],
    manual: [],
  };

  criteria.forEach(c => {
    const group = getConfidenceGroup(c);
    groupedCriteria[group].push(c);
  });

  const applicableCriteria = criteria.filter(c => c.status !== 'not_applicable' && c.status !== 'not_tested');
  const overallConfidence = applicableCriteria.length > 0
    ? Math.round(applicableCriteria.reduce((acc, c) => acc + c.confidenceScore, 0) / applicableCriteria.length)
    : 0;

  const needsVerificationCount = criteria.filter(c => c.needsVerification).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const sectionOrder: ConfidenceGroup[] = ['high', 'medium', 'low', 'manual'];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
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
            {criteria.filter(c => c.status === 'pass').length} passed, {criteria.filter(c => c.status === 'fail').length} failed
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500 mb-1">Needs Verification</p>
          <p className="text-2xl font-semibold text-orange-600">{needsVerificationCount}</p>
          <p className="text-xs text-gray-500 mt-1">criteria require human review</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">Criterion Confidence Scores</h3>
              <p className="text-sm text-gray-500">Job ID: {jobId}</p>
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
          {sectionOrder.map((group) => {
            const items = groupedCriteria[group];
            if (items.length === 0) return null;

            const config = SECTION_CONFIG[group];
            const isExpanded = expandedSections.has(group);

            return (
              <div key={group}>
                <button
                  type="button"
                  onClick={() => toggleSection(group)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 transition-colors',
                    config.bgColor,
                    'hover:opacity-90'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn('w-3 h-3 rounded-full', config.dotColor)} />
                    <span className="font-medium text-gray-900">{config.label}</span>
                    <span className="text-sm text-gray-500">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  </span>
                  <ChevronDown 
                    className={cn(
                      'h-5 w-5 text-gray-500 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )} 
                  />
                </button>

                {isExpanded && (
                  <div className={cn('border-l-4', config.borderColor)}>
                    {items.map((criterion) => (
                      <CriterionRow
                        key={criterion.id}
                        criterion={criterion}
                        isExpanded={expandedRows.has(criterion.id)}
                        onToggle={() => toggleRow(criterion.id)}
                        onVerifyClick={onVerifyClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
