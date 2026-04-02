import { api } from './api';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const annotationReportService = {
  getAnnotationReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/annotation-report`).then(r => r.data.data),

  getAnnotationReportCsvUrl: (runId: string) =>
    `${API_BASE}/calibration/runs/${runId}/annotation-report/export/csv`,

  getAnnotationReportPdfUrl: (runId: string) =>
    `${API_BASE}/calibration/runs/${runId}/annotation-report/export/pdf`,

  getLineageCsvUrl: (runId: string) =>
    `${API_BASE}/calibration/runs/${runId}/annotation-report/export/lineage-csv`,

  getTimesheetReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/timesheet-report`).then(r => r.data.data),

  getTimesheetReportCsvUrl: (runId: string) =>
    `${API_BASE}/calibration/runs/${runId}/timesheet-report/export/csv`,

  getTimesheetReportPdfUrl: (runId: string) =>
    `${API_BASE}/calibration/runs/${runId}/timesheet-report/export/pdf`,

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
};
