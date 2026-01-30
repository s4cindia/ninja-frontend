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
  public code?: string;
  public readonly statusCode?: number;
  
  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'CitationServiceError';
    this.code = code;
    this.statusCode = statusCode;
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
    if (!error.code) {
      error.code = context;
    }
    throw error;
  }
  
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const message = serverMessage || getUserFriendlyMessage(statusCode, error.message);
    const err = new CitationServiceError(message, context, statusCode);
    if (error.stack) {
      err.stack = error.stack;
    }
    throw err;
  }
  
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred. Please try again.';
  const err = new CitationServiceError(message, context);
  if (error instanceof Error) {
    err.stack = error.stack;
  }
  throw err;
}

function buildFilterParams(filters?: CitationFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.style) params.append('style', filters.style);
  if (filters?.minConfidence !== undefined) params.append('minConfidence', String(filters.minConfidence));
  if (filters?.maxConfidence !== undefined) params.append('maxConfidence', String(filters.maxConfidence));
  if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
  if (filters?.page !== undefined) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
  return params;
}

export const citationService = {
  /**
   * Detect citations in an uploaded file
   * @param file - The file to analyze for citations (PDF, EPUB, DOCX)
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Detection result with citations array and statistics by type/style
   * @throws {CitationServiceError} If file upload fails (413 for size, 415 for type) or parsing errors occur
   */
  async detectFromFile(file: File, signal?: AbortSignal): Promise<DetectionResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<ApiResponse<DetectionResult>>(
        '/citation/detect',
        formData,
        { signal }
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_DETECT');
    }
  },

  /**
   * Detect citations from an existing job's file
   * @param jobId - The job ID whose file should be analyzed
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Detection result with citations array and statistics by type/style
   * @throws {CitationServiceError} If job not found (404) or detection fails
   */
  async detectFromJob(jobId: string, signal?: AbortSignal): Promise<DetectionResult> {
    validateId(jobId, 'job ID');
    try {
      const response = await api.post<ApiResponse<DetectionResult>>(
        `/citation/detect/${jobId}`,
        undefined,
        { signal }
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_DETECT_JOB');
    }
  },

  /**
   * Get all citations for a document with optional filtering
   * @param documentId - The document ID to fetch citations for
   * @param filters - Optional filters for type, style, confidence, review status, and pagination
   * @returns Paginated list of citations matching the filters
   * @throws {CitationServiceError} If document not found (404) or access denied (403)
   */
  async getByDocument(
    documentId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    validateId(documentId, 'document ID');
    try {
      const params = buildFilterParams(filters);
      const response = await api.get<ApiResponse<PaginatedCitations>>(
        `/citation/document/${documentId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_BY_DOCUMENT');
    }
  },

  /**
   * Get citations by job ID with optional filtering
   * @param jobId - The job ID to fetch citations for
   * @param filters - Optional filters for type, style, confidence, review status, and pagination
   * @returns Paginated list of citations matching the filters
   * @throws {CitationServiceError} If job not found (404) or access denied (403)
   */
  async getByJob(
    jobId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    validateId(jobId, 'job ID');
    try {
      const params = buildFilterParams(filters);
      const response = await api.get<ApiResponse<PaginatedCitations>>(
        `/citation/job/${jobId}?${params}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_GET_BY_JOB');
    }
  },

  /**
   * Get a single citation with its primary component
   * @param citationId - The citation ID to fetch
   * @returns Citation with populated primaryComponent if parsed
   * @throws {CitationServiceError} If citation not found (404) or access denied (403)
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
   * Parse a single citation into structured components (authors, title, etc.)
   * @param citationId - The citation ID to parse
   * @returns Parsed citation component with extracted fields and confidence scores
   * @throws {CitationServiceError} If citation not found (404) or parsing fails (422)
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
   * Parse all unparsed citations for a document in bulk
   * @param documentId - The document ID whose citations should be parsed
   * @param signal - Optional AbortSignal for request cancellation
   * @returns Bulk result with parsed/failed counts and error details
   * @throws {CitationServiceError} If document not found (404) or bulk operation fails
   */
  async parseAll(documentId: string, signal?: AbortSignal): Promise<BulkParseResult> {
    validateId(documentId, 'document ID');
    try {
      const response = await api.post<ApiResponse<BulkParseResult>>(
        `/citation/document/${documentId}/parse-all`,
        undefined,
        { signal }
      );
      return response.data.data;
    } catch (error) {
      handleError(error, 'CITATION_PARSE_ALL');
    }
  },

  /**
   * Get all parsed components (parse history) for a citation
   * @param citationId - The citation ID to fetch components for
   * @returns Array of all parsed components, including historical parses
   * @throws {CitationServiceError} If citation not found (404) or access denied (403)
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
   * @param documentId - The document ID to get statistics for
   * @returns Statistics including total, parsed, unparsed counts and breakdowns by type/style
   * @throws {CitationServiceError} If document not found (404) or access denied (403)
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
