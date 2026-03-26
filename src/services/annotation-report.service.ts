import { api } from './api';

export const annotationReportService = {
  getAnnotationReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/annotation-report`).then(r => r.data.data),

  getAnnotationReportCsvUrl: (runId: string) =>
    `/api/v1/calibration/runs/${runId}/annotation-report/export/csv`,

  getAnnotationReportPdfUrl: (runId: string) =>
    `/api/v1/calibration/runs/${runId}/annotation-report/export/pdf`,

  getTimesheetReport: (runId: string) =>
    api.get(`/calibration/runs/${runId}/timesheet-report`).then(r => r.data.data),

  getTimesheetReportCsvUrl: (runId: string) =>
    `/api/v1/calibration/runs/${runId}/timesheet-report/export/csv`,

  getTimesheetReportPdfUrl: (runId: string) =>
    `/api/v1/calibration/runs/${runId}/timesheet-report/export/pdf`,

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
