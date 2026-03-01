/**
 * Document Editor Page
 *
 * TipTap-based document editor with style validation panel integration.
 * Orchestrates editor layout, toolbar, stats bar, and side panels.
 */

import toast from 'react-hot-toast';
import { TipTapEditor } from '@/components/editor';
import { ValidatorPanel } from '@/components/validator/ValidatorPanel';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';
import { EditorToolbar, FullscreenToolbar } from '@/pages/editor/EditorToolbar';
import { DocumentStatsBar } from '@/pages/editor/DocumentStatsBar';
import { VersionHistoryPanel } from '@/pages/editor/VersionHistoryPanel';

export default function DocumentEditorPage() {
  const {
    editorRef,
    documentId,
    documentName,
    content,
    docStats,
    contentType,
    loading,
    saving,
    exporting,
    error,
    hasUnsavedChanges,
    lastSaved,
    showVersionPanel,
    showValidatorPanel,
    isFullscreen,
    versions,
    loadingVersions,
    currentVersion,
    restoring,
    handleBack,
    handleSave,
    handleDownload,
    handleConsolidatedReport,
    handleFileUpload,
    handleContentChange,
    handleApplyFixToDocument,
    handleRestoreVersion,
    toggleVersionPanel,
    toggleValidatorPanel,
    toggleFullscreen,
  } = useDocumentEditor();

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
      <div className="flex-1 min-w-[400px]">
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

      {showValidatorPanel && documentId && (
        <ValidatorPanel
          documentId={documentId}
          onClose={toggleValidatorPanel}
          onGoToLocation={(text) => {
            if (editorRef.current) {
              const found = editorRef.current.findAndSelect(text);
              if (!found) {
                toast.error('Could not locate this text in the document', { duration: 3000 });
              }
            }
          }}
          onApplyFix={handleApplyFixToDocument}
        />
      )}

      {showVersionPanel && documentId && (
        <VersionHistoryPanel
          versions={versions}
          loadingVersions={loadingVersions}
          currentVersion={currentVersion}
          restoring={restoring}
          onClose={toggleVersionPanel}
          onRestoreVersion={handleRestoreVersion}
        />
      )}
    </div>
  );

  // Unified return — same component tree for both modes prevents React from
  // unmounting the ValidatorPanel (and killing running checks) on fullscreen toggle.
  return (
    <div
      className={isFullscreen ? undefined : 'h-full flex flex-col overflow-hidden'}
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
      } : undefined}
    >
      {isFullscreen ? (
        <FullscreenToolbar
          documentName={documentName}
          showValidatorPanel={showValidatorPanel}
          onToggleValidatorPanel={toggleValidatorPanel}
          onToggleFullscreen={toggleFullscreen}
        />
      ) : (
        <>
          <EditorToolbar
            documentName={documentName}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSaved={lastSaved}
            saving={saving}
            exporting={exporting}
            showVersionPanel={showVersionPanel}
            showValidatorPanel={showValidatorPanel}
            isFullscreen={isFullscreen}
            onBack={handleBack}
            onSave={handleSave}
            onDownload={handleDownload}
            onConsolidatedReport={handleConsolidatedReport}
            onFileUpload={handleFileUpload}
            onToggleVersionPanel={toggleVersionPanel}
            onToggleValidatorPanel={toggleValidatorPanel}
            onToggleFullscreen={toggleFullscreen}
          />
          <DocumentStatsBar docStats={docStats} contentType={contentType} />
        </>
      )}
      {editorContent}
    </div>
  );
}
