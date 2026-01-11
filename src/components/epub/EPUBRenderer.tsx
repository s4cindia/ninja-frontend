import React, { useEffect, useRef, useMemo, useCallback } from 'react';

interface ChangeHighlight {
  xpath: string;
  cssSelector?: string;
  description?: string;
}

interface EPUBRendererProps {
  html: string;
  css: string[];
  baseUrl: string;
  highlights?: ChangeHighlight[];
  version: 'before' | 'after';
  onLoad?: () => void;
  className?: string;
}

function findByXPath(doc: Document, xpath: string): Element[] {
  const result: Element[] = [];
  try {
    const xpathResult = doc.evaluate(
      xpath,
      doc,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < xpathResult.snapshotLength; i++) {
      const node = xpathResult.snapshotItem(i);
      if (node instanceof Element) {
        result.push(node);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[EPUBRenderer] XPath evaluation failed:', error);
    }
  }
  return result;
}

function applyHighlights(
  doc: Document,
  highlights: ChangeHighlight[] | undefined,
  version: 'before' | 'after'
) {
  if (import.meta.env.DEV) {
    console.log('[applyHighlights] Called with:', { highlights, version });
  }

  if (!highlights || highlights.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[applyHighlights] No highlights to apply');
    }
    return;
  }

  highlights.forEach((highlight, index) => {
    let elements: Element[] = [];

    if (highlight.cssSelector) {
      try {
        elements = Array.from(doc.querySelectorAll(highlight.cssSelector));
        if (import.meta.env.DEV) {
          console.log(`[applyHighlights] CSS selector "${highlight.cssSelector}" found ${elements.length} elements`);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[applyHighlights] CSS selector failed:', error);
        }
      }
    }

    if (elements.length === 0 && highlight.xpath) {
      elements = findByXPath(doc, highlight.xpath);
      if (import.meta.env.DEV) {
        console.log(`[applyHighlights] XPath "${highlight.xpath}" found ${elements.length} elements`);
      }
    }

    if (elements.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[applyHighlights] No elements found for highlight:', highlight);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[applyHighlights] Applying ${version} highlights to ${elements.length} elements`);
    }

    elements.forEach((el, elIndex) => {
      el.classList.add(`change-highlight-${version}`);

      const tooltip = doc.createElement('div');
      tooltip.className = 'change-tooltip';
      tooltip.textContent = highlight.description || 'Changed';
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        display: none;
        top: -30px;
        left: 0;
      `;

      const badge = doc.createElement('div');
      badge.className = 'change-badge';
      badge.textContent = version === 'before' ? '❌ BEFORE' : '✓ AFTER';
      badge.style.cssText = `
        position: absolute;
        top: -12px;
        right: -12px;
        background: ${version === 'before' ? '#ef4444' : '#22c55e'};
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        z-index: 1001;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      `;

      const computedStyle = window.getComputedStyle(el as HTMLElement);
      if (computedStyle.position === 'static') {
        (el as HTMLElement).style.position = 'relative';
      }

      el.appendChild(tooltip);
      el.appendChild(badge);

      el.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      }, { passive: true });

      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      }, { passive: true });

      if (index === 0 && elIndex === 0) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('flash-highlight');
            setTimeout(() => el.classList.remove('flash-highlight'), 1000);
          }, 300);
        });
      }
    });
  });
}

export const EPUBRenderer = React.memo(function EPUBRenderer({
  html,
  css,
  baseUrl,
  highlights,
  version,
  onLoad,
  className = ''
}: EPUBRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        console.log(`[EPUBRenderer] Render time: ${(endTime - startTime).toFixed(2)}ms`);
      };
    }
  }, [html, css, baseUrl, highlights, version]);

  const combinedCSS = useMemo(() => {
    return css.map(styles => `<style>${styles}</style>`).join('\n');
  }, [css]);

  const fullHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <base href="${baseUrl}/">
    ${combinedCSS}
    <style>
      body {
        margin: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .change-highlight-before {
        outline: 3px solid #ef4444 !important;
        outline-offset: 2px;
        background-color: rgba(239, 68, 68, 0.1) !important;
      }
      .change-highlight-after {
        outline: 3px solid #22c55e !important;
        outline-offset: 2px;
        background-color: rgba(34, 197, 94, 0.1) !important;
      }
      @keyframes flash {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(59, 130, 246, 0.3); }
      }
      .flash-highlight {
        animation: flash 1s ease-in-out;
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;
  }, [html, baseUrl, combinedCSS]);

  const handleLoadCallback = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    if (import.meta.env.DEV) {
      console.log('[EPUBRenderer] Rendering EPUB, version:', version);
      console.log('[EPUBRenderer] Highlights:', highlights);
    }

    // Always rewrite iframe on render
    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Apply highlights after load
    const handleLoad = () => {
      const loadedDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (loadedDoc) {
        if (import.meta.env.DEV) {
          console.log('[EPUBRenderer] Applying highlights to loaded content');
        }
        applyHighlights(loadedDoc, highlights, version);
        handleLoadCallback();
      }
    };

    iframe.addEventListener('load', handleLoad, { once: true });

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [fullHtml, highlights, version, handleLoadCallback]);

  return (
    <div className={`epub-renderer ${className}`}>
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        className="w-full h-full border-0"
        title={`EPUB ${version}`}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.html === nextProps.html &&
    prevProps.css === nextProps.css &&
    prevProps.baseUrl === nextProps.baseUrl &&
    prevProps.version === nextProps.version &&
    prevProps.highlights === nextProps.highlights &&
    prevProps.className === nextProps.className
  );
});
