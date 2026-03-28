import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnnotationGuide } from '@/hooks/useZoneReview';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';

/* Minimal markdown-to-HTML: handles ##, |tables|, **bold**, \n */
function renderMarkdown(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2 class="text-lg font-bold mt-6 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1 class="text-xl font-bold mt-6 mb-3">${line.slice(2)}</h1>`;
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(Boolean).map((c) => c.trim());
        if (cells.every((c) => /^[-:]+$/.test(c))) return '';
        const tag = 'td';
        return `<tr>${cells.map((c) => `<${tag} class="border border-gray-200 px-2 py-1 text-sm">${c}</${tag}>`).join('')}</tr>`;
      }
      if (line.trim() === '') return '<br/>';
      return `<p class="text-sm text-gray-700 mb-1">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

export default function AnnotationGuidePage() {
  const { runId } = useParams<{ runId: string }>();
  const { data: guide, isLoading, error } = useAnnotationGuide(runId!);
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState(1);

  const currentPageData = useMemo(
    () => guide?.pages?.find((p) => p.pageNumber === selectedPage),
    [guide, selectedPage],
  );

  const handleRegenerate = useCallback(() => {
    if (!window.confirm('Regenerate the annotation guide? This will re-fetch from the server.')) return;
    queryClient.invalidateQueries({ queryKey: ['annotation-guide', runId] });
  }, [queryClient, runId]);

  const handleExportMarkdown = useCallback(() => {
    if (!guide?.pages) return;
    const content = guide.pages.map((p) => p.markdown).join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotation-guide-${runId?.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [guide, runId]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !guide || !guide.pages || guide.pages.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
          <h1 className="text-xl font-semibold">Annotation Guide</h1>
        </div>
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No annotation guide generated yet.</p>
          <p className="text-sm mt-1">Click Generate to create one.</p>
          <button
            onClick={handleRegenerate}
            className="mt-4 px-4 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700"
          >
            Generate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
          <h1 className="text-xl font-semibold">Annotation Guide</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Export as Markdown
          </button>
          <button
            onClick={handleRegenerate}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Page navigation sidebar */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-lg shadow p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pages</h3>
            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
              {guide.pages.map((p) => (
                <button
                  key={p.pageNumber}
                  onClick={() => setSelectedPage(p.pageNumber)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    selectedPage === p.pageNumber
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-xs mr-1">P{p.pageNumber}</span>
                  <span className="text-xs text-gray-400">({p.zoneCount} zones)</span>
                  {p.title && <div className="text-xs text-gray-500 truncate mt-0.5">{p.title}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-white rounded-lg shadow p-6 min-w-0">
          {currentPageData ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(currentPageData.markdown) }}
            />
          ) : (
            <div className="text-center py-12 text-gray-400">
              Select a page from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
