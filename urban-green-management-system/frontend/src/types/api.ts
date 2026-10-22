/** Mirrors the backend response contract (see docs/ARCHITECTURE.md). */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  environment: string;
  database: 'connected' | 'disconnected';
  uptimeSeconds: number;
  timestamp: string;
}
