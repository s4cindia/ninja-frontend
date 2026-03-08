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
  fileSize?: number;
  wordCount?: number;
  processingTime?: number | null;
  conversionWarnings?: string[];
  contentType?: 'JOURNAL_ARTICLE' | 'BOOK' | 'UNKNOWN';
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

interface PresignResponse {
  uploadUrl: string;
  contentKey: string;
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
   * Save document content (HTML).
   * Tries presigned S3 upload first (bypasses CloudFront WAF body-size limits),
   * falls back to direct PUT when S3 is not configured (local dev — 501).
   */
  async saveDocumentContent(documentId: string, content: string, createVersion = true): Promise<{
    documentId: string;
    savedAt: string;
    wordCount: number;
    version: number | null;
  }> {
    // Try presigned S3 save (cloud/production).
    // Falls back to direct PUT on ANY failure (501 = S3 not configured,
    // CORS/network error on S3 upload, confirm-save failure, etc.).
    try {
      const presignRes = await api.post(`/validator/documents/${documentId}/presign-save`);
      const { uploadUrl, contentKey } = presignRes.data.data as PresignResponse;

      // Upload HTML directly to S3 (bypasses CloudFront)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: content,
      });
      if (!uploadRes.ok) {
        throw new Error(`S3 upload failed: ${uploadRes.status} ${await uploadRes.text().catch(() => '')}`);
      }

      // Confirm save — backend reads from S3, persists to DB
      const confirmRes = await api.post(`/validator/documents/${documentId}/confirm-save`, {
        contentKey,
        createVersion,
      });
      return confirmRes.data.data;
    } catch (err: unknown) {
      // Fall back to direct PUT for any presigned flow failure:
      // - 501: S3 not configured (local dev)
      // - CORS/network: browser can't reach S3 directly (e.g., localhost)
      // - confirm-save failure: S3 object expired or read error
      console.warn('[validator] Presigned save failed, falling back to direct PUT:', err);
    }

    // Fallback: direct PUT (works locally; on production CloudFront WAF may
    // block large bodies, but presigned flow should have succeeded above)
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
  async exportDocument(documentId: string, mode: 'clean' | 'tracked' = 'clean'): Promise<Blob> {
    const response = await api.get(`/validator/documents/${documentId}/export`, {
      params: { mode },
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
