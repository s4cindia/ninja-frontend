import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, CheckCircle, BookOpen, ArrowLeft, Loader2, AlertTriangle, Info } from 'lucide-react';
import { CitationsModule } from '@/components/citation';
import { ValidationPanel } from '@/components/citation/validation/ValidationPanel';
import { ReferenceListGenerator } from '@/components/citation/reference-list/ReferenceListGenerator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useJob } from '@/hooks/useJobs';
import type { DetectionValidationResult } from '@/types/citation.types';

type Tab = 'citations' | 'validation' | 'references';

export function CitationsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('citations');

  const { data: job, isLoading: jobLoading } = useJob(jobId || null);

  if (!jobId) {
    return <CitationsJobListPlaceholder />;
  }

  const tabs = [
    { id: 'citations', label: 'Detected Citations', icon: FileText },
    { id: 'validation', label: 'Style Validation', icon: CheckCircle },
    { id: 'references', label: 'Reference List', icon: BookOpen },
  ] as const;

  const jobOutput = job?.output as Record<string, unknown> | undefined;
  const jobInput = job?.input as Record<string, unknown> | undefined;
  const documentId = (jobOutput?.documentId as string) || '';
  const filename = (jobInput?.filename as string) || (jobInput?.fileName as string) || (jobInput?.originalName as string);
  const inlineValidation = jobOutput?.validation as DetectionValidationResult | undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/jobs"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Citation Management</h1>
        {filename && (
          <p className="text-sm text-gray-600 mt-1">{filename}</p>
        )}
      </div>

      {inlineValidation && activeTab === 'citations' && (
        <ValidationSummaryBanner
          validation={inlineValidation}
          onViewDetails={() => setActiveTab('validation')}
        />
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-4" role="tablist" aria-label="Citation workflow tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              {tab.id === 'validation' && inlineValidation && inlineValidation.errorCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {inlineValidation.errorCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        <div
          role="tabpanel"
          id="citations-panel"
          className={activeTab === 'citations' ? '' : 'hidden'}
          aria-hidden={activeTab !== 'citations'}
        >
          {jobLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading citations...</p>
            </Card>
          ) : (
            <CitationsModule jobId={jobId} documentId={documentId} />
          )}
        </div>

        <div
          role="tabpanel"
          id="validation-panel"
          className={activeTab === 'validation' ? '' : 'hidden'}
          aria-hidden={activeTab !== 'validation'}
        >
          {documentId ? (
            <ValidationPanel documentId={documentId} />
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
              <p className="text-gray-500">Please wait while we load the document.</p>
            </Card>
          )}
        </div>

        <div
          role="tabpanel"
          id="references-panel"
          className={activeTab === 'references' ? '' : 'hidden'}
          aria-hidden={activeTab !== 'references'}
        >
          {documentId ? (
            <ReferenceListGenerator documentId={documentId} />
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
              <p className="text-gray-500">Please wait while we load the document.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ValidationSummaryBanner({
  validation,
  onViewDetails,
}: {
  validation: DetectionValidationResult;
  onViewDetails: () => void;
}) {
  const hasErrors = validation.errorCount > 0;
  const hasWarnings = validation.warningCount > 0;

  if (!hasErrors && !hasWarnings) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between" role="status">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
          <span className="text-sm text-green-800">
            All {validation.totalCitations} citations pass {validation.styleName} validation
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewDetails}>
          View Details
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${
      hasErrors ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }`} role="alert">
      <div className="flex items-center gap-3">
        {hasErrors ? (
          <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
        ) : (
          <Info className="h-5 w-5 text-yellow-600" aria-hidden="true" />
        )}
        <div className="text-sm">
          <span className={hasErrors ? 'text-red-800' : 'text-yellow-800'}>
            {validation.styleName} validation:
          </span>
          <span className="ml-2 text-gray-700">
            {validation.validCitations}/{validation.totalCitations} valid
            {hasErrors && (
              <span className="text-red-700 ml-1">
                ({validation.errorCount} error{validation.errorCount !== 1 ? 's' : ''})
              </span>
            )}
            {hasWarnings && (
              <span className="text-yellow-700 ml-1">
                ({validation.warningCount} warning{validation.warningCount !== 1 ? 's' : ''})
              </span>
            )}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onViewDetails}>
        View Details
      </Button>
    </div>
  );
}

function CitationsJobListPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500 text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Citation Management</h2>
            <p className="text-sm text-gray-500">Detection, validation, and reference list generation</p>
          </div>
        </div>
        <Link
          to="/jobs"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Jobs
        </Link>
      </div>
      <div className="bg-white rounded-lg border p-6 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a citation job from the Jobs page to get started.</p>
        <p className="text-sm text-gray-400 mt-1">
          Citation jobs will appear here with full management features.
        </p>
        <Link
          to="/jobs"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Jobs
        </Link>
      </div>
    </div>
  );
}

export default CitationsPage;
