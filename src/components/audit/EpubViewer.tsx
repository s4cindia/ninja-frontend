import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';

interface EpubViewerProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  filePath: string;
  issueCode?: string;
  cssSelector?: string;
}

const getIssueTypeSelector = (issueCode?: string): string => {
  if (!issueCode) return '';
  
  const issueSelectors: Record<string, string> = {
    'IMAGE-ALT': 'img[alt=""], img[alt=" "], img:not([alt])',
    'IMG-ALT': 'img[alt=""], img[alt=" "], img:not([alt])',
    'LINK-IN-TEXT-BLOCK': 'a',
    'LINK-TEXT': 'a',
    'HEADING-ORDER': 'h1, h2, h3, h4, h5, h6',
    'PAGE-TITLE': 'title',
    'LANG': 'html',
    'TABLE-HEADER': 'table',
    'LIST': 'ul, ol, dl',
    'LANDMARK': 'main, nav, header, footer, aside',
  };

  const codeUpper = issueCode.toUpperCase();
  for (const [key, selector] of Object.entries(issueSelectors)) {
    if (codeUpper.includes(key)) {
      return selector;
    }
  }
  return '';
};

export function EpubViewer({ isOpen, onClose, jobId, filePath, issueCode, cssSelector }: EpubViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/epub/job/${jobId}/content`, {
        params: { path: filePath },
        responseType: 'text',
      });

      let html = response.data;

      const highlightStyle = `
        <style>
          .issue-highlight {
            outline: 4px solid #ef4444 !important;
            background-color: #fef2f2 !important;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { outline-color: #ef4444; }
            50% { outline-color: #f97316; }
          }
        </style>
      `;

      const escapedSelector = cssSelector ? cssSelector.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
      const fallbackSelector = getIssueTypeSelector(issueCode);

      const highlightScript = `
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            let targetElement = null;

            ${escapedSelector ? `
              try {
                targetElement = document.querySelector('${escapedSelector}');
              } catch(e) { console.log('Selector failed:', e); }
            ` : ''}

            ${fallbackSelector ? `
              if (!targetElement) {
                try {
                  const elements = document.querySelectorAll('${fallbackSelector}');
                  if (elements.length > 0) targetElement = elements[0];
                } catch(e) { console.log('Fallback selector failed:', e); }
              }
            ` : ''}

            if (!targetElement) {
              const images = document.querySelectorAll('img[alt=""], img[alt=" "], img:not([alt])');
              if (images.length > 0) targetElement = images[0];
            }

            if (!targetElement) {
              const links = document.querySelectorAll('a');
              if (links.length > 0) targetElement = links[0];
            }

            if (targetElement) {
              targetElement.classList.add('issue-highlight');
              setTimeout(function() {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          });
        </script>
      `;

      if (html.includes('</head>')) {
        html = html.replace('</head>', highlightStyle + '</head>');
      } else {
        html = highlightStyle + html;
      }

      if (html.includes('</body>')) {
        html = html.replace('</body>', highlightScript + '</body>');
      } else {
        html = html + highlightScript;
      }

      setContent(html);
    } catch (err) {
      setError('Failed to load content. The backend endpoint may not be available yet.');
    } finally {
      setLoading(false);
    }
  }, [jobId, filePath, cssSelector, issueCode]);

  useEffect(() => {
    if (isOpen && filePath) {
      loadContent();
    }
  }, [isOpen, filePath, loadContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">View in Context</h2>
            <span className="text-sm text-gray-500 truncate max-w-md">{filePath}</span>
            {issueCode && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                {issueCode}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close viewer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading content...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-4">
                <p className="text-red-500 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={loadContent}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
          {!loading && !error && (
            <iframe
              srcDoc={content}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              title="EPUB Content"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default EpubViewer;
