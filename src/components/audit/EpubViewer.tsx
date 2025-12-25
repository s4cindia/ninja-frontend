import { useState, useEffect } from 'react';
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

export function EpubViewer({ isOpen, onClose, jobId, filePath, issueCode, cssSelector }: EpubViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && filePath) {
      loadContent();
    }
  }, [isOpen, filePath, jobId]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/epub/job/${jobId}/content`, {
        params: { path: filePath },
        responseType: 'text',
      });

      let html = response.data;
      if (cssSelector) {
        const highlightStyle = `<style>[data-issue-highlight] { outline: 3px solid #ef4444 !important; background: #fef2f2 !important; }</style>`;
        html = html.replace('</head>', `${highlightStyle}</head>`);
      }

      setContent(html);
    } catch (err) {
      setError('Failed to load content. The backend endpoint may not be available yet.');
    } finally {
      setLoading(false);
    }
  };

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
              sandbox="allow-same-origin"
              title="EPUB Content"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default EpubViewer;
