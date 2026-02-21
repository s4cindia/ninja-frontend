/**
 * Test Page for OnlyOffice Editor Integration
 *
 * This page allows testing:
 * 1. OnlyOffice availability
 * 2. Document editing sessions
 * 3. Version history
 * 4. Track changes
 */

import { useState, useEffect } from 'react';
import { editorService, DocumentVersion, DocumentChange, ChangeStats } from '@/services/editor.service';
import { api } from '@/services/api';

interface EditorialDocument {
  id: string;
  fileName: string;
  originalName: string;
  status: string;
  createdAt: string;
}

export default function TestEditorPage() {
  // State
  const [status, setStatus] = useState<{ available: boolean; documentServerUrl: string } | null>(null);
  const [documents, setDocuments] = useState<EditorialDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [changes, setChanges] = useState<DocumentChange[]>([]);
  const [changeStats, setChangeStats] = useState<ChangeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check OnlyOffice status on mount
  useEffect(() => {
    checkStatus();
    loadDocuments();
  }, []);

  const checkStatus = async () => {
    try {
      const result = await editorService.getStatus();
      setStatus(result);
      setError(null);
    } catch (err) {
      setStatus({ available: false, documentServerUrl: '' });
      setError('Failed to check OnlyOffice status');
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { documents: EditorialDocument[] };
      }>('/citation-management/documents');
      setDocuments(response.data.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadVersions = async (docId: string) => {
    if (!docId) return;
    try {
      const result = await editorService.getVersions(docId);
      setVersions(result.versions);
    } catch (err) {
      // Version tracking not available yet - gracefully ignore
      console.log('Version tracking not available:', err);
      setVersions([]);
    }
  };

  const loadChanges = async (docId: string) => {
    if (!docId) return;
    try {
      const [changesResult, statsResult] = await Promise.all([
        editorService.getChanges(docId),
        editorService.getChangeStats(docId),
      ]);
      setChanges(changesResult.changes);
      setChangeStats(statsResult);
    } catch (err) {
      // Track changes not available yet - gracefully ignore
      console.log('Track changes not available:', err);
      setChanges([]);
      setChangeStats(null);
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(docId);
    if (docId) {
      loadVersions(docId);
      loadChanges(docId);
    } else {
      setVersions([]);
      setChanges([]);
      setChangeStats(null);
    }
  };

  const openEditor = () => {
    if (!selectedDocId) {
      setError('Please select a document first');
      return;
    }

    if (!status?.available) {
      setError('OnlyOffice is not available. Make sure Docker is running.');
      return;
    }

    // Get document name for the new tab
    const doc = documents.find(d => d.id === selectedDocId);
    const documentName = doc?.originalName || 'Document';

    // Open editor in a new tab
    const editorUrl = `/editor/${selectedDocId}?name=${encodeURIComponent(documentName)}`;
    window.open(editorUrl, '_blank');
    setMessage(`Opened editor for "${documentName}" in a new tab`);
  };


  const createVersion = async () => {
    if (!selectedDocId) return;

    setLoading(true);
    try {
      const result = await editorService.createVersion(selectedDocId, 'Manual snapshot');
      setMessage(`Created version ${result.version}`);
      loadVersions(selectedDocId);
    } catch (err) {
      setError('Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (version: number) => {
    if (!selectedDocId) return;

    if (!confirm(`Restore document to version ${version}?`)) return;

    setLoading(true);
    try {
      const result = await editorService.restoreVersion(selectedDocId, version);
      setMessage(`Restored to version ${result.restoredFrom}, new version is ${result.newVersion}`);
      loadVersions(selectedDocId);
    } catch (err) {
      setError('Failed to restore version');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChange = async (changeId: string) => {
    try {
      await editorService.acceptChange(changeId);
      loadChanges(selectedDocId);
      setMessage('Change accepted');
    } catch (err) {
      setError('Failed to accept change');
    }
  };

  const handleRejectChange = async (changeId: string) => {
    try {
      await editorService.rejectChange(changeId);
      loadChanges(selectedDocId);
      setMessage('Change rejected');
    } catch (err) {
      setError('Failed to reject change');
    }
  };

  const handleAcceptAll = async () => {
    if (!selectedDocId) return;
    try {
      const result = await editorService.acceptAllChanges(selectedDocId);
      loadChanges(selectedDocId);
      setMessage(`Accepted ${result.accepted} changes`);
    } catch (err) {
      setError('Failed to accept all changes');
    }
  };

  const handleRejectAll = async () => {
    if (!selectedDocId) return;
    try {
      const result = await editorService.rejectAllChanges(selectedDocId);
      loadChanges(selectedDocId);
      setMessage(`Rejected ${result.rejected} changes`);
    } catch (err) {
      setError('Failed to reject all changes');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          OnlyOffice Editor Test Page
        </h1>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
              ✕
            </button>
          </div>
        )}
        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
            <button onClick={() => setMessage(null)} className="ml-4 text-green-500 hover:text-green-700">
              ✕
            </button>
          </div>
        )}

        {/* OnlyOffice Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">OnlyOffice Status</h2>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${status?.available ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-700">
              {status?.available ? 'OnlyOffice is available' : 'OnlyOffice is not available'}
            </span>
            <button
              onClick={checkStatus}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Status
            </button>
          </div>
          {status?.documentServerUrl && (
            <p className="mt-2 text-sm text-gray-500">
              Server URL: {status.documentServerUrl}
            </p>
          )}
          {!status?.available && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>To start OnlyOffice:</strong>
              </p>
              <pre className="mt-2 text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
{`cd ninja-backend/docker/onlyoffice
docker-compose up -d`}
              </pre>
            </div>
          )}
        </div>

        {/* Document Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Document</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedDocId}
              onChange={(e) => handleDocumentSelect(e.target.value)}
              className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a document --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.originalName} ({doc.status})
                </option>
              ))}
            </select>
            <button
              onClick={loadDocuments}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Refresh
            </button>
          </div>
          {documents.length === 0 && (
            <p className="mt-4 text-gray-500">
              No documents found. Upload a document via Citation Upload first.
            </p>
          )}
        </div>

        {selectedDocId && (
          <>
            {/* Editor Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Document Editor</h2>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={openEditor}
                  disabled={!status?.available}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Open in New Tab
                </button>
              </div>

              {!status?.available && (
                <div className="p-8 border-2 border-dashed border-gray-300 rounded text-center text-gray-500">
                  Start OnlyOffice Docker container to enable editing
                </div>
              )}

              {status?.available && (
                <p className="text-sm text-gray-500">
                  Click "Open in New Tab" to launch the OnlyOffice editor in a full-screen view.
                </p>
              )}
            </div>

            {/* Version History */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Version History</h2>
                <button
                  onClick={createVersion}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Create Snapshot
                </button>
              </div>

              {versions.length === 0 ? (
                <p className="text-gray-500">No versions yet. Create a snapshot to start version history.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <span className="font-medium">Version {v.version}</span>
                        <span className="ml-4 text-sm text-gray-500">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                        <span className="ml-4 text-sm text-gray-400">
                          {v.changeLogSummary}
                        </span>
                      </div>
                      <button
                        onClick={() => restoreVersion(v.version)}
                        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Track Changes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Track Changes</h2>
                {changeStats && changeStats.pending > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptAll}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Accept All ({changeStats.pending})
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject All
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              {changeStats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-gray-100 rounded text-center">
                    <div className="text-2xl font-bold">{changeStats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded text-center">
                    <div className="text-2xl font-bold text-yellow-700">{changeStats.pending}</div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>
                  <div className="p-3 bg-green-100 rounded text-center">
                    <div className="text-2xl font-bold text-green-700">{changeStats.accepted}</div>
                    <div className="text-sm text-green-600">Accepted</div>
                  </div>
                  <div className="p-3 bg-red-100 rounded text-center">
                    <div className="text-2xl font-bold text-red-700">{changeStats.rejected}</div>
                    <div className="text-sm text-red-600">Rejected</div>
                  </div>
                </div>
              )}

              {/* Change List */}
              {changes.length === 0 ? (
                <p className="text-gray-500">No tracked changes yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className={`p-3 rounded border ${
                        change.status === 'PENDING'
                          ? 'bg-yellow-50 border-yellow-200'
                          : change.status === 'ACCEPTED'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                            change.changeType === 'INSERT' ? 'bg-green-200' :
                            change.changeType === 'DELETE' ? 'bg-red-200' :
                            'bg-blue-200'
                          }`}>
                            {change.changeType}
                          </span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            change.status === 'PENDING' ? 'bg-yellow-200' :
                            change.status === 'ACCEPTED' ? 'bg-green-200' :
                            'bg-red-200'
                          }`}>
                            {change.status}
                          </span>
                          {change.reason && (
                            <span className="ml-2 text-xs text-gray-500">{change.reason}</span>
                          )}
                        </div>
                        {change.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptChange(change.id)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectChange(change.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                      {(change.beforeText || change.afterText) && (
                        <div className="mt-2 text-sm">
                          {change.beforeText && (
                            <div className="text-red-600 line-through">
                              {change.beforeText.substring(0, 100)}
                              {change.beforeText.length > 100 && '...'}
                            </div>
                          )}
                          {change.afterText && (
                            <div className="text-green-600">
                              {change.afterText.substring(0, 100)}
                              {change.afterText.length > 100 && '...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
