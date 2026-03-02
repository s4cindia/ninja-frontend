import { useState } from 'react';
import { ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/utils/cn';

interface RemediationDiffViewerProps {
  before: string;
  after: string;
  filePath: string;
  className?: string;
}

function detectLanguage(filePath: string): string {
  if (filePath.endsWith('.xml') || filePath.endsWith('.xhtml') || filePath.endsWith('.opf') || filePath.endsWith('.ncx')) return 'xml';
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) return 'html';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  return 'markup';
}

export function RemediationDiffViewer({ before, after, filePath, className }: RemediationDiffViewerProps) {
  const [open, setOpen] = useState(false);
  const language = detectLanguage(filePath);
  const fileName = filePath.split('/').pop() ?? filePath;

  return (
    <div className={cn('border border-gray-200 rounded-md overflow-hidden text-xs', className)}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Code2 size={13} />
          <span className="font-mono text-gray-500">{fileName}</span>
          <span className="text-gray-400">— Show code diff</span>
        </div>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Before */}
          <div>
            <div className="px-3 py-1 bg-red-50 text-red-700 font-medium text-xs border-b border-red-100">
              Before
            </div>
            <div className="overflow-auto max-h-64">
              <SyntaxHighlighter
                language={language}
                style={oneLight}
                customStyle={{ margin: 0, padding: '8px', fontSize: '11px', background: '#fff8f8', borderRadius: 0 }}
                wrapLines
                wrapLongLines
              >
                {before}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* After */}
          <div>
            <div className="px-3 py-1 bg-green-50 text-green-700 font-medium text-xs border-b border-green-100">
              After
            </div>
            <div className="overflow-auto max-h-64">
              <SyntaxHighlighter
                language={language}
                style={oneLight}
                customStyle={{ margin: 0, padding: '8px', fontSize: '11px', background: '#f0fdf4', borderRadius: 0 }}
                wrapLines
                wrapLongLines
              >
                {after}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
