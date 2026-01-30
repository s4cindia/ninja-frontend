import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import axios from 'axios';
import { citationService, CitationServiceError } from '../citation.service';
import { api } from '../api';
import type { CitationType } from '@/types/citation.types';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('citationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validateId', () => {
    it('should throw error for empty ID', async () => {
      await expect(citationService.getById('')).rejects.toThrow('Invalid citation ID');
    });

    it('should throw error for whitespace-only ID', async () => {
      await expect(citationService.getById('   ')).rejects.toThrow('Invalid citation ID');
    });
  });

  describe('getById', () => {
    it('should return citation on success', async () => {
      const mockCitation = { id: 'cit-1', rawText: 'Test citation' };
      (api.get as Mock).mockResolvedValueOnce({ data: { data: mockCitation } });

      const result = await citationService.getById('cit-1');

      expect(result).toEqual(mockCitation);
      expect(api.get).toHaveBeenCalledWith('/citation/cit-1');
    });

    it('should throw CitationServiceError on 404', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404, data: {} },
        message: 'Not found',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (api.get as Mock).mockRejectedValueOnce(axiosError);

      await expect(citationService.getById('not-found')).rejects.toThrow(
        'The requested resource was not found.'
      );
    });

    it('should throw CitationServiceError on 403', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 403, data: {} },
        message: 'Forbidden',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (api.get as Mock).mockRejectedValueOnce(axiosError);

      await expect(citationService.getById('forbidden')).rejects.toThrow(
        'You do not have permission to perform this action.'
      );
    });

    it('should use server message when provided', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 400, data: { message: 'Custom server error' } },
        message: 'Bad request',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (api.get as Mock).mockRejectedValueOnce(axiosError);

      await expect(citationService.getById('bad')).rejects.toThrow('Custom server error');
    });
  });

  describe('getByDocument', () => {
    it('should build query params correctly', async () => {
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { items: [], total: 0, page: 0, limit: 10, totalPages: 0 } },
      });

      await citationService.getByDocument('doc-1', {
        type: 'PARENTHETICAL' as CitationType,
        style: 'APA',
        minConfidence: 50,
        maxConfidence: 100,
        needsReview: true,
        page: 0,
        limit: 20,
      });

      expect(api.get).toHaveBeenCalledWith(
        '/citation/document/doc-1?type=PARENTHETICAL&style=APA&minConfidence=50&maxConfidence=100&needsReview=true&page=0&limit=20'
      );
    });

    it('should handle page=0 correctly', async () => {
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { items: [], total: 0, page: 0, limit: 10, totalPages: 0 } },
      });

      await citationService.getByDocument('doc-1', { page: 0 });

      expect(api.get).toHaveBeenCalledWith('/citation/document/doc-1?page=0');
    });

    it('should handle limit=0 correctly', async () => {
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { items: [], total: 0, page: 0, limit: 0, totalPages: 0 } },
      });

      await citationService.getByDocument('doc-1', { limit: 0 });

      expect(api.get).toHaveBeenCalledWith('/citation/document/doc-1?limit=0');
    });

    it('should omit undefined filters', async () => {
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { items: [], total: 0, page: 0, limit: 10, totalPages: 0 } },
      });

      await citationService.getByDocument('doc-1', { type: 'FOOTNOTE' as CitationType });

      expect(api.get).toHaveBeenCalledWith('/citation/document/doc-1?type=FOOTNOTE');
    });
  });

  describe('getByJob', () => {
    it('should validate job ID', async () => {
      await expect(citationService.getByJob('')).rejects.toThrow('Invalid job ID');
    });

    it('should build query params correctly', async () => {
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { items: [], total: 0, page: 0, limit: 10, totalPages: 0 } },
      });

      await citationService.getByJob('job-1', { page: 1, limit: 25 });

      expect(api.get).toHaveBeenCalledWith('/citation/job/job-1?page=1&limit=25');
    });
  });

  describe('parse', () => {
    it('should return parsed component on success', async () => {
      const mockComponent = { id: 'comp-1', authors: ['Author'] };
      (api.post as Mock).mockResolvedValueOnce({ data: { data: mockComponent } });

      const result = await citationService.parse('cit-1');

      expect(result).toEqual(mockComponent);
      expect(api.post).toHaveBeenCalledWith('/citation/cit-1/parse');
    });

    it('should throw on 422 parsing error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 422, data: {} },
        message: 'Unprocessable',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (api.post as Mock).mockRejectedValueOnce(axiosError);

      await expect(citationService.parse('bad-format')).rejects.toThrow(
        'The data could not be processed. Please check the format.'
      );
    });
  });

  describe('parseAll', () => {
    it('should return bulk result on success', async () => {
      const mockResult = { documentId: 'doc-1', parsed: 10, failed: 2, results: [] };
      (api.post as Mock).mockResolvedValueOnce({ data: { data: mockResult } });

      const result = await citationService.parseAll('doc-1');

      expect(result).toEqual(mockResult);
      expect(api.post).toHaveBeenCalledWith(
        '/citation/document/doc-1/parse-all',
        undefined,
        { signal: undefined }
      );
    });
  });

  describe('getStats', () => {
    it('should return stats on success', async () => {
      const mockStats = { total: 100, parsed: 80, unparsed: 20 };
      (api.get as Mock).mockResolvedValueOnce({ data: { data: mockStats } });

      const result = await citationService.getStats('doc-1');

      expect(result).toEqual(mockStats);
      expect(api.get).toHaveBeenCalledWith('/citation/document/doc-1/stats');
    });
  });

  describe('detectFromJob', () => {
    it('should detect citations from job', async () => {
      const mockDetection = { documentId: 'doc-1', citations: [] };
      (api.post as Mock).mockResolvedValueOnce({ data: { data: mockDetection } });

      const result = await citationService.detectFromJob('job-1');

      expect(result).toEqual(mockDetection);
      expect(api.post).toHaveBeenCalledWith(
        '/citation/detect/job-1',
        undefined,
        { signal: undefined }
      );
    });
  });

  describe('getComponents', () => {
    it('should return component history', async () => {
      const mockComponents = [{ id: 'comp-1' }, { id: 'comp-2' }];
      (api.get as Mock).mockResolvedValueOnce({ data: { data: mockComponents } });

      const result = await citationService.getComponents('cit-1');

      expect(result).toEqual(mockComponents);
      expect(api.get).toHaveBeenCalledWith('/citation/cit-1/components');
    });
  });

  describe('error handling', () => {
    it('should handle non-axios errors', async () => {
      (api.get as Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(citationService.getById('cit-1')).rejects.toThrow('Network error');
    });

    it('should handle unknown errors', async () => {
      (api.get as Mock).mockRejectedValueOnce('Unknown error string');

      await expect(citationService.getById('cit-1')).rejects.toThrow(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should preserve error context code', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 500, data: {} },
        message: 'Server error',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (api.get as Mock).mockRejectedValueOnce(axiosError);

      try {
        await citationService.getById('cit-1');
      } catch (error) {
        expect(error).toBeInstanceOf(CitationServiceError);
        expect((error as CitationServiceError).code).toBe('CITATION_GET_BY_ID');
      }
    });
  });
});
