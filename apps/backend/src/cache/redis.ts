import type { Redis as RedisClient, RedisOptions } from 'ioredis';
import Redis from 'ioredis';

import { logger } from '../logger';
import { parseBoolean, parseInteger } from 'libs/utils/parse';

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;
const DEFAULT_CONNECTION_NAME = 'berth-backend';
const DEFAULT_CACHE_PREFIX = 'cache:';
const DEFAULT_SESSION_PREFIX = 'session:';
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES_PER_REQUEST = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 100;
const DEFAULT_RETRY_MAX_DELAY_MS = 30_000;

type RedisRole = 'primary' | 'cache' | 'session';

type HealthCheckDetails = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
};

export type RedisHealth = {
  healthy: boolean;
  nodes: {
    cache: HealthCheckDetails;
    session: HealthCheckDetails;
  };
};

let primaryClient: RedisClient | undefined;
let cacheClient: RedisClient | undefined;
let sessionClient: RedisClient | undefined;

const clampNumber = (value: number, min?: number, max?: number): number => {
  let result = value;

  if (typeof min === 'number') {
    result = Math.max(result, min);
  }

  if (typeof max === 'number') {
    result = Math.min(result, max);
  }

  return result;
};

const parseOptionalInteger = (
  raw: string | undefined,
  options: { min?: number; max?: number } = {}
): number | undefined => {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return clampNumber(parsed, options.min, options.max);
};

const ensurePrefix = (prefix: string): string => (prefix.endsWith(':') ? prefix : `${prefix}:`);

const shouldUseTls = (): boolean => {
  const raw = process.env.REDIS_USE_TLS ?? process.env.REDIS_TLS;
  return parseBoolean(raw, false);
};

const shouldRejectUnauthorized = (): boolean => {
  const raw = process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
  return parseBoolean(raw, true);
};

const createRetryStrategy = (): ((attempt: number) => number | null) => {
  const baseDelayMs = parseInteger(process.env.REDIS_RETRY_BASE_MS, DEFAULT_RETRY_BASE_DELAY_MS, {
    min: 10,
  });
  const maxDelayMs = parseInteger(process.env.REDIS_RETRY_MAX_MS, DEFAULT_RETRY_MAX_DELAY_MS, {
    min: baseDelayMs,
  });
  const maxAttempts = parseOptionalInteger(process.env.REDIS_MAX_RETRY_ATTEMPTS, { min: 1 });

  return (attempt: number) => {
    if (maxAttempts !== undefined && attempt > maxAttempts) {
      return null;
    }

    const exponentialDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
    const jitter = Math.random() * exponentialDelay * 0.2;

    return Math.round(exponentialDelay + jitter);
  };
};

const buildRedisOptions = (keyPrefix?: string): RedisOptions => {
  const host = process.env.REDIS_HOST ?? DEFAULT_REDIS_HOST;
  const port = parseInteger(process.env.REDIS_PORT, DEFAULT_REDIS_PORT, { min: 1, max: 65_535 });
  const db = parseInteger(process.env.REDIS_DB, DEFAULT_REDIS_DB, { min: 0 });
  const password = process.env.REDIS_PASSWORD;
  const connectTimeout = parseInteger(
    process.env.REDIS_CONNECT_TIMEOUT_MS,
    DEFAULT_CONNECT_TIMEOUT_MS,
    {
      min: 100,
    }
  );
  const keepAlive = parseOptionalInteger(process.env.REDIS_KEEP_ALIVE_MS, { min: 0 });
  const maxRetriesPerRequest = parseInteger(
    process.env.REDIS_MAX_RETRIES_PER_REQUEST,
    DEFAULT_MAX_RETRIES_PER_REQUEST,
    { min: 0 }
  );
  const enableOfflineQueue = parseBoolean(process.env.REDIS_ENABLE_OFFLINE_QUEUE, false);
  const connectionName = process.env.REDIS_CONNECTION_NAME ?? DEFAULT_CONNECTION_NAME;

  const options: RedisOptions = {
    host,
    port,
    db,
    connectionName,
    enableAutoPipelining: true,
    enableOfflineQueue,
    retryStrategy: createRetryStrategy(),
    reconnectOnError: (error) => {
      const message = error?.message ?? '';

      if (message.includes('READONLY')) {
        return true;
      }

      if (message.includes('ETIMEDOUT') || message.includes('ECONNRESET')) {
        return true;
      }

      return false;
    },
    keyPrefix: keyPrefix ? ensurePrefix(keyPrefix) : undefined,
    maxRetriesPerRequest,
    connectTimeout,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  };

  if (password) {
    options.password = password;
  }

  if (keepAlive !== undefined) {
    options.keepAlive = keepAlive;
  }

  if (shouldUseTls()) {
    options.tls = {
      rejectUnauthorized: shouldRejectUnauthorized(),
    };
  }

  return options;
};

const attachLogging = (client: RedisClient, role: RedisRole): void => {
  client.on('connect', () => {
    logger.debug(`Redis (${role}) connecting`);
  });

  client.on('ready', () => {
    logger.info(`Redis (${role}) connection ready`);
  });

  client.on('error', (error: Error) => {
    logger.error(`Redis (${role}) error`, {
      message: error.message,
    });
  });

  client.on('end', () => {
    logger.warn(`Redis (${role}) connection closed`);
  });

  client.on('reconnecting', (delay: number) => {
    logger.warn(`Redis (${role}) attempting reconnect`, {
      delayMs: delay,
    });
  });
};

const createRedisClient = (role: RedisRole, keyPrefix?: string): RedisClient => {
  const url = process.env.REDIS_URL;
  const options = buildRedisOptions(keyPrefix);

  const client = url ? new Redis(url, options) : new Redis(options);
  attachLogging(client, role);

  return client;
};

export const getRedisClient = (): RedisClient => {
  if (!primaryClient) {
    primaryClient = createRedisClient('primary');
  }

  return primaryClient;
};

export const getCacheClient = (): RedisClient => {
  if (!cacheClient) {
    const prefix = process.env.REDIS_CACHE_PREFIX ?? DEFAULT_CACHE_PREFIX;
    cacheClient = createRedisClient('cache', prefix);
  }

  return cacheClient;
};

export const getSessionClient = (): RedisClient => {
  if (!sessionClient) {
    const prefix = process.env.REDIS_SESSION_PREFIX ?? DEFAULT_SESSION_PREFIX;
    sessionClient = createRedisClient('session', prefix);
  }

  return sessionClient;
};

const measureHealth = async (
  client: RedisClient,
  label: 'cache' | 'session'
): Promise<HealthCheckDetails> => {
  const start = process.hrtime.bigint();

  try {
    await client.ping();
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    return {
      healthy: true,
      latencyMs: Number(durationMs.toFixed(3)),
    };
  } catch (error) {
    const err = error as Error;

    logger.warn(`Redis (${label}) health check failed`, {
      message: err.message,
    });

    return {
      healthy: false,
      error: err.message,
    };
  }
};

export const checkRedisConnection = async (): Promise<RedisHealth> => {
  const cacheHealth = await measureHealth(getCacheClient(), 'cache');
  const sessionHealth = await measureHealth(getSessionClient(), 'session');

  return {
    healthy: cacheHealth.healthy && sessionHealth.healthy,
    nodes: {
      cache: cacheHealth,
      session: sessionHealth,
    },
  };
};

const closeClient = async (client: RedisClient | undefined, role: RedisRole): Promise<void> => {
  if (!client) {
    return;
  }

  try {
    await client.quit();
    logger.info(`Redis (${role}) connection closed gracefully`);
  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to close Redis (${role}) connection`, {
      message: err.message,
    });
  }
};

export const closeRedisConnections = async (): Promise<void> => {
  await Promise.all([
    closeClient(cacheClient, 'cache'),
    closeClient(sessionClient, 'session'),
    closeClient(primaryClient, 'primary'),
  ]);

  cacheClient = undefined;
  sessionClient = undefined;
  primaryClient = undefined;
};
