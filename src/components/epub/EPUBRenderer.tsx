import React, { useEffect, useRef } from 'react';

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
  poolKey?: string; // Unique identifier for iframe pooling (use different keys for fullscreen vs inline)
}

class IframeRegistry {
  private iframes: Map<string, HTMLIFrameElement> = new Map();
  private maxIframes = 6; // Allow inline-before/after + fullscreen-before/after + 2 spare
  private reuseCount = 0;
  private createCount = 0;

  get(version: string): HTMLIFrameElement | undefined {
    return this.iframes.get(version);
  }

  register(version: string, iframe: HTMLIFrameElement) {
    const existing = this.iframes.get(version);
    
    // If same iframe is being re-registered, just track it
    if (existing === iframe) {
      if (import.meta.env.DEV) {
        this.reuseCount++;
        console.log(`[IframeRegistry] Reusing same ${version} iframe (reuse: ${this.reuseCount}, create: ${this.createCount})`);
      }
      return;
    }

    // If there's an existing different iframe for this version, destroy it first
    if (existing && existing !== iframe) {
      this.destroy(version);
    }

    // Enforce pool size limit - remove oldest if at capacity
    if (this.iframes.size >= this.maxIframes) {
      const oldestKey = this.iframes.keys().next().value;
      if (oldestKey && oldestKey !== version) {
        console.log(`[IframeRegistry] At capacity (${this.maxIframes}), destroying oldest: ${oldestKey}`);
        this.destroy(oldestKey);
      }
    }

    this.iframes.set(version, iframe);
    this.createCount++;
    
    if (import.meta.env.DEV) {
      console.log(`[IframeRegistry] Registered ${version} iframe. Total: ${this.iframes.size} (reuse: ${this.reuseCount}, create: ${this.createCount})`);
      this.logDOMState();
    }
  }

  destroy(version: string) {
    const iframe = this.iframes.get(version);
    if (iframe) {
      try {
        iframe.contentWindow?.stop();

        const doc = iframe.contentDocument;
        if (doc?.body) {
          doc.body.innerHTML = '';
        }

        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }

        this.iframes.delete(version);
        if (import.meta.env.DEV) {
          console.log(`[IframeRegistry] Destroyed ${version} iframe. Total: ${this.iframes.size}`);
        }
      } catch (error) {
        console.error(`[IframeRegistry] Error destroying ${version} iframe:`, error);
      }
    }
  }

  destroyAll() {
    const versions = Array.from(this.iframes.keys());
    versions.forEach(version => this.destroy(version));
    console.log('[IframeRegistry] Destroyed all iframes');
  }

  getCount(): number {
    return this.iframes.size;
  }

  getStats() {
    return { reuse: this.reuseCount, create: this.createCount, active: this.iframes.size };
  }

  private logDOMState() {
    setTimeout(() => {
      const actualIframes = document.querySelectorAll('iframe').length;
      const registryCount = this.iframes.size;

      if (Math.abs(actualIframes - registryCount) > 1) {
        console.warn(`[IframeRegistry] MISMATCH! Registry: ${registryCount}, DOM: ${actualIframes}`);
      }
    }, 100);
  }
}

const iframeRegistry = new IframeRegistry();

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

const EPUBRendererComponent = function EPUBRenderer({
  html,
  css,
  baseUrl,
  highlights,
  version,
  onLoad,
  className = '',
  poolKey
}: EPUBRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isInitialized = useRef(false);
  
  // Use poolKey if provided, otherwise default to version
  const iframeKey = poolKey || version;

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    if (!containerRef.current) {
      if (import.meta.env.DEV) {
        console.warn(`[EPUBRenderer] No container ref for ${iframeKey}`);
      }
      return;
    }

    // Try to reuse existing iframe from pool
    const existingIframe = iframeRegistry.get(iframeKey);
    if (existingIframe) {
      // Check if iframe is in our container or needs to be moved
      if (existingIframe.parentNode === containerRef.current) {
        // Already in our container - just reuse
        if (import.meta.env.DEV) {
          console.log(`[EPUBRenderer] Reusing ${iframeKey} iframe (same container)`);
        }
        iframeRef.current = existingIframe;
        iframeRegistry.register(iframeKey, existingIframe);
        return;
      } else {
        // Iframe exists but in different/no container - MOVE it to our container
        if (import.meta.env.DEV) {
          console.log(`[EPUBRenderer] Moving ${iframeKey} iframe to new container`);
        }
        // Remove from old parent if needed
        if (existingIframe.parentNode) {
          existingIframe.parentNode.removeChild(existingIframe);
        }
        // Append to our container
        containerRef.current.appendChild(existingIframe);
        iframeRef.current = existingIframe;
        iframeRegistry.register(iframeKey, existingIframe);
        return;
      }
    }

    // Create new iframe only if none exists in pool
    if (import.meta.env.DEV) {
      console.log(`[EPUBRenderer] Creating new ${iframeKey} iframe`);
    }

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-same-origin');
    iframe.className = 'w-full h-full border-0';
    iframe.title = `EPUB ${version}`;

    iframeRegistry.register(iframeKey, iframe);
    iframeRef.current = iframe;

    containerRef.current.appendChild(iframe);

    // Don't destroy on unmount - let the pool manage lifecycle
    return () => {
      if (import.meta.env.DEV) {
        console.log(`[EPUBRenderer] Unmount triggered for ${iframeKey} (keeping in pool)`);
      }
      // Don't destroy - keep iframe in pool for reuse
      // Only clear local ref
      iframeRef.current = null;
      isInitialized.current = false;
    };
  }, [iframeKey, version]);

  useEffect(() => {
    if (!iframeRef.current) {
      if (import.meta.env.DEV) {
        console.warn(`[EPUBRenderer] No iframe ref for ${version}, skipping render`);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[EPUBRenderer] Updating ${version} content (${html.length} chars)`);
    }

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

    iframeRef.current.srcdoc = fullHtml;

    const handleLoad = () => {
      if (import.meta.env.DEV) {
        console.log(`[EPUBRenderer] ${version} content loaded`);
      }
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        applyHighlights(doc, highlights, version);
      }
      onLoad?.();
    };

    const iframe = iframeRef.current;
    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [html, css, baseUrl, highlights, version, onLoad]);

  return (
    <div ref={containerRef} className={`epub-renderer ${className}`} />
  );
};

export const EPUBRenderer = React.memo(EPUBRendererComponent, (prevProps, nextProps) => {
  return (
    prevProps.html === nextProps.html &&
    prevProps.version === nextProps.version &&
    prevProps.baseUrl === nextProps.baseUrl &&
    prevProps.poolKey === nextProps.poolKey &&
    JSON.stringify(prevProps.css) === JSON.stringify(nextProps.css) &&
    JSON.stringify(prevProps.highlights) === JSON.stringify(nextProps.highlights)
  );
});

EPUBRenderer.displayName = 'EPUBRenderer';
