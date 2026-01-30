/**
 * React Query configuration constants
 * Centralized cache timing settings for consistent behavior across hooks
 */

/** Citation data stale time - data is relatively static (10 minutes) */
export const CITATION_STALE_TIME = 10 * 60 * 1000;

/** Default stale time for general queries (5 minutes) */
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/** Short stale time for frequently changing data (1 minute) */
export const SHORT_STALE_TIME = 1 * 60 * 1000;

/** Long stale time for rarely changing data (30 minutes) */
export const LONG_STALE_TIME = 30 * 60 * 1000;
