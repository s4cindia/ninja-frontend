export const JOB_TYPE_LABELS: Record<string, string> = {
  'EPUB_ACCESSIBILITY': 'EPUB Accessibility Audit',
  'PDF_ACCESSIBILITY': 'PDF Accessibility Audit',
  'VPAT_GENERATION': 'VPAT Generation',
  'ACR_WORKFLOW': 'ACR Workflow',
  'ALT_TEXT_GENERATION': 'Alt Text Generation',
  'METADATA_EXTRACTION': 'Metadata Extraction',
  'BATCH_VALIDATION': 'Batch Validation',
  'CITATION_DETECTION': 'Citation Detection',
  'CITATION_VALIDATION': 'Citation Validation',
  'PLAGIARISM_CHECK': 'Plagiarism Check',
  'STYLE_VALIDATION': 'Style Validation',
  'EDITORIAL_FULL': 'Editorial Full Check'
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  'QUEUED': 'bg-gray-100 text-gray-800',
  'PROCESSING': 'bg-blue-100 text-blue-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'FAILED': 'bg-red-100 text-red-800',
  'CANCELLED': 'bg-yellow-100 text-yellow-800'
};

export function getJobTypeLabel(type: string): string {
  return JOB_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

export function extractFileNameFromJob(job: { input?: Record<string, unknown>; output?: Record<string, unknown> }): string {
  if (job.output?.originalName) return String(job.output.originalName);
  if (job.input?.originalName) return String(job.input.originalName);
  // Strip UUID storage prefix if present (e.g. "abc123-....epub" → shown as-is in fallback)
  const raw = job.output?.fileName || job.output?.filename || job.input?.fileName || job.input?.filename;
  if (raw) {
    return String(raw).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[._-]/i, '');
  }
  return 'Unknown file';
}
