/**
 * PDF Viewer Page
 *
 * Displays PDF documents page by page without conversion.
 * Uses react-pdf for native PDF rendering.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2, CheckSquare } from 'lucide-react';
import { validatorService } from '@/services/validator.service';
import { StyleValidationPanel } from '@/components/style/StyleValidationPanel';
import type { StyleViolation } from '@/types/style';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - use local copy to avoid CSP issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function PdfViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentName = searchParams.get('name') || 'Document.pdf';

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  // Load PDF data from backend
  const loadPdf = useCallback(async () => {
    if (!documentId) {
      setError('No document ID provided');
      return;
    }

    try {
      // Get the raw file as blob (includes auth headers)
      const blob = await validatorService.getDocumentFileBlob(documentId);
      console.log('PDF blob received:', blob.type, blob.size, 'bytes');

      // Verify it's actually a PDF
      if (blob.type !== 'application/pdf' && !blob.type.includes('pdf')) {
        // Try to read error message if it's JSON
        const text = await blob.text();
        console.error('Received non-PDF response:', text);
        try {
          const json = JSON.parse(text);
          setError(json.error?.message || 'Server returned an error');
        } catch {
          setError('Invalid PDF file received from server');
        }
        return;
      }

      // Store blob for download
      blobRef.current = blob;

      // Convert blob to Uint8Array for react-pdf (avoids CSP blob: URL issues)
      // Using Uint8Array allows us to create copies for multiple Document components
      const arrayBuffer = await blob.arrayBuffer();
      setPdfData(new Uint8Array(arrayBuffer));
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setError('Failed to load PDF. Please check if the document exists.');
    }
  }, [documentId]);

  // Load PDF on mount
  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err.message, err);
    setError(`Failed to load PDF: ${err.message}`);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleBack = () => {
    navigate('/editorial');
  };

  const handleDownload = () => {
    if (!blobRef.current) return;

    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navigate to violation location (page number)
  const handleNavigateToViolation = useCallback((violation: StyleViolation) => {
    if (violation.pageNumber && violation.pageNumber !== currentPage) {
      setCurrentPage(violation.pageNumber);
    }
  }, [currentPage]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Editorial
          </button>
        </div>
      </div>
    );
  }

  // Create a function that returns a fresh copy of PDF data for react-pdf
  // This is necessary because PDF.js transfers the ArrayBuffer to a Web Worker,
  // which "detaches" it, making it unusable for subsequent Document components
  // Using .slice() creates an actual copy of the underlying buffer
  const createPdfFile = () => pdfData ? { data: pdfData.slice() } : null;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-5 w-px bg-gray-300" />
          <span className="text-sm font-medium text-gray-700 truncate max-w-md">
            {documentName}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            PDF
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm px-2">
              {currentPage} / {numPages || '?'}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm px-2 min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <div className="h-5 w-px bg-gray-300" />

          {/* Style Check Toggle */}
          <button
            onClick={() => setShowStylePanel(!showStylePanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
              showStylePanel
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Style Check
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto flex justify-center p-4">
            {!pdfData ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Document
                file={createPdfFile()}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
            )}
          </div>

          {/* Page thumbnails (optional - for quick navigation) */}
          {numPages > 1 && pdfData && (
            <div className="bg-white border-t px-4 py-2 overflow-x-auto">
              <div className="flex gap-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex-shrink-0 w-12 h-16 border-2 rounded overflow-hidden ${
                      currentPage === pageNum
                        ? 'border-blue-500'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Document file={createPdfFile()}>
                      <Page
                        pageNumber={pageNum}
                        width={44}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Style Validation Panel */}
        {showStylePanel && documentId && (
          <div className="w-[400px] flex-shrink-0 border-l bg-white overflow-hidden">
            <StyleValidationPanel
              documentId={documentId}
              onNavigateToViolation={handleNavigateToViolation}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
