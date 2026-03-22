import { useState, useCallback, useEffect, useMemo } from 'react';
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
} from '@/hooks/useZoneReview';
import { useTaggedPdfUrl } from '@/hooks/useTaggedPdfUrl';
import { api } from '@/services/api';
import ZonePdfPanel from './ZonePdfPanel';
import ZoneComparisonDetailBar from './ZoneComparisonDetailBar';
import ZoneOverlay from './ZoneOverlay';
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
  const [numPages, setNumPages] = useState(0);
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('ALL');
  const [rightPanelMode, setRightPanelMode] = useState<'tagged' | 'source'>('tagged');
  const [syncedScrollTop, setSyncedScrollTop] = useState(0);
  const [tableEditorZone, setTableEditorZone] = useState<CalibrationZone | null>(null);
  const [sourcePdfUrl, setSourcePdfUrl] = useState('');

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

  // Handlers
  const handleConfirm = useCallback(
    (zoneId: string) => {
      confirmZone.mutate(zoneId);
      setSelectedZoneId(null);
    },
    [confirmZone],
  );

  const handleReject = useCallback(
    (zoneId: string) => {
      rejectZone.mutate(zoneId);
      setSelectedZoneId(null);
    },
    [rejectZone],
  );

  const handleReclassify = useCallback(
    (zoneId: string, newLabel: string) => {
      correctZone.mutate({ zoneId, payload: { newLabel } });
    },
    [correctZone],
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
      } else if (e.key === 'c' && selectedZoneId && selectedZone && !selectedZone.operatorVerified) {
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
            <span className="min-w-[80px] text-center">
              Page {currentPage} of {numPages || '?'}
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

      {/* Two PDF panels side by side */}
      <div className="flex flex-1 min-h-0">
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
            className="flex-1 overflow-auto bg-gray-100"
            onScroll={(e) => {
              setSyncedScrollTop(e.currentTarget.scrollTop);
            }}
          >
            {rightPanelUrl ? (
              <div className="flex justify-center p-2">
                <div className="relative" style={{ width: 800 }}>
                  <RightPanelPdf
                    pdfUrl={rightPanelUrl}
                    page={currentPage}
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    onZoneClick={setSelectedZoneId}
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
}: {
  pdfUrl: string;
  page: number;
  zones: CalibrationZone[];
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
}) {
  const [pageHeight, setPageHeight] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(595);
  const [pdfHeight, setPdfHeight] = useState(842);

  const scaleX = 800 / pdfWidth;
  const scaleY = pageHeight / pdfHeight;
  const pageZones = zones.filter((z) => z.pageNumber === page);

  return (
    <>
      <Document
        file={{ url: pdfUrl }}
        loading={
          <div className="flex items-center justify-center h-96 text-gray-400">
            Loading PDF...
          </div>
        }
      >
        <Page
          pageNumber={page}
          width={800}
          onLoadSuccess={(p) => {
            setPdfWidth(p.originalWidth);
            setPdfHeight(p.originalHeight);
            setPageHeight(p.originalHeight * (800 / p.originalWidth));
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
        />
      )}
    </>
  );
}
