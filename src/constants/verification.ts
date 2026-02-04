/**
 * Verification-related constants
 */

/** 
 * Confidence score threshold for determining if human verification is needed.
 * Criteria with scores below this threshold require manual review.
 */
export const CONFIDENCE_THRESHOLD_HIGH = 90;

/**
 * Confidence score thresholds for categorization
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 60,
  LOW: 0,
} as const;

/**
 * Severity thresholds based on confidence scores
 */
export const SEVERITY_THRESHOLDS = {
  CRITICAL: 0,   // status === 'fail'
  SERIOUS: 50,
  MODERATE: 70,
} as const;

/**
 * N/A Suggestion confidence threshold for "Quick Accept" feature.
 * Only suggestions with confidence >= this threshold show the quick accept button.
 */
export const NA_QUICK_ACCEPT_THRESHOLD = 80;
