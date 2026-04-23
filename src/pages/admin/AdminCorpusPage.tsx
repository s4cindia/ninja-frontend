import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Upload, Database, RefreshCw, Loader2, Trash2, Sparkles, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuthStore } from '@/stores/auth.store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/Dialog';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
import {
  getUploadUrl,
  registerCorpusDocument,
  listCorpusDocuments,
  triggerCalibrationRun,
  resetCorpus,
  resetCorpusDocuments,
} from '@/services/adminApi';
import { runBulkAiAnnotation, exportTrainingData } from '@/services/zone-correction.service';
import type { CorpusDocument } from '@/services/adminApi';

const CONTENT_TYPE_OPTIONS = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'table-heavy', label: 'Table Heavy' },
  { value: 'figure-heavy', label: 'Figure Heavy' },
  { value: 'text-dominant', label: 'Text Dominant' },
];

const CONTENT_TYPE_BADGE: Record<string, string> = {
  mixed: 'bg-blue-100 text-blue-700',
  'figure-heavy': 'bg-purple-100 text-purple-700',
  'table-heavy': 'bg-amber-100 text-amber-700',
  'text-dominant': 'bg-green-100 text-green-700',
};

function RunStatusBadge({ status }: { status: string | undefined }) {
  if (!status) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
        Not started
      </span>
    );
  }
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
          Completed
        </span>
      );
    case 'FAILED':
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
          Failed
        </span>
      );
    case 'QUEUED':
    case 'RUNNING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
          {status === 'RUNNING' && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {status}
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
          {status}
        </span>
      );
  }
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function compactPageRanges(pages: number[]): string {
  if (!pages.length) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = n;
    prev = n;
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(', ');
}

function EmptyPagesIndicator({
  emptyPages,
  totalPages,
  onClick,
}: {
  emptyPages: number | undefined;
  totalPages: number | undefined;
  onClick: () => void;
}) {
  if (emptyPages == null || !totalPages) {
    return <span className="text-sm text-gray-400">—</span>;
  }
  if (emptyPages === 0) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
        0
      </span>
    );
  }
  const pct = Math.round((emptyPages / totalPages) * 100);
  const tone =
    pct >= 25
      ? 'bg-red-100 text-red-700 hover:bg-red-200'
      : pct >= 10
      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${tone}`}
      title={`${emptyPages} of ${totalPages} pages have no detected zones (${pct}%) — click for details`}
    >
      {emptyPages} ({pct}%)
    </button>
  );
}

function EmptyPagesModal({
  doc,
  onClose,
}: {
  doc: CorpusDocument | null;
  onClose: () => void;
}) {
  const summary = doc?.calibrationRuns?.[0]?.summary;
  const emptyPages = summary?.emptyPages;
  const emptyPageCount = summary?.emptyPageCount ?? emptyPages?.length ?? 0;
  const totalPages = doc?.pageCount;
  const pct =
    totalPages && totalPages > 0
      ? Math.round((emptyPageCount / totalPages) * 100)
      : 0;

  return (
    <Dialog open={doc !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle>Empty pages — {doc?.filename ?? ''}</DialogTitle>
          <DialogDescription>
            {emptyPageCount} of {totalPages ?? '?'} pages ({pct}%) had no zones
            detected by the calibration run.
          </DialogDescription>
        </DialogHeader>
        <DialogClose />
        <div className="mt-4">
          {emptyPages && emptyPages.length > 0 ? (
            <>
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                Page numbers
              </div>
              <div className="max-h-80 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 text-sm font-mono text-gray-800 break-words">
                {compactPageRanges(emptyPages)}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Spot-check the PDF at these pages to distinguish legitimately
                empty content (front matter, blank dividers, image plates) from
                detection failures that warrant a re-run.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              The backend did not return a page list for this run. Ask the
              calibration service to include <code>summary.emptyPages</code>.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCorpusPage() {
  const { user } = useAuthStore();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [publisher, setPublisher] = useState('');
  const [contentType, setContentType] = useState('mixed');
  const [pageCount, setPageCount] = useState('');
  const [countingPages, setCountingPages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Document list state
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [filterPublisher, setFilterPublisher] = useState('');
  const [filterContentType, setFilterContentType] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resettingSelected, setResettingSelected] = useState(false);
  const [bulkAnnotating, setBulkAnnotating] = useState(false);
  const [bulkAnnotateResult, setBulkAnnotateResult] = useState<string | null>(null);
  const [exportingTraining, setExportingTraining] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [emptyPagesModalDoc, setEmptyPagesModalDoc] =
    useState<CorpusDocument | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCorpusDocuments({
        publisher: filterPublisher || undefined,
        contentType: filterContentType || undefined,
      });
      setDocuments(result.documents);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [filterPublisher, filterContentType]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDocuments();
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Delete ALL corpus documents, calibration runs, and zones? This cannot be undone.')) return;
    setResetting(true);
    try {
      const result = await resetCorpus();
      alert(`Reset complete: ${result.deletedDocuments} docs, ${result.deletedCalibrationRuns} runs, ${result.deletedZones} zones deleted.`);
      await loadDocuments();
    } catch {
      alert('Reset failed — check console for details.');
    } finally {
      setResetting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleResetSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected document(s) and all their calibration data? This cannot be undone.`)) return;
    setResettingSelected(true);
    try {
      const result = await resetCorpusDocuments(Array.from(selectedIds));
      alert(`Reset complete: ${result.deletedDocuments} docs, ${result.deletedCalibrationRuns} runs, ${result.deletedZones} zones deleted.`);
      setSelectedIds(new Set());
      await loadDocuments();
    } catch {
      alert('Reset failed — check console for details.');
    } finally {
      setResettingSelected(false);
    }
  };

  const handleBulkAiAnnotate = async () => {
    if (selectedIds.size === 0) return;
    const dryRun = !window.confirm(
      `AI annotate ${selectedIds.size} document(s)?\n\nOK = Auto-apply (>= 0.95 confidence)\nCancel = Abort`,
    );
    if (dryRun) return;
    setBulkAnnotating(true);
    setBulkAnnotateResult(null);
    try {
      const result = await runBulkAiAnnotation({
        documentIds: Array.from(selectedIds),
        confidenceThreshold: 0.95,
        dryRun: false,
      });
      setBulkAnnotateResult(
        `Annotated ${result.completedRuns} documents: ${result.totalAnnotated} zones, $${result.totalCostUsd.toFixed(3)} cost`,
      );
      setTimeout(() => setBulkAnnotateResult(null), 8000);
    } catch {
      alert('Bulk AI annotation failed — check console for details.');
    } finally {
      setBulkAnnotating(false);
    }
  };

  const handleExportTraining = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    const label = ids ? `${ids.length} selected documents` : 'all documents';
    if (!window.confirm(`Export training data for ${label}?`)) return;
    setExportingTraining(true);
    setExportResult(null);
    try {
      const result = await exportTrainingData({
        documentIds: ids,
        minConfidence: 0.95,
        includeAiOnly: true,
      });
      const s = result.stats;
      setExportResult(
        `Ready: ${s.totalDocuments} docs, ${s.totalZones} zones (${s.zonesWithHumanLabel} human, ${s.zonesWithAiLabel} AI)`,
      );
      setTimeout(() => setExportResult(null), 10000);
    } catch {
      alert('Export failed — check console for details.');
    } finally {
      setExportingTraining(false);
    }
  };

  const handlePublisherFilter = (value: string) => {
    setFilterPublisher(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadDocuments();
    }, 300);
  };

  // Three-step upload flow
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      // Step 1: Get presigned URL
      setUploadStep('Requesting upload URL…');
      const { uploadUrl, s3Path } = await getUploadUrl(file.name);

      // Step 2: Upload to S3
      setUploadStep('Uploading file to storage…');
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });
      if (!s3Res.ok) {
        throw new Error(`S3 upload failed (${s3Res.status})`);
      }

      // Step 3: Register document
      setUploadStep('Registering document…');
      await registerCorpusDocument({
        filename: file.name,
        s3Path,
        publisher: publisher || undefined,
        contentType,
        pageCount: pageCount ? Number(pageCount) : undefined,
      });

      setUploadSuccess(`${file.name} registered successfully`);
      setFile(null);
      setPublisher('');
      setContentType('mixed');
      setPageCount('');
      await loadDocuments();
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed'
      );
    } finally {
      setUploading(false);
      setUploadStep(null);
    }
  };

  const handleRunExtraction = async (doc: CorpusDocument) => {
    if (!doc.taggedPdfPath) {
      const confirmed = window.confirm(
        'No tagged PDF has been uploaded for this document.\n\n' +
        'Running without a tagged PDF will run Docling-only and will NOT produce ' +
        'GREEN/AMBER/RED comparison data.\n\n' +
        'This run cannot contribute to Phase Gate scores (C1 mAP or C2 zone counts).' +
        '\n\nContinue anyway?'
      );
      if (!confirmed) return;
    }
    setRunningIds((prev) => new Set(prev).add(doc.id));
    try {
      await triggerCalibrationRun(doc.id);
      await loadDocuments();
    } catch {
      // silently handle
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const selectFile = async (f: File | null) => {
    setFile(f);
    setPageCount('');
    if (!f) return;
    setCountingPages(true);
    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(String(pdf.numPages));
    } catch {
      // silently fail — user can still enter manually
    } finally {
      setCountingPages(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      selectFile(dropped);
    }
  };

  // Client-side filtering
  const filteredDocuments = documents.filter((doc) => {
    if (filterPublisher && !doc.publisher?.toLowerCase().includes(filterPublisher.toLowerCase())) {
      return false;
    }
    if (filterContentType && doc.contentType !== filterContentType) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Corpus Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload PDFs and trigger zone extraction for ML training corpus
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Upload Document
        </h2>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
        >
          {file ? (
            <p className="text-sm text-gray-700">
              Selected: <span className="font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => selectFile(null)}
                className="ml-2 text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                Drag and drop a PDF here, or{' '}
                <label className="text-[#006B6B] font-medium cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-400">PDF files only</p>
            </div>
          )}
        </div>

        {/* Metadata grid — 2 columns */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Publisher
              <span className="text-gray-400 font-normal ml-1">(auto-detected from PDF if blank)</span>
            </label>
            <input
              type="text"
              list="publisher-options"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Leave blank to auto-detect from PDF metadata"
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="publisher-options">
              {[...new Set(documents.map(d => d.publisher).filter(Boolean))].sort().map(p => (
                <option key={p} value={p!} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Page Count
            </label>
            <div className="relative">
              <input
                type="number"
                value={pageCount}
                readOnly
                placeholder={countingPages ? 'Counting…' : 'Auto-detected'}
                min={1}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm bg-gray-50 text-gray-700"
              />
              {countingPages && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Upload button + step status */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-[#006B6B] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#005858] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading…' : 'Upload & Register'}
          </button>
          {uploadStep && (
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {uploadStep}
            </span>
          )}
        </div>

        {/* Alerts */}
        {uploadError && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            {uploadSuccess}
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Corpus Documents
          </h2>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleBulkAiAnnotate}
                  disabled={bulkAnnotating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-purple-300 rounded text-purple-600 hover:bg-purple-50 disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {bulkAnnotating ? 'Annotating...' : `AI Annotate (${selectedIds.size})`}
                </button>
                <button
                  onClick={handleResetSelected}
                  disabled={resettingSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-300 rounded text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {resettingSelected ? 'Resetting...' : `Reset Selected (${selectedIds.size})`}
                </button>
              </>
            )}
            <button
              onClick={handleExportTraining}
              disabled={exportingTraining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-teal-300 rounded text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingTraining ? 'Exporting...' : 'Export for Training'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-300 rounded text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {resetting ? 'Resetting...' : 'Reset Corpus'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Result banners */}
        {bulkAnnotateResult && (
          <div className="mb-3 px-3 py-2 rounded bg-purple-50 border border-purple-200 text-sm text-purple-800 flex items-center justify-between">
            <span><Sparkles className="h-3.5 w-3.5 inline mr-1" />{bulkAnnotateResult}</span>
            <button onClick={() => setBulkAnnotateResult(null)} className="text-purple-600 hover:text-purple-800">&times;</button>
          </div>
        )}
        {exportResult && (
          <div className="mb-3 px-3 py-2 rounded bg-teal-50 border border-teal-200 text-sm text-teal-800 flex items-center justify-between">
            <span><Download className="h-3.5 w-3.5 inline mr-1" />{exportResult}</span>
            <button onClick={() => setExportResult(null)} className="text-teal-600 hover:text-teal-800">&times;</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={filterPublisher}
            onChange={(e) => handlePublisherFilter(e.target.value)}
            placeholder="Filter by publisher"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            value={filterContentType}
            onChange={(e) => setFilterContentType(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Types</option>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Publisher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pages</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </tbody>
            </table>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Database className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No corpus documents yet.</p>
            <p className="text-sm mt-1">
              Upload a PDF above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Publisher
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Content Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Run
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empty Pages
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => {
                  const lastRun = doc.bootstrapJobs?.[0];
                  const isRunning =
                    runningIds.has(doc.id) ||
                    lastRun?.status === 'QUEUED' ||
                    lastRun?.status === 'RUNNING';
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-xs">
                        {doc.filename}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {doc.publisher ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {doc.contentType ? (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              CONTENT_TYPE_BADGE[doc.contentType] ?? 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {doc.contentType}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {doc.pageCount ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <RunStatusBadge status={lastRun?.status} />
                      </td>
                      <td className="px-4 py-3">
                        <EmptyPagesIndicator
                          emptyPages={
                            doc.calibrationRuns?.[0]?.summary?.emptyPageCount ??
                            doc.calibrationRuns?.[0]?.summary?.emptyPages?.length
                          }
                          totalPages={doc.pageCount}
                          onClick={() => setEmptyPagesModalDoc(doc)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {doc.calibrationRuns?.[0]?.id && (
                          <Link
                            to={`/calibration/runs/${doc.calibrationRuns[0].id}/annotation-report`}
                            className="px-3 py-1.5 text-xs font-medium rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            View Report
                          </Link>
                        )}
                        <button
                          onClick={() => handleRunExtraction(doc)}
                          disabled={isRunning}
                          className="px-3 py-1.5 text-xs font-medium rounded bg-[#006B6B] text-white hover:bg-[#005858] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {doc.taggedPdfPath ? 'Run zone extraction' : 'Run Docling check'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <EmptyPagesModal
        doc={emptyPagesModalDoc}
        onClose={() => setEmptyPagesModalDoc(null)}
      />
    </div>
  );
}
