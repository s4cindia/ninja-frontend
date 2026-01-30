import axios from 'axios';
import { api, ApiResponse } from './api';
import { validateId } from '@/utils/citation.utils';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

class CitationServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'CitationServiceError';
  }
}

const STATUS_CODE_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This operation conflicts with existing data.',
  413: 'The file is too large. Please use a smaller file.',
  415: 'Unsupported file type. Please use a supported format.',
  422: 'The data could not be processed. Please check the format.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service is under maintenance. Please try again later.',
};

function getUserFriendlyMessage(statusCode?: number, fallback?: string): string {
  if (statusCode) {
    const message = STATUS_CODE_MESSAGES[statusCode];
    if (message) return message;
  }
  return fallback || 'An unexpected error occurred. Please try again.';
}

function handleError(error: unknown, context: string): never {
  if (error instanceof CitationServiceError) {
    throw error;
  }
  
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const message = serverMessage || getUserFriendlyMessage(statusCode, error.message);
    const err = new CitationServiceError(message, context, statusCode);
    err.stack = error.stack;
    throw err;
  }
  
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred. Please try again.';
  throw new CitationServiceError(message, context);
}

export const citationService = {
  /**
   * Detect citations in an uploaded file
   * POST /api/v1/citation/detect
   */
  async detectFromFile(file: File): Promise<DetectionResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<ApiResponse<DetectionResult>>(
        '/citation/detect',
        formData
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_DETECT');
    }
  },

  /**
   * Detect citations from an existing job's file
   * POST /api/v1/citation/detect/:jobId
   */
  async detectFromJob(jobId: string): Promise<DetectionResult> {
    validateId(jobId, 'job ID');
    try {
      const response = await api.post<ApiResponse<DetectionResult>>(
        `/citation/detect/${jobId}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_DETECT_JOB');
    }
  },

  /**
   * Get all citations for a document
   * GET /api/v1/citation/document/:documentId
   */
  async getByDocument(
    documentId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    validateId(documentId, 'document ID');
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.style) params.append('style', filters.style);
      if (filters?.minConfidence !== undefined) params.append('minConfidence', String(filters.minConfidence));
      if (filters?.maxConfidence !== undefined) params.append('maxConfidence', String(filters.maxConfidence));
      if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const response = await api.get<ApiResponse<PaginatedCitations>>(
        `/citation/document/${documentId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_BY_DOCUMENT');
    }
  },

  /**
   * Get citations by job ID
   * GET /api/v1/citation/job/:jobId
   */
  async getByJob(
    jobId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    validateId(jobId, 'job ID');
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.style) params.append('style', filters.style);
      if (filters?.minConfidence !== undefined) params.append('minConfidence', String(filters.minConfidence));
      if (filters?.maxConfidence !== undefined) params.append('maxConfidence', String(filters.maxConfidence));
      if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const response = await api.get<ApiResponse<PaginatedCitations>>(
        `/citation/job/${jobId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_BY_JOB');
    }
  },

  /**
   * Get a single citation with its components
   * GET /api/v1/citation/:citationId
   */
  async getById(citationId: string): Promise<Citation> {
    validateId(citationId, 'citation ID');
    try {
      const response = await api.get<ApiResponse<Citation>>(
        `/citation/${citationId}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_BY_ID');
    }
  },

  /**
   * Parse a single citation into components
   * POST /api/v1/citation/:citationId/parse
   */
  async parse(citationId: string): Promise<CitationComponent> {
    validateId(citationId, 'citation ID');
    try {
      const response = await api.post<ApiResponse<CitationComponent>>(
        `/citation/${citationId}/parse`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_PARSE');
    }
  },

  /**
   * Parse all citations for a document
   * POST /api/v1/citation/document/:documentId/parse-all
   */
  async parseAll(documentId: string): Promise<BulkParseResult> {
    validateId(documentId, 'document ID');
    try {
      const response = await api.post<ApiResponse<BulkParseResult>>(
        `/citation/document/${documentId}/parse-all`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_PARSE_ALL');
    }
  },

  /**
   * Get all parse history for a citation
   * GET /api/v1/citation/:citationId/components
   */
  async getComponents(citationId: string): Promise<CitationComponent[]> {
    validateId(citationId, 'citation ID');
    try {
      const response = await api.get<ApiResponse<CitationComponent[]>>(
        `/citation/${citationId}/components`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_COMPONENTS');
    }
  },

  /**
   * Get citation statistics for a document
   * GET /api/v1/citation/document/:documentId/stats
   */
  async getStats(documentId: string): Promise<CitationStats> {
    validateId(documentId, 'document ID');
    try {
      const response = await api.get<ApiResponse<CitationStats>>(
        `/citation/document/${documentId}/stats`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_STATS');
    }
  },
};

export { CitationServiceError };
