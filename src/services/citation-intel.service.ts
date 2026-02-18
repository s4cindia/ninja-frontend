/**
 * Citation Intelligence Tool - API Service
 */

import { api } from './api';
import type {
  UploadResponse,
  AnalysisResult,
  CitationReference,
  DOIVerificationResult,
  CitationIssue,
  ManuscriptResponse,
} from '@/types/citation-intel.types';

export const citationIntelService = {
  /**
   * Upload and analyze manuscript
   * Uses presigned S3 upload for production (bypasses CloudFront WAF)
   * Falls back to direct upload for local development
   */
  async upload(file: File): Promise<UploadResponse> {
    // Try presigned S3 upload first (required for production/AWS)
    try {
      // Step 1: Get presigned URL
      const presignResponse = await api.post('/citation-management/presign-upload', {
        fileName: file.name,
        fileSize: file.size,
      });

      const { uploadUrl, fileKey } = presignResponse.data.data;

      // Step 2: Upload directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }

      // Step 3: Confirm upload and start analysis
      const confirmResponse = await api.post('/citation-management/confirm-upload', {
        fileKey,
        fileName: file.name,
      });

      return confirmResponse.data.data;
    } catch (presignError: unknown) {
      // If presigned upload fails (S3 not configured, credentials missing, etc.), fall back to direct upload
      const errorResponse = presignError as { response?: { status?: number; data?: { error?: { code?: string } } } };
      const errorCode = errorResponse?.response?.data?.error?.code;
      const statusCode = errorResponse?.response?.status;

      // Fall back to direct upload for S3 configuration issues (503) or server errors (500)
      if (errorCode === 'S3_NOT_CONFIGURED' || statusCode === 503 || statusCode === 500) {
        console.log('S3 presign failed, falling back to direct upload');
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/citation-management/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data.data;
      }
      throw presignError;
    }
  },

  /**
   * Get job processing progress
   */
  async getProgress(jobId: string): Promise<{
    jobId: string;
    status: string;
    progress: number;
    totalReferences: number;
    totalCitations: number;
    totalIssues: number;
  }> {
    const response = await api.get(`/citation/job/${jobId}/progress`);
    return response.data.data;
  },

  /**
   * Get analysis results (dashboard data)
   */
  async getAnalysis(documentId: string): Promise<AnalysisResult> {
    const response = await api.get(`/citation-management/document/${documentId}/analysis`);
    return response.data.data;
  },

  /**
   * Get reference list with verification status
   */
  async getReferences(jobId: string): Promise<{ references: CitationReference[] }> {
    const response = await api.get(`/citation/job/${jobId}/references`);
    return response.data.data;
  },

  /**
   * Verify DOI for a specific reference
   */
  async verifyDOI(referenceId: string): Promise<DOIVerificationResult> {
    const response = await api.post(`/citation/reference/${referenceId}/verify-doi`);
    return response.data.data;
  },

  /**
   * Get ghost citations and issues
   */
  async getIssues(jobId: string): Promise<{
    unmatchedCitations: CitationIssue[];
    uncitedReferences: CitationIssue[];
    numberingMismatches: CitationIssue[];
  }> {
    const response = await api.get(`/citation/job/${jobId}/issues`);
    return response.data.data;
  },

  /**
   * Download corrected manuscript as DOCX
   */
  async downloadCorrectedDOCX(jobId: string): Promise<void> {
    const response = await api.get(`/citation/job/${jobId}/export-corrected`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `corrected_manuscript_${Date.now()}.docx`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download change summary report as DOCX
   */
  async downloadChangeSummary(jobId: string): Promise<void> {
    const response = await api.get(`/citation/job/${jobId}/export-summary`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `citation_changes_${Date.now()}.docx`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get interactive manuscript with citation positions
   */
  async getManuscript(jobId: string): Promise<ManuscriptResponse> {
    const response = await api.get(`/citation/job/${jobId}/manuscript`);
    return response.data.data;
  },

  /**
   * Update reference text
   */
  async updateReference(
    referenceId: string,
    correctedText: string,
    changeNote?: string
  ): Promise<CitationReference> {
    const response = await api.patch(`/citation/references/${referenceId}`, {
      correctedText,
      changeNote,
    });
    return response.data.data;
  },

  /**
   * Get change history for a reference
   */
  async getReferenceHistory(referenceId: string): Promise<{
    reference: CitationReference;
    history: Array<{
      timestamp: string;
      userId: string;
      previousText: string;
      newText: string;
      note?: string;
    }>;
  }> {
    const response = await api.get(`/citation/references/${referenceId}/history`);
    return response.data.data;
  },

  /**
   * Flag reference for manual review
   */
  async flagReferenceForReview(referenceId: string): Promise<void> {
    await api.post(`/citation/references/${referenceId}/flag-review`);
  },

  /**
   * Revert reference to original text
   */
  async revertReference(referenceId: string): Promise<CitationReference> {
    const response = await api.post(`/citation/references/${referenceId}/revert`);
    return response.data.data;
  },

  /**
   * Export manuscript with corrected references
   */
  async exportWithCorrections(
    jobId: string,
    options: {
      includeOriginal?: boolean;
      highlightChanges?: boolean;
    } = {}
  ): Promise<void> {
    const response = await api.post(
      `/citation/job/${jobId}/export`,
      options,
      {
        responseType: 'blob',
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `manuscript_corrected_${Date.now()}.docx`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
