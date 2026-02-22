/**
 * Document Editor Page
 *
 * TipTap-based document editor with style validation panel integration.
 * Replaces the OnlyOffice-based FullEditorPage.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, PanelRightClose, PanelRight, Maximize2, Minimize2, Upload, Download, Save, Loader2, History, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { TipTapEditor, type TipTapEditorRef } from '@/components/editor';
import { StyleValidationPanel } from '@/components/style';
import { validatorService, type DocumentVersion } from '@/services/validator.service';
import type { StyleViolation } from '@/types/style';

export default function DocumentEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentName = searchParams.get('name') || 'Document';

  const editorRef = useRef<TipTapEditorRef>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [content, setContent] = useState<string>('<p>Loading document...</p>');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Load document content from API
  useEffect(() => {
    if (!documentId) {
      setError('No document ID provided');
      setLoading(false);
      return;
    }

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await validatorService.getDocumentContent(documentId);
        setContent(result.content);

        if (result.conversionWarnings && result.conversionWarnings.length > 0) {
          console.warn('[DocumentEditorPage] Conversion warnings:', result.conversionWarnings);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document. Please check if the document exists.');
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // Load version history
  const loadVersions = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoadingVersions(true);
      const result = await validatorService.getDocumentVersions(documentId);
      setVersions(result.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  }, [documentId]);

  // Save document
  const handleSave = useCallback(async () => {
    if (!documentId || !editorRef.current) return;

    try {
      setSaving(true);
      const htmlContent = editorRef.current.getHTML();
      const result = await validatorService.saveDocumentContent(documentId, htmlContent);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      if (result.version) {
        setCurrentVersion(result.version);
        // Refresh version list if panel is open
        if (showVersionPanel) {
          loadVersions();
        }
      }
      console.log('[DocumentEditorPage] Document saved, version:', result.version);
    } catch (err) {
      console.error('Failed to save document:', err);
      // Don't set error state to avoid disrupting the user
    } finally {
      setSaving(false);
    }
  }, [documentId, showVersionPanel, loadVersions]);

  // Auto-save functionality (every 30 seconds if there are unsaved changes)
  useEffect(() => {
    if (!hasUnsavedChanges || !documentId) return;

    const autoSaveTimer = setTimeout(async () => {
      if (editorRef.current && hasUnsavedChanges) {
        await handleSave();
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [hasUnsavedChanges, documentId, handleSave]);

  // Restore to a specific version
  const handleRestoreVersion = useCallback(async (versionId: string, versionNumber: number) => {
    if (!documentId) return;

    const confirmed = window.confirm(
      `Restore to version ${versionNumber}? This will create a new version with the restored content.`
    );
    if (!confirmed) return;

    try {
      setRestoring(true);
      const result = await validatorService.restoreDocumentVersion(documentId, versionId);

      // Reload the document content
      const contentResult = await validatorService.getDocumentContent(documentId);
      setContent(contentResult.content);

      // Update editor content
      if (editorRef.current) {
        editorRef.current.setContent(contentResult.content);
      }

      setCurrentVersion(result.newVersion);
      setHasUnsavedChanges(false);

      // Refresh version list
      loadVersions();

      console.log('[DocumentEditorPage] Restored to version:', versionNumber, 'new version:', result.newVersion);
    } catch (err) {
      console.error('Failed to restore version:', err);
      alert('Failed to restore version. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [documentId, loadVersions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleBack = () => {
    navigate('/editorial');
  };

  const toggleStylePanel = () => {
    setShowStylePanel(!showStylePanel);
    // Close version panel when opening style panel
    if (!showStylePanel) {
      setShowVersionPanel(false);
    }
  };

  const toggleVersionPanel = () => {
    const newState = !showVersionPanel;
    setShowVersionPanel(newState);
    // Close style panel when opening version panel
    if (newState) {
      setShowStylePanel(false);
      loadVersions();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Navigate to violation - find and highlight text
  const handleNavigateToViolation = useCallback((violation: StyleViolation) => {
    console.log('[DocumentEditorPage] Navigate to violation:', violation);

    if (editorRef.current) {
      const found = editorRef.current.findAndSelect(violation.originalText);
      if (found) {
        console.log('[DocumentEditorPage] Text found and selected');
      } else {
        console.log('[DocumentEditorPage] Text not found:', violation.originalText);
        const truncatedText = violation.originalText.length > 30
          ? violation.originalText.substring(0, 30) + '...'
          : violation.originalText;
        toast.error(`Text not found: "${truncatedText}"`);
      }
    }
  }, []);

  // Apply fix with track changes
  const handleApplyFix = useCallback((violation: StyleViolation, fixText: string) => {
    console.log('[DocumentEditorPage] Apply fix:', { original: violation.originalText, fix: fixText });

    if (editorRef.current) {
      // Enable track changes if not already enabled
      if (!editorRef.current.isTrackChangesEnabled()) {
        editorRef.current.enableTrackChanges();
      }

      const success = editorRef.current.replaceWithTracking(violation.originalText, fixText);
      if (success) {
        setHasUnsavedChanges(true);
        toast.success('Fix applied with track changes');
        console.log('[DocumentEditorPage] Fix applied with track changes');
      } else {
        toast.error('Could not apply fix - text may have been modified');
        console.log('[DocumentEditorPage] Failed to apply fix - text not found');
      }
    }
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((_newContent: string) => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, only support .txt files
    // TODO: Add DOCX support with mammoth.js or similar
    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setContent(`<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
    } else {
      alert('Currently only .txt files are supported. DOCX support coming soon.');
    }
  }, []);

  // Handle file download as DOCX
  const [exporting, setExporting] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!documentId) return;

    // Save current content first to ensure export has latest changes
    if (hasUnsavedChanges && editorRef.current) {
      await handleSave();
    }

    try {
      setExporting(true);
      const blob = await validatorService.exportDocument(documentId);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName.replace(/\.docx$/i, '') + '_edited.docx';
      a.click();
      URL.revokeObjectURL(url);

      console.log('[DocumentEditorPage] Document exported as DOCX');
    } catch (err) {
      console.error('Failed to export document:', err);
      alert('Failed to export document. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [documentId, documentName, hasUnsavedChanges, handleSave]);

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
          <p className="text-gray-600">Loading {documentName}...</p>
        </div>
      </div>
    );
  }

  const editorContent = (
    <div className="flex-1 flex" style={{ minHeight: 0 }}>
      {/* Editor */}
      <div className="flex-1 min-w-0">
        <TipTapEditor
          ref={editorRef}
          initialContent={content}
          onChange={handleContentChange}
          trackChangesEnabled={true}
          userId="current-user"
          userName="Current User"
          className="h-full"
        />
      </div>

      {/* Style Validation Panel */}
      {showStylePanel && documentId && (
        <div className="w-[400px] flex-shrink-0 border-l bg-white">
          <StyleValidationPanel
            documentId={documentId}
            onNavigateToViolation={handleNavigateToViolation}
            onApplyFixToDocument={handleApplyFix}
            className="h-full"
          />
        </div>
      )}

      {/* Version History Panel */}
      {showVersionPanel && documentId && (
        <div className="w-[320px] flex-shrink-0 border-l bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-sm">Version History</span>
            </div>
            <button
              onClick={toggleVersionPanel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No versions yet. Save the document to create your first version.
              </div>
            ) : (
              <div className="divide-y">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 hover:bg-gray-50 ${
                      currentVersion === version.version ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        Version {version.version}
                        {currentVersion === version.version && (
                          <span className="ml-2 text-xs text-blue-600">(current)</span>
                        )}
                      </span>
                      {currentVersion !== version.version && (
                        <button
                          onClick={() => handleRestoreVersion(version.id, version.version)}
                          disabled={restoring}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(version.createdAt).toLocaleString()}
                    </div>
                    {version.changeLog[0] && (
                      <div className="text-xs text-gray-400 mt-1">
                        {version.changeLog[0].action === 'restore'
                          ? `Restored from v${version.changeLog[0].restoredFrom}`
                          : version.changeLog[0].wordCount
                          ? `${version.changeLog[0].wordCount} words`
                          : version.changeLog[0].action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Fullscreen mode
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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Fullscreen toolbar */}
        <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
          <span className="text-white text-sm font-medium truncate max-w-xs">
            {documentName}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleStylePanel}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
                showStylePanel
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Style Check
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors text-sm"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Fullscreen
            </button>
          </div>
        </div>

        {editorContent}
      </div>
    );
  }

  // Normal mode
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Toolbar */}
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
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600">• Unsaved changes</span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-xs text-gray-400">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
              hasUnsavedChanges
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>

          <div className="h-5 w-px bg-gray-300" />

          {/* File operations */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload
            <input
              type="file"
              accept=".txt,.html,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Exporting...' : 'Export DOCX'}
          </button>

          <div className="h-5 w-px bg-gray-300" />

          <button
            onClick={toggleStylePanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
              showStylePanel
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showStylePanel ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
            Style Check
          </button>
          <button
            onClick={toggleVersionPanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
              showVersionPanel
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </button>
        </div>
      </div>

      {editorContent}
    </div>
  );
}
