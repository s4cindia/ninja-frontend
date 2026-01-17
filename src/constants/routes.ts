/**
 * Centralized route definitions for the application.
 * Use these constants instead of hardcoding route strings.
 */
export const ROUTES = {
  // ============ Static Routes ============
  HOME: '/',
  DASHBOARD: '/dashboard',
  JOBS: '/jobs',
  FILES: '/files',
  SETTINGS: '/settings',

  // ============ Auth Routes ============
  LOGIN: '/login',
  REGISTER: '/register',
  LOGOUT: '/logout',
  UNAUTHORIZED: '/unauthorized',

  // ============ Dynamic Routes ============

  /** View details of a specific job */
  JOB_DETAIL: (id: string) => `/jobs/${id}`,

  /**
   * General remediation workflow - used for EPUB accessibility jobs
   * This is the main remediation entry point from job details
   */
  REMEDIATION: (jobId: string) => `/remediation/${jobId}`,

  /**
   * EPUB-specific remediation with additional EPUB features
   * @deprecated Use REMEDIATION instead - routes are being consolidated
   */
  EPUB_REMEDIATION: (jobId: string) => `/epub/remediation/${jobId}`,

  /** View before/after comparison of remediation changes */
  COMPARISON: (jobId: string) => `/jobs/${jobId}/comparison`,

  /** ACR (Accessibility Conformance Report) workflow */
  ACR_WORKFLOW: (jobId: string) => `/acr/${jobId}`,
} as const;

// Type helper for route keys
export type RouteKey = keyof typeof ROUTES;

// Type helper for dynamic route functions
export type DynamicRoute = (id: string) => string;
