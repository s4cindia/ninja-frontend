import React from 'react';
import { FileCode, AlertCircle, Code } from 'lucide-react';
import type { AccessibilityIssue } from '@/types/accessibility.types';

interface CodePreviewProps {
  issue: AccessibilityIssue;
  previewContent: string | null;
  onEditManually: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDiffPreview(content: string): string {
  return content
    .split('\n')
    .map(line => {
      if (line.startsWith('+')) {
        return `<span class="text-green-400">${escapeHtml(line)}</span>`;
      }
      if (line.startsWith('-')) {
        return `<span class="text-red-400">${escapeHtml(line)}</span>`;
      }
      return `<span class="text-gray-400">${escapeHtml(line)}</span>`;
    })
    .join('\n');
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  issue,
  previewContent,
  onEditManually,
}) => {
  if (!previewContent) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="font-medium text-gray-900 mb-2">No Preview Available</h3>
        <p className="text-sm text-gray-600 mb-4">
          Fill out the Quick Fix form to see a preview of the changes.
        </p>
        <button
          onClick={onEditManually}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Code className="h-4 w-4" />
          Edit Code Manually
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileCode className="h-4 w-4" />
          <span>Changes to: {issue.location || 'content.opf'}</span>
        </div>
        <button
          onClick={onEditManually}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Edit Manually
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300">
          Preview Changes
        </div>
        <pre className="p-4 bg-gray-900 text-sm overflow-x-auto max-h-64">
          <code
            className="text-gray-100"
            dangerouslySetInnerHTML={{
              __html: formatDiffPreview(previewContent)
            }}
          />
        </pre>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-500/20 border border-green-500 rounded-sm"></span>
          Added lines
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-500/20 border border-red-500 rounded-sm"></span>
          Removed lines
        </span>
      </div>
    </div>
  );
};

export default CodePreview;
