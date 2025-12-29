import { api } from './api';
import type { RemediationConfig, RemediationConfigResponse } from '@/types/remediation.types';

export async function getRemediationConfig(): Promise<RemediationConfig> {
  const response = await api.get<RemediationConfigResponse>('/config/remediation');
  return response.data.data;
}

export async function updateRemediationConfig(
  updates: Partial<RemediationConfig>
): Promise<RemediationConfig> {
  const response = await api.patch<RemediationConfigResponse>('/config/remediation', updates);
  return response.data.data;
}

export async function resetRemediationConfig(): Promise<RemediationConfig> {
  const response = await api.post<RemediationConfigResponse>('/config/remediation/reset');
  return response.data.data;
}
