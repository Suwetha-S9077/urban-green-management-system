import app from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  // Fail fast: the API is useless without its database.
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
