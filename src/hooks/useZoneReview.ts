import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCalibrationZones,
  confirmZone,
  correctZone,
  rejectZone,
  confirmAllGreen,
  runAutoAnnotation,
} from '../services/zone-correction.service';

export const ZONE_KEYS = {
  zones: (runId: string, params?: object) =>
    ['calibration', 'zones', runId, params] as const,
};

export function useCalibrationZones(
  runId: string,
  params?: { bucket?: string; limit?: number; cursor?: string }
) {
  return useQuery({
    queryKey: ZONE_KEYS.zones(runId, params),
    queryFn: () => getCalibrationZones(runId, { ...params, limit: 2000 }),
    enabled: !!runId,
  });
}

export function useConfirmZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmZone,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useCorrectZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      zoneId,
      payload,
    }: {
      zoneId: string;
      payload: { newLabel: string; bbox?: object };
    }) => correctZone(zoneId, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useRejectZone(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectZone,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useConfirmAllGreen(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmAllGreen(runId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}

export function useAutoAnnotate(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => runAutoAnnotation(runId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['calibration', 'zones', runId] }),
  });
}
