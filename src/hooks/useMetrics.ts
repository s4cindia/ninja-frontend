import { useQuery } from '@tanstack/react-query';
import { getMAPHistory, getPhaseGate } from '../services/metrics.service';
import { getCorpusStats } from '../services/calibration.service';

export const METRICS_KEYS = {
  mapHistory: () => ['metrics', 'map', 'history'],
  phaseGate: () => ['metrics', 'phase-gate'],
  corpusStats: () => ['calibration', 'stats'],
};

export function useMAPHistory() {
  return useQuery({
    queryKey: METRICS_KEYS.mapHistory(),
    queryFn: getMAPHistory,
  });
}

export function usePhaseGate() {
  return useQuery({
    queryKey: METRICS_KEYS.phaseGate(),
    queryFn: getPhaseGate,
    refetchInterval: 60_000,
  });
}

export function useCorpusStatsMetrics() {
  return useQuery({
    queryKey: METRICS_KEYS.corpusStats(),
    queryFn: getCorpusStats,
  });
}
