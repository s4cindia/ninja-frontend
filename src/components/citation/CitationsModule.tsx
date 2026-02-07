import { useStylesheetDetection } from '@/hooks/useStylesheetDetection';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CitationEditorLayout } from './CitationEditorLayout';
import {
  AlertCircle,
  FileQuestion,
} from 'lucide-react';

interface CitationsModuleProps {
  jobId: string;
  documentId?: string;
}

function resolveTextLookupId(documentId?: string, jobId?: string): string {
  return documentId || jobId || '';
}

const SKELETON_ROWS = 8;

export function CitationsModule({ jobId, documentId }: CitationsModuleProps): JSX.Element {
  const lookupId = resolveTextLookupId(documentId, jobId);
  const hasLookupId = !!lookupId;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useStylesheetDetection(documentId || jobId || '');

  if (!hasLookupId) {
    return (
      <div className="p-6 text-center">
        <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Document not ready
        </h2>
        <p className="text-sm text-gray-500">
          The document ID could not be resolved. The job may still be processing.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load stylesheet analysis
        </h2>
        <p className="text-sm text-gray-500">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        className="flex flex-col h-[calc(100vh-120px)] min-h-[600px]"
        role="status"
        aria-label="Loading citation editor"
        aria-busy="true"
      >
        <div className="flex-shrink-0 h-10 bg-gray-700 rounded-t-lg animate-pulse" aria-hidden="true" />
        <div className="flex-1 flex border border-t-0 border-gray-300 rounded-b-lg overflow-hidden">
          <div className="flex-1 bg-gray-900 p-4 space-y-2">
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-4 bg-gray-700 rounded" />
                <div className="h-4 bg-gray-700 rounded" style={{ width: `${40 + Math.random() * 50}%` }} />
              </div>
            ))}
          </div>
          <div className="w-96 bg-white p-4 border-l border-gray-300 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i} className="p-3 animate-pulse" aria-hidden="true">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-200 rounded" />
              </Card>
            ))}
          </div>
        </div>
        <span className="sr-only">Loading citation editor, please wait...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CitationEditorLayout data={data} textLookupId={lookupId} />
    </ErrorBoundary>
  );
}
