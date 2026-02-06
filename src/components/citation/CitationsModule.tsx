import { useState, useRef, useEffect, useCallback } from 'react';
import { CitationList } from './CitationList';
import { CitationDetail } from './CitationDetail';
import { CitationStats } from './CitationStats';
import { CitationTypeFilter } from './CitationTypeFilter';
import { StyleSelector } from './validation/StyleSelector';
import { ValidationSummary } from './validation/ValidationSummary';
import { ViolationCard } from './validation/ViolationCard';
import { BatchCorrectionModal } from './correction/BatchCorrectionModal';
import {
  useCitationsByJob,
  useCitationStats,
  useParseCitation,
  useParseAllCitations
} from '@/hooks/useCitation';
import {
  useCitationStyles,
  useValidateDocument,
  useValidations,
  useAcceptValidation,
  useRejectValidation,
  useEditValidation,
  useBatchCorrect
} from '@/hooks/useCitationValidation';
import { useJob } from '@/hooks/useJobs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Wand2, AlertCircle, X, Quote, StopCircle, FileText, FileCheck, Loader2, Layers } from 'lucide-react';
import type { Citation, CitationFilters } from '@/types/citation.types';
import type { ValidationResult } from '@/types/citation-validation.types';

interface CitationsModuleProps {
  jobId: string;
  documentId?: string;
}

const AUTO_DISMISS_DELAY = 5000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 20;
const SKELETON_STATS_COUNT = 4;
const SKELETON_ITEMS_COUNT = 3;

export function CitationsModule({ jobId, documentId: propDocumentId }: CitationsModuleProps): JSX.Element {
  const [filters, setFilters] = useState<CitationFilters>({ page: DEFAULT_PAGE, limit: DEFAULT_PAGE_LIMIT });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('apa7');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    data: citations,
    isLoading,
    isError,
    error
  } = useCitationsByJob(jobId, filters);

  const { data: job } = useJob(jobId);

  const documentId = propDocumentId || citations?.documentId;
  const isEmpty = !citations?.items || citations.items.length === 0;
  
  const filename = citations?.filename || 
    (job?.input?.filename as string | undefined) ||
    (job?.input?.fileName as string | undefined) ||
    (job?.input?.originalName as string | undefined);

  const {
    data: stats,
    isLoading: isLoadingStats
  } = useCitationStats(documentId ?? '');

  const parseMutation = useParseCitation();
  const parseAllMutation = useParseAllCitations();

  const { data: styles = [] } = useCitationStyles();
  const { data: validations = [] } = useValidations(documentId ?? '');
  const validateMutation = useValidateDocument();
  const acceptMutation = useAcceptValidation();
  const rejectMutation = useRejectValidation();
  const editMutation = useEditValidation();
  const batchMutation = useBatchCorrect();

  const pendingViolations = validations.filter(v => v.status === 'pending');
  const resolvedViolations = validations.filter(v => v.status !== 'pending');

  useEffect(() => {
    if (parseAllMutation.isSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => setShowSuccessMessage(false), AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessMessage(false);
    }
  }, [parseAllMutation.isSuccess, parseAllMutation.data?.parsed]);

  useEffect(() => {
    if (parseAllMutation.isError) {
      const error = parseAllMutation.error;
      const isAbortError = 
        error?.name === 'AbortError' || 
        error?.message?.includes('aborted') ||
        (error instanceof DOMException && error.name === 'AbortError');
      
      if (isAbortError) {
        setShowErrorMessage(false);
        return;
      }
      
      setShowErrorMessage(true);
      const timer = setTimeout(() => setShowErrorMessage(false), AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    } else {
      setShowErrorMessage(false);
    }
  }, [parseAllMutation.isError, parseAllMutation.error]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleParseAll = useCallback(() => {
    if (documentId && !isEmpty) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      parseAllMutation.mutate({ 
        documentId,
        ...(abortControllerRef.current && { signal: abortControllerRef.current.signal })
      });
    }
  }, [documentId, isEmpty, parseAllMutation]);

  const handleCancelParseAll = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const handleValidate = async () => {
    if (!documentId) return;
    const result = await validateMutation.mutateAsync({
      documentId,
      request: { styleCode: selectedStyle }
    });
    setValidationResult(result);
  };

  const unparsedCount = stats?.unparsed || 0;

  if (isError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load citations
        </h2>
        <p className="text-sm text-gray-500">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="space-y-6" 
        role="status" 
        aria-label="Loading citation analysis"
        aria-busy="true"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_STATS_COUNT }, (_, i) => (
            <Card key={i} className="p-4 animate-pulse" aria-hidden="true">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: SKELETON_ITEMS_COUNT }, (_, i) => (
            <Card key={i} className="p-4 animate-pulse" aria-hidden="true">
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-200 rounded" />
              </div>
            </Card>
          ))}
        </div>
        <span className="sr-only">Loading citation analysis, please wait...</span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Citation Analysis
          </h2>
          <p className="text-sm text-gray-500">
            Detected citations and style validation
          </p>
        </div>
        <Card className="p-8 text-center">
          <Quote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No citations found
          </h3>
          <p className="text-sm text-gray-500">
            No citations have been detected for this job yet.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Citation Analysis
          </h2>
          <p className="text-sm text-gray-500">
            Detected citations and style validation
          </p>
          {filename && (
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>{filename}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unparsedCount > 0 && (
            parseAllMutation.isPending ? (
              <Button
                variant="outline"
                onClick={handleCancelParseAll}
                aria-label="Cancel parsing citations"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                onClick={handleParseAll}
                disabled={!documentId}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Parse All ({unparsedCount})
              </Button>
            )
          )}
        </div>
      </div>

      {showSuccessMessage && parseAllMutation.data && (
        <div 
          className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between"
          role="alert"
        >
          <span>{parseAllMutation.data.message}</span>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="p-1 hover:bg-green-100 rounded"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showErrorMessage && parseAllMutation.isError && (
        <div 
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center justify-between"
          role="alert"
        >
          <span>Failed to parse citations. Please try again.</span>
          <button
            onClick={() => setShowErrorMessage(false)}
            className="p-1 hover:bg-red-100 rounded"
            aria-label="Dismiss error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ErrorBoundary>
        {stats && (
          <CitationStats stats={stats} isLoading={isLoadingStats} />
        )}

        <CitationTypeFilter filters={filters} onFilterChange={setFilters} />

        <CitationList
          citations={citations?.items || []}
          isLoading={false}
          onParse={(id) => parseMutation.mutate(id)}
          onViewDetail={setSelectedCitation}
          isParsing={parseMutation.isPending ? parseMutation.variables : null}
        />

        {citations && citations.totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-500">
              Page {citations.page} of {citations.totalPages}
              <span className="ml-1">({citations.total} total citations)</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={citations.page <= DEFAULT_PAGE}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || DEFAULT_PAGE) - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={citations.page >= citations.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: (f.page || DEFAULT_PAGE) + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {documentId && (
          <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Style Validation</h3>
                <p className="text-sm text-gray-500">
                  Check citations against style guide rules
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StyleSelector
                  styles={styles}
                  selected={selectedStyle}
                  onChange={setSelectedStyle}
                  disabled={validateMutation.isPending}
                />
                <Button
                  onClick={handleValidate}
                  disabled={validateMutation.isPending}
                >
                  {validateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                      Validate
                    </>
                  )}
                </Button>
              </div>
            </div>

            {validationResult && (
              <ValidationSummary data={validationResult.summary} />
            )}

            {pendingViolations.length > 1 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBatchModal(true)}
                >
                  <Layers className="h-4 w-4 mr-2" aria-hidden="true" />
                  Batch Correct ({pendingViolations.length})
                </Button>
              </div>
            )}

            {pendingViolations.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Issues to Review ({pendingViolations.length})
                </h4>
                <div className="space-y-3">
                  {pendingViolations.map((violation) => (
                    <ViolationCard
                      key={violation.id}
                      violation={violation}
                      onAccept={() => acceptMutation.mutate(violation.id)}
                      onReject={() => rejectMutation.mutate({ validationId: violation.id })}
                      onEdit={(text) => editMutation.mutate({ validationId: violation.id, correctedText: text })}
                      isLoading={acceptMutation.isPending || rejectMutation.isPending || editMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {resolvedViolations.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-500 mb-3">
                  Resolved ({resolvedViolations.length})
                </h4>
                <div className="space-y-3">
                  {resolvedViolations.map((violation) => (
                    <ViolationCard
                      key={violation.id}
                      violation={violation}
                      onAccept={() => {}}
                      onReject={() => {}}
                      onEdit={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {!validationResult && validations.length === 0 && (
              <Card className="p-6 text-center">
                <FileCheck className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 text-sm">
                  Select a citation style and click "Validate" to check your citations against style guide rules.
                </p>
              </Card>
            )}

            <BatchCorrectionModal
              isOpen={showBatchModal}
              onClose={() => setShowBatchModal(false)}
              violations={pendingViolations}
              onApplyByType={async (violationType) => {
                await batchMutation.mutateAsync({ documentId, violationType, applyAll: true });
              }}
            />
          </div>
        )}

        {selectedCitation && (
          <CitationDetail
            citation={selectedCitation}
            onClose={() => setSelectedCitation(null)}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
