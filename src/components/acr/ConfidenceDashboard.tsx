import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

interface CriterionConfidence {
  id: string;
  criterionId: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidenceScore: number;
  status: 'pass' | 'fail' | 'not_applicable' | 'not_tested';
  needsVerification: boolean;
  remarks?: string;
}

interface ConfidenceDashboardProps {
  jobId: string;
  onVerifyClick?: (criterionId: string) => void;
}

const mockCriteria: CriterionConfidence[] = [
  { id: '1', criterionId: '1.1.1', name: 'Non-text Content', level: 'A', confidenceScore: 95, status: 'pass', needsVerification: false },
  { id: '2', criterionId: '1.2.1', name: 'Audio-only and Video-only', level: 'A', confidenceScore: 72, status: 'pass', needsVerification: true },
  { id: '3', criterionId: '1.3.1', name: 'Info and Relationships', level: 'A', confidenceScore: 88, status: 'pass', needsVerification: false },
  { id: '4', criterionId: '1.4.1', name: 'Use of Color', level: 'A', confidenceScore: 45, status: 'fail', needsVerification: true },
  { id: '5', criterionId: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', confidenceScore: 98, status: 'pass', needsVerification: false },
  { id: '6', criterionId: '2.1.1', name: 'Keyboard', level: 'A', confidenceScore: 60, status: 'pass', needsVerification: true },
  { id: '7', criterionId: '2.4.1', name: 'Bypass Blocks', level: 'A', confidenceScore: 0, status: 'not_applicable', needsVerification: false },
  { id: '8', criterionId: '2.4.4', name: 'Link Purpose', level: 'A', confidenceScore: 82, status: 'pass', needsVerification: false },
];

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

export function ConfidenceDashboard({ jobId, onVerifyClick }: ConfidenceDashboardProps) {
  const isLoading = false;
  const criteria = mockCriteria;

  const overallConfidence = criteria.length > 0
    ? Math.round(criteria.filter(c => c.status !== 'not_applicable').reduce((acc, c) => acc + c.confidenceScore, 0) / criteria.filter(c => c.status !== 'not_applicable').length)
    : 0;

  const needsVerificationCount = criteria.filter(c => c.needsVerification).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className={cn(
                'px-4 py-3 flex items-center gap-4',
                criterion.needsVerification && 'bg-orange-50'
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
                {criterion.remarks && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{criterion.remarks}</p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {criterion.status !== 'not_applicable' && (
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
                    onClick={() => onVerifyClick(criterion.criterionId)}
                  >
                    Verify
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
