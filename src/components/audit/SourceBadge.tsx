import React from 'react';
import { cn } from '@/utils/cn';

export type IssueSource =
  | 'epubcheck' | 'ace' | 'js-auditor' | 'prh-uk'
  | 'ninja' | 'pdf-structure' | 'contrast-validator' | 'alt-text-validator'
  | 'verapdf' | 'pdfa11y';

interface SourceBadgeProps {
  source: IssueSource | string;
  className?: string;
}

const SOURCE_CONFIG: Record<string, { label: string; colors: string }> = {
  epubcheck: {
    label: 'EPUBCheck',
    colors: 'bg-blue-100 text-blue-800',
  },
  ace: {
    label: 'ACE',
    colors: 'bg-purple-100 text-purple-800',
  },
  'js-auditor': {
    label: 'JS Auditor',
    colors: 'bg-green-100 text-green-800',
  },
  // Distinct teal so PRH UK issues are recognisable at a glance among the
  // generic source badges (blue/purple/green).
  'prh-uk': {
    label: 'PRH UK',
    colors: 'bg-teal-100 text-teal-800',
  },
  manual: {
    label: 'Manual',
    colors: 'bg-gray-100 text-gray-800',
  },
  // PDF/UA validation now blends Ninja's own checks with two external
  // engines (veraPDF, pdfa11y) — this is purely a provenance label, not a
  // trust ranking, so all three get distinct-but-neutral colors rather than
  // a "good/bad" gradient. 'pdf-structure'/'contrast-validator'/
  // 'alt-text-validator' are Ninja's own PDF check sources (mirrors how
  // 'epubcheck'/'ace'/'js-auditor' are EPUB's); 'ninja' covers the PAC
  // report's own already-normalized source field.
  ninja: {
    label: 'Ninja',
    colors: 'bg-indigo-100 text-indigo-800',
  },
  'pdf-structure': {
    label: 'Ninja',
    colors: 'bg-indigo-100 text-indigo-800',
  },
  'contrast-validator': {
    label: 'Ninja',
    colors: 'bg-indigo-100 text-indigo-800',
  },
  'alt-text-validator': {
    label: 'Ninja',
    colors: 'bg-indigo-100 text-indigo-800',
  },
  verapdf: {
    label: 'veraPDF',
    colors: 'bg-slate-100 text-slate-800',
  },
  pdfa11y: {
    label: 'pdfa11y',
    colors: 'bg-cyan-100 text-cyan-800',
  },
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className }) => {
  // `source` ultimately comes from an unvalidated API response (PdfAuditIssue
  // and PacConditionResult are cast, not runtime-checked) — a malformed
  // non-string value must not reach `config.label` below, or React throws
  // trying to render it as a child.
  if (typeof source !== 'string') return null;

  const config = SOURCE_CONFIG[source] || {
    label: source || 'Unknown',
    colors: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        config.colors,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export default SourceBadge;
