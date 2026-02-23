/**
 * Full Screen Editor Page
 * Opens OnlyOffice editor with optional fullscreen mode and style validation panel
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { editorService } from '../services/editor.service';
import { Maximize2, Minimize2, ArrowLeft, CheckSquare, PanelRightClose, PanelRight } from 'lucide-react';
import { StyleValidationPanel } from '@/components/style';
import type { StyleViolation } from '@/types/style';

// OnlyOffice DocEditor interface
interface DocEditorConnector {
  executeMethod: (method: string, args?: unknown, callback?: (result: unknown) => void) => void;
  callCommand: (func: () => void, isNoCalc?: boolean, isWaitRecalc?: boolean, callback?: (result: unknown) => void) => void;
}

interface DocEditorInstance {
  createConnector: () => DocEditorConnector;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: unknown) => DocEditorInstance;
    };
  }
}

export default function FullEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentName = searchParams.get('name') || 'Document';

  const editorRef = useRef<HTMLDivElement>(null);
  const editorInitialized = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const editorInstanceRef = useRef<DocEditorInstance | null>(null);
  const connectorRef = useRef<DocEditorConnector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [session, setSession] = useState<{ sessionId: string; config: unknown; documentServerUrl: string } | null>(null);

  // Step 1: Create session and load script
  useEffect(() => {
    if (!documentId) {
      setError('No document ID provided');
      setLoading(false);
      return;
    }

    const prepareEditor = async () => {
      try {
        setLoading(true);

        // Create editor session
        const response = await editorService.createSession(documentId, 'edit');

        // Ensure documentServerUrl uses HTTPS to avoid mixed content issues
        let serverUrl = response.documentServerUrl;
        if (serverUrl && !serverUrl.startsWith('http://localhost')) {
          serverUrl = serverUrl.replace(/^http:/, 'https:');
        }

        // Load OnlyOffice script (must use HTTPS for the iframe to work)
        await loadOnlyOfficeScript(serverUrl);

        // Store session info
        sessionIdRef.current = response.sessionId;
        setSession({
          sessionId: response.sessionId,
          config: response.config,
          documentServerUrl: serverUrl,
        });

        // Now ready to show the editor container
        setLoading(false);
        setEditorReady(true);
      } catch (err) {
        console.error('Failed to initialize editor:', err);
        setError('Failed to load editor. Please try again.');
        setLoading(false);
      }
    };

    prepareEditor();

    // Cleanup on unmount
    return () => {
      if (sessionIdRef.current) {
        editorService.closeSession(sessionIdRef.current).catch(console.error);
      }
    };
  }, [documentId]);

  // Step 2: Initialize editor after container is rendered
  useEffect(() => {
    if (editorReady && session && !editorInitialized.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (window.DocsAPI && document.getElementById('fullscreen-editor')) {
          try {
            // Enhance config with events to capture connector
            const enhancedConfig = {
              ...(session.config as object),
              events: {
                onDocumentReady: () => {
                  console.log('[FullEditorPage] Document ready, attempting to create connector...');
                  // Try to create connector after document is fully loaded
                  setTimeout(() => {
                    try {
                      if (editorInstanceRef.current) {
                        // Check if createConnector exists
                        const instance = editorInstanceRef.current as unknown as Record<string, unknown>;
                        console.log('[FullEditorPage] Editor instance methods:', Object.keys(instance));

                        if (typeof instance.createConnector === 'function') {
                          connectorRef.current = (instance.createConnector as () => DocEditorConnector)();
                          console.log('[FullEditorPage] Connector created successfully');
                        } else {
                          console.warn('[FullEditorPage] createConnector not available on editor instance');
                        }
                      }
                    } catch (err) {
                      console.warn('[FullEditorPage] Failed to create connector:', err);
                    }
                  }, 1000);
                },
                onError: (event: { data?: number }) => {
                  console.error('[FullEditorPage] OnlyOffice error:', event);
                },
              },
            };

            // Store the editor instance for connector access
            const editorInstance = new window.DocsAPI.DocEditor('fullscreen-editor', enhancedConfig);
            editorInstanceRef.current = editorInstance;
            editorInitialized.current = true;
            console.log('[FullEditorPage] DocEditor created, waiting for document ready...');
          } catch (err) {
            console.error('Failed to create DocEditor:', err);
            setError('Failed to initialize editor');
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editorReady, session]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const loadOnlyOfficeScript = (serverUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.DocsAPI) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OnlyOffice script'));
      document.head.appendChild(script);
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleStylePanel = () => {
    setShowStylePanel(!showStylePanel);
  };

  const handleBack = () => {
    navigate('/editorial');
  };

  // Copy text to clipboard and show instructions
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Navigate to violation by searching for the text and selecting it
  // Uses OnlyOffice SearchNext API if connector available, otherwise uses Find shortcut
  const handleNavigateToViolation = useCallback((violation: StyleViolation) => {
    const connector = connectorRef.current;

    console.log('[FullEditorPage] handleNavigateToViolation called:', {
      hasConnector: !!connector,
      violationText: violation.originalText,
    });

    if (connector?.executeMethod) {
      // Use OnlyOffice SearchNext to find and select text (Developer Edition)
      connector.executeMethod(
        'SearchNext',
        [
          {
            searchString: violation.originalText,
            matchCase: true,
          },
          true,
        ],
        (result) => {
          console.log('[FullEditorPage] SearchNext result:', result);
        }
      );
    } else {
      // Community Edition: Copy text and instruct user to use Ctrl+F
      copyToClipboard(violation.originalText).then((success) => {
        // Focus the editor iframe
        const iframe = document.querySelector('#fullscreen-editor iframe') as HTMLIFrameElement;
        if (iframe) {
          iframe.focus();
        }

        // Show instruction toast
        const toast = document.createElement('div');
        toast.className = 'style-fix-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        `;
        toast.innerHTML = success
          ? `<span style="color: #4ade80;">✓</span> Text copied! Press <kbd style="background:#374151;padding:2px 6px;border-radius:3px;margin:0 2px;">Ctrl+F</kbd> and paste to find it`
          : `Press <kbd style="background:#374151;padding:2px 6px;border-radius:3px;margin:0 2px;">Ctrl+F</kbd> to search for: "${violation.originalText.slice(0, 30)}..."`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      });
    }
  }, [copyToClipboard]);

  // Apply fix by replacing text with track changes enabled
  const handleApplyFix = useCallback((violation: StyleViolation, fixText: string) => {
    const connector = connectorRef.current;

    console.log('[FullEditorPage] handleApplyFix called:', {
      hasConnector: !!connector,
      originalText: violation.originalText,
      fixText: fixText,
    });

    if (connector?.executeMethod) {
      // Developer Edition: Use connector API
      connector.executeMethod(
        'SearchAndReplace',
        [
          {
            searchString: violation.originalText,
            replaceString: fixText,
            matchCase: true,
          },
        ],
        (result) => {
          console.log('[FullEditorPage] SearchAndReplace result:', result);
        }
      );
    } else {
      // Community Edition: Copy replacement text and instruct user to use Ctrl+H
      copyToClipboard(fixText).then((success) => {
        // Focus the editor iframe
        const iframe = document.querySelector('#fullscreen-editor iframe') as HTMLIFrameElement;
        if (iframe) {
          iframe.focus();
        }

        // Show instruction modal
        const modal = document.createElement('div');
        modal.className = 'style-fix-modal';
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        `;
        modal.innerHTML = `
          <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">Apply Fix with Track Changes</h3>
            <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px;">Track changes is enabled. Use Find & Replace to apply the fix:</p>

            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #991b1b; font-weight: 500;">Find:</p>
              <code style="font-size: 13px; color: #1e293b; word-break: break-all;">${violation.originalText}</code>
            </div>

            <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #166534; font-weight: 500;">Replace with: ${success ? '(copied to clipboard)' : ''}</p>
              <code style="font-size: 13px; color: #1e293b; word-break: break-all;">${fixText}</code>
            </div>

            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 0; font-size: 13px; color: #475569;">
                <strong>Steps:</strong><br>
                1. Press <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:3px;">Ctrl+H</kbd> to open Find & Replace<br>
                2. Paste the replacement text (Ctrl+V)<br>
                3. Click "Replace" to apply with track changes
              </p>
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button id="copy-find-text" style="padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Copy Find Text</button>
              <button id="close-modal" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Got it</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('copy-find-text')?.addEventListener('click', () => {
          copyToClipboard(violation.originalText).then(() => {
            const btn = document.getElementById('copy-find-text');
            if (btn) btn.textContent = 'Copied!';
          });
        });

        document.getElementById('close-modal')?.addEventListener('click', () => {
          modal.remove();
        });

        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.remove();
        });
      });
    }
  }, [copyToClipboard]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Editorial
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor for {documentName}...</p>
        </div>
      </div>
    );
  }

  // Fullscreen mode - covers entire viewport
  if (isFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: '#fff',
        }}
      >
        {/* Fullscreen toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 10000,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium truncate max-w-xs">
              {documentName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleStylePanel}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                showStylePanel
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              title={showStylePanel ? 'Hide Style Validation' : 'Show Style Validation'}
            >
              <CheckSquare className="w-4 h-4" />
              Style Check
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors text-sm"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Fullscreen
            </button>
          </div>
        </div>

        {/* Editor and Panel container */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
          }}
        >
          {/* Editor container */}
          <div
            id="fullscreen-editor"
            ref={editorRef}
            style={{
              flex: 1,
              minWidth: 0,
            }}
          />

          {/* Style Validation Panel */}
          {showStylePanel && documentId && (
            <div style={{ width: '400px', flexShrink: 0 }}>
              <StyleValidationPanel
                documentId={documentId}
                onNavigateToViolation={handleNavigateToViolation}
                onApplyFixToDocument={handleApplyFix}
                className="h-full"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal mode - within layout
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-5 w-px bg-gray-300" />
          <span className="text-sm font-medium text-gray-700 truncate max-w-md">
            {documentName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStylePanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
              showStylePanel
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={showStylePanel ? 'Hide Style Validation' : 'Show Style Validation'}
          >
            {showStylePanel ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
            Style Check
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm"
            title="Enter Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Editor and Panel container */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Editor container */}
        <div
          id="fullscreen-editor"
          ref={editorRef}
          className="flex-1"
          style={{
            minHeight: 0,
            minWidth: 0,
          }}
        />

        {/* Style Validation Panel */}
        {showStylePanel && documentId && (
          <div className="w-[400px] flex-shrink-0 border-l">
            <StyleValidationPanel
              documentId={documentId}
              onNavigateToViolation={handleNavigateToViolation}
              onApplyFixToDocument={handleApplyFix}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
