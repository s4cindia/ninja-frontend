import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCorpusDocumentsWithPolling, useStartCalibration, CALIBRATION_KEYS } from '@/hooks/useCalibration';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import {
  uploadTaggedPdf,
  triggerCorpusCalibrationRun,
  getCorpusDocumentStatus,
} from '@/services/calibration.service';
import type { CorpusDocument, CorpusDocumentStatus } from '@/services/calibration.service';

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'table-heavy', label: 'Table Heavy' },
  { value: 'figure-heavy', label: 'Figure Heavy' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'text-dominant', label: 'Text Dominant' },
];

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }, (_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const OPERATOR_STATUS_CONFIG: Record<CorpusDocumentStatus, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',  bg: 'bg-gray-100',   text: 'text-gray-600' },
  TAGGED:    { label: 'Tagged',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  QUEUED:    { label: 'Queued',   bg: 'bg-[#FFF8E8]',  text: 'text-[#C8860A]' },
  COMPLETED: { label: 'Complete', bg: 'bg-[#E8F5EE]',  text: 'text-[#1A7A3C]' },
  FAILED:    { label: 'Failed',   bg: 'bg-red-100',    text: 'text-red-700' },
};

function OperatorStatusBadge({ status }: { status: CorpusDocumentStatus }) {
  const config = OPERATOR_STATUS_CONFIG[status];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function DocumentQueueView() {
  const [publisherFilter, setPublisherFilter] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data, isLoading, isError, error } = useCorpusDocumentsWithPolling();
  const startMutation = useStartCalibration();

  const documents = useMemo(() => data?.documents ?? [], [data]);

  const publishers = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.publisher) set.add(d.publisher);
    });
    return Array.from(set).sort();
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (publisherFilter && d.publisher !== publisherFilter) return false;
      if (contentTypeFilter && d.contentType !== contentTypeFilter) return false;
      return true;
    });
  }, [documents, publisherFilter, contentTypeFilter]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      needsReview: filtered.filter((d) => d.status === 'NEEDS_REVIEW').length,
      complete: filtered.filter((d) => d.status === 'COMPLETE').length,
    };
  }, [filtered]);

  const handleStartCalibration = (doc: CorpusDocument) => {
    startMutation.mutate({ documentId: doc.id, fileId: doc.id });
  };

  const refreshDocuments = () =>
    queryClient.invalidateQueries({ queryKey: CALIBRATION_KEYS.documents() });

  const handleTaggedUpload = async (docId: string, file?: File) => {
    if (!file) return;
    setUploadingId(docId);
    setUploadError((prev) => ({ ...prev, [docId]: '' }));
    try {
      await uploadTaggedPdf(docId, file);
      await refreshDocuments();
    } catch {
      setUploadError((prev) => ({
        ...prev,
        [docId]: 'Upload failed — check file and retry',
      }));
    } finally {
      setUploadingId(null);
    }
  };

  const handleTriggerRun = async (docId: string) => {
    setTriggeringId(docId);
    try {
      await triggerCorpusCalibrationRun(docId);
      await refreshDocuments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        await refreshDocuments();
      }
    } finally {
      setTriggeringId(null);
    }
  };

  const renderActions = (doc: CorpusDocument) => {
    switch (doc.status ?? 'PENDING') {
      case 'PENDING':
        return (
          <button
            onClick={() => handleStartCalibration(doc)}
            disabled={startMutation.isPending}
            aria-label={`Start calibration for ${doc.filename}`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {startMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              'Start Calibration'
            )}
          </button>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Processing...
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <button
            onClick={() => navigate(`/bootstrap/review/${doc.id}`)}
            aria-label={`Review ${doc.filename}`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            Review
          </button>
        );
      case 'COMPLETE':
        return <span className="text-xs font-medium text-green-700">Done</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calibration Document Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and annotate documents for ML zone detection training
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-4">
        <select
          value={publisherFilter}
          onChange={(e) => setPublisherFilter(e.target.value)}
          aria-label="Filter by publisher"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Publishers</option>
          {publishers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          aria-label="Filter by content type"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Documents</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Needs Review</p>
            <p className="mt-1 text-2xl font-semibold text-orange-700">{stats.needsReview}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Complete</p>
            <p className="mt-1 text-2xl font-semibold text-green-700">{stats.complete}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Failed to load documents'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm font-medium text-gray-500">No documents in queue</p>
          <p className="mt-1 text-xs text-gray-400">
            Documents will appear here once the corpus is loaded by the Ninja team.
          </p>
        </div>
      )}

      {/* Documents table */}
      {(isLoading || filtered.length > 0) && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publisher</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pages</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <SkeletonRows />
              ) : (
                filtered.map((doc) => {
                  const opStatus = getCorpusDocumentStatus(doc);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.publisher ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.contentType ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.pageCount ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DocumentStatusBadge status={doc.status ?? 'PENDING'} />
                          <OperatorStatusBadge status={opStatus} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderActions(doc)}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                            onChange={(e) => handleTaggedUpload(doc.id, e.target.files?.[0] ?? undefined)}
                          />
                          {(opStatus === 'PENDING' || opStatus === 'TAGGED') && (
                            <button
                              onClick={() => fileInputRefs.current[doc.id]?.click()}
                              disabled={uploadingId === doc.id}
                              className="border border-[#1B3A6B] text-[#1B3A6B] text-xs px-3 py-1 rounded hover:bg-[#E8F0F7] disabled:opacity-50 transition-colors"
                            >
                              {uploadingId === doc.id ? 'Uploading...' : 'Upload tagged PDF'}
                            </button>
                          )}
                          {opStatus === 'TAGGED' && (
                            <button
                              onClick={() => handleTriggerRun(doc.id)}
                              disabled={triggeringId === doc.id}
                              className="bg-[#1B3A6B] text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
                            >
                              {triggeringId === doc.id ? 'Queuing...' : 'Run zone extraction'}
                            </button>
                          )}
                        </div>
                        {uploadError[doc.id] && (
                          <p className="text-xs text-red-600 mt-1">{uploadError[doc.id]}</p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
