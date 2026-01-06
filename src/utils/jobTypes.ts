export const JOB_TYPE_LABELS: Record<string, string> = {
  'EPUB_ACCESSIBILITY': 'EPUB Accessibility Audit',
  'PDF_ACCESSIBILITY': 'PDF Accessibility Audit',
  'VPAT_GENERATION': 'VPAT Generation',
  'ACR_WORKFLOW': 'ACR Workflow',
  'ALT_TEXT_GENERATION': 'Alt Text Generation',
  'METADATA_EXTRACTION': 'Metadata Extraction',
  'BATCH_VALIDATION': 'Batch Validation'
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

export function extractFileNameFromJob(job: { input?: any; output?: any }): string {
  if (job.output?.fileName) return job.output.fileName;
  if (job.output?.originalName) return job.output.originalName;
  if (job.input?.originalName) return job.input.originalName;
  if (job.input?.fileName) return job.input.fileName;
  return 'Unknown file';
}
