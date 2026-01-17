export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  JOBS: '/jobs',
  FILES: '/files',
  SETTINGS: '/settings',

  JOB_DETAIL: (id: string) => `/jobs/${id}`,
  REMEDIATION: (id: string) => `/remediation/${id}`,
  EPUB_REMEDIATION: (jobId: string) => `/epub/remediation/${jobId}`,
  COMPARISON: (jobId: string) => `/jobs/${jobId}/comparison`,

  ACR_WORKFLOW: (jobId: string) => `/acr/${jobId}`,

  LOGIN: '/login',
  REGISTER: '/register',
  LOGOUT: '/logout',
  UNAUTHORIZED: '/unauthorized',
} as const;

export type RouteKey = keyof typeof ROUTES;
