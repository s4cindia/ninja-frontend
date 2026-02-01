import { useState, useRef, useEffect, useCallback } from 'react';
import { CitationList } from './CitationList';
import { CitationDetail } from './CitationDetail';
import { CitationStats } from './CitationStats';
import { CitationTypeFilter } from './CitationTypeFilter';
import {
  useCitationsByJob,
  useCitationStats,
  useParseCitation,
  useParseAllCitations
} from '@/hooks/useCitation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Wand2, AlertCircle, X, Quote, StopCircle } from 'lucide-react';
import type { Citation, CitationFilters } from '@/types/citation.types';

interface CitationsModuleProps {
  jobId: string;
}

const AUTO_DISMISS_DELAY = 5000;

export function CitationsModule({ jobId }: CitationsModuleProps) {
  const [filters, setFilters] = useState<CitationFilters>({ page: 1, limit: 20 });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    data: citations,
    isLoading,
    isError,
    error
  } = useCitationsByJob(jobId, filters);

  const documentId = citations?.items[0]?.documentId;
  const isEmpty = !citations?.items || citations.items.length === 0;

  const {
    data: stats,
    isLoading: isLoadingStats
  } = useCitationStats(documentId || '');

  const parseMutation = useParseCitation();
  const parseAllMutation = useParseAllCitations();

  useEffect(() => {
    if (parseAllMutation.isSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => setShowSuccessMessage(false), AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [parseAllMutation.isSuccess]);

  useEffect(() => {
    if (parseAllMutation.isError) {
      setShowErrorMessage(true);
      const timer = setTimeout(() => setShowErrorMessage(false), AUTO_DISMISS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [parseAllMutation.isError]);

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
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse" aria-hidden="true">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
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
            Detected citations and parsed components
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Citation Analysis
          </h2>
          <p className="text-sm text-gray-500">
            Detected citations and parsed components
          </p>
        </div>

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

      {showSuccessMessage && parseAllMutation.data && (
        <div 
          className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between"
          role="alert"
        >
          <span>
            Successfully parsed {parseAllMutation.data.parsed} citations.
            {parseAllMutation.data.failed > 0 && (
              <span className="ml-1">
                ({parseAllMutation.data.failed} failed)
              </span>
            )}
          </span>
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
              disabled={citations.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={citations.page >= citations.totalPages}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedCitation && (
        <CitationDetail
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
