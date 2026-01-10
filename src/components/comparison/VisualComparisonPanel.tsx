import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVisualComparison } from '@/services/comparison.service';
import { EPUBRenderer } from '../epub/EPUBRenderer';
import { Loader2 } from 'lucide-react';

interface VisualComparisonPanelProps {
  jobId: string;
  changeId: string;
}

export function VisualComparisonPanel({ jobId, changeId }: VisualComparisonPanelProps) {
  const [zoom, setZoom] = useState(100);
  const [syncScroll, setSyncScroll] = useState(true);

  const { data: visualData, isLoading, error } = useQuery({
    queryKey: ['visual-comparison', jobId, changeId],
    queryFn: () => getVisualComparison(jobId, changeId),
    enabled: !!jobId && !!changeId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading visual comparison...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-600">Error loading visual comparison: {String(error)}</p>
      </div>
    );
  }

  if (!visualData || !visualData.beforeContent || !visualData.afterContent) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 italic">No visual preview available</p>
      </div>
    );
  }

  return (
    <div className="visual-comparison-panel h-full flex flex-col">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <h3 className="font-semibold text-lg text-blue-900 mb-2">
          {visualData.change?.description || 'Visual Change'}
        </h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {visualData.change?.changeType && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium text-gray-900">{visualData.change.changeType}</span>
            </div>
          )}
          {visualData.spineItem?.href && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">File:</span>
              <span className="font-medium text-gray-900">{visualData.spineItem.href}</span>
            </div>
          )}
          {visualData.change?.severity && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Severity:</span>
              <span className={`font-medium ${
                visualData.change.severity === 'MAJOR' ? 'text-red-600' :
                visualData.change.severity === 'MINOR' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {visualData.change.severity}
              </span>
            </div>
          )}
        </div>
        {visualData.highlightData?.xpath && (
          <div className="mt-2 text-xs text-gray-500">
            Location: {visualData.highlightData.xpath}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="px-3 py-1 border rounded hover:bg-gray-100"
            aria-label="Zoom out"
          >
            -
          </button>
          <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="px-3 py-1 border rounded hover:bg-gray-100"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
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
          className="overflow-auto border-r"
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
            highlights={[visualData.highlightData]}
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
            highlights={[visualData.highlightData]}
            version="after"
          />
        </div>
      </div>
    </div>
  );
}
