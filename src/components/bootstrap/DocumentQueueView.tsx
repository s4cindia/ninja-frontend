import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCorpusDocumentsWithPolling, useUploadTaggedPdf, useTriggerCorpusCalibrationRun } from '@/hooks/useCalibration';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { getCorpusDocumentStatus, resetCorpus } from '@/services/calibration.service';
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
          {Array.from({ length: 8 }, (_, j) => (
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

function AiAnnotationBadge({ ai }: { ai?: CorpusDocument['aiAnnotation'] }) {
  if (!ai) return <span className="text-xs text-gray-400">—</span>;

  if (ai.status === 'RUNNING') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <Loader2 className="w-3 h-3 animate-spin" />
        Running
      </span>
    );
  }

  if (ai.status === 'COMPLETED') {
    const total = ai.annotatedZones + ai.skippedZones;
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 cursor-default"
        title={`${ai.confirmedCount} confirmed, ${ai.correctedCount} corrected, ${ai.rejectedCount} rejected, ${ai.skippedZones} skipped`}
      >
        AI: {ai.annotatedZones}/{total}
      </span>
    );
  }

  if (ai.status === 'FAILED') {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        AI Failed
      </span>
    );
  }

  return <span className="text-xs text-gray-400">{ai.status}</span>;
}

function AnnotationStatusBadge({ progress }: { progress?: CorpusDocument['annotationProgress'] }) {
  if (!progress) return <span className="text-xs text-gray-400">—</span>;

  const { totalZones, annotatedZones, status } = progress;

  if (status === 'COMPLETED') {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Completed
      </span>
    );
  }

  if (status === 'IN_PROGRESS') {
    const pct = totalZones > 0 ? Math.min(100, Math.round((annotatedZones / totalZones) * 100)) : 0;
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Annotation progress: ${annotatedZones} of ${totalZones} zones`}
        >
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-blue-700 font-medium">{annotatedZones}/{totalZones}</span>
      </div>
    );
  }

  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Not Started
    </span>
  );
}

export default function DocumentQueueView() {
  const [publisherFilter, setPublisherFilter] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [uploadingIds, setUploadingIds] = useState<Record<string, boolean>>({});
  const [triggeringIds, setTriggeringIds] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [triggerError, setTriggerError] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data, isLoading, isError, error } = useCorpusDocumentsWithPolling();
  const uploadMutation = useUploadTaggedPdf();
  const triggerMutation = useTriggerCorpusCalibrationRun();

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

  const handleTaggedUpload = (docId: string, file?: File) => {
    if (!file) return;
    setUploadingIds((prev) => ({ ...prev, [docId]: true }));
    setUploadError((prev) => ({ ...prev, [docId]: '' }));
    uploadMutation.mutate(
      { documentId: docId, file },
      {
        onError: () => {
          setUploadError((prev) => ({
            ...prev,
            [docId]: 'Upload failed — check file and retry',
          }));
        },
        onSettled: () => {
          setUploadingIds((prev) => ({ ...prev, [docId]: false }));
        },
      }
    );
  };

  const handleReset = async () => {
    if (!window.confirm('Delete ALL corpus documents, calibration runs, and zones? This cannot be undone.')) return;
    setResetting(true);
    try {
      const result = await resetCorpus();
      alert(`Reset complete: ${result.deletedDocuments} docs, ${result.deletedCalibrationRuns} runs, ${result.deletedZones} zones deleted.`);
      window.location.reload();
    } catch {
      alert('Reset failed — check console for details.');
    } finally {
      setResetting(false);
    }
  };

  const handleTriggerRun = (docId: string) => {
    setTriggeringIds((prev) => ({ ...prev, [docId]: true }));
    setTriggerError((prev) => ({ ...prev, [docId]: '' }));
    triggerMutation.mutate(docId, {
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status !== 409) {
          setTriggerError((prev) => ({
            ...prev,
            [docId]: 'Failed to queue zone extraction. Please retry.',
          }));
        }
      },
      onSettled: () => {
        setTriggeringIds((prev) => ({ ...prev, [docId]: false }));
      },
    });
  };

  const renderActions = (doc: CorpusDocument) => {
    switch (doc.status ?? 'PENDING') {
      case 'PENDING':
        return null;
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
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {resetting ? 'Resetting...' : 'Reset Corpus'}
          </button>
          <button
            onClick={() => navigate('/calibration/corpus/summary')}
            className="px-4 py-1.5 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Corpus Summary
          </button>
        </div>
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
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-20 bg-gray-50 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-gray-200">Filename</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publisher</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pages</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annotation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI</th>
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
                    <tr key={doc.id} className="group hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs sticky left-0 z-10 bg-white group-hover:bg-gray-50 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-gray-200">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <AnnotationStatusBadge progress={doc.annotationProgress} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <AiAnnotationBadge ai={doc.aiAnnotation} />
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
                              disabled={!!uploadingIds[doc.id]}
                              className="border border-[#1B3A6B] text-[#1B3A6B] text-xs px-3 py-1 rounded hover:bg-[#E8F0F7] disabled:opacity-50 transition-colors"
                            >
                              {uploadingIds[doc.id] ? 'Uploading...' : 'Upload tagged PDF'}
                            </button>
                          )}
                          {opStatus === 'TAGGED' && (
                            <button
                              onClick={() => handleTriggerRun(doc.id)}
                              disabled={!!triggeringIds[doc.id]}
                              className="bg-[#1B3A6B] text-white text-xs px-3 py-1 rounded disabled:opacity-50 transition-colors"
                            >
                              {triggeringIds[doc.id] ? 'Queuing...' : 'Run zone extraction'}
                            </button>
                          )}
                          {opStatus === 'FAILED' && (
                            <button
                              onClick={() => handleTriggerRun(doc.id)}
                              disabled={!!triggeringIds[doc.id]}
                              className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {triggeringIds[doc.id] ? 'Queuing...' : 'Retry'}
                            </button>
                          )}
                          {opStatus === 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => navigate(`/bootstrap/review/${doc.id}`)}
                                className="bg-teal-600 text-white text-xs px-3 py-1 rounded hover:bg-teal-700 transition-colors"
                              >
                                Review Zones
                              </button>
                              {doc.calibrationRuns?.[0]?.id && (
                                <>
                                  <button
                                    onClick={() => navigate(`/bootstrap/lineage/${doc.calibrationRuns![0].id}`)}
                                    className="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                                  >
                                    Lineage
                                  </button>
                                  <button
                                    onClick={() => navigate(`/calibration/runs/${doc.calibrationRuns![0].id}/timesheet`)}
                                    className="border border-gray-300 text-gray-600 text-xs px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                                  >
                                    Timesheet
                                  </button>
                                  <button
                                    onClick={() => navigate(`/calibration/runs/${doc.calibrationRuns![0].id}/analysis`)}
                                    className="border border-purple-300 text-purple-600 text-xs px-3 py-1 rounded hover:bg-purple-50 transition-colors"
                                  >
                                    Analysis
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                        {uploadError[doc.id] && (
                          <p className="text-xs text-red-600 mt-1">{uploadError[doc.id]}</p>
                        )}
                        {triggerError[doc.id] && (
                          <p className="text-xs text-red-600 mt-1">{triggerError[doc.id]}</p>
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
