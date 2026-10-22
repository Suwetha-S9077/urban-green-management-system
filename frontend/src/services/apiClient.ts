import axios from 'axios';
import { env } from '@/config/env';
import type { ApiErrorBody } from '@/types/api';

/** The one error type UI code needs to handle. */
export class ApiClientError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      const body = error.response?.data;
      if (body?.error) {
        return Promise.reject(
          new ApiClientError(body.error.message, error.response?.status, body.error.code, body.error.details),
        );
      }
      if (!error.response) {
        return Promise.reject(
          new ApiClientError(
            'Unable to reach the server. Check that the backend is running and try again.',
            undefined,
            'NETWORK_ERROR',
          ),
        );
      }
      return Promise.reject(new ApiClientError(error.message, error.response.status));
    }
    return Promise.reject(error);
  },
);
