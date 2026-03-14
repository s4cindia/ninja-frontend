import { api } from './api';

export interface CalibrationZone {
  id: string;
  calibrationRunId: string;
  pageNumber: number;
  bounds: { x: number; y: number; w: number; h: number };
  type: string;
  source: string;
  reconciliationBucket: 'GREEN' | 'AMBER' | 'RED';
  doclingLabel?: string;
  doclingConfidence?: number;
  pdfxtLabel?: string;
  operatorVerified: boolean;
  operatorLabel?: string;
  tableStructure?: { thead: unknown; tbody: unknown };
  isArtefact: boolean;
  confidence?: number;
}

export interface ZonesResponse {
  zones: CalibrationZone[];
  nextCursor?: string;
}

export const getCalibrationZones = async (
  runId: string,
  params?: { bucket?: string; limit?: number; cursor?: string }
): Promise<ZonesResponse> =>
  (await api.get(`/calibration/runs/${runId}/zones`, { params })).data.data;

export const confirmZone = async (
  zoneId: string
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${zoneId}/confirm`)).data.data;

export const correctZone = async (
  zoneId: string,
  payload: { newLabel: string; bbox?: object }
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${zoneId}/correct`, payload)).data.data;

export const rejectZone = async (
  zoneId: string
): Promise<CalibrationZone> =>
  (await api.post(`/calibration/zones/${zoneId}/reject`)).data.data;

export const confirmAllGreen = async (
  runId: string
): Promise<{ confirmedCount: number }> =>
  (await api.post(`/calibration/runs/${runId}/confirm-all-green`)).data.data;
