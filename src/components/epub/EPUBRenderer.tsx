import { useEffect, useRef } from 'react';

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
    const xpathResult = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < xpathResult.snapshotLength; i++) {
      const node = xpathResult.snapshotItem(i);
      if (node instanceof Element) result.push(node);
    }
  } catch (error) {
    console.warn('[EPUBRenderer] XPath failed:', error);
  }
  return result;
}

function applyHighlights(doc: Document, highlights: ChangeHighlight[] | undefined, version: 'before' | 'after') {
  if (!highlights || highlights.length === 0) return;

  highlights.forEach((highlight, index) => {
    let elements: Element[] = [];

    if (highlight.cssSelector) {
      try {
        elements = Array.from(doc.querySelectorAll(highlight.cssSelector));
      } catch (error) { /* silent fail */ }
    }

    if (elements.length === 0 && highlight.xpath) {
      elements = findByXPath(doc, highlight.xpath);
    }

    if (elements.length === 0) return;

    elements.forEach((el, elIndex) => {
      el.classList.add(`change-highlight-${version}`);

      const tooltip = doc.createElement('div');
      tooltip.className = 'change-tooltip';
      tooltip.textContent = highlight.description || 'Changed';
      tooltip.style.cssText = `position:absolute;background:rgba(0,0,0,0.8);color:white;padding:4px 8px;border-radius:4px;font-size:12px;pointer-events:none;z-index:1000;display:none;top:-30px;left:0;`;

      const badge = doc.createElement('div');
      badge.className = 'change-badge';
      badge.textContent = version === 'before' ? '❌ BEFORE' : '✓ AFTER';
      badge.style.cssText = `position:absolute;top:-12px;right:-12px;background:${version === 'before' ? '#ef4444' : '#22c55e'};color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;z-index:1001;box-shadow:0 2px 4px rgba(0,0,0,0.2);pointer-events:none;`;

      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.position === 'static') {
        (el as HTMLElement).style.position = 'relative';
      }

      el.appendChild(tooltip);
      el.appendChild(badge);

      el.addEventListener('mouseenter', () => tooltip.style.display = 'block', { passive: true });
      el.addEventListener('mouseleave', () => tooltip.style.display = 'none', { passive: true });

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

export function EPUBRenderer({ html, css, baseUrl, highlights, version, onLoad, className = '' }: EPUBRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceId = useRef(`${version}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    console.log(`[EPUBRenderer] Created ${instanceId.current}`);

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-same-origin');
    iframe.className = 'w-full h-full border-0';
    iframe.title = `EPUB ${version}`;
    iframe.style.cssText = 'width: 100%; height: 100%; border: 0;';

    iframeRef.current = iframe;

    if (containerRef.current) {
      containerRef.current.appendChild(iframe);
    }

    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <base href="${baseUrl}/">
    ${css.map(styles => `<style>${styles}</style>`).join('\n')}
    <style>
      body { margin: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .change-highlight-before { outline: 3px solid #ef4444 !important; outline-offset: 2px; background-color: rgba(239, 68, 68, 0.1) !important; }
      .change-highlight-after { outline: 3px solid #22c55e !important; outline-offset: 2px; background-color: rgba(34, 197, 94, 0.1) !important; }
      @keyframes flash { 0%, 100% { background-color: transparent; } 50% { background-color: rgba(59, 130, 246, 0.3); } }
      .flash-highlight { animation: flash 1s ease-in-out; }
    </style>
  </head>
  <body>${html}</body>
</html>`;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      const handleLoad = () => {
        const loadedDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (loadedDoc) {
          applyHighlights(loadedDoc, highlights, version);
          onLoad?.();
        }
      };

      iframe.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      console.log(`[EPUBRenderer] Destroying ${instanceId.current}`);

      if (iframeRef.current) {
        if (iframeRef.current.contentWindow) {
          try {
            iframeRef.current.contentWindow.stop();
          } catch (e) { /* ignore */ }
        }

        if (iframeRef.current.contentDocument) {
          const doc = iframeRef.current.contentDocument;
          if (doc.body) doc.body.innerHTML = '';
          doc.open();
          doc.write('');
          doc.close();
        }

        if (iframeRef.current.parentNode) {
          iframeRef.current.parentNode.removeChild(iframeRef.current);
        }

        iframeRef.current = null;
      }

      setTimeout(() => {
        const remainingIframes = document.querySelectorAll('iframe').length;
        console.log(`[EPUBRenderer] Cleanup verified: ${remainingIframes} iframes remaining`);
        if (remainingIframes > 2) {
          console.error(`[IFRAME LEAK] ${remainingIframes} iframes still in DOM!`);
        }
      }, 100);
    };
  }, []);

  useEffect(() => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <base href="${baseUrl}/">
    ${css.map(styles => `<style>${styles}</style>`).join('\n')}
    <style>
      body { margin: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .change-highlight-before { outline: 3px solid #ef4444 !important; outline-offset: 2px; background-color: rgba(239, 68, 68, 0.1) !important; }
      .change-highlight-after { outline: 3px solid #22c55e !important; outline-offset: 2px; background-color: rgba(34, 197, 94, 0.1) !important; }
      @keyframes flash { 0%, 100% { background-color: transparent; } 50% { background-color: rgba(59, 130, 246, 0.3); } }
      .flash-highlight { animation: flash 1s ease-in-out; }
    </style>
  </head>
  <body>${html}</body>
</html>`;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    applyHighlights(doc, highlights, version);
  }, [html, css, baseUrl, highlights, version]);

  return (
    <div
      ref={containerRef}
      className={`epub-renderer ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
