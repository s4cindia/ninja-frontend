import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVisualComparison } from '@/services/comparison.service';
import { EPUBRenderer } from '../epub/EPUBRenderer';
import { Loader2, ZoomIn, ZoomOut, Info } from 'lucide-react';

function getFallbackSelector(changeType?: string): string | undefined {
  const normalizedType = changeType?.toLowerCase().replace(/[-_]/g, '');
  
  switch (normalizedType) {
    case 'epubstruct002':
      return 'table';
    case 'epubimg001':
    case 'epubimg002':
      return 'img';
    case 'epublang001':
      return 'html';
    default:
      return undefined;
  }
}

interface VisualComparisonPanelProps {
  jobId: string;
  changeId: string;
  changeDescription?: string;
  changeType?: string;
  filePath?: string;
  severity?: string;
}

export function VisualComparisonPanel({
  jobId,
  changeId,
  changeDescription,
  changeType,
  filePath,
  severity
}: VisualComparisonPanelProps) {
  const [zoom, setZoom] = useState(100);
  const [syncScroll, setSyncScroll] = useState(true);

  const { data: visualData, isLoading, error } = useQuery({
    queryKey: ['visual-comparison', jobId, changeId],
    queryFn: () => getVisualComparison(jobId, changeId),
    enabled: !!jobId && !!changeId,
    retry: 1
  });

  const effectiveHighlights = useMemo(() => {
    const actualType = changeType || visualData?.change?.changeType;
    const baseHighlight = visualData?.highlightData;
    
    if (baseHighlight?.xpath || baseHighlight?.cssSelector) {
      return [baseHighlight];
    }
    
    const fallbackSelector = getFallbackSelector(actualType);
    if (fallbackSelector) {
      return [{
        xpath: '',
        cssSelector: fallbackSelector,
        description: changeDescription || visualData?.change?.description || 'Changed element'
      }];
    }
    
    return undefined;
  }, [visualData, changeType, changeDescription]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading visual comparison...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Visual preview not available</p>
          <p className="text-sm text-gray-500 mt-1">This change may be in a metadata file</p>
        </div>
      </div>
    );
  }

  if (!visualData || !visualData.beforeContent || !visualData.afterContent) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 italic">No visual preview available</p>
      </div>
    );
  }

  return (
    <div className="visual-comparison-panel h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {changeDescription || visualData.change?.description || 'Visual Change'}
        </h3>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span>
            <strong>Type:</strong> {changeType || visualData.change?.changeType}
          </span>
          <span>
            <strong>File:</strong> {filePath || visualData.spineItem?.href}
          </span>
          {(severity || visualData.change?.severity) && (
            <span>
              <strong>Severity:</strong>{' '}
              <span className={`font-medium ${
                (severity || visualData.change?.severity) === 'MAJOR' ? 'text-red-600' :
                (severity || visualData.change?.severity) === 'MINOR' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {severity || visualData.change?.severity}
              </span>
            </span>
          )}
        </div>
        {visualData.highlightData?.xpath && (
          <div className="mt-2 text-xs text-gray-500">
            Location: {visualData.highlightData.xpath}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={zoom <= 50}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={zoom >= 200}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sync-scroll"
            checked={syncScroll}
            onChange={(e) => setSyncScroll(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="sync-scroll" className="text-sm">Sync Scroll</label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden">
        <div
          className="overflow-auto border-r border-gray-200"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`
          }}
        >
          <div className="bg-red-50 px-4 py-2 sticky top-0 z-10 border-b border-red-200">
            <span className="font-semibold text-red-700">BEFORE</span>
          </div>
          <EPUBRenderer
            html={visualData.beforeContent.html}
            css={visualData.beforeContent.css}
            baseUrl={visualData.beforeContent.baseHref}
            highlights={effectiveHighlights}
            version="before"
          />
        </div>

        <div
          className="overflow-auto"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`
          }}
        >
          <div className="bg-green-50 px-4 py-2 sticky top-0 z-10 border-b border-green-200">
            <span className="font-semibold text-green-700">AFTER</span>
          </div>
          <EPUBRenderer
            html={visualData.afterContent.html}
            css={visualData.afterContent.css}
            baseUrl={visualData.afterContent.baseHref}
            highlights={effectiveHighlights}
            version="after"
          />
        </div>
      </div>
    </div>
  );
}
