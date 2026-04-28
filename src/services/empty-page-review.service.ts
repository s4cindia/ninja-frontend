import { api } from './api';

export type EmptyPageCategory = 'LEGIT_EMPTY' | 'DETECTION_FAILURE' | 'UNSURE';

export const EMPTY_PAGE_CATEGORIES: ReadonlyArray<EmptyPageCategory> = [
  'LEGIT_EMPTY',
  'DETECTION_FAILURE',
  'UNSURE',
];

// Mirror of the backend's controlled vocabulary. Order matters — used as the
// drop-down option order. Keep in lockstep with the backend's pageType enum
// validation and with `ninja-frontend/docs/empty-pages-review/sheet-setup.gs`.
export const EMPTY_PAGE_TYPES = [
  'blank',
  'cover',
  'copyright',
  'dedication',
  'colophon',
  'chapter_divider',
  'toc_divider',
  'image_plate',
  'ornament',
  'text_normal',
  'text_complex',
  'table',
  'figure',
  'mixed',
  'other',
] as const;

export type EmptyPageType = (typeof EMPTY_PAGE_TYPES)[number];

// Page types that are valid only when category === 'LEGIT_EMPTY'.
export const LEGIT_EMPTY_PAGE_TYPES: ReadonlyArray<EmptyPageType> = [
  'blank',
  'cover',
  'copyright',
  'dedication',
  'colophon',
  'chapter_divider',
  'toc_divider',
  'image_plate',
  'ornament',
];

// Page types that are valid when category is DETECTION_FAILURE or UNSURE.
export const DETECTION_FAILURE_PAGE_TYPES: ReadonlyArray<EmptyPageType> = [
  'text_normal',
  'text_complex',
  'table',
  'figure',
  'mixed',
];

export interface EmptyPageReviewAnnotator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface EmptyPageReview {
  pageNumber: number;
  category: EmptyPageCategory;
  pageType: EmptyPageType | string;
  expectedContent: string | null;
  notes: string | null;
  annotator: EmptyPageReviewAnnotator;
  reviewedAt: string;
  updatedAt: string;
}

export interface SaveEmptyPageReviewPayload {
  category: EmptyPageCategory;
  pageType: EmptyPageType | string;
  expectedContent?: string;
  notes?: string;
}

const basePath = (runId: string) =>
  `/calibration/runs/${encodeURIComponent(runId)}/empty-page-reviews`;

export const listEmptyPageReviews = async (
  runId: string,
): Promise<{ reviews: EmptyPageReview[] }> =>
  (await api.get(basePath(runId))).data.data;

export const getEmptyPageReview = async (
  runId: string,
  pageNumber: number,
): Promise<EmptyPageReview | null> => {
  try {
    const res = await api.get(`${basePath(runId)}/${pageNumber}`);
    return res.data.data;
  } catch (err) {
    // 404 = "no review yet for this page" — not an error from the caller's POV.
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw err;
  }
};

export const saveEmptyPageReview = async (
  runId: string,
  pageNumber: number,
  payload: SaveEmptyPageReviewPayload,
): Promise<EmptyPageReview> =>
  (await api.put(`${basePath(runId)}/${pageNumber}`, payload)).data.data;

export const deleteEmptyPageReview = async (
  runId: string,
  pageNumber: number,
): Promise<{ deleted: boolean }> =>
  (await api.delete(`${basePath(runId)}/${pageNumber}`)).data.data;
