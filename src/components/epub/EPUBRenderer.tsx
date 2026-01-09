import { useEffect, useRef, useState } from 'react';

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
    console.warn('XPath evaluation failed:', error);
  }
  return result;
}

function applyHighlights(
  doc: Document,
  highlights: ChangeHighlight[] | undefined,
  version: 'before' | 'after'
) {
  if (!highlights || highlights.length === 0) return;

  highlights.forEach(highlight => {
    let elements: Element[] = [];

    if (highlight.cssSelector) {
      try {
        elements = Array.from(doc.querySelectorAll(highlight.cssSelector));
      } catch (error) {
        console.warn('CSS selector failed:', error);
      }
    }

    if (elements.length === 0 && highlight.xpath) {
      elements = findByXPath(doc, highlight.xpath);
    }

    elements.forEach(el => {
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
      `;

      (el as HTMLElement).style.position = 'relative';
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      });
      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  });
}

export function EPUBRenderer({
  html,
  css,
  baseUrl,
  highlights,
  version,
  onLoad,
  className = ''
}: EPUBRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <base href="${baseUrl}/">
          ${css.map(styles => `<style>${styles}</style>`).join('\n')}
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
        <body>
          ${html}
        </body>
      </html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    const handleLoad = () => {
      applyHighlights(doc, highlights, version);
      setIsLoaded(true);
      onLoad?.();
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [html, css, baseUrl, highlights, version, onLoad]);

  return (
    <div className={`epub-renderer ${className}`}>
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        className="w-full h-full border-0"
        title={`EPUB ${version}`}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}
    </div>
  );
}
