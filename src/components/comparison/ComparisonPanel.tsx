import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from '../ui/Badge';
import type { RemediationChange, ChangeStatus } from '@/types/comparison';

interface ComparisonPanelProps {
  change: RemediationChange;
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

const getStatusVariant = (status: ChangeStatus): 'success' | 'error' | 'warning' | 'default' => {
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

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ change }) => {
  const beforeContent = change.beforeContent || change.contextBefore;
  const afterContent = change.afterContent || change.contextAfter;

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
      
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b md:border-b-0 md:border-r border-gray-200">
          <div className="bg-red-50 px-4 py-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-red-700">BEFORE</span>
          </div>
          <div className="p-2 overflow-x-auto">
            {beforeContent ? (
              <SyntaxHighlighter
                language="xml"
                style={vscDarkPlus}
                wrapLines
                customStyle={{ margin: 0, borderRadius: '0.375rem' }}
              >
                {beforeContent}
              </SyntaxHighlighter>
            ) : (
              <p className="text-sm text-gray-500 italic p-4">No preview available</p>
            )}
          </div>
        </div>
        
        <div>
          <div className="bg-green-50 px-4 py-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-green-700">AFTER</span>
          </div>
          <div className="p-2 overflow-x-auto">
            {afterContent ? (
              <SyntaxHighlighter
                language="xml"
                style={vscDarkPlus}
                wrapLines
                customStyle={{ margin: 0, borderRadius: '0.375rem' }}
              >
                {afterContent}
              </SyntaxHighlighter>
            ) : (
              <p className="text-sm text-gray-500 italic p-4">No preview available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
