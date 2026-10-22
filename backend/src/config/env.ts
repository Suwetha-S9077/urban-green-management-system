import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5174'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // How long aggregate results (dashboard, analytics) are cached in memory. 0 disables caching.
  ANALYTICS_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
