import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  useCalibrationZones,
  useConfirmZone,
  useCorrectZone,
  useRejectZone,
  useConfirmAllGreen,
} from '../../hooks/useZoneReview';
import { useCalibrationRuns } from '../../hooks/useCalibration';
import ZoneOverlay from './ZoneOverlay';
import ZoneDetailPanel from './ZoneDetailPanel';
import { TableStructureEditor } from '../quickfix/TableStructureEditor';
import type { TableSection } from '@/types/zone.types';
import type { CalibrationZone } from '../../services/zone-correction.service';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface ZoneReviewWorkspaceProps {
  documentId: string;
  runId: string;
}

export default function ZoneReviewWorkspace({
  documentId,
  runId: runIdProp,
}: ZoneReviewWorkspaceProps) {
  const params = useParams<{ documentId: string }>();
  const docId = documentId || params.documentId || '';

  // Fetch latest CalibrationRun if runId not provided
  const { data: runsData } = useCalibrationRuns(
    runIdProp ? undefined : { documentId: docId, limit: 1 }
  );
  const runId = runIdProp || runsData?.runs?.[0]?.id || '';

  // Fetch presigned download URL for the source PDF
  const [pdfUrl, setPdfUrl] = useState<string>('');
  useEffect(() => {
    if (!docId) return;
    const fetchUrl = async () => {
      try {
        const { api } = await import('../../services/api');
        const res = await api.get(`/admin/corpus/documents/${docId}/download-url`);
        setPdfUrl(res.data?.data?.downloadUrl ?? '');
      } catch (err) {
        console.error('Failed to fetch PDF download URL', err);
      }
    };
    fetchUrl();
  }, [docId]);

  // Presigned URL carries auth in query params — no headers needed
  const pdfFile = useMemo(() => {
    if (!pdfUrl) return null;
    return { url: pdfUrl };
  }, [pdfUrl]);

  // Local state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageWidth] = useState(800);
  const [pageHeight, setPageHeight] = useState(1000);
  const [pdfWidth, setPdfWidth] = useState(595);
  const [pdfHeight, setPdfHeight] = useState(842);
  const [tableEditorState, setTableEditorState] = useState<CalibrationZone | null>(null);
  const [bucketFilter, setBucketFilter] = useState<'ALL' | 'GREEN' | 'AMBER' | 'RED'>('ALL');

  // Zone data
  const { data: zonesData, isLoading: zonesLoading } = useCalibrationZones(
    runId,
    bucketFilter !== 'ALL' ? { bucket: bucketFilter } : undefined
  );
  const zones = zonesData?.zones ?? [];
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  // Mutations
  const confirmZone = useConfirmZone(runId);
  const correctZone = useCorrectZone(runId);
  const rejectZone = useRejectZone(runId);
  const confirmAllGreen = useConfirmAllGreen(runId);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      if ((e.key === 'c' || e.key === 'C') && selectedZoneId) {
        confirmZone.mutate(selectedZoneId);
      }
      if ((e.key === 'r' || e.key === 'R') && selectedZoneId) {
        rejectZone.mutate(selectedZoneId);
      }
      if (e.key === 'ArrowLeft') setCurrentPage((p) => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage((p) => Math.min(numPages, p + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedZoneId, numPages, confirmZone, rejectZone]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-white flex-shrink-0">
          {/* Bucket filter */}
          <div className="flex gap-1">
            {(['ALL', 'GREEN', 'AMBER', 'RED'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBucketFilter(b)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  bucketFilter === b
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Confirm all green */}
          <button
            onClick={() => confirmAllGreen.mutate()}
            disabled={confirmAllGreen.isPending}
            className="ml-auto px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            aria-label="Confirm all green zones on this document"
          >
            {confirmAllGreen.isPending ? 'Confirming...' : 'Confirm All Green'}
          </button>

          {/* Page navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 border rounded disabled:opacity-30"
              aria-label="Previous page"
            >
              ←
            </button>
            <span>
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="px-2 py-1 border rounded disabled:opacity-30"
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>

        {/* PDF canvas area */}
        <div className="flex-1 overflow-auto flex justify-center items-start p-4">
          {!pdfFile ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Loading document...
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Document
                file={pdfFile}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                onLoadError={(err) => console.error('PDF load error', err)}
              >
                <Page
                  pageNumber={currentPage}
                  width={pageWidth}
                  onLoadSuccess={(page) => {
                    setPdfWidth(page.originalWidth);
                    setPdfHeight(page.originalHeight);
                    setPageHeight(page.height);
                  }}
                />
              </Document>
              <ZoneOverlay
                zones={zones}
                selectedZoneId={selectedZoneId}
                pageNumber={currentPage}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                pdfWidth={pdfWidth}
                pdfHeight={pdfHeight}
                onSelectZone={setSelectedZoneId}
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-96 border-l bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-800">Zone Detail</h2>
          {zonesLoading && (
            <p className="text-xs text-gray-400 mt-1">Loading zones...</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ZoneDetailPanel
            zone={selectedZone}
            onConfirm={(id) => confirmZone.mutate(id)}
            onCorrect={(id, label) =>
              correctZone.mutate({ zoneId: id, payload: { newLabel: label } })
            }
            onReject={(id) => rejectZone.mutate(id)}
            onEditStructure={(zone) => setTableEditorState(zone)}
            isConfirming={confirmZone.isPending}
            isCorrecting={correctZone.isPending}
            isRejecting={rejectZone.isPending}
          />
        </div>
      </div>

      {/* TABLE STRUCTURE EDITOR MODAL */}
      {tableEditorState && (
        <TableStructureEditor
          zoneId={tableEditorState.id}
          initialData={
            (tableEditorState.tableStructure as { thead: TableSection; tbody: TableSection }) ?? {
              thead: { rows: [] },
              tbody: { rows: [] },
            }
          }
          onSave={() => setTableEditorState(null)}
          onClose={() => setTableEditorState(null)}
        />
      )}
    </div>
  );
}
