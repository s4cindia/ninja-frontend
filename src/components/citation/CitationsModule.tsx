import { useState } from 'react';
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
import { Wand2, AlertCircle } from 'lucide-react';
import type { Citation, CitationFilters } from '@/types/citation.types';

interface CitationsModuleProps {
  jobId: string;
}

export function CitationsModule({ jobId }: CitationsModuleProps) {
  const [filters, setFilters] = useState<CitationFilters>({ page: 1, limit: 20 });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const {
    data: citations,
    isLoading,
    isError,
    error
  } = useCitationsByJob(jobId, filters);

  const documentId = citations?.items[0]?.documentId || '';

  const {
    data: stats,
    isLoading: isLoadingStats
  } = useCitationStats(documentId);

  const parseMutation = useParseCitation();
  const parseAllMutation = useParseAllCitations();

  const handleParseAll = () => {
    if (documentId) {
      parseAllMutation.mutate({ documentId });
    }
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
          <Button
            onClick={handleParseAll}
            disabled={parseAllMutation.isPending || !documentId}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {parseAllMutation.isPending
              ? 'Parsing...'
              : `Parse All (${unparsedCount})`
            }
          </Button>
        )}
      </div>

      {parseAllMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Successfully parsed {parseAllMutation.data.parsed} citations.
          {parseAllMutation.data.failed > 0 && (
            <span className="ml-1">
              ({parseAllMutation.data.failed} failed)
            </span>
          )}
        </div>
      )}

      {parseAllMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Failed to parse citations. Please try again.
        </div>
      )}

      {stats && (
        <CitationStats stats={stats} isLoading={isLoadingStats} />
      )}

      <CitationTypeFilter filters={filters} onFilterChange={setFilters} />

      <CitationList
        citations={citations?.items || []}
        isLoading={isLoading}
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
