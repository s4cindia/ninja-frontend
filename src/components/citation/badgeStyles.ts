import type { CitationType, CitationStyle } from '@/types/citation.types';

export const CITATION_TYPE_BADGE_COLORS: Record<CitationType, string> = {
  PARENTHETICAL: 'bg-blue-100 text-blue-800',
  NARRATIVE: 'bg-green-100 text-green-800',
  FOOTNOTE: 'bg-purple-100 text-purple-800',
  ENDNOTE: 'bg-indigo-100 text-indigo-800',
  NUMERIC: 'bg-orange-100 text-orange-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

export const CITATION_STYLE_BADGE_COLORS: Record<CitationStyle, string> = {
  APA: 'bg-sky-100 text-sky-800',
  MLA: 'bg-emerald-100 text-emerald-800',
  CHICAGO: 'bg-amber-100 text-amber-800',
  VANCOUVER: 'bg-rose-100 text-rose-800',
  HARVARD: 'bg-violet-100 text-violet-800',
  IEEE: 'bg-cyan-100 text-cyan-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

export const STATUS_BADGE_COLORS = {
  parsed: 'bg-green-100 text-green-800',
  unparsed: 'bg-yellow-100 text-yellow-800',
  needsReview: 'bg-orange-100 text-orange-800',
  primary: 'bg-green-100 text-green-800',
} as const;

export const CONFIDENCE_BADGE_COLORS = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
} as const;

export const SOURCE_TYPE_BADGE_COLOR = 'bg-blue-100 text-blue-800';
export const PARSE_VARIANT_BADGE_COLOR = 'bg-purple-100 text-purple-800';
