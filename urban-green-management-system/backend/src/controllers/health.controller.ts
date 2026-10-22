import type { Request, Response } from 'express';
import { env } from '../config/env';
import { isDatabaseConnected } from '../config/db';

export function getHealth(_req: Request, res: Response): void {
  const dbConnected = isDatabaseConnected();

  res.json({
    success: true,
    data: {
      status: dbConnected ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      database: dbConnected ? 'connected' : 'disconnected',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
}
