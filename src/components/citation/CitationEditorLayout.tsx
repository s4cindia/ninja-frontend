import { useState, useCallback, useRef, useMemo } from 'react';
import { DocumentTextViewer } from './DocumentTextViewer';
import { IssuePanel } from './IssuePanel';
import { useDocumentText } from '@/hooks/useDocumentText';
import { useEditorValidation, useReferenceLookup } from '@/hooks/useCitationEditorValidation';
import { useQueryClient } from '@tanstack/react-query';
import { documentTextKeys } from '@/hooks/useDocumentText';
import { citationService } from '@/services/citation.service';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, FileText, Gauge } from 'lucide-react';
import type { StylesheetDetectionResult } from '@/types/stylesheet-detection.types';

function findCitationInPanel(container: HTMLElement, citNum: number): Element | null {
  const legacy = container.querySelector(`[data-citation="${citNum}"]`);
  if (legacy) return legacy;
  const allCitEls = container.querySelectorAll('[data-cit-nums]');
  for (const el of allCitEls) {
    const nums = el.getAttribute('data-cit-nums');
    if (!nums) continue;
    const parsed = nums.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (parsed.includes(String(citNum))) return el;
  }
  return null;
}

interface CitationEditorLayoutProps {
  data: StylesheetDetectionResult;
  textLookupId: string;
}

export function CitationEditorLayout({ data, textLookupId }: CitationEditorLayoutProps): JSX.Element {
  const { data: docText, isLoading: textLoading } = useDocumentText(textLookupId);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [validationRan, setValidationRan] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const issuePanelRef = useRef<HTMLDivElement>(null);
  const documentPanelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const documentId = docText?.documentId ?? data.documentId ?? textLookupId;

  const {
    data: validationResult,
    isFetching: isValidating,
    runValidation,
  } = useEditorValidation(documentId, validationRan);

  const { data: lookupData } = useReferenceLookup(documentId);

  const referenceLookup = useMemo(() => {
    if (validationResult?.referenceLookup) return validationResult.referenceLookup;
    if (docText?.referenceLookup) return docText.referenceLookup;
    if (lookupData?.lookupMap) return lookupData.lookupMap;
    return undefined;
  }, [validationResult, docText, lookupData]);

  const handleRunValidation = useCallback(async () => {
    setValidationRan(true);
    try {
      await runValidation();
    } catch {
      // Error handled by query
    }
  }, [runValidation]);

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

  const handleCitationClick = useCallback((citationNumber: number) => {
    setHighlightedCitation(citationNumber);

    if (issuePanelRef.current) {
      const issueCard = issuePanelRef.current.querySelector(
        `[data-issue-citation~="${citationNumber}"]`
      );
      if (issueCard) {
        issueCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        issueCard.classList.add('issue-card-flash');
        setTimeout(() => {
          issueCard.classList.remove('issue-card-flash');
        }, 1500);
      }
    }
  }, []);

  const handleIssueClick = useCallback((citationNumbers: number[]) => {
    if (citationNumbers.length === 0) return;
    const firstNum = citationNumbers[0];
    setHighlightedCitation(firstNum);

    if (documentPanelRef.current) {
      const citationEl = findCitationInPanel(documentPanelRef.current, firstNum);
      if (citationEl) {
        citationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        citationEl.classList.add('citation-flash');
        setTimeout(() => citationEl.classList.remove('citation-flash'), 1500);
      }
    }
  }, []);

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
          <span className="text-sm font-medium">Citation Management</span>
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
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500/40 border border-yellow-500/60" aria-hidden="true" />
              Unmatched
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border border-t-0 border-gray-300 rounded-b-lg">
        <div ref={documentPanelRef} className="flex-1 min-w-0 overflow-hidden">
          <DocumentTextViewer
            highlightedHtml={docText?.highlightedHtml}
            fullHtml={docText?.fullHtml}
            fullText={docText?.fullText}
            isLoading={textLoading}
            highlightedCitation={highlightedCitation}
            onRegenerateHtml={handleRegenerateHtml}
            isRegenerating={isRegenerating}
            referenceLookup={referenceLookup}
            onCitationClick={handleCitationClick}
          />
        </div>

        <div ref={issuePanelRef} className="w-96 flex-shrink-0 border-l border-gray-300 overflow-hidden">
          <IssuePanel
            data={data}
            onHighlightCitation={setHighlightedCitation}
            onIssueClick={handleIssueClick}
            validationResult={validationResult}
            isValidating={isValidating}
            onRunValidation={handleRunValidation}
          />
        </div>
      </div>
    </div>
  );
}
