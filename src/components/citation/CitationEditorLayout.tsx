import { useState, useCallback, useRef } from 'react';
import { DocumentTextViewer } from './DocumentTextViewer';
import { IssuePanel } from './IssuePanel';
import { useDocumentText } from '@/hooks/useDocumentText';
import { useQueryClient } from '@tanstack/react-query';
import { documentTextKeys } from '@/hooks/useDocumentText';
import { citationService } from '@/services/citation.service';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, FileText, Gauge } from 'lucide-react';
import type { StylesheetDetectionResult } from '@/types/stylesheet-detection.types';

interface CitationEditorLayoutProps {
  data: StylesheetDetectionResult;
  textLookupId: string;
}

export function CitationEditorLayout({ data, textLookupId }: CitationEditorLayoutProps): JSX.Element {
  const { data: docText, isLoading: textLoading } = useDocumentText(textLookupId);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const documentId = docText?.documentId ?? data.documentId ?? textLookupId;

  const handleRegenerateHtml = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRegenerating(true);
      await citationService.regenerateHtml(documentId, file);
      await queryClient.invalidateQueries({
        queryKey: documentTextKeys.byDocument(textLookupId),
      });
    } catch {
      // Error handled by service layer
    } finally {
      setIsRegenerating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [documentId, textLookupId, queryClient]);

  const style = data.detectedStyle;
  const pct = style ? Math.round(style.confidence * 100) : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[600px]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleFileSelected}
        aria-label="Select DOCX file for HTML regeneration"
      />

      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-800 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-medium">Citation Editor</span>
          {data.filename && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden="true" />
              {data.filename}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {style && (
            <>
              <Badge variant="info" size="sm">{style.styleName}</Badge>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Gauge className="h-3 w-3" aria-hidden="true" />
                {pct}% confidence
              </span>
            </>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/40 border border-green-500/60" aria-hidden="true" />
              Matched
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500/60" aria-hidden="true" />
              Orphaned
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border border-t-0 border-gray-300 rounded-b-lg">
        <div className="flex-1 min-w-0 overflow-hidden">
          <DocumentTextViewer
            fullHtml={docText?.fullHtml}
            fullText={docText?.fullText}
            isLoading={textLoading}
            crossReference={data.crossReference}
            highlightedCitation={highlightedCitation}
            onRegenerateHtml={handleRegenerateHtml}
            isRegenerating={isRegenerating}
          />
        </div>

        <div className="w-96 flex-shrink-0 border-l border-gray-300 overflow-hidden">
          <IssuePanel
            data={data}
            onHighlightCitation={setHighlightedCitation}
          />
        </div>
      </div>
    </div>
  );
}
