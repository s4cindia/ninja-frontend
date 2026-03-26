import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useCalibrationRuns } from '@/hooks/useCalibration';
import {
  useCalibrationZones,
  useConfirmZone,
  useCorrectZone,
  useRejectZone,
  useConfirmAllGreen,
  useAutoAnnotate,
} from '@/hooks/useZoneReview';
import type { AutoAnnotationResult } from '@/services/zone-correction.service';
import { useTaggedPdfUrl } from '@/hooks/useTaggedPdfUrl';
import { useAnnotationTimer } from '@/hooks/useAnnotationTimer';
import { api } from '@/services/api';
import { PageThumbnailNav } from './PageThumbnailNav';
import ZonePdfPanel from './ZonePdfPanel';
import ZoneComparisonDetailBar from './ZoneComparisonDetailBar';
import ZoneOverlay from './ZoneOverlay';
import ZoneListSidebar from './ZoneListSidebar';
import { useZoneNumberMap } from '@/hooks/useZoneNumberMap';
import { TableStructureEditor } from '../quickfix/TableStructureEditor';
import type { TableSection } from '@/types/zone.types';
import type { CalibrationZone } from '@/services/zone-correction.service';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type BucketFilter = 'ALL' | 'GREEN' | 'AMBER' | 'RED';

interface ZoneReviewWorkspaceProps {
  documentId: string;
  runId: string;
}

export default function ZoneReviewWorkspace({
  documentId,
  runId: runIdProp,
}: ZoneReviewWorkspaceProps) {
  const params = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const docId = documentId || params.documentId || '';

  // State
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [numPages, setNumPages] = useState(0);
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('ALL');
  const [rightPanelMode, setRightPanelMode] = useState<'tagged' | 'source'>('tagged');
  const [syncedScrollTop, setSyncedScrollTop] = useState(0);
  const [tableEditorZone, setTableEditorZone] = useState<CalibrationZone | null>(null);
  const [sourcePdfUrl, setSourcePdfUrl] = useState('');
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isRightExternalScroll = useRef(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(0);
  const [showZoneList, setShowZoneList] = useState(true);
  const [showPages, setShowPages] = useState(false);
  const [autoAnnotateToggle, setAutoAnnotateToggle] = useState(
    () => localStorage.getItem('ninja:autoAnnotateEnabled') !== 'false',
  );
  const autoAnnotateRanRef = useRef<string | null>(null);
  const [autoAnnotateResult, setAutoAnnotateResult] = useState<AutoAnnotationResult | null>(null);

  // Keep page input in sync with currentPage (arrow buttons, thumbnail clicks, etc.)
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  // Fetch source PDF presigned URL
  useEffect(() => {
    if (!docId) return;
    api
      .get(`/admin/corpus/documents/${docId}/download-url`)
      .then((res) => setSourcePdfUrl(res.data?.data?.downloadUrl ?? ''))
      .catch(() => setSourcePdfUrl(''));
  }, [docId]);

  // Fetch tagged PDF presigned URL
  const { data: taggedPdfUrl } = useTaggedPdfUrl(docId);

  // Right panel URL: togglable between tagged and source
  const rightPanelUrl = rightPanelMode === 'tagged' ? taggedPdfUrl : sourcePdfUrl;

  // Calibration data — fetch latest run if runId not provided
  const { data: runsData } = useCalibrationRuns(
    runIdProp ? undefined : { documentId: docId, limit: 1 },
  );
  const runId = runIdProp || runsData?.runs?.[0]?.id || '';

  const filterParam = bucketFilter === 'ALL' ? undefined : { bucket: bucketFilter };
  const { data: zonesData } = useCalibrationZones(runId, filterParam);
  const zones: CalibrationZone[] = useMemo(() => zonesData?.zones ?? [], [zonesData]);

  // Zone mutations
  const confirmZone = useConfirmZone(runId);
  const correctZone = useCorrectZone(runId);
  const rejectZone = useRejectZone(runId);
  const confirmAllGreen = useConfirmAllGreen(runId);
  const autoAnnotateMutation = useAutoAnnotate(runId);

  // Annotation timer
  const { recordDecision } = useAnnotationTimer(runId);

  // Correction reason
  const [correctionReason, setCorrectionReason] = useState('');

  // Selected zone
  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  );

  // Bucket counts from zones data
  const greenCount = zones.filter((z) => z.reconciliationBucket === 'GREEN').length;
  const amberCount = zones.filter((z) => z.reconciliationBucket === 'AMBER').length;
  const redCount = zones.filter((z) => z.reconciliationBucket === 'RED').length;
  const totalCount = zones.length;

  // Unconfirmed green count for current page
  const unconfirmedGreenOnPage = useMemo(
    () =>
      zones.filter(
        (z) =>
          z.pageNumber === currentPage &&
          z.reconciliationBucket === 'GREEN' &&
          !z.operatorVerified,
      ).length,
    [zones, currentPage],
  );

  // Unified zone numbering
  const zoneNumberMap = useZoneNumberMap(zones, currentPage);

  // Selected zone number
  const selectedZoneNumber = selectedZone ? zoneNumberMap.get(selectedZone.id) ?? undefined : undefined;

  // Per-page zone counts
  const pageZoneCounts = useMemo(() => {
    const pageZones = zones.filter((z) => z.pageNumber === currentPage);
    const docling = pageZones.filter((z) => z.doclingLabel != null).length;
    const pdfxt = pageZones.filter((z) => z.pdfxtLabel != null).length;
    return { total: pageZones.length, docling, pdfxt };
  }, [zones, currentPage]);

  // Zone count per page (for thumbnail navigator)
  const zoneCountByPage = useMemo(() => {
    const map = new Map<number, number>();
    for (const zone of zones) {
      map.set(zone.pageNumber, (map.get(zone.pageNumber) ?? 0) + 1);
    }
    return map;
  }, [zones]);

  // Handlers
  const handleConfirm = useCallback(
    (zoneId: string) => {
      confirmZone.mutate(zoneId);
      recordDecision('confirm');
      setSelectedZoneId(null);
      setCorrectionReason('');
    },
    [confirmZone, recordDecision],
  );

  const handleReject = useCallback(
    (zoneId: string) => {
      rejectZone.mutate({ zoneId, correctionReason: correctionReason || undefined });
      recordDecision('reject');
      setSelectedZoneId(null);
      setCorrectionReason('');
    },
    [rejectZone, recordDecision, correctionReason],
  );

  const handleReclassify = useCallback(
    (zoneId: string, newLabel: string) => {
      correctZone.mutate({ zoneId, payload: { newLabel, correctionReason: correctionReason || undefined } });
      recordDecision('correct');
    },
    [correctZone, recordDecision, correctionReason],
  );

  const handleDismiss = useCallback(() => setSelectedZoneId(null), []);

  const handleConfirmAllGreen = useCallback(() => {
    confirmAllGreen.mutate();
  }, [confirmAllGreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage((p) => p - 1);
        setSelectedZoneId(null);
      } else if (e.key === 'ArrowRight' && currentPage < numPages) {
        setCurrentPage((p) => p + 1);
        setSelectedZoneId(null);
      } else if (e.key === 'c' && selectedZoneId && selectedZone) {
        handleConfirm(selectedZoneId);
      } else if (e.key === 'r' && selectedZoneId && selectedZone && !selectedZone.isArtefact) {
        handleReject(selectedZoneId);
      } else if (e.key === 'Escape') {
        setSelectedZoneId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, numPages, selectedZoneId, selectedZone, handleConfirm, handleReject]);

  // Reset scroll when page changes
  useEffect(() => {
    setSyncedScrollTop(0);
  }, [currentPage]);

  // Measure right panel width — only update on meaningful changes
  useEffect(() => {
    const el = rightScrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) {
          setRightPanelWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync right panel scroll from syncedScrollTop
  useEffect(() => {
    if (rightScrollRef.current && rightScrollRef.current.scrollTop !== syncedScrollTop) {
      isRightExternalScroll.current = true;
      rightScrollRef.current.scrollTop = syncedScrollTop;
    }
  }, [syncedScrollTop]);

  // Persist auto-annotate toggle preference
  useEffect(() => {
    localStorage.setItem('ninja:autoAnnotateEnabled', String(autoAnnotateToggle));
  }, [autoAnnotateToggle]);

  // Auto-trigger auto-annotate once when zones load
  useEffect(() => {
    if (!autoAnnotateToggle) return;
    if (!runId || autoAnnotateRanRef.current === runId) return;
    if (!zones || zones.length === 0) return;

    autoAnnotateRanRef.current = runId;
    autoAnnotateMutation.mutate(undefined, {
      onSuccess: (result) => {
        setAutoAnnotateResult(result);
        setTimeout(() => setAutoAnnotateResult(null), 5000);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnnotateToggle, runId, zones]);

  const handleToggleAutoAnnotate = useCallback((newValue: boolean) => {
    setAutoAnnotateToggle(newValue);
    if (newValue && runId) {
      autoAnnotateMutation.mutate(undefined, {
        onSuccess: (result) => {
          setAutoAnnotateResult(result);
          setTimeout(() => setAutoAnnotateResult(null), 5000);
        },
      });
    }
  }, [runId, autoAnnotateMutation]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/bootstrap')}
            className="text-sm text-gray-500 hover:text-gray-700 mr-2"
          >
            &larr; Back
          </button>

          {/* Bucket filter tabs */}
          {(
            [
              { key: 'ALL', label: `All (${totalCount})`, color: 'gray' },
              { key: 'GREEN', label: `Green (${greenCount})`, color: 'green' },
              { key: 'AMBER', label: `Amber (${amberCount})`, color: 'amber' },
              { key: 'RED', label: `Red (${redCount})`, color: 'red' },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => {
                setBucketFilter(key);
                setSelectedZoneId(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                bucketFilter === key
                  ? color === 'gray'
                    ? 'bg-gray-800 text-white'
                    : color === 'green'
                      ? 'bg-green-600 text-white'
                      : color === 'amber'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Report links */}
          {runId && (
            <>
              <button
                onClick={() => navigate(`/calibration/runs/${runId}/annotation-report`)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Annotation Report
              </button>
              <button
                onClick={() => navigate(`/calibration/runs/${runId}/timesheet`)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Timesheet
              </button>
            </>
          )}

          {/* Confirm All Green */}
          <button
            onClick={handleConfirmAllGreen}
            disabled={greenCount === 0 || confirmAllGreen.isPending}
            className="px-3 py-1.5 text-xs font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmAllGreen.isPending
              ? 'Confirming...'
              : `Confirm All Green (${unconfirmedGreenOnPage})`}
          </button>

          {/* Auto-Annotation toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              Auto Annotation
              {autoAnnotateMutation.isPending && (
                <svg className="animate-spin h-3 w-3 text-indigo-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoAnnotateToggle}
              onClick={() => handleToggleAutoAnnotate(!autoAnnotateToggle)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoAnnotateToggle ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  autoAnnotateToggle ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <button
            onClick={() => setShowPages((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              showPages
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showPages ? 'Hide Pages' : 'Pages'}
          </button>

          <button
            onClick={() => setShowZoneList((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            {showZoneList ? 'Hide List' : 'Show List'}
          </button>

          {/* Page navigation */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setSelectedZoneId(null);
              }}
              disabled={currentPage <= 1}
              className="px-1.5 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              &larr;
            </button>
            <span className="flex items-center gap-1 min-w-[80px] justify-center">
              Page{' '}
              <input
                type="text"
                inputMode="numeric"
                className="w-10 text-center border border-gray-300 rounded px-0.5 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const n = parseInt(pageInputValue, 10);
                    if (!isNaN(n) && n >= 1 && n <= numPages) {
                      setCurrentPage(n);
                      setSelectedZoneId(null);
                    } else {
                      setPageInputValue(String(currentPage));
                    }
                  }
                }}
                onBlur={() => {
                  const n = parseInt(pageInputValue, 10);
                  if (!isNaN(n) && n >= 1 && n <= numPages) {
                    setCurrentPage(n);
                    setSelectedZoneId(null);
                  } else {
                    setPageInputValue(String(currentPage));
                  }
                }}
              />{' '}
              of {numPages || '?'}
            </span>
            <span className="text-xs text-gray-400 ml-2">
              ({pageZoneCounts.total} zones: {pageZoneCounts.docling} docling, {pageZoneCounts.pdfxt} pdfxt)
            </span>
            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(numPages, p + 1));
                setSelectedZoneId(null);
              }}
              disabled={currentPage >= numPages}
              className="px-1.5 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Auto-annotate result banner */}
      {autoAnnotateResult && (
        <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-200 text-sm text-green-800">
          <span>
            Auto-annotated: {autoAnnotateResult.totalConfirmed} confirmed, {autoAnnotateResult.totalCorrected} corrected, {autoAnnotateResult.totalRejected} rejected
            <span className="text-green-600 ml-1">({(autoAnnotateResult.durationMs / 1000).toFixed(1)}s)</span>
          </span>
          <button
            onClick={() => setAutoAnnotateResult(null)}
            className="text-green-600 hover:text-green-800 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Two PDF panels side by side */}
      <div className="flex flex-1 min-h-0">
        {/* Page thumbnail navigator */}
        {showPages && sourcePdfUrl && (
          <PageThumbnailNav
            pdfUrl={sourcePdfUrl}
            totalPages={numPages}
            currentPage={currentPage}
            zoneCountByPage={zoneCountByPage}
            onPageSelect={(page) => {
              setCurrentPage(page);
              setSelectedZoneId(null);
            }}
          />
        )}

        {/* Left panel: Source PDF + Docling zones */}
        <ZonePdfPanel
          pdfUrl={sourcePdfUrl || undefined}
          page={currentPage}
          zones={zones}
          source="docling"
          selectedZoneId={selectedZoneId}
          onZoneClick={setSelectedZoneId}
          scrollTop={syncedScrollTop}
          onScroll={setSyncedScrollTop}
          onDocumentLoad={setNumPages}
          label="Docling — Source PDF"
          zoneNumberMap={zoneNumberMap}
        />

        {/* Right panel: Tagged PDF (default) + pdfxt zones */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toggle in panel header */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              pdfxt — {rightPanelMode === 'tagged' ? 'Tagged PDF' : 'Source PDF'}
            </span>
            <select
              value={rightPanelMode}
              onChange={(e) => setRightPanelMode(e.target.value as 'tagged' | 'source')}
              className="text-xs border border-gray-300 rounded px-2 py-0.5 bg-white"
            >
              <option value="tagged">Tagged PDF</option>
              <option value="source">Source PDF</option>
            </select>
          </div>
          {/* Right panel PDF content */}
          <div
            ref={rightScrollRef}
            className="flex-1 overflow-y-scroll overflow-x-hidden bg-gray-100"
            onScroll={(e) => {
              if (isRightExternalScroll.current) {
                isRightExternalScroll.current = false;
                return;
              }
              setSyncedScrollTop(e.currentTarget.scrollTop);
            }}
          >
            {rightPanelUrl ? (
              <div className="flex justify-center p-2">
                <div className="relative" style={{ width: (rightPanelWidth || 600) - 16 }}>
                  <RightPanelPdf
                    pdfUrl={rightPanelUrl}
                    page={currentPage}
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    onZoneClick={setSelectedZoneId}
                    width={(rightPanelWidth || 600) - 16}
                    zoneNumberMap={zoneNumberMap}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                {rightPanelMode === 'tagged' ? 'No tagged PDF uploaded' : 'Loading...'}
              </div>
            )}
          </div>
        </div>

          {/* Zone list sidebar */}
          {showZoneList && (
            <ZoneListSidebar
              zones={zones}
              currentPage={currentPage}
              selectedZoneId={selectedZoneId}
              onZoneClick={setSelectedZoneId}
              zoneNumberMap={zoneNumberMap}
            />
          )}
      </div>

      {/* Bottom detail bar — visible only when zone selected */}
      {selectedZone && (
        <ZoneComparisonDetailBar
          zone={selectedZone}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onReclassify={handleReclassify}
          onDismiss={handleDismiss}
          confirmPending={confirmZone.isPending}
          rejectPending={rejectZone.isPending}
          correctPending={correctZone.isPending}
          zoneNumber={selectedZoneNumber}
          correctionReason={correctionReason}
          onCorrectionReasonChange={setCorrectionReason}
        />
      )}

      {/* Table editor modal */}
      {tableEditorZone && (
        <TableStructureEditor
          zoneId={tableEditorZone.id}
          initialData={
            (tableEditorZone.tableStructure as { thead: TableSection; tbody: TableSection }) ?? {
              thead: { rows: [] },
              tbody: { rows: [] },
            }
          }
          onSave={() => setTableEditorZone(null)}
          onClose={() => setTableEditorZone(null)}
        />
      )}
    </div>
  );
}

/* Right panel inner PDF (without ZonePdfPanel header, since we render our own toggle header) */
function RightPanelPdf({
  pdfUrl,
  page,
  zones,
  selectedZoneId,
  onZoneClick,
  width,
  zoneNumberMap,
}: {
  pdfUrl: string;
  page: number;
  zones: CalibrationZone[];
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  width: number;
  zoneNumberMap?: Map<string, number>;
}) {
  const [pageHeight, setPageHeight] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(595);
  const [pdfHeight, setPdfHeight] = useState(842);

  const scaleX = width / pdfWidth;
  const scaleY = pageHeight / pdfHeight;
  const pageZones = zones.filter((z) => z.pageNumber === page);
  const fileObj = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  return (
    <>
      <Document
        key={pdfUrl}
        file={fileObj}
        loading={
          <div className="flex items-center justify-center h-96 text-gray-400">
            Loading PDF...
          </div>
        }
        onLoadError={(err) => console.error('[RightPanelPdf] PDF load error:', err)}
        error={
          <div className="flex items-center justify-center h-96 text-red-400">
            Failed to load PDF. Check console for details.
          </div>
        }
      >
        <Page
          pageNumber={page}
          width={width}
          onLoadSuccess={(p) => {
            setPdfWidth(p.originalWidth);
            setPdfHeight(p.originalHeight);
            setPageHeight(p.originalHeight * (width / p.originalWidth));
          }}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
      {pageHeight > 0 && (
        <ZoneOverlay
          zones={pageZones}
          pageNumber={page}
          scaleX={scaleX}
          scaleY={scaleY}
          selectedZoneId={selectedZoneId}
          onZoneClick={onZoneClick}
          source="pdfxt"
          zoneNumberMap={zoneNumberMap}
        />
      )}
    </>
  );
}
