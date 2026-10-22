import type { ApiSuccess, HealthStatus } from '@/types/api';
import { apiClient } from './apiClient';

export async function fetchHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<ApiSuccess<HealthStatus>>('/health');
  return data.data;
}
