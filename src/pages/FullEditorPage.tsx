/**
 * Full Screen Editor Page
 * Opens OnlyOffice editor in a dedicated full-screen view
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { editorService } from '../services/editor.service';

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
  const documentName = searchParams.get('name') || 'Document';

  const editorRef = useRef<HTMLDivElement>(null);
  const editorInitialized = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
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

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor for {documentName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div
        id="fullscreen-editor"
        ref={editorRef}
        className="h-full w-full"
      />
    </div>
  );
}
