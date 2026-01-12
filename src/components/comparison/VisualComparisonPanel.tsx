import React, { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVisualComparison } from '@/services/comparison.service';
import { EPUBRenderer } from '../epub/EPUBRenderer';
import { Loader2, ZoomIn, ZoomOut, Info, Code, AlertTriangle, Columns, Rows, Maximize2, X } from 'lucide-react';

interface ChangeExplanation {
  title: string;
  what: string;
  why: string;
  visual: string;
  codeExample: boolean;
}

function getChangeExplanation(changeType?: string, changeDescription?: string): ChangeExplanation {
  const desc = changeDescription?.toLowerCase() || '';
  const type = changeType?.toLowerCase() || '';
  
  if (desc.includes('header') && desc.includes('table')) {
    return {
      title: "Table Header Accessibility Fix",
      what: "Added semantic HTML table header elements (<thead> and <th> tags) to identify header rows.",
      why: "Screen readers can now properly announce these rows as headers and allow users to navigate by table structure.",
      visual: "The tables look identical visually, but the underlying HTML structure is now accessible.",
      codeExample: true
    };
  }

  if (type.includes('aria')) {
    return {
      title: "ARIA Attribute Enhancement",
      what: "Added or updated ARIA (Accessible Rich Internet Applications) attributes.",
      why: "ARIA attributes provide additional context to assistive technologies about the purpose and state of elements.",
      visual: "No visual change - ARIA attributes are invisible but essential for screen readers.",
      codeExample: false
    };
  }

  if (desc.includes('alt')) {
    return {
      title: "Image Alt Text Addition",
      what: "Added or improved alternative text descriptions for images.",
      why: "Screen readers read alt text aloud, allowing blind users to understand image content.",
      visual: "Alt text is not visible on screen but appears in the HTML code.",
      codeExample: false
    };
  }

  if (type.includes('struct')) {
    return {
      title: "Structural Accessibility Fix",
      what: "Improved the semantic HTML structure for better accessibility.",
      why: "Proper semantic structure helps assistive technologies understand and navigate content.",
      visual: "Changes may not be visually obvious but improve the experience for users with disabilities.",
      codeExample: false
    };
  }

  return {
    title: "Accessibility Enhancement",
    what: "Made structural improvements to improve accessibility compliance.",
    why: "These changes help assistive technologies better understand and navigate the content.",
    visual: "Changes may not be visually obvious but improve the experience for users with disabilities.",
    codeExample: false
  };
}

function getFallbackSelector(changeType?: string): string | undefined {
  const normalizedType = changeType?.toLowerCase().replace(/[-_]/g, '') || '';
  
  // Direct code matches
  switch (normalizedType) {
    case 'epubstruct002':
      return 'table';
    case 'epubimg001':
    case 'epubimg002':
      return 'img';
    case 'epublang001':
      return 'html';
  }
  
  // Pattern-based fallbacks
  if (normalizedType.includes('table') || normalizedType.includes('header')) {
    return 'table';
  }
  if (normalizedType.includes('img') || normalizedType.includes('alt')) {
    return 'img';
  }
  if (normalizedType.includes('lang')) {
    return 'html';
  }
  if (normalizedType.includes('link') || normalizedType.includes('href')) {
    return 'a';
  }
  if (normalizedType.includes('list')) {
    return 'ul, ol';
  }
  if (normalizedType.includes('heading')) {
    return 'h1, h2, h3, h4, h5, h6';
  }
  
  return undefined;
}

interface VisualComparisonPanelProps {
  jobId: string;
  changeId: string;
  changeDescription?: string;
  changeType?: string;
  filePath?: string;
  severity?: string;
  currentIndex?: number;
  totalChanges?: number;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function VisualComparisonPanel({
  jobId,
  changeId,
  changeDescription,
  changeType,
  filePath,
  severity,
  currentIndex,
  totalChanges,
  onNavigatePrevious,
  onNavigateNext,
  canNavigatePrevious,
  canNavigateNext,
  isFullscreen: externalFullscreen,
  onToggleFullscreen
}: VisualComparisonPanelProps) {
  const [zoom, setZoom] = useState(100);
  const [showCode, setShowCode] = useState(false);
  const [layout, setLayout] = useState<'side-by-side' | 'stacked'>('side-by-side');
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalFullscreen ?? internalFullscreen;
  const handleOpenFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      if (!isFullscreen) onToggleFullscreen();
    } else {
      setInternalFullscreen(true);
    }
  }, [onToggleFullscreen, isFullscreen]);
  const handleCloseFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      if (isFullscreen) onToggleFullscreen();
    } else {
      setInternalFullscreen(false);
    }
  }, [onToggleFullscreen, isFullscreen]);
  const [fullscreenMode, setFullscreenMode] = useState<'before' | 'after' | 'compare'>('compare');
  const [showCodeChanges, setShowCodeChanges] = useState(false);
  const [isPending, startTransition] = useTransition();
  const beforeScrollRef = useRef<HTMLDivElement>(null);
  const afterScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        `%c[VisualComparisonPanel] MOUNTED`,
        'background: #4CAF50; color: white; padding: 2px 5px;',
        { changeId }
      );
    }

    return () => {
      if (import.meta.env.DEV) {
        const lifetime = Date.now() - mountTime.current;
        console.log(
          `%c[VisualComparisonPanel] UNMOUNTED`,
          'background: #f44336; color: white; padding: 2px 5px;',
          { changeId, lifetime: `${lifetime}ms`, renders: renderCount.current }
        );
      }
    };
  }, [changeId]);

  useEffect(() => {
    if (import.meta.env.DEV && renderCount.current > 1) {
      console.warn(
        `%c[VisualComparisonPanel] RE-RENDER #${renderCount.current}`,
        'background: #ff9800; color: white; padding: 2px 5px;',
        { changeId }
      );
    }
  });

  const { data: queryData, isLoading, error, isFetching } = useQuery({
    queryKey: ['visual-comparison', jobId, changeId],
    queryFn: () => getVisualComparison(jobId, changeId),
    enabled: !!jobId && !!changeId,
    staleTime: Infinity, // Never refetch - data won't change during session
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    notifyOnChangeProps: ['data', 'error'],
    // Use select to create stable object references - only recreate if content actually changed
    select: (data) => ({
      ...data,
      // Freeze content references to prevent React Query from creating new objects
      beforeContent: data.beforeContent,
      afterContent: data.afterContent,
      change: data.change,
      highlightData: data.highlightData,
      spineItem: data.spineItem,
    }),
  });

  const cachedDataRef = useRef(queryData);
  if (queryData?.beforeContent && queryData?.afterContent) {
    cachedDataRef.current = queryData;
  }
  const displayData = queryData || cachedDataRef.current;

  const handleZoomOut = useCallback(() => {
    startTransition(() => {
      setZoom(prev => Math.max(50, prev - 10));
    });
  }, [startTransition]);

  const handleZoomIn = useCallback(() => {
    startTransition(() => {
      setZoom(prev => Math.min(200, prev + 10));
    });
  }, [startTransition]);

  const handleZoomReset = useCallback(() => {
    startTransition(() => {
      setZoom(100);
    });
  }, [startTransition]);

  const effectiveHighlights = useMemo(() => {
    const actualType = changeType || displayData?.change?.changeType;
    const baseHighlight = displayData?.highlightData;
    
    if (baseHighlight?.xpath || baseHighlight?.cssSelector) {
      return [baseHighlight];
    }
    
    const fallbackSelector = getFallbackSelector(actualType);
    if (fallbackSelector) {
      return [{
        xpath: '',
        cssSelector: fallbackSelector,
        description: changeDescription || displayData?.change?.description || 'Changed element'
      }];
    }
    
    return undefined;
  }, [displayData, changeType, changeDescription]);

  const isStructuralChange = useMemo(() => {
    const type = changeType || displayData?.change?.changeType || '';
    const desc = changeDescription || displayData?.change?.description || '';
    return type.toLowerCase().includes('struct') ||
           desc.toLowerCase().includes('header') ||
           desc.toLowerCase().includes('semantic') ||
           desc.toLowerCase().includes('aria');
  }, [changeType, changeDescription, displayData]);

  const currentChangeId = displayData?.change?.id || changeId;
  const rendererProps = useMemo(() => {
    if (!displayData) return null;

    return {
      changeId: currentChangeId,
      before: {
        html: displayData.beforeContent.html,
        css: displayData.beforeContent.css,
        baseUrl: displayData.beforeContent.baseHref,
        highlights: effectiveHighlights
      },
      after: {
        html: displayData.afterContent.html,
        css: displayData.afterContent.css,
        baseUrl: displayData.afterContent.baseHref,
        highlights: effectiveHighlights
      }
    };
  }, [currentChangeId, displayData?.beforeContent?.html, displayData?.afterContent?.html, effectiveHighlights]);

  const beforeRenderer = useMemo(() => {
    if (!rendererProps) return null;
    return (
      <EPUBRenderer
        key="before-stable"
        poolKey="inline-before"
        html={rendererProps.before.html}
        css={rendererProps.before.css}
        baseUrl={rendererProps.before.baseUrl}
        highlights={rendererProps.before.highlights}
        version="before"
      />
    );
  }, [rendererProps]);

  const afterRenderer = useMemo(() => {
    if (!rendererProps) return null;
    return (
      <EPUBRenderer
        key="after-stable"
        poolKey="inline-after"
        html={rendererProps.after.html}
        css={rendererProps.after.css}
        baseUrl={rendererProps.after.baseUrl}
        highlights={rendererProps.after.highlights}
        version="after"
      />
    );
  }, [rendererProps]);

  // Memoized fullscreen renderers - only created when actually in fullscreen
  const fullscreenBeforeRenderer = useMemo(() => {
    if (!isFullscreen || !rendererProps) return null;
    return (
      <EPUBRenderer
        key={`fullscreen-before-${currentChangeId}`}
        poolKey="fullscreen-before"
        html={rendererProps.before.html}
        css={rendererProps.before.css}
        baseUrl={rendererProps.before.baseUrl}
        highlights={rendererProps.before.highlights}
        version="before"
        className="h-full"
      />
    );
  }, [isFullscreen, rendererProps, currentChangeId]);

  const fullscreenAfterRenderer = useMemo(() => {
    if (!isFullscreen || !rendererProps) return null;
    return (
      <EPUBRenderer
        key={`fullscreen-after-${currentChangeId}`}
        poolKey="fullscreen-after"
        html={rendererProps.after.html}
        css={rendererProps.after.css}
        baseUrl={rendererProps.after.baseUrl}
        highlights={rendererProps.after.highlights}
        version="after"
        className="h-full"
      />
    );
  }, [isFullscreen, rendererProps, currentChangeId]);

  const toggleLayout = useCallback((newLayout: 'side-by-side' | 'stacked') => {
    startTransition(() => {
      setLayout(newLayout);
    });
  }, [startTransition]);

  useEffect(() => {
    if (import.meta.env.DEV && displayData) {
      console.log('[VisualComparisonPanel] Data loaded:', {
        htmlSize: displayData.beforeContent.html.length + displayData.afterContent.html.length,
        cssFiles: displayData.beforeContent.css.length + displayData.afterContent.css.length,
        hasHighlights: !!displayData.highlightData,
        highlightData: displayData.highlightData,
        effectiveHighlights: effectiveHighlights
      });
    }
  }, [displayData, effectiveHighlights]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseFullscreen();
      } else if (e.key === '1') {
        setFullscreenMode('before');
      } else if (e.key === '2') {
        setFullscreenMode('after');
      } else if (e.key === '3') {
        setFullscreenMode('compare');
      } else if (e.key === 'ArrowLeft' && canNavigatePrevious && onNavigatePrevious) {
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && canNavigateNext && onNavigateNext) {
        onNavigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, canNavigatePrevious, canNavigateNext, onNavigatePrevious, onNavigateNext]);

  const handleSyncScroll = useCallback((source: 'before' | 'after') => (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;

    const sourceEl = e.currentTarget;
    const targetEl = source === 'before' ? afterScrollRef.current : beforeScrollRef.current;

    if (!targetEl) return;

    isScrollingRef.current = true;

    const sourceScrollableHeight = sourceEl.scrollHeight - sourceEl.clientHeight;
    const scrollPercentage = sourceScrollableHeight > 0 
      ? sourceEl.scrollTop / sourceScrollableHeight 
      : 0;
    const targetScrollableHeight = targetEl.scrollHeight - targetEl.clientHeight;
    targetEl.scrollTop = scrollPercentage * targetScrollableHeight;

    requestAnimationFrame(() => {
      isScrollingRef.current = false;
    });
  }, []);

  if (isLoading && !displayData) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading visual comparison...</span>
      </div>
    );
  }

  if (error && !displayData) {
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

  if (!displayData || !displayData.beforeContent || !displayData.afterContent) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 italic">No visual preview available</p>
      </div>
    );
  }

  return (
    <div className="visual-comparison-panel h-full flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden relative">
      {(isPending || isFetching) && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-50 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      )}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {changeDescription || displayData.change?.description || 'Visual Change'}
        </h3>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span>
            <strong>Type:</strong> {changeType || displayData.change?.changeType}
          </span>
          <span>
            <strong>File:</strong> {filePath || displayData.spineItem?.href}
          </span>
          {(severity || displayData.change?.severity) && (
            <span>
              <strong>Severity:</strong>{' '}
              <span className={`font-medium ${
                (severity || displayData.change?.severity) === 'MAJOR' ? 'text-red-600' :
                (severity || displayData.change?.severity) === 'MINOR' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {severity || displayData.change?.severity}
              </span>
            </span>
          )}
        </div>
        {displayData.highlightData?.xpath && (
          <div className="mt-2 text-xs text-gray-500">
            Location: {displayData.highlightData.xpath}
          </div>
        )}
      </div>

      {isStructuralChange && (() => {
        const explanation = getChangeExplanation(
          changeType || displayData.change?.changeType,
          changeDescription || displayData.change?.description
        );
        return (
          <>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {explanation.title}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 space-y-2">
                    <div className="bg-yellow-100 bg-opacity-50 p-2 rounded text-xs space-y-1">
                      <p><strong>What changed:</strong> {explanation.what}</p>
                      <p><strong>Why it matters:</strong> {explanation.why}</p>
                      <p><strong>Visual impact:</strong> {explanation.visual}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {explanation.codeExample && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <Code size={14} />
                  {showCode ? 'Hide' : 'Show'} HTML code changes
                </button>

                {showCode && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-red-50 border border-red-200 rounded overflow-hidden">
                      <div className="bg-red-100 px-3 py-1 text-red-800 font-semibold border-b border-red-200">
                        Before (regular cells)
                      </div>
                      <pre className="text-red-900 p-3 overflow-x-auto whitespace-pre-wrap">
{`<table>
  <tr>
    <td>Header Cell</td>
  </tr>
  <tr>
    <td>Data</td>
  </tr>
</table>`}
                      </pre>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded overflow-hidden">
                      <div className="bg-green-100 px-3 py-1 text-green-800 font-semibold border-b border-green-200">
                        After (with semantic headers)
                      </div>
                      <pre className="text-green-900 p-3 overflow-x-auto whitespace-pre-wrap">
{`<table>
  <thead>
    <tr>
      <th>Header Cell</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
    </tr>
  </tbody>
</table>`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={zoom <= 50}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            disabled={zoom >= 200}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
          >
            Reset
          </button>
        </div>

        {/* Sync scroll is only functional in fullscreen compare mode */}

        <div className="flex items-center gap-2 ml-4 border-l border-gray-300 pl-4">
          <button
            onClick={() => toggleLayout('side-by-side')}
            className={`p-2 border rounded ${
              layout === 'side-by-side'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Side by side"
            aria-label="Side by side layout"
          >
            <Columns size={16} />
          </button>
          <button
            onClick={() => toggleLayout('stacked')}
            className={`p-2 border rounded ${
              layout === 'stacked'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
            title="Stacked"
            aria-label="Stacked layout"
          >
            <Rows size={16} />
          </button>
        </div>

        <button
          onClick={() => handleOpenFullscreen()}
          className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium ml-4"
          aria-label="Open fullscreen view"
        >
          <Maximize2 size={16} />
          Fullscreen
        </button>
      </div>

      <div className={layout === 'side-by-side' ? 'grid grid-cols-2 gap-0 flex-1 overflow-hidden' : 'flex flex-col flex-1 overflow-hidden'}>
        <div
          className={`overflow-auto ${layout === 'side-by-side' ? 'border-r border-gray-200' : 'flex-1 border-b border-gray-200'}`}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: layout === 'side-by-side' ? `${100 / (zoom / 100)}%` : `${50 / (zoom / 100)}%`
          }}
        >
          <div className="bg-red-50 px-4 py-2 sticky top-0 z-10 border-b border-red-200 flex items-center justify-between">
            <span className="font-semibold text-red-700">BEFORE</span>
            <button
              onClick={() => {
                setFullscreenMode('before');
                handleOpenFullscreen();
              }}
              className="p-1 hover:bg-red-100 rounded"
              title="Expand BEFORE to fullscreen"
              aria-label="Expand BEFORE panel to fullscreen"
            >
              <Maximize2 size={16} className="text-red-700" />
            </button>
          </div>
          {beforeRenderer}
        </div>

        <div
          className={`overflow-auto ${layout === 'stacked' ? 'flex-1' : ''}`}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: layout === 'side-by-side' ? `${100 / (zoom / 100)}%` : `${50 / (zoom / 100)}%`
          }}
        >
          <div className="bg-green-50 px-4 py-2 sticky top-0 z-10 border-b border-green-200 flex items-center justify-between">
            <span className="font-semibold text-green-700">AFTER</span>
            <button
              onClick={() => {
                setFullscreenMode('after');
                handleOpenFullscreen();
              }}
              className="p-1 hover:bg-green-100 rounded"
              title="Expand AFTER to fullscreen"
              aria-label="Expand AFTER panel to fullscreen"
            >
              <Maximize2 size={16} className="text-green-700" />
            </button>
          </div>
          {afterRenderer}
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="border-b border-gray-200 bg-gray-50">
            {/* Top Row: Title and Close */}
            <div className="flex items-center justify-between px-6 py-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {changeDescription || displayData.change?.description || 'Visual Change'}
              </h3>

              <button
                onClick={() => handleCloseFullscreen()}
                className="p-2 hover:bg-gray-200 rounded-lg"
                title="Close (ESC)"
                aria-label="Close fullscreen"
              >
                <X size={24} />
              </button>
            </div>

            {/* Middle Row: Change Info */}
            <div className="px-6 py-2 bg-blue-50 border-y border-blue-200">
              <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                <span>
                  <strong>Type:</strong> {changeType || displayData.change?.changeType || 'Unknown'}
                </span>
                <span>
                  <strong>File:</strong> {filePath || displayData.spineItem?.href || 'Unknown'}
                </span>
                {(severity || displayData.change?.severity) && (
                  <span>
                    <strong>Severity:</strong> {severity || displayData.change?.severity}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row: Navigation and Controls */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
              {/* Left: Change Navigation */}
              <div className="flex items-center gap-3">
                {currentIndex !== undefined && totalChanges !== undefined ? (
                  <>
                    <button
                      onClick={onNavigatePrevious}
                      disabled={!canNavigatePrevious}
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      ← Previous
                    </button>

                    <span className="text-sm font-medium text-gray-700">
                      Change {currentIndex + 1} of {totalChanges}
                    </span>

                    <button
                      onClick={onNavigateNext}
                      disabled={!canNavigateNext}
                      className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next →
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Fullscreen View</div>
                )}
              </div>

              {/* Center: View Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFullscreenMode('before')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    fullscreenMode === 'before'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  BEFORE
                </button>
                <button
                  onClick={() => setFullscreenMode('after')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    fullscreenMode === 'after'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  AFTER
                </button>
                <button
                  onClick={() => setFullscreenMode('compare')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    fullscreenMode === 'compare'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  COMPARE
                </button>
              </div>

              {/* Right: HTML Code Toggle */}
              <button
                onClick={() => setShowCodeChanges(!showCodeChanges)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              >
                <Code size={16} />
                {showCodeChanges ? 'Hide' : 'Show'} HTML code
              </button>
            </div>

            {/* HTML Code Changes Section (Collapsible) */}
            {showCodeChanges && isStructuralChange && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-red-50 border border-red-200 rounded overflow-hidden">
                    <div className="bg-red-100 px-3 py-1 text-red-800 font-semibold border-b border-red-200">
                      Before
                    </div>
                    <pre className="text-red-900 p-3 overflow-x-auto max-h-48 text-xs whitespace-pre-wrap break-all">
{(() => {
  const html = displayData.beforeContent?.html || '';
  if (!html) return 'No content available';
  const truncated = html.slice(0, 1000);
  const lastClosingTag = truncated.lastIndexOf('>');
  return lastClosingTag > 0 ? truncated.slice(0, lastClosingTag + 1) + (html.length > 1000 ? '...' : '') : truncated;
})()}
                    </pre>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded overflow-hidden">
                    <div className="bg-green-100 px-3 py-1 text-green-800 font-semibold border-b border-green-200">
                      After
                    </div>
                    <pre className="text-green-900 p-3 overflow-x-auto max-h-48 text-xs whitespace-pre-wrap break-all">
{(() => {
  const html = displayData.afterContent?.html || '';
  if (!html) return 'No content available';
  const truncated = html.slice(0, 1000);
  const lastClosingTag = truncated.lastIndexOf('>');
  return lastClosingTag > 0 ? truncated.slice(0, lastClosingTag + 1) + (html.length > 1000 ? '...' : '') : truncated;
})()}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {fullscreenMode === 'before' && (
              <div className="h-full overflow-auto">
                {fullscreenBeforeRenderer}
              </div>
            )}
            {fullscreenMode === 'after' && (
              <div className="h-full overflow-auto">
                {fullscreenAfterRenderer}
              </div>
            )}
            {fullscreenMode === 'compare' && (
              <div className="grid grid-cols-2 gap-0 h-full">
                {/* BEFORE Panel */}
                <div
                  ref={beforeScrollRef}
                  onScroll={handleSyncScroll('before')}
                  className="h-full overflow-auto border-r-2 border-gray-300"
                >
                  <div className="bg-red-50 px-4 py-2 sticky top-0 z-10 border-b border-red-200">
                    <span className="font-semibold text-red-700">BEFORE</span>
                  </div>
                  {fullscreenBeforeRenderer}
                </div>

                {/* AFTER Panel */}
                <div
                  ref={afterScrollRef}
                  onScroll={handleSyncScroll('after')}
                  className="h-full overflow-auto"
                >
                  <div className="bg-green-50 px-4 py-2 sticky top-0 z-10 border-b border-green-200">
                    <span className="font-semibold text-green-700">AFTER</span>
                  </div>
                  {fullscreenAfterRenderer}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-600 flex flex-wrap gap-4">
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ESC</kbd> Close</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">1</kbd> Before</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">2</kbd> After</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">3</kbd> Compare</span>
            {canNavigatePrevious && <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">←</kbd> Previous</span>}
            {canNavigateNext && <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded">→</kbd> Next</span>}
          </div>
        </div>
      )}
    </div>
  );
}
