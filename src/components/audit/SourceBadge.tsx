import React from 'react';
import { cn } from '@/utils/cn';

export type IssueSource = 'epubcheck' | 'ace' | 'js-auditor';

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
  manual: {
    label: 'Manual',
    colors: 'bg-gray-100 text-gray-800',
  },
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className }) => {
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
