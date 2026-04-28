import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  deleteEmptyPageReview,
  getEmptyPageReview,
  listEmptyPageReviews,
  saveEmptyPageReview,
} from '../empty-page-review.service';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('empty-page-review.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEmptyPageReviews', () => {
    it('returns the unwrapped reviews array', async () => {
      const reviews = [
        { pageNumber: 5, category: 'LEGIT_EMPTY', pageType: 'blank' },
      ];
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: { reviews } },
      });

      const result = await listEmptyPageReviews('run-1');
      expect(result).toEqual({ reviews });
      expect(api.get).toHaveBeenCalledWith(
        '/calibration/runs/run-1/empty-page-reviews',
      );
    });
  });

  describe('getEmptyPageReview', () => {
    it('returns the review when one exists', async () => {
      const review = {
        pageNumber: 96,
        category: 'DETECTION_FAILURE',
      };
      (api.get as Mock).mockResolvedValueOnce({
        data: { data: review },
      });

      const result = await getEmptyPageReview('run-1', 96);
      expect(result).toEqual(review);
    });

    it('returns null when the backend responds with 404', async () => {
      (api.get as Mock).mockRejectedValueOnce({ response: { status: 404 } });
      const result = await getEmptyPageReview('run-1', 96);
      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      (api.get as Mock).mockRejectedValueOnce({ response: { status: 500 } });
      await expect(getEmptyPageReview('run-1', 96)).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    it('rethrows network errors with no response', async () => {
      const networkErr = new Error('Network down');
      (api.get as Mock).mockRejectedValueOnce(networkErr);
      await expect(getEmptyPageReview('run-1', 96)).rejects.toThrow(
        'Network down',
      );
    });
  });

  describe('saveEmptyPageReview', () => {
    it('PUTs the payload and returns the upserted review', async () => {
      const upserted = {
        pageNumber: 96,
        category: 'LEGIT_EMPTY',
        pageType: 'blank',
      };
      (api.put as Mock).mockResolvedValueOnce({
        data: { data: upserted },
      });

      const result = await saveEmptyPageReview('run-1', 96, {
        category: 'LEGIT_EMPTY',
        pageType: 'blank',
      });
      expect(result).toEqual(upserted);
      expect(api.put).toHaveBeenCalledWith(
        '/calibration/runs/run-1/empty-page-reviews/96',
        { category: 'LEGIT_EMPTY', pageType: 'blank' },
      );
    });
  });

  describe('deleteEmptyPageReview', () => {
    it('DELETEs and returns the unwrapped success body', async () => {
      (api.delete as Mock).mockResolvedValueOnce({
        data: { data: { deleted: true } },
      });

      const result = await deleteEmptyPageReview('run-1', 96);
      expect(result).toEqual({ deleted: true });
      expect(api.delete).toHaveBeenCalledWith(
        '/calibration/runs/run-1/empty-page-reviews/96',
      );
    });
  });
});
