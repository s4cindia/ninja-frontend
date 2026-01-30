import {
  User,
  Calendar,
  BookOpen,
  Building,
  Hash,
  FileText,
  Link,
  ExternalLink,
  Percent,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { isSafeUrl, normalizeConfidence, normalizeDoiUrl } from '@/utils/citation.utils';
import type { CitationComponent, SourceType } from '@/types/citation.types';
import { REVIEW_REASON_LABELS, CONFIDENCE_THRESHOLDS } from '@/types/citation.types';
import {
  SOURCE_TYPE_BADGE_COLOR,
  PARSE_VARIANT_BADGE_COLOR,
  CONFIDENCE_BADGE_COLORS,
  STATUS_BADGE_COLORS,
} from './badgeStyles';

interface ParsedComponentsViewProps {
  component: CitationComponent;
  isPrimary?: boolean;
  showConfidence?: boolean;
}

const sourceTypeLabels: Record<SourceType, string> = {
  JOURNAL_ARTICLE: 'Journal Article',
  BOOK: 'Book',
  BOOK_CHAPTER: 'Book Chapter',
  CONFERENCE_PAPER: 'Conference Paper',
  WEBSITE: 'Website',
  THESIS: 'Thesis',
  REPORT: 'Report',
  NEWSPAPER: 'Newspaper',
  MAGAZINE: 'Magazine',
  PATENT: 'Patent',
  LEGAL: 'Legal Document',
  PERSONAL_COMMUNICATION: 'Personal Communication',
  UNKNOWN: 'Unknown',
};

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  confidence?: number;
  showConfidence?: boolean;
  isLink?: boolean;
  linkHref?: string;
}

function FieldRow({
  icon: Icon,
  label,
  value,
  confidence,
  showConfidence,
  isLink,
  linkHref
}: FieldRowProps) {
  if (!value) return null;

  const confidenceColor = confidence
    ? confidence >= CONFIDENCE_THRESHOLDS.HIGH
      ? 'text-green-600'
      : confidence >= CONFIDENCE_THRESHOLDS.MEDIUM
        ? 'text-yellow-600'
        : 'text-red-600'
    : '';

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        {isLink ? (
          <SafeLink url={linkHref || value}>{value}</SafeLink>
        ) : (
          <p className="text-sm text-gray-900">{value}</p>
        )}
      </div>
      {showConfidence && confidence !== undefined && (
        <div className="flex items-center gap-1">
          <Percent className={cn('h-3 w-3', confidenceColor)} />
          <span className={cn('text-xs font-medium', confidenceColor)}>
            {confidence}%
          </span>
        </div>
      )}
    </div>
  );
}

function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  if (!isSafeUrl(url)) {
    return <span className="text-sm text-gray-900">{url}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function ParsedComponentsView({
  component,
  isPrimary = false,
  showConfidence = true
}: ParsedComponentsViewProps) {
  const { fieldConfidence } = component;

  return (
    <Card className="divide-y divide-gray-100">
      {/* Header with Source Type, Parse Variant, and Primary indicator */}
      <div className="p-4 bg-gray-50 flex items-center gap-2 flex-wrap">
        {component.sourceType && (
          <Badge className={SOURCE_TYPE_BADGE_COLOR}>
            {sourceTypeLabels[component.sourceType]}
          </Badge>
        )}
        {component.parseVariant && (
          <Badge className={PARSE_VARIANT_BADGE_COLOR}>
            Parsed as {component.parseVariant}
          </Badge>
        )}
        <Badge className={cn(
          component.confidence >= CONFIDENCE_THRESHOLDS.HIGH ? CONFIDENCE_BADGE_COLORS.high :
          component.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM ? CONFIDENCE_BADGE_COLORS.medium :
          CONFIDENCE_BADGE_COLORS.low
        )}>
          {Math.round(component.confidence)}% confidence
        </Badge>
        {isPrimary && (
          <Badge className={STATUS_BADGE_COLORS.primary}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Primary
          </Badge>
        )}
        {component.needsReview && (
          <Badge className={STATUS_BADGE_COLORS.needsReview}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        )}
      </div>

      {/* AC-26: Review reasons panel */}
      {component.needsReview && component.reviewReasons.length > 0 && (
        <div className="p-3 bg-orange-50 border-l-4 border-orange-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">Review Required</p>
              <ul className="mt-1 text-xs text-orange-700 space-y-0.5">
                {component.reviewReasons.map((reason, idx) => (
                  <li key={idx}>
                    {REVIEW_REASON_LABELS[reason] || reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-1">
        {/* Authors */}
        {component.authors.length > 0 && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Authors</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {component.authors.map((author, idx) => (
                  <Badge key={idx} className="text-xs bg-gray-100 text-gray-800 border border-gray-300">
                    {author}
                  </Badge>
                ))}
              </div>
            </div>
            {showConfidence && fieldConfidence.authors !== undefined && (() => {
              const normalizedAuthors = normalizeConfidence(fieldConfidence.authors);
              const authorsColor = normalizedAuthors >= CONFIDENCE_THRESHOLDS.HIGH ? 'text-green-600' :
                normalizedAuthors >= CONFIDENCE_THRESHOLDS.MEDIUM ? 'text-yellow-600' : 'text-red-600';
              return (
                <div className="flex items-center gap-1">
                  <Percent className={cn('h-3 w-3', authorsColor)} />
                  <span className={cn('text-xs font-medium', authorsColor)}>
                    {normalizedAuthors}%
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Year */}
        <FieldRow
          icon={Calendar}
          label="Year"
          value={component.year}
          confidence={fieldConfidence.year}
          showConfidence={showConfidence}
        />

        {/* Title */}
        <FieldRow
          icon={BookOpen}
          label="Title"
          value={component.title}
          confidence={fieldConfidence.title}
          showConfidence={showConfidence}
        />

        {/* Source/Journal */}
        <FieldRow
          icon={Building}
          label="Source"
          value={component.source}
          confidence={fieldConfidence.source}
          showConfidence={showConfidence}
        />

        {/* Volume & Issue */}
        {(component.volume || component.issue) && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Hash className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0 flex gap-4">
              {component.volume && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Volume</p>
                  <p className="text-sm text-gray-900">{component.volume}</p>
                </div>
              )}
              {component.issue && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Issue</p>
                  <p className="text-sm text-gray-900">{component.issue}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pages */}
        <FieldRow
          icon={FileText}
          label="Pages"
          value={component.pages}
          confidence={fieldConfidence.pages}
          showConfidence={showConfidence}
        />

        {/* DOI */}
        <FieldRow
          icon={Link}
          label="DOI"
          value={component.doi}
          confidence={fieldConfidence.doi}
          showConfidence={showConfidence}
          isLink={component.doi ? isSafeUrl(normalizeDoiUrl(component.doi)) : false}
          linkHref={component.doi ? normalizeDoiUrl(component.doi) : undefined}
        />

        {/* URL */}
        <FieldRow
          icon={ExternalLink}
          label="URL"
          value={component.url}
          confidence={fieldConfidence.url}
          showConfidence={showConfidence}
          isLink={true}
        />
      </div>

      {/* Parsed date footer */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Parsed on {new Date(component.createdAt).toLocaleString()}
      </div>
    </Card>
  );
}
