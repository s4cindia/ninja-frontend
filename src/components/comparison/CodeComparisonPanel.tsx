import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Loader2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { getVisualComparison } from '@/services/comparison.service';
import type { RemediationChange } from '@/types/comparison';

interface CodeComparisonPanelProps {
  change: RemediationChange;
  jobId: string;
}

const getSeverityVariant = (severity?: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'error';
    case 'MAJOR':
      return 'warning';
    case 'MINOR':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusVariant = (status: string): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'APPLIED':
      return 'success';
    case 'REJECTED':
    case 'FAILED':
      return 'error';
    case 'SKIPPED':
    case 'REVERTED':
      return 'warning';
    default:
      return 'default';
  }
};

function extractRelevantHtml(fullHtml: string, changeDescription?: string): string {
  if (!fullHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, 'text/html');
  const desc = changeDescription?.toLowerCase() || '';

  let elements: Element[] = [];

  if (desc.includes('table') || desc.includes('header')) {
    elements = Array.from(doc.querySelectorAll('table'));
  } else if (desc.includes('image') || desc.includes('alt')) {
    elements = Array.from(doc.querySelectorAll('img'));
  } else if (desc.includes('role') || desc.includes('section') || desc.includes('main')) {
    elements = Array.from(doc.querySelectorAll('section, main, [role]'));
  } else if (desc.includes('lang')) {
    const html = doc.querySelector('html');
    if (html) {
      return `<html lang="${html.getAttribute('lang') || ''}">`;
    }
  } else if (desc.includes('heading')) {
    elements = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  } else if (desc.includes('link')) {
    elements = Array.from(doc.querySelectorAll('a'));
  } else if (desc.includes('list')) {
    elements = Array.from(doc.querySelectorAll('ul, ol'));
  }

  if (elements.length > 0) {
    const maxElements = 3;
    const relevantElements = elements.slice(0, maxElements);
    return relevantElements.map(el => formatHtml(el.outerHTML)).join('\n\n');
  }

  const body = doc.body;
  if (body) {
    const truncated = body.innerHTML.substring(0, 2000);
    return formatHtml(truncated) + (body.innerHTML.length > 2000 ? '\n<!-- ... truncated ... -->' : '');
  }

  return fullHtml.substring(0, 2000);
}

function formatHtml(html: string): string {
  let formatted = html;
  let indent = 0;
  const lines: string[] = [];

  formatted = formatted.replace(/></g, '>\n<');

  formatted.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }

    lines.push('  '.repeat(indent) + trimmed);

    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      indent++;
    }
  });

  return lines.join('\n');
}

export const CodeComparisonPanel: React.FC<CodeComparisonPanelProps> = ({ change, jobId }) => {
  const { data: visualData, isLoading, error: visualError } = useQuery({
    queryKey: ['visual-comparison', jobId, change.id],
    queryFn: () => getVisualComparison(jobId, change.id),
    enabled: !!jobId && !!change.id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // The /visual endpoint is EPUB-only; PDF jobs are expected to 404.
  // Log unexpected failures so EPUB issues don't go unnoticed.
  useEffect(() => {
    if (visualError) {
      const status = (visualError as { response?: { status?: number } }).response?.status;
      if (status !== 404 && status !== 501) {
        console.warn('[CodeComparisonPanel] Unexpected visual API error:', visualError);
      }
    }
  }, [visualError]);

  // Use sourceHtml for code view (readable paths) instead of html (base64 images)
  const beforeHtml = visualData?.beforeContent?.sourceHtml || visualData?.beforeContent?.html;
  const afterHtml = visualData?.afterContent?.sourceHtml || visualData?.afterContent?.html;

  const beforeContent = beforeHtml
    ? extractRelevantHtml(beforeHtml, change.description)
    : change.beforeContent || change.contextBefore;

  const afterContent = afterHtml
    ? extractRelevantHtml(afterHtml, change.description)
    : change.afterContent || change.contextAfter;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {change.description}
        </h3>

        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
            {change.filePath}
            {change.lineNumber && `:${change.lineNumber}`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {change.severity && (
            <Badge variant={getSeverityVariant(change.severity)}>
              {change.severity}
            </Badge>
          )}

          {change.wcagCriteria && (
            <Badge variant="info">
              WCAG {change.wcagCriteria}
              {change.wcagLevel && ` (${change.wcagLevel})`}
            </Badge>
          )}

          <Badge variant={getStatusVariant(change.status)}>
            {change.status}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading code comparison...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-b md:border-b-0 md:border-r border-gray-200">
            <div className="bg-red-50 px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-red-700">BEFORE</span>
            </div>
            <div className="p-2 overflow-x-auto max-h-96 overflow-y-auto">
              {beforeContent ? (
                <SyntaxHighlighter
                  language="xml"
                  style={vscDarkPlus}
                  wrapLines
                  customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '12px' }}
                >
                  {beforeContent}
                </SyntaxHighlighter>
              ) : (
                <p className="text-sm text-gray-500 italic p-4">No code changes to display</p>
              )}
            </div>
          </div>

          <div>
            <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-green-700">AFTER</span>
            </div>
            <div className="p-2 overflow-x-auto max-h-96 overflow-y-auto">
              {afterContent ? (
                <SyntaxHighlighter
                  language="xml"
                  style={vscDarkPlus}
                  wrapLines
                  customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '12px' }}
                >
                  {afterContent}
                </SyntaxHighlighter>
              ) : (
                <p className="text-sm text-gray-500 italic p-4">No code changes to display</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
