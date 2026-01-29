import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wand2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import { CONFIDENCE_THRESHOLDS } from '@/types/citation.types';
import type { Citation, CitationType, CitationStyle } from '@/types/citation.types';

interface CitationListProps {
  citations: Citation[];
  isLoading?: boolean;
  onParse?: (citationId: string) => void;
  onViewDetail?: (citation: Citation) => void;
  isParsing?: string | null;
}

const typeColors: Record<CitationType, string> = {
  PARENTHETICAL: 'bg-blue-100 text-blue-800',
  NARRATIVE: 'bg-green-100 text-green-800',
  FOOTNOTE: 'bg-purple-100 text-purple-800',
  ENDNOTE: 'bg-indigo-100 text-indigo-800',
  NUMERIC: 'bg-orange-100 text-orange-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

const styleColors: Record<CitationStyle, string> = {
  APA: 'bg-sky-100 text-sky-800',
  MLA: 'bg-emerald-100 text-emerald-800',
  CHICAGO: 'bg-amber-100 text-amber-800',
  VANCOUVER: 'bg-rose-100 text-rose-800',
  HARVARD: 'bg-violet-100 text-violet-800',
  IEEE: 'bg-cyan-100 text-cyan-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= CONFIDENCE_THRESHOLDS.HIGH
    ? 'text-green-600'
    : confidence >= CONFIDENCE_THRESHOLDS.MEDIUM
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <span className={cn('text-sm font-medium', color)}>
      {confidence}%
    </span>
  );
}

function CitationRow({
  citation,
  onParse,
  onViewDetail,
  isParsing
}: {
  citation: Citation;
  onParse?: (id: string) => void;
  onViewDetail?: (citation: Citation) => void;
  isParsing?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasParsedComponent = !!citation.primaryComponent;

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isExpanded && 'ring-2 ring-blue-200'
    )}>
      {/* Main row */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Citation text */}
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-900 font-medium line-clamp-2">
                {citation.rawText}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={typeColors[citation.citationType]}>
                {citation.citationType.toLowerCase().replace('_', ' ')}
              </Badge>
              {citation.detectedStyle && (
                <Badge className={styleColors[citation.detectedStyle]}>
                  {citation.detectedStyle}
                </Badge>
              )}
              {hasParsedComponent ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Parsed
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unparsed
                </Badge>
              )}
              {/* AC-26: Show needs review badge */}
              {citation.needsReview && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Review
                </Badge>
              )}
            </div>
          </div>

          {/* Right side: confidence + expand */}
          <div className="flex items-center gap-4">
            <ConfidenceBadge confidence={citation.confidence} />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Location info */}
          <div className="text-xs text-gray-500 flex gap-4">
            {citation.pageNumber && (
              <span>Page: {citation.pageNumber}</span>
            )}
            {citation.paragraphIndex !== null && (
              <span>Paragraph: {citation.paragraphIndex + 1}</span>
            )}
            <span>
              Position: {citation.startOffset}-{citation.endOffset}
            </span>
          </div>

          {/* Parsed component preview */}
          {hasParsedComponent && citation.primaryComponent && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                Parsed Components
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {citation.primaryComponent.authors.length > 0 && (
                  <div>
                    <span className="text-gray-500">Authors:</span>{' '}
                    <span className="text-gray-900">
                      {citation.primaryComponent.authors.join(', ')}
                    </span>
                  </div>
                )}
                {citation.primaryComponent.year && (
                  <div>
                    <span className="text-gray-500">Year:</span>{' '}
                    <span className="text-gray-900">{citation.primaryComponent.year}</span>
                  </div>
                )}
                {citation.primaryComponent.title && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Title:</span>{' '}
                    <span className="text-gray-900">{citation.primaryComponent.title}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!hasParsedComponent && onParse && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onParse(citation.id);
                }}
                disabled={isParsing}
              >
                {isParsing ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Parse Citation
                  </>
                )}
              </Button>
            )}
            {onViewDetail && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(citation);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function CitationList({
  citations,
  isLoading,
  onParse,
  onViewDetail,
  isParsing
}: CitationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (citations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Quote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No citations found</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document to detect citations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((citation) => (
        <CitationRow
          key={citation.id}
          citation={citation}
          onParse={onParse}
          onViewDetail={onViewDetail}
          isParsing={isParsing === citation.id}
        />
      ))}
    </div>
  );
}
