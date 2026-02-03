import { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  X,
  Quote,
  Wand2,
  History,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { ParsedComponentsView } from './ParsedComponentsView';
import { useCitation, useCitationComponents, useParseCitation } from '@/hooks/useCitation';
import { cn } from '@/utils/cn';
import { normalizeConfidence } from '@/utils/citation.utils';
import { CONFIDENCE_THRESHOLDS } from '@/types/citation.types';
import {
  CITATION_TYPE_BADGE_COLORS,
  CITATION_STYLE_BADGE_COLORS,
  CONFIDENCE_BADGE_COLORS,
} from './badgeStyles';
import type { Citation } from '@/types/citation.types';

/**
 * Panel header height for content area calculation.
 * Matches the h-16 (64px) class on the header element.
 * 
 * Note: Could be measured dynamically via ref, but a constant is simpler
 * and avoids layout thrashing. Update if header design changes.
 */
const HEADER_HEIGHT_PX = 64;

interface CitationDetailProps {
  citation: Citation;
  onClose: () => void;
}

export function CitationDetail({ citation: initialCitation, onClose }: CitationDetailProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const { data: fetchedCitation } = useCitation(initialCitation.id);
  const citation = fetchedCitation ?? initialCitation;

  const {
    data: components,
    isLoading: isLoadingHistory
  } = useCitationComponents(citation.id);

  const { mutate: parseCitation, isPending: isParsing, isSuccess: parseSuccess, isError: parseError, error: parseErrorDetails } = useParseCitation();

  const handleParse = useCallback(() => {
    parseCitation(initialCitation.id);
  }, [initialCitation.id, parseCitation]);

  const hasParsedComponent = !!citation.primaryComponent || !!citation.primaryComponentId;

  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      const prevElement = previousActiveElement.current;
      try {
        if (
          prevElement instanceof HTMLElement &&
          document.body.contains(prevElement)
        ) {
          prevElement.focus();
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Focus restoration failed:', error);
        }
        document.body.focus();
      }
      previousActiveElement.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-detail-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 id="citation-detail-title" className="text-lg font-semibold text-gray-900">
              Citation Details
            </h2>
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close citation details"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className={`p-4 overflow-y-auto space-y-6 h-[calc(100%-${HEADER_HEIGHT_PX}px)]`}>
          {/* Raw Citation Text */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Original Citation
            </h3>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized with DOMPurify.sanitize() */}
            <p 
              className="text-gray-900 bg-gray-50 p-3 rounded-lg border"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(citation.rawText) }}
            />

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={CITATION_TYPE_BADGE_COLORS[citation.citationType]}>
                {citation.citationType.toLowerCase().replace(/_/g, ' ')}
              </Badge>
              {citation.detectedStyle && (
                <Badge className={CITATION_STYLE_BADGE_COLORS[citation.detectedStyle]}>
                  {citation.detectedStyle}
                </Badge>
              )}
              {(() => {
                const normalizedConfidence = normalizeConfidence(citation.confidence);
                return (
                  <Badge className={cn(
                    normalizedConfidence >= CONFIDENCE_THRESHOLDS.HIGH ? CONFIDENCE_BADGE_COLORS.high :
                    normalizedConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM ? CONFIDENCE_BADGE_COLORS.medium :
                    CONFIDENCE_BADGE_COLORS.low
                  )}>
                    {normalizedConfidence}% confidence
                  </Badge>
                );
              })()}
            </div>

            {/* Location info */}
            <div className="text-xs text-gray-500 mt-3 flex gap-4">
              {citation.pageNumber != null && (
                <span>Page: {citation.pageNumber}</span>
              )}
              {citation.paragraphIndex != null && (
                <span>Paragraph: {citation.paragraphIndex + 1}</span>
              )}
              <span>
                Position: {citation.startOffset}-{citation.endOffset}
              </span>
            </div>
          </Card>

          {/* Parsed Components Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                {hasParsedComponent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Parsed Components
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Not Yet Parsed
                  </>
                )}
              </h3>
              <Button
                size="sm"
                onClick={handleParse}
                disabled={isParsing}
              >
                {isParsing ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Parsing...
                  </>
                ) : hasParsedComponent ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-parse
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Parse Citation
                  </>
                )}
              </Button>
            </div>

            {/* Success message */}
            {parseSuccess && (
              <div 
                role="status" 
                aria-live="polite"
                className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
              >
                Citation parsed successfully!
              </div>
            )}

            {/* Error message */}
            {parseError && (
              <div 
                role="alert" 
                aria-live="assertive"
                className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
              >
                {parseErrorDetails?.message || 'Failed to parse citation. Please try again.'}
              </div>
            )}

            {hasParsedComponent ? (
              <Tabs
                defaultValue="current"
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'current' | 'history')}
              >
                <Tabs.List>
                  <Tabs.Trigger value="current">
                    Current Parse
                  </Tabs.Trigger>
                  <Tabs.Trigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    History
                    {components && components.length > 1 && (
                      <Badge className="ml-1 bg-gray-100 text-gray-800 border border-gray-300">
                        {components.length}
                      </Badge>
                    )}
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="current" className="mt-4">
                  {citation.primaryComponent && (
                    <ParsedComponentsView
                      component={citation.primaryComponent}
                      isPrimary={true}
                    />
                  )}
                </Tabs.Content>

                <Tabs.Content value="history" className="mt-4">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : components && components.length > 0 ? (
                    <div className="space-y-4">
                      {components.map((comp) => (
                        <div key={comp.id}>
                          <div className="text-xs text-gray-500 mb-2">
                            {comp.parseVariant || 'Unknown style'}
                            {' - '}
                            {new Date(comp.createdAt).toLocaleDateString()}
                          </div>
                          <ParsedComponentsView
                            component={comp}
                            isPrimary={citation.primaryComponentId === comp.id}
                            showConfidence={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No parse history available
                    </p>
                  )}
                </Tabs.Content>
              </Tabs>
            ) : (
              <Card className="p-8 text-center">
                <Wand2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Click "Parse Citation" to extract structured components
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  This will identify authors, year, title, and other metadata
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
