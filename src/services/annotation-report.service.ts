import { api } from './api';

async function downloadFile(url: string, filename: string) {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const annotationReportService = {
  getAnnotationReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/annotation-report`).then(r => r.data.data),

  downloadCsv: (runId: string) =>
    downloadFile(`/calibration/runs/${runId}/annotation-report/export/csv`, `annotation-report-${runId.slice(0, 8)}.csv`),

  downloadPdf: (runId: string) =>
    downloadFile(`/calibration/runs/${runId}/annotation-report/export/pdf`, `annotation-report-${runId.slice(0, 8)}.pdf`),

  downloadLineageCsv: (runId: string) =>
    downloadFile(`/calibration/runs/${runId}/annotation-report/export/lineage-csv`, `lineage-report-${runId.slice(0, 8)}.csv`),

  getTimesheetReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/timesheet-report`).then(r => r.data.data),

  downloadTimesheetCsv: (runId: string) =>
    downloadFile(`/calibration/runs/${runId}/timesheet-report/export/csv`, `timesheet-${runId.slice(0, 8)}.csv`),

  downloadTimesheetPdf: (runId: string) =>
    downloadFile(`/calibration/runs/${runId}/timesheet-report/export/pdf`, `timesheet-${runId.slice(0, 8)}.pdf`),

  startSession: (runId: string, pageNumber?: number) =>
    api.post(`/calibration/runs/${runId}/sessions/start`, { pageNumber }).then(r => r.data.data),

  endSession: (runId: string, sessionId: string, data: {
    activeMs: number;
    idleMs: number;
    zonesReviewed: number;
    zonesConfirmed: number;
    zonesCorrected: number;
    zonesRejected: number;
    sessionLog?: unknown;
  }) =>
    api.post(`/calibration/runs/${runId}/sessions/${sessionId}/end`, data).then(r => r.data.data),

  markAnnotationComplete: (
    runId: string,
    payload?: {
      pagesReviewed: number;
      issues: Array<{
        category:
          | 'PAGE_ALIGNMENT_MISMATCH'
          | 'INSUFFICIENT_JOINT_COVERAGE'
          | 'LIMITED_ZONE_COVERAGE'
          | 'UNEQUAL_EXTRACTOR_COVERAGE'
          | 'SINGLE_EXTRACTOR_ONLY'
          | 'ZONE_CONTENT_DIVERGENCE'
          | 'COMPLETED_WITH_REDUCED_SCOPE'
          | 'OTHER';
        pagesAffected?: number;
        description: string;
        blocking: boolean;
      }>;
      notes?: string;
    },
  ) =>
    api.post(`/calibration/runs/${runId}/complete`, payload).then(r => r.data.data),

  getAnalysis: (runId: string) =>
    api.get(`/calibration/runs/${runId}/analysis`).then(r => r.data.data),

  getAnalysisStatus: (runId: string) =>
    api.get(`/calibration/runs/${runId}/analysis-status`).then(r => r.data.data),

  /**
   * Poll GET /analysis-status every `intervalMs` until `status` is
   * 'COMPLETED' or 'FAILED'. Throws on 'FAILED' or if `maxAttempts`
   * is exceeded.
   */
  pollAnalysisUntilDone: async (
    runId: string,
    { intervalMs = 3_000, maxAttempts = 100 } = {},
  ) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const status = await api
        .get(`/calibration/runs/${runId}/analysis-status`)
        .then((r) => r.data.data);
      if (status.status === 'COMPLETED') return status;
      if (status.status === 'FAILED') {
        throw new Error(status.error || 'Analysis report generation failed');
      }
    }
    throw new Error('Analysis report generation timed out');
  },

  getCorpusSummary: () =>
    api.get('/calibration/corpus/analysis-summary').then(r => r.data.data),
};
