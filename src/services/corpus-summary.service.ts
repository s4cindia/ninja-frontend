import { api } from './api';
import type {
  DateRange,
  LineageSummaryResponse,
  TimesheetSummaryResponse,
} from '@/types/corpus-summary.types';

// Service wrapper for the Corpus Summary v2 endpoints introduced in Backend
// PR #344. All functions take an explicit DateRange — no implicit defaults —
// so callers are always aware of the window they're querying.

function rangeParams(range: DateRange) {
  return { from: range.from, to: range.to };
}

async function downloadFile(
  url: string,
  params: Record<string, string>,
  filename: string,
) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function rangeFilename(range: DateRange, prefix: string, ext: string) {
  const from = range.from.replace(/-/g, '');
  const to = range.to.replace(/-/g, '');
  return `${prefix}-${from}-${to}.${ext}`;
}

export const corpusSummaryService = {
  getLineageSummary: (range: DateRange): Promise<LineageSummaryResponse> =>
    api
      .get('/calibration/corpus/lineage-summary', { params: rangeParams(range) })
      .then((r) => r.data.data),

  getTimesheetSummary: (range: DateRange): Promise<TimesheetSummaryResponse> =>
    api
      .get('/calibration/corpus/timesheet-summary', { params: rangeParams(range) })
      .then((r) => r.data.data),

  downloadLineageCsv: (range: DateRange) =>
    downloadFile(
      '/calibration/corpus/lineage-summary/export/csv',
      rangeParams(range),
      rangeFilename(range, 'corpus-lineage-summary', 'csv'),
    ),

  downloadTimesheetPerOperatorCsv: (range: DateRange) =>
    downloadFile(
      '/calibration/corpus/timesheet-summary/export/per-operator-csv',
      rangeParams(range),
      rangeFilename(range, 'corpus-timesheet-per-operator', 'csv'),
    ),

  downloadTimesheetPerTitleCsv: (range: DateRange) =>
    downloadFile(
      '/calibration/corpus/timesheet-summary/export/per-title-csv',
      rangeParams(range),
      rangeFilename(range, 'corpus-timesheet-per-title', 'csv'),
    ),

  downloadTimesheetPdf: (range: DateRange) =>
    downloadFile(
      '/calibration/corpus/timesheet-summary/export/pdf',
      rangeParams(range),
      rangeFilename(range, 'corpus-timesheet-summary', 'pdf'),
    ),
};
