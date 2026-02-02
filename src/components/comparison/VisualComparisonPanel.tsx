import React, { useState, useMemo, useCallback, useEffect, useRef, useTransition } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getVisualComparison } from '@/services/comparison.service';
import { EPUBRenderer } from '../epub/EPUBRenderer';
import { Loader2, ZoomIn, ZoomOut, Info, Code, AlertTriangle, Columns, Rows, Maximize2, X } from 'lucide-react';

/**
 * Decodes HTML entities back to their original characters.
 * This handles cases where the API returns already-encoded content.
 */
function decodeHtmlEntities(text: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|#x27|apos);/g, match => entityMap[match] ?? match);
}

/**
 * Escapes HTML special characters to prevent XSS when displaying HTML source code as text.
 * Unlike sanitizeText which strips tags, this preserves the markup for viewing in code preview.
 * First decodes any pre-existing entities to avoid double-encoding.
 */
function escapeHtml(text: string): string {
  const decoded = decodeHtmlEntities(text);
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return decoded.replace(/[&<>"']/g, char => htmlEntities[char] ?? char);
}

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

function getFallbackSelector(changeType?: string, changeDescription?: string): string | undefined {
  const normalizedType = changeType?.toLowerCase().replace(/[-_]/g, '') || '';
  const desc = changeDescription?.toLowerCase() || '';
  
  // Match EPUB codes
  switch (normalizedType) {
    case 'epubstruct002':
      return 'table';
    case 'epubimg001':
    case 'epubimg002':
      return 'img';
    case 'epublang001':
      return 'html';
  }
  
  // Match common change type patterns
  if (normalizedType.includes('table') || normalizedType.includes('header')) {
    return 'table';
  }
  if (normalizedType.includes('img') || normalizedType.includes('alt')) {
    return 'img';
  }
  if (normalizedType.includes('lang')) {
    return 'html';
  }
  if (normalizedType.includes('list')) {
    return 'ul, ol';
  }
  if (normalizedType.includes('heading')) {
    return 'h1, h2, h3, h4, h5, h6';
  }
  if (normalizedType.includes('link')) {
    return 'a';
  }
  
  // Match by description content
  if (desc.includes('table') || desc.includes('header')) {
    return 'table';
  }
  if (desc.includes('image') || desc.includes('alt text') || desc.includes('alt=')) {
    return 'img';
  }
  if (desc.includes('language') || desc.includes('lang')) {
    return 'html';
  }
  if (desc.includes('list')) {
    return 'ul, ol';
  }
  if (desc.includes('heading')) {
    return 'h1, h2, h3, h4, h5, h6';
  }
  if (desc.includes('link')) {
    return 'a';
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

  /**
   * Resolves a relative path against a base directory
   * @param src - The source path to resolve
   * @param baseDir - The base directory
   * @returns Resolved path or null if path escapes EPUB root
   */
  const resolveRelativePath = useCallback((src: string, baseDir: string): string | null => {
    // Skip absolute URLs, protocol-relative URLs, and data URIs
    if (src.startsWith('//') || src.startsWith('http://') || src.startsWith('https://') ||
        src.startsWith('data:') || src.startsWith('/api/')) {
      return null; // Signal to skip processing
    }

    let resolvedPath = src;

    if (src.startsWith('../')) {
      const baseParts = baseDir.split('/').filter(Boolean);
      const srcParts = src.split('/');

      while (srcParts[0] === '..' && baseParts.length > 0) {
        srcParts.shift();
        baseParts.pop();
      }

      // If there are still ../ remaining, path escapes EPUB root
      if (srcParts[0] === '..') {
        if (import.meta.env.DEV) {
          console.warn(`[VisualComparison] Path escapes EPUB root: ${src}`);
        }
        return null;
      }

      resolvedPath = [...baseParts, ...srcParts].join('/');
    } else if (src.startsWith('./')) {
      // Ensure baseDir ends with / before concatenation
      const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
      resolvedPath = normalizedBase + src.substring(2);
    } else if (!src.startsWith('OEBPS/') && !src.startsWith('OPS/')) {
      // Ensure baseDir ends with / before concatenation
      const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
      resolvedPath = normalizedBase + src;
    }

    return resolvedPath;
  }, []);

  /**
   * Validates and normalizes an EPUB asset path to prevent path traversal attacks
   * @param path - The path to validate
   * @returns Normalized safe path or null if invalid
   * @security Prevents ../../../../etc/passwd style attacks, javascript: URIs, URL-encoded traversal, etc.
   */
  const validateAssetPath = useCallback((path: string): string | null => {
    if (!path || path.length > 500) return null; // Reasonable length limit

    // Reject dangerous URI schemes
    const lowerPath = path.toLowerCase();
    if (lowerPath.startsWith('javascript:') ||
        lowerPath.startsWith('vbscript:') ||
        lowerPath.startsWith('data:text/html')) {
      return null;
    }

    // Check for URL-encoded path traversal sequences (e.g., %2e%2e%2f = ../)
    const urlEncodedTraversal = /%2e%2e(%2f|\/)|\.\.%2f/i;
    if (urlEncodedTraversal.test(path)) {
      return null;
    }

    // Reject suspicious patterns
    if (path.includes('..\\') || path.includes('\\')) return null;

    // Count directory traversals
    const upDirCount = (path.match(/\.\.\//g) || []).length;
    if (upDirCount > 10) return null; // Prevent excessive traversal

    // Normalize and validate
    const normalized = path
      .replace(/\/+/g, '/') // Remove double slashes
      .replace(/^\//, '');   // Remove leading slash

    // Ensure path stays within EPUB structure
    if (normalized.startsWith('/') || normalized.includes('://')) return null;

    // Defense-in-depth: Check if path still contains unresolved ../ after normalization
    // This catches edge cases where normalization doesn't fully resolve the path
    if (normalized.startsWith('../')) return null;

    return normalized;
  }, []);

  /**
   * Resolves EPUB internal image paths to API-served URLs using DOM-based parsing
   * @param htmlContent - The HTML content to process
   * @param baseFilePath - The current file path for relative resolution
   * @param actualBaseHref - The actual base href from spine item (fallback)
   * @returns HTML with resolved image paths
   * @security Uses DOMParser to prevent XSS attacks
   */
  const resolveImagePaths = useCallback((htmlContent: string, baseFilePath?: string, actualBaseHref?: string): string => {
    if (!htmlContent) return '';

    try {
      // Use DOMParser for safe DOM manipulation (prevents XSS)
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('[VisualComparison] HTML parsing error, falling back to original content');
        return htmlContent; // Show original content (backend HTML is trusted, just unresolved paths)
      }

      // Determine base directory from filePath or fallback to baseHref
      let baseDir = 'OEBPS/'; // Default fallback
      if (baseFilePath && baseFilePath.includes('/')) {
        baseDir = baseFilePath.substring(0, baseFilePath.lastIndexOf('/') + 1);
      } else if (actualBaseHref && actualBaseHref.includes('/')) {
        baseDir = actualBaseHref.substring(0, actualBaseHref.lastIndexOf('/') + 1);
      }

      // Process all img elements
      const images = doc.querySelectorAll('img[src]');
      images.forEach((img) => {
        const src = img.getAttribute('src');
        if (!src) return;

        // Split path from query string and fragment to preserve them
        const queryIndex = src.indexOf('?');
        const fragmentIndex = src.indexOf('#');
        let pathname = src;
        let suffix = '';

        if (queryIndex !== -1) {
          pathname = src.substring(0, queryIndex);
          suffix = src.substring(queryIndex);
        } else if (fragmentIndex !== -1) {
          pathname = src.substring(0, fragmentIndex);
          suffix = src.substring(fragmentIndex);
        }

        // Resolve relative path using shared helper (only the pathname)
        const resolvedPath = resolveRelativePath(pathname, baseDir);
        if (resolvedPath === null) return; // Skip if absolute URL or path escapes root

        // Validate and sanitize the resolved path
        const safePath = validateAssetPath(resolvedPath);
        if (!safePath) {
          if (import.meta.env.DEV) {
            console.warn(`[VisualComparison] Invalid asset path rejected: ${src}`);
          }
          return;
        }

        // Build API URL with encoded path and preserved query/fragment
        const apiUrl = `/api/v1/epub/job/${jobId}/asset/${encodeURIComponent(safePath)}${suffix}`;

        if (import.meta.env.DEV) {
          console.log(`[VisualComparison] Resolved image: ${src} → ${apiUrl}`);
        }

        img.setAttribute('src', apiUrl);
      });

      // Return serialized HTML
      return doc.body.innerHTML;
    } catch (error) {
      console.error('[VisualComparison] Error resolving image paths:', error);
      return htmlContent; // Return original content for better UX (backend HTML is trusted)
    }
  }, [jobId, validateAssetPath, resolveRelativePath]);

  /**
   * Resolves CSS background-image URLs
   * @param content - HTML content with potential CSS
   * @param baseFilePath - The current file path for relative resolution
   * @param actualBaseHref - The actual base href from spine item (fallback)
   * @returns Content with resolved CSS URLs
   * @security Validates paths and skips fragments/absolute URLs
   */
  const resolveCSSImages = useCallback((content: string, baseFilePath?: string, actualBaseHref?: string): string => {
    if (!content) return '';

    // Determine base directory from filePath or fallback to baseHref
    let baseDir = 'OEBPS/'; // Default fallback
    if (baseFilePath && baseFilePath.includes('/')) {
      baseDir = baseFilePath.substring(0, baseFilePath.lastIndexOf('/') + 1);
    } else if (actualBaseHref && actualBaseHref.includes('/')) {
      baseDir = actualBaseHref.substring(0, actualBaseHref.lastIndexOf('/') + 1);
    }

    // Pattern handles both quoted URLs (with spaces) and unquoted URLs
    // Group 1: quoted URL with potential spaces, Group 2: unquoted URL without spaces
    const cssPattern = /url\(\s*['"]([^'"]+)['"]\s*\)|url\(\s*([^)\s]+)\s*\)/gi;

    return content.replace(cssPattern, (match, quotedUrl, unquotedUrl) => {
      const url = quotedUrl || unquotedUrl;
      if (!url) return match;

      // Skip fragments (they're SVG references, not paths)
      if (url.startsWith('#')) {
        return match;
      }

      // Split path from query string and fragment to preserve them
      const queryIndex = url.indexOf('?');
      const fragmentIndex = url.indexOf('#');
      let pathname = url;
      let suffix = '';

      if (queryIndex !== -1) {
        pathname = url.substring(0, queryIndex);
        suffix = url.substring(queryIndex);
      } else if (fragmentIndex !== -1) {
        pathname = url.substring(0, fragmentIndex);
        suffix = url.substring(fragmentIndex);
      }

      // Resolve relative path using shared helper (only the pathname)
      const resolvedPath = resolveRelativePath(pathname, baseDir);
      if (resolvedPath === null) return match; // Skip if absolute URL or path escapes root

      // Validate the path
      const safePath = validateAssetPath(resolvedPath);
      if (!safePath) {
        if (import.meta.env.DEV) {
          console.warn(`[VisualComparison] Invalid CSS asset path rejected: ${url}`);
        }
        return match; // Return original if invalid
      }

      // Build API URL with encoded path and preserved query/fragment
      return `url('/api/v1/epub/job/${jobId}/asset/${encodeURIComponent(safePath)}${suffix}')`;
    });
  }, [jobId, validateAssetPath, resolveRelativePath]);
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

    const currentMountTime = mountTime.current;
    const currentRenderCount = renderCount.current;
    return () => {
      if (import.meta.env.DEV) {
        const lifetime = Date.now() - currentMountTime;
        console.log(
          `%c[VisualComparisonPanel] UNMOUNTED`,
          'background: #f44336; color: white; padding: 2px 5px;',
          { changeId, lifetime: `${lifetime}ms`, renders: currentRenderCount }
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
    notifyOnChangeProps: ['data', 'error', 'isFetching'],
    placeholderData: keepPreviousData
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
    const actualDescription = changeDescription || displayData?.change?.description;
    const baseHighlight = displayData?.highlightData;
    
    // Use API-provided highlight if available
    if (baseHighlight?.xpath || baseHighlight?.cssSelector) {
      return [baseHighlight];
    }
    
    // Fall back to inferred selector based on change type and description
    const fallbackSelector = getFallbackSelector(actualType, actualDescription);
    if (fallbackSelector) {
      return [{
        xpath: '',
        cssSelector: fallbackSelector,
        description: actualDescription || 'Changed element'
      }];
    }
    
    // If no selector found, return undefined (no highlighting)
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

  const rendererProps = useMemo(() => {
    if (!displayData) return null;

    // Resolve image paths for both before and after content
    const beforeBaseHref = displayData.spineItem?.href || displayData.beforeContent?.baseHref || "";
    let beforeHtml = resolveImagePaths(displayData.beforeContent?.html || "", filePath, beforeBaseHref);
    beforeHtml = resolveCSSImages(beforeHtml || "", filePath, beforeBaseHref);

    const afterBaseHref = displayData.spineItem?.href || displayData.afterContent?.baseHref || "";
    let afterHtml = resolveImagePaths(displayData.afterContent?.html || "", filePath, afterBaseHref);
    afterHtml = resolveCSSImages(afterHtml || "", filePath, afterBaseHref);

    return {
      before: {
        html: beforeHtml,
        css: displayData.beforeContent.css,
        baseUrl: displayData.beforeContent.baseHref,
        highlights: effectiveHighlights
      },
      after: {
        html: afterHtml,
        css: displayData.afterContent.css,
        baseUrl: displayData.afterContent.baseHref,
        highlights: effectiveHighlights
      }
    };
  }, [displayData, effectiveHighlights, resolveImagePaths, resolveCSSImages, filePath]);

  const beforeRenderer = useMemo(() => {
    if (!rendererProps) return null;
    return (
      <EPUBRenderer
        key="before-stable"
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
        html={rendererProps.after.html}
        css={rendererProps.after.css}
        baseUrl={rendererProps.after.baseUrl}
        highlights={rendererProps.after.highlights}
        version="after"
      />
    );
  }, [rendererProps]);

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
        hasHighlights: !!displayData.highlightData
      });
    }
  }, [displayData]);

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
  }, [isFullscreen, canNavigatePrevious, canNavigateNext, onNavigatePrevious, onNavigateNext, handleCloseFullscreen]);

  // Debounce timer ref for scroll sync
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup scroll debounce on unmount
  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, []);
  
  const handleSyncScroll = useCallback((source: 'before' | 'after') => (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;

    const sourceEl = e.currentTarget;
    const targetEl = source === 'before' ? afterScrollRef.current : beforeScrollRef.current;

    if (!targetEl) return;

    // Clear any pending debounce
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    isScrollingRef.current = true;

    const sourceScrollableHeight = sourceEl.scrollHeight - sourceEl.clientHeight;
    const scrollPercentage = sourceScrollableHeight > 0 
      ? sourceEl.scrollTop / sourceScrollableHeight 
      : 0;
    const targetScrollableHeight = targetEl.scrollHeight - targetEl.clientHeight;
    targetEl.scrollTop = scrollPercentage * targetScrollableHeight;

    // Use debounced timeout instead of requestAnimationFrame for reliable reset
    // Store ref locally to handle potential unmount during timeout
    const timeoutId = setTimeout(() => {
      // Guard against unmount: only update if ref still exists
      if (scrollDebounceRef.current === timeoutId) {
        isScrollingRef.current = false;
        scrollDebounceRef.current = null;
      }
    }, 50);
    scrollDebounceRef.current = timeoutId;
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
            {showCodeChanges && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-red-50 border border-red-200 rounded overflow-hidden">
                    <div className="bg-red-100 px-3 py-1 text-red-800 font-semibold border-b border-red-200">
                      Before
                    </div>
                    <pre className="text-red-900 p-3 overflow-x-auto max-h-48 text-xs whitespace-pre-wrap break-all">
{(() => {
  // Escape HTML entities to show source code as text (XSS prevention)
  const rawHtml = displayData.beforeContent?.html || '';
  if (!rawHtml) return 'No content available';
  const truncated = rawHtml.slice(0, 1000);
  const lastClosingTag = truncated.lastIndexOf('>');
  const displayText = lastClosingTag > 0 ? truncated.slice(0, lastClosingTag + 1) + (rawHtml.length > 1000 ? '...' : '') : truncated;
  return escapeHtml(displayText);
})()}
                    </pre>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded overflow-hidden">
                    <div className="bg-green-100 px-3 py-1 text-green-800 font-semibold border-b border-green-200">
                      After (changes highlighted)
                    </div>
                    <div className="text-green-900 p-3 overflow-x-auto max-h-48 text-xs whitespace-pre-wrap break-all font-mono">
{(() => {
  // Escape HTML entities to show source code as text (XSS prevention)
  const beforeHtml = displayData.beforeContent?.html || '';
  const afterHtml = displayData.afterContent?.html || '';
  if (!afterHtml) return <span>No content available</span>;
  
  const truncateHtml = (html: string) => {
    const truncated = html.slice(0, 1000);
    const lastClosingTag = truncated.lastIndexOf('>');
    return lastClosingTag > 0 ? truncated.slice(0, lastClosingTag + 1) + (html.length > 1000 ? '...' : '') : truncated;
  };
  
  const beforeLines = truncateHtml(beforeHtml).split('\n');
  const afterLines = truncateHtml(afterHtml).split('\n');
  
  return afterLines.map((line, idx) => {
    const beforeLine = beforeLines[idx] || '';
    const isNewLine = idx >= beforeLines.length;
    const isChanged = line !== beforeLine;
    // Escape each line for safe display
    const escapedLine = escapeHtml(line) || ' ';
    
    if (isNewLine) {
      return <div key={idx} className="bg-green-200 text-green-900 px-1 -mx-1 rounded">{escapedLine}</div>;
    }
    if (isChanged) {
      return <div key={idx} className="bg-yellow-200 text-yellow-900 px-1 -mx-1 rounded border-l-2 border-yellow-500">{escapedLine}</div>;
    }
    return <div key={idx}>{escapedLine}</div>;
  });
})()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {fullscreenMode === 'before' && (
              <div className="h-full overflow-auto">
                <EPUBRenderer
                  key={`fullscreen-before-${changeId}`}
                  html={rendererProps?.before.html || displayData.beforeContent.html}
                  css={displayData.beforeContent.css}
                  baseUrl={displayData.beforeContent.baseHref}
                  highlights={effectiveHighlights}
                  version="before"
                  className="h-full"
                />
              </div>
            )}
            {fullscreenMode === 'after' && (
              <div className="h-full overflow-auto">
                <EPUBRenderer
                  key={`fullscreen-after-${changeId}`}
                  html={rendererProps?.after.html || displayData.afterContent.html}
                  css={displayData.afterContent.css}
                  baseUrl={displayData.afterContent.baseHref}
                  highlights={effectiveHighlights}
                  version="after"
                  className="h-full"
                />
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
                  <EPUBRenderer
                    key={`compare-before-${changeId}`}
                    html={rendererProps?.before.html || displayData.beforeContent.html}
                    css={displayData.beforeContent.css}
                    baseUrl={displayData.beforeContent.baseHref}
                    highlights={effectiveHighlights}
                    version="before"
                    className="h-full"
                  />
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
                  <EPUBRenderer
                    key={`compare-after-${changeId}`}
                    html={rendererProps?.after.html || displayData.afterContent.html}
                    css={displayData.afterContent.css}
                    baseUrl={displayData.afterContent.baseHref}
                    highlights={effectiveHighlights}
                    version="after"
                    className="h-full"
                  />
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
