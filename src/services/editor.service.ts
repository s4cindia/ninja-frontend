/**
 * Editor Service
 * API client for OnlyOffice document editing integration
 */

import { api } from './api';

export interface OnlyOfficeConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      comment: boolean;
      download: boolean;
      edit: boolean;
      print: boolean;
      review: boolean;
    };
  };
  documentType: string;
  editorConfig: {
    callbackUrl: string;
    lang: string;
    mode: string;
    user: {
      id: string;
      name: string;
    };
    customization?: {
      autosave: boolean;
      chat: boolean;
      comments: boolean;
      compactHeader: boolean;
      compactToolbar: boolean;
      feedback: boolean;
      forcesave: boolean;
      help: boolean;
      hideRightMenu: boolean;
      showReviewChanges: boolean;
      trackChanges: boolean;
    };
  };
  token?: string;
}

export interface EditorSession {
  sessionId: string;
  documentId: string;
  expiresAt: string;
  documentServerUrl: string;
  config: OnlyOfficeConfig;
}

export interface EditorStatus {
  available: boolean;
  documentServerUrl: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changeLogSummary: string;
  snapshotType: string;
}

export interface DocumentChange {
  id: string;
  documentId: string;
  changeType: string;
  status: string;
  startOffset: number;
  endOffset: number;
  beforeText: string | null;
  afterText: string | null;
  reason: string | null;
  sourceType: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface ChangeStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  autoApplied: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export const editorService = {
  /**
   * Check if OnlyOffice is available
   */
  async getStatus(): Promise<EditorStatus> {
    const response = await api.get<{ success: boolean; data: EditorStatus }>(
      '/editor/status'
    );
    return response.data.data;
  },

  /**
   * Create an editing session for a document
   */
  async createSession(
    documentId: string,
    mode: 'edit' | 'view' = 'edit'
  ): Promise<EditorSession> {
    const response = await api.post<{ success: boolean; data: EditorSession }>(
      '/editor/session',
      { documentId, mode }
    );
    return response.data.data;
  },

  /**
   * Get an existing session
   */
  async getSession(sessionId: string): Promise<EditorSession> {
    const response = await api.get<{ success: boolean; data: EditorSession }>(
      `/editor/session/${sessionId}`
    );
    return response.data.data;
  },

  /**
   * Close an editing session
   */
  async closeSession(sessionId: string): Promise<void> {
    await api.delete(`/editor/session/${sessionId}`);
  },

  /**
   * Get active sessions for a document
   */
  async getDocumentSessions(
    documentId: string
  ): Promise<{ activeCount: number; sessions: Array<{ id: string; userId: string; status: string }> }> {
    const response = await api.get<{
      success: boolean;
      data: { activeCount: number; sessions: Array<{ id: string; userId: string; status: string }> };
    }>(`/editor/document/${documentId}/sessions`);
    return response.data.data;
  },

  // ============================================
  // Document Version API
  // ============================================

  /**
   * Get all versions of a document
   */
  async getVersions(
    documentId: string
  ): Promise<{ versions: DocumentVersion[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: { versions: DocumentVersion[]; total: number };
    }>(`/document/${documentId}/versions`);
    return response.data.data;
  },

  /**
   * Get the latest version
   */
  async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    try {
      const response = await api.get<{ success: boolean; data: DocumentVersion }>(
        `/document/${documentId}/versions/latest`
      );
      return response.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Create a new version snapshot
   */
  async createVersion(
    documentId: string,
    reason?: string
  ): Promise<{ id: string; version: number }> {
    const response = await api.post<{
      success: boolean;
      data: { id: string; version: number; createdAt: string };
    }>(`/document/${documentId}/versions`, { reason });
    return response.data.data;
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    documentId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    changes: Array<{ field: string; previousValue: unknown; newValue: unknown }>;
    summary: { fieldsChanged: number; contentChanged: boolean };
  }> {
    const response = await api.get<{
      success: boolean;
      data: {
        changes: Array<{ field: string; previousValue: unknown; newValue: unknown }>;
        summary: { fieldsChanged: number; contentChanged: boolean };
      };
    }>(`/document/${documentId}/versions/compare`, {
      params: { versionA, versionB },
    });
    return response.data.data;
  },

  /**
   * Restore to a specific version
   */
  async restoreVersion(
    documentId: string,
    version: number
  ): Promise<{ newVersion: number; restoredFrom: number }> {
    const response = await api.post<{
      success: boolean;
      data: { newVersion: number; restoredFrom: number };
    }>(`/document/${documentId}/versions/${version}/restore`);
    return response.data.data;
  },

  // ============================================
  // Track Changes API
  // ============================================

  /**
   * Get all changes for a document
   */
  async getChanges(
    documentId: string,
    status?: string
  ): Promise<{ changes: DocumentChange[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: { changes: DocumentChange[]; total: number };
    }>(`/document/${documentId}/changes`, {
      params: status ? { status } : undefined,
    });
    return response.data.data;
  },

  /**
   * Get pending changes
   */
  async getPendingChanges(
    documentId: string
  ): Promise<{ changes: DocumentChange[]; total: number }> {
    const response = await api.get<{
      success: boolean;
      data: { changes: DocumentChange[]; total: number };
    }>(`/document/${documentId}/changes/pending`);
    return response.data.data;
  },

  /**
   * Get change statistics
   */
  async getChangeStats(documentId: string): Promise<ChangeStats> {
    const response = await api.get<{ success: boolean; data: ChangeStats }>(
      `/document/${documentId}/changes/stats`
    );
    return response.data.data;
  },

  /**
   * Accept a change
   */
  async acceptChange(changeId: string): Promise<DocumentChange> {
    const response = await api.patch<{ success: boolean; data: DocumentChange }>(
      `/document/change/${changeId}/accept`
    );
    return response.data.data;
  },

  /**
   * Reject a change
   */
  async rejectChange(changeId: string): Promise<DocumentChange> {
    const response = await api.patch<{ success: boolean; data: DocumentChange }>(
      `/document/change/${changeId}/reject`
    );
    return response.data.data;
  },

  /**
   * Accept all pending changes
   */
  async acceptAllChanges(documentId: string): Promise<{ accepted: number }> {
    const response = await api.post<{
      success: boolean;
      data: { accepted: number };
    }>(`/document/${documentId}/changes/accept-all`);
    return response.data.data;
  },

  /**
   * Reject all pending changes
   */
  async rejectAllChanges(documentId: string): Promise<{ rejected: number }> {
    const response = await api.post<{
      success: boolean;
      data: { rejected: number };
    }>(`/document/${documentId}/changes/reject-all`);
    return response.data.data;
  },
};

export default editorService;
