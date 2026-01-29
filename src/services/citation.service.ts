import { api, ApiResponse } from './api';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

export const citationService = {
  /**
   * Detect citations in an uploaded file
   * POST /api/v1/citation/detect
   */
  async detectFromFile(file: File): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<DetectionResult>>(
      '/citation/detect',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  },

  /**
   * Detect citations from an existing job's file
   * POST /api/v1/citation/detect/:jobId
   */
  async detectFromJob(jobId: string): Promise<DetectionResult> {
    const response = await api.post<ApiResponse<DetectionResult>>(
      `/citation/detect/${jobId}`
    );
    return response.data.data;
  },

  /**
   * Get all citations for a document
   * GET /api/v1/citation/document/:documentId
   */
  async getByDocument(
    documentId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.style) params.append('style', filters.style);
    if (filters?.minConfidence) params.append('minConfidence', String(filters.minConfidence));
    // AC-26: Filter by review status
    if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<PaginatedCitations>>(
      `/citation/document/${documentId}?${params}`
    );
    return response.data.data;
  },

  /**
   * Get citations by job ID
   * GET /api/v1/citation/job/:jobId
   */
  async getByJob(
    jobId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.style) params.append('style', filters.style);
    if (filters?.minConfidence) params.append('minConfidence', String(filters.minConfidence));
    // AC-26: Filter by review status
    if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<PaginatedCitations>>(
      `/citation/job/${jobId}?${params}`
    );
    return response.data.data;
  },

  /**
   * Get a single citation with its components
   * GET /api/v1/citation/:citationId
   */
  async getById(citationId: string): Promise<Citation> {
    const response = await api.get<ApiResponse<Citation>>(
      `/citation/${citationId}`
    );
    return response.data.data;
  },

  /**
   * Parse a single citation into components
   * POST /api/v1/citation/:citationId/parse
   */
  async parse(citationId: string): Promise<CitationComponent> {
    const response = await api.post<ApiResponse<CitationComponent>>(
      `/citation/${citationId}/parse`
    );
    return response.data.data;
  },

  /**
   * Parse all citations for a document
   * POST /api/v1/citation/document/:documentId/parse-all
   */
  async parseAll(documentId: string): Promise<BulkParseResult> {
    const response = await api.post<ApiResponse<BulkParseResult>>(
      `/citation/document/${documentId}/parse-all`
    );
    return response.data.data;
  },

  /**
   * Get all parse history for a citation
   * GET /api/v1/citation/:citationId/components
   */
  async getComponents(citationId: string): Promise<CitationComponent[]> {
    const response = await api.get<ApiResponse<CitationComponent[]>>(
      `/citation/${citationId}/components`
    );
    return response.data.data;
  },

  /**
   * Get citation statistics for a document
   * GET /api/v1/citation/document/:documentId/stats
   */
  async getStats(documentId: string): Promise<CitationStats> {
    const response = await api.get<ApiResponse<CitationStats>>(
      `/citation/document/${documentId}/stats`
    );
    return response.data.data;
  },
};
