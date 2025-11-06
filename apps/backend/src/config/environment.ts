import path from 'node:path';

import dotenv from 'dotenv';

const envFile = process.env.BACKEND_ENV_FILE;

dotenv.config({
  path: envFile ? path.resolve(process.cwd(), envFile) : undefined,
});

const parseIntEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const parseFloatEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildPostgresUrl = (): string | undefined => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !host || !database) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
};

const buildRedisUrl = (): string | undefined => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT ?? '6379';

  if (!host) {
    return undefined;
  }

  return `redis://${host}:${port}`;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appEnv: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
  port: parseIntEnv(process.env.PORT, 3000),
  rateLimit: {
    windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: parseIntEnv(process.env.RATE_LIMIT_MAX_REQUESTS, 120),
  },
  jwtSecret: process.env.JWT_SECRET ?? 'insecure-development-secret',
  authDemo: {
    email: process.env.AUTH_DEMO_EMAIL ?? 'care-team@berthcare.dev',
    passwordHash: process.env.AUTH_DEMO_PASSWORD_HASH,
  },
  postgresUrl: buildPostgresUrl(),
  redisUrl: buildRedisUrl(),
  shutdownTimeoutMs: parseIntEnv(process.env.SHUTDOWN_TIMEOUT_MS, 5_000),
  sentry: {
    dsn: process.env.SENTRY_DSN_BACKEND,
    tracesSampleRate: parseFloatEnv(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
    profilesSampleRate: parseFloatEnv(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0),
    flushTimeoutMs: parseIntEnv(process.env.SENTRY_FLUSH_TIMEOUT_MS, 2_000),
  },
};

export type AppEnvironment = typeof env;
