import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import { Badge } from '@/components/ui/Badge';
import { FileText, Code, Layout, Accessibility } from 'lucide-react';

export interface Modification {
  type: string;
  category: 'metadata' | 'content' | 'structure' | 'accessibility';
  description: string;
  filePath: string;
  before?: string;
  after?: string;
  wcagCriteria?: string;
}

interface ComparisonDiffProps {
  modification: Modification;
  viewMode?: 'side-by-side' | 'inline';
  className?: string;
}

const CATEGORY_ICONS = {
  metadata: FileText,
  content: Code,
  structure: Layout,
  accessibility: Accessibility,
};

const CATEGORY_COLORS = {
  metadata: 'bg-purple-50 border-purple-200',
  content: 'bg-blue-50 border-blue-200',
  structure: 'bg-amber-50 border-amber-200',
  accessibility: 'bg-green-50 border-green-200',
};

const detectLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    html: 'markup',
    xhtml: 'markup',
    xml: 'markup',
    opf: 'markup',
    ncx: 'markup',
    svg: 'markup',
    css: 'css',
    js: 'javascript',
  };
  return languageMap[ext] || 'markup';
};

interface HighlightedCodeProps {
  code: string;
  language: string;
  type: 'before' | 'after';
}

const HighlightedCode: React.FC<HighlightedCodeProps> = ({ code, language, type }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const bgColor = type === 'before' ? 'bg-red-50' : 'bg-green-50';
  const borderColor = type === 'before' ? 'border-red-200' : 'border-green-200';

  return (
    <pre className={`p-3 rounded-md ${bgColor} border ${borderColor} text-sm overflow-x-auto`}>
      <code
        ref={codeRef}
        className={`language-${language}`}
        style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          background: 'transparent',
        }}
      >
        {code}
      </code>
    </pre>
  );
};

export const ComparisonDiff: React.FC<ComparisonDiffProps> = ({
  modification,
  viewMode = 'side-by-side',
  className = '',
}) => {
  const Icon = CATEGORY_ICONS[modification.category] || FileText;
  const colorClass = CATEGORY_COLORS[modification.category] || 'bg-gray-50 border-gray-200';
  const language = detectLanguage(modification.filePath);

  const renderCode = (content: string | undefined, type: 'before' | 'after') => {
    if (!content) {
      return <span className="text-gray-400 italic p-3 block">No content</span>;
    }
    return <HighlightedCode code={content} language={language} type={type} />;
  };

  const renderInlineDiff = () => {
    return (
      <div className="space-y-2" role="group" aria-label="Code changes">
        {modification.before && (
          <div className="flex items-start gap-2">
            <span className="text-red-600 font-bold shrink-0 mt-3" aria-label="Removed">-</span>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-red-100 opacity-30 pointer-events-none rounded" />
              <HighlightedCode code={modification.before} language={language} type="before" />
            </div>
          </div>
        )}
        {modification.after && (
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold shrink-0 mt-3" aria-label="Added">+</span>
            <div className="flex-1">
              <HighlightedCode code={modification.after} language={language} type="after" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSideBySide = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-label="Before and after comparison">
        <div>
          <p className="text-sm font-medium text-red-700 mb-2" id="before-label">Before</p>
          <div aria-labelledby="before-label">
            {renderCode(modification.before, 'before')}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-green-700 mb-2" id="after-label">After</p>
          <div aria-labelledby="after-label">
            {renderCode(modification.after, 'after')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-lg ${colorClass} ${className}`}>
      <div className="p-4 border-b border-inherit">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-gray-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-900">{modification.description}</p>
              <p className="text-sm text-gray-500 mt-0.5">{modification.filePath}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="default" size="sm">
              {modification.category}
            </Badge>
            {modification.wcagCriteria && (
              <Badge variant="info" size="sm">
                {modification.wcagCriteria}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {(modification.before || modification.after) && (
        <div className="p-4">
          {viewMode === 'inline' ? renderInlineDiff() : renderSideBySide()}
        </div>
      )}
    </div>
  );
};
