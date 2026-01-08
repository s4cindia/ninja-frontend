import React from 'react';
import { FileCode, Eye, Wrench } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '@/utils/cn';

export interface SourceSummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
  autoFixable?: number;
  quickFixable?: number;
  fixable?: number; // Combined auto + quickfix count
}

export interface SummaryBySourceData {
  epubcheck?: SourceSummary;
  ace?: SourceSummary;
  'js-auditor'?: SourceSummary;
}

interface SummaryBySourceProps {
  summaryBySource: SummaryBySourceData;
  onSourceClick?: (source: 'epubcheck' | 'ace' | 'js-auditor') => void;
}

interface SourceCardProps {
  source: 'epubcheck' | 'ace' | 'js-auditor';
  title: string;
  subtitle: string;
  data: SourceSummary;
  icon: React.ReactNode;
  theme: {
    bg: string;
    accent: string;
    text: string;
    border: string;
  };
  onClick?: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({
  title,
  subtitle,
  data,
  icon,
  theme,
  onClick,
}) => {
  const isClickable = onClick !== undefined;
  
  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        theme.border,
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', theme.bg)}>
            <div className={theme.accent}>{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-semibold text-sm', theme.text)}>{title}</h4>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <span className={cn('text-3xl font-bold', theme.accent)}>
            {data.total}
          </span>
          <p className="text-xs text-gray-500 mt-1">
            {data.total === 1 ? 'issue' : 'issues'}
            {data.autoFixable !== undefined && data.autoFixable > 0 && (
              <span className="ml-1 text-green-600">({data.autoFixable} fixable)</span>
            )}
          </p>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
          {data.critical > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-gray-600">{data.critical} critical</span>
            </div>
          )}
          {data.serious > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span className="text-gray-600">{data.serious} serious</span>
            </div>
          )}
          {data.moderate > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-gray-600">{data.moderate} moderate</span>
            </div>
          )}
          {data.minor > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-gray-600">{data.minor} minor</span>
            </div>
          )}
          {data.critical === 0 && data.serious === 0 && data.moderate === 0 && data.minor === 0 && (
            <div className="col-span-2 text-center text-gray-400">No issues</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SOURCE_CONFIG = {
  epubcheck: {
    title: 'EPUBCheck',
    subtitle: 'Structure & Validity',
    icon: <FileCode className="h-5 w-5" />,
    theme: {
      bg: 'bg-blue-50',
      accent: 'text-blue-600',
      text: 'text-blue-900',
      border: 'border-blue-200',
    },
  },
  ace: {
    title: 'ACE',
    subtitle: 'WCAG Accessibility',
    icon: <Eye className="h-5 w-5" />,
    theme: {
      bg: 'bg-purple-50',
      accent: 'text-purple-600',
      text: 'text-purple-900',
      border: 'border-purple-200',
    },
  },
  'js-auditor': {
    title: 'JS Auditor',
    subtitle: 'Auto + Quick Fix Issues',
    icon: <Wrench className="h-5 w-5" />,
    theme: {
      bg: 'bg-green-50',
      accent: 'text-green-600',
      text: 'text-green-900',
      border: 'border-green-200',
    },
  },
};

const EMPTY_SUMMARY: SourceSummary = {
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 0,
  total: 0,
};

export const SummaryBySource: React.FC<SummaryBySourceProps> = ({
  summaryBySource,
  onSourceClick,
}) => {
  const sources: Array<'epubcheck' | 'ace' | 'js-auditor'> = ['epubcheck', 'ace', 'js-auditor'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {sources.map((source) => {
        const config = SOURCE_CONFIG[source];
        const data = summaryBySource[source] || EMPTY_SUMMARY;
        
        return (
          <SourceCard
            key={source}
            source={source}
            title={config.title}
            subtitle={config.subtitle}
            data={data}
            icon={config.icon}
            theme={config.theme}
            onClick={onSourceClick ? () => onSourceClick(source) : undefined}
          />
        );
      })}
    </div>
  );
};

export default SummaryBySource;
