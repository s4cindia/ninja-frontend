/**
 * Full Screen Editor Page
 * Opens OnlyOffice editor with optional fullscreen mode
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { editorService } from '../services/editor.service';
import { Maximize2, Minimize2, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: unknown) => unknown;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

        // Load OnlyOffice script
        await loadOnlyOfficeScript(response.documentServerUrl);

        // Store session info
        sessionIdRef.current = response.sessionId;
        setSession({
          sessionId: response.sessionId,
          config: response.config,
          documentServerUrl: response.documentServerUrl,
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
            new window.DocsAPI.DocEditor('fullscreen-editor', session.config);
            editorInitialized.current = true;
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

  const handleBack = () => {
    navigate('/editorial');
  };

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
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors text-sm"
            title="Exit Fullscreen (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
            Exit Fullscreen
          </button>
        </div>

        {/* Editor container */}
        <div
          id="fullscreen-editor"
          ref={editorRef}
          style={{
            position: 'absolute',
            top: '40px',
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
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
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm"
            title="Enter Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Editor container */}
      <div
        id="fullscreen-editor"
        ref={editorRef}
        className="flex-1"
        style={{
          minHeight: 0, // Important for flex children
        }}
      />
    </div>
  );
}
