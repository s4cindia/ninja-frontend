/**
 * Validator Service
 * Handles document upload and content management for the Validator feature
 */

import { api } from './api';

export interface ValidatorDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentContent {
  documentId: string;
  content: string;
  fileName: string;
  conversionWarnings?: string[];
}

export interface UploadResponse {
  documentId: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  status: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changeLog: Array<{
    timestamp: string;
    action: string;
    wordCount?: number;
    restoredFrom?: number;
  }>;
  snapshotType: string;
}

export interface DocumentVersionDetail extends DocumentVersion {
  snapshot: {
    content: string;
    wordCount: number;
    savedAt: string;
    restoredFromVersion?: number;
  };
  fileName: string;
}

export const validatorService = {
  /**
   * Upload a DOCX file for editing
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/validator/upload', formData);
    return response.data.data;
  },

  /**
   * List all documents for the current user
   */
  async listDocuments(limit = 50, offset = 0): Promise<{
    documents: ValidatorDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await api.get('/validator/documents', {
      params: { limit, offset },
    });
    return response.data.data;
  },

  /**
   * Get document details
   */
  async getDocument(documentId: string): Promise<ValidatorDocument> {
    const response = await api.get(`/validator/documents/${documentId}`);
    return response.data.data;
  },

  /**
   * Get document content as HTML for editing
   */
  async getDocumentContent(documentId: string): Promise<DocumentContent> {
    const response = await api.get(`/validator/documents/${documentId}/content`);
    return response.data.data;
  },

  /**
   * Get document file URL for viewing (PDF) or download
   */
  getDocumentFileUrl(documentId: string): string {
    // Return the full URL for the file endpoint
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/validator/documents/${documentId}/file`;
  },

  /**
   * Get document file as blob for viewing
   */
  async getDocumentFileBlob(documentId: string): Promise<Blob> {
    const response = await api.get(`/validator/documents/${documentId}/file`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Save document content (HTML)
   */
  async saveDocumentContent(documentId: string, content: string, createVersion = true): Promise<{
    documentId: string;
    savedAt: string;
    wordCount: number;
    version: number | null;
  }> {
    const response = await api.put(`/validator/documents/${documentId}/content`, {
      content,
      createVersion,
    });
    return response.data.data;
  },

  /**
   * Get document version history
   */
  async getDocumentVersions(documentId: string): Promise<{
    documentId: string;
    versions: DocumentVersion[];
    total: number;
  }> {
    const response = await api.get(`/validator/documents/${documentId}/versions`);
    return response.data.data;
  },

  /**
   * Get a specific version's content
   */
  async getDocumentVersion(documentId: string, versionId: string): Promise<DocumentVersionDetail> {
    const response = await api.get(`/validator/documents/${documentId}/versions/${versionId}`);
    return response.data.data;
  },

  /**
   * Restore document to a specific version
   */
  async restoreDocumentVersion(documentId: string, versionId: string): Promise<{
    documentId: string;
    restoredFromVersion: number;
    newVersion: number;
    wordCount: number;
  }> {
    const response = await api.post(`/validator/documents/${documentId}/versions/${versionId}/restore`);
    return response.data.data;
  },

  /**
   * Export document as DOCX
   * Returns a Blob that can be downloaded
   */
  async exportDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/validator/documents/${documentId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Clear cached HTML content to force re-conversion from original DOCX
   */
  async clearContentCache(documentId: string): Promise<{
    documentId: string;
    message: string;
  }> {
    const response = await api.post(`/validator/documents/${documentId}/clear-cache`);
    return response.data.data;
  },
};

export default validatorService;
