import { performance } from 'node:perf_hooks';

import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

import { env } from '../config/environment.js';
import { createLogger, serializeError } from '../logger/index.js';

const cacheLogger = createLogger('cache');

export const CACHE_TTL = {
  client_list: 5 * 60,
  client_detail: 10 * 60,
  user_profile: 15 * 60,
  visit_schedule: 2 * 60,
  care_plan: 30 * 60,
} as const;

type RedisClient = Redis;

type RedisPoolState = {
  clients: RedisClient[];
  initializationPromise: Promise<void> | null;
  nextIndex: number;
};

const POOL_MIN_CONNECTIONS = 2;
const POOL_MAX_CONNECTIONS = 6;
const CONNECTION_TIMEOUT_MS = 1_500;
const INITIAL_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 3_000;
const MAX_RETRIES = 5;
const INVALIDATE_SCAN_COUNT = 100;

const pool: RedisPoolState = {
  clients: [],
  initializationPromise: null,
  nextIndex: 0,
};

export type CacheSetOptions = {
  ttlSeconds?: number;
};

export type CacheHealthState = 'ok' | 'error';

export type CacheHealth = {
  status: CacheHealthState;
  latencyMs: number | null;
  error?: {
    message: string;
  };
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const calculateBackoff = (attempt: number): number => {
  const exponential = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
  const capped = Math.min(exponential, MAX_BACKOFF_MS);
  const jitter = Math.round(Math.random() * 50);
  return capped + jitter;
};

const buildRedisOptions = (connectionName: string): RedisOptions => ({
  enableAutoPipelining: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 2,
  connectTimeout: CONNECTION_TIMEOUT_MS,
  connectionName,
  retryStrategy(times) {
    if (times > MAX_RETRIES) {
      return null;
    }
    return calculateBackoff(times);
  },
  reconnectOnError(error) {
    const message = error?.message ?? '';
    if (message.includes('READONLY') || message.includes('ECONNRESET')) {
      cacheLogger.warn('Redis forcing reconnect after error', {
        error: serializeError(error),
      });
      return true;
    }
    return false;
  },
});

const removeClientFromPool = (client: RedisClient) => {
  const index = pool.clients.indexOf(client);
  if (index === -1) {
    return;
  }

  pool.clients.splice(index, 1);

  if (pool.nextIndex >= pool.clients.length) {
    pool.nextIndex = 0;
  }
};

const attachClientEventHandlers = (client: RedisClient, index: number) => {
  client.on('connect', () => {
    cacheLogger.debug('Redis client connecting', { index });
  });

  client.on('ready', () => {
    cacheLogger.info('Redis client ready', { index });
  });

  client.on('error', (error: unknown) => {
    cacheLogger.error('Redis client error', {
      index,
      error: serializeError(error),
    });
  });

  client.on('close', () => {
    cacheLogger.warn('Redis client connection closed', { index });
  });

  client.on('reconnecting', (delay: number) => {
    cacheLogger.warn('Redis client reconnecting', { index, delayMs: delay });
  });

  client.on('end', () => {
    cacheLogger.warn('Redis client ended', { index });
    removeClientFromPool(client);
    void ensureMinimumPoolSize();
  });
};

const waitForClientReady = (client: RedisClient): Promise<void> =>
  new Promise((resolve, reject) => {
    if (client.status === 'ready') {
      resolve();
      return;
    }

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: unknown) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      client.off('ready', handleReady);
      client.off('error', handleError);
    };

    client.once('ready', handleReady);
    client.once('error', handleError);
  });

const createRedisClient = (index: number): RedisClient => {
  const redisUrl = env.redisUrl;

  if (!redisUrl) {
    throw new Error('Redis connection not configured');
  }

  const client = new Redis(redisUrl, buildRedisOptions(`cache:${env.appEnv}:${index}`));

  attachClientEventHandlers(client, index);

  return client;
};

const connectClientWithRetry = async (index: number): Promise<RedisClient | null> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let client: RedisClient | null = null;

    try {
      client = createRedisClient(index);
      await waitForClientReady(client);

      cacheLogger.info('Redis connection established', {
        index,
        attempt,
      });

      return client;
    } catch (error: unknown) {
      cacheLogger.warn('Redis connection attempt failed', {
        index,
        attempt,
        maxAttempts: MAX_RETRIES,
        error: serializeError(error),
      });

      if (client) {
        client.disconnect();
      }

      if (attempt === MAX_RETRIES) {
        cacheLogger.error('Redis connection failed after max retries', {
          index,
          error: serializeError(error),
        });
        break;
      }

      await wait(calculateBackoff(attempt));
    }
  }

  return null;
};

const initializePool = async (): Promise<void> => {
  if (!env.redisUrl) {
    cacheLogger.warn('Redis connection skipped - REDIS_URL/REDIS_HOST not configured');
    return;
  }

  const newClients: RedisClient[] = [];

  for (let index = 0; index < POOL_MIN_CONNECTIONS; index += 1) {
    const client = await connectClientWithRetry(index);
    if (!client) {
      break;
    }
    newClients.push(client);
  }

  pool.clients = newClients;
  pool.nextIndex = 0;

  if (pool.clients.length > 0) {
    cacheLogger.info('Redis pool initialized', {
      size: pool.clients.length,
      minConnections: POOL_MIN_CONNECTIONS,
      maxConnections: POOL_MAX_CONNECTIONS,
    });
  } else {
    cacheLogger.error('Redis pool initialization failed - no clients ready');
  }
};

const ensurePool = async (): Promise<RedisClient[]> => {
  if (pool.clients.length > 0) {
    return pool.clients;
  }

  if (!pool.initializationPromise) {
    pool.initializationPromise = initializePool().finally(() => {
      pool.initializationPromise = null;
    });
  }

  try {
    await pool.initializationPromise;
  } catch (error: unknown) {
    cacheLogger.error('Redis pool initialization promise rejected', {
      error: serializeError(error),
    });
  }

  return pool.clients;
};

const ensureMinimumPoolSize = async (): Promise<void> => {
  if (!env.redisUrl) {
    return;
  }

  if (pool.clients.length >= POOL_MIN_CONNECTIONS) {
    return;
  }

  const needed = Math.min(POOL_MIN_CONNECTIONS - pool.clients.length, POOL_MAX_CONNECTIONS - pool.clients.length);
  const newClients: RedisClient[] = [];

  for (let index = 0; index < needed; index += 1) {
    const client = await connectClientWithRetry(pool.clients.length + index);
    if (!client) {
      break;
    }
    newClients.push(client);
  }

  if (newClients.length > 0) {
    pool.clients.push(...newClients);
    cacheLogger.info('Redis pool replenished', {
      size: pool.clients.length,
    });
  }
};

const acquireClient = async (): Promise<RedisClient | null> => {
  const clients = await ensurePool();
  if (clients.length === 0) {
    return null;
  }

  const readyClients = clients.filter((client) => client.status === 'ready');

  if (readyClients.length === 0) {
    cacheLogger.warn('Redis pool temporarily unavailable - no ready clients', {
      statuses: clients.map((client) => client.status),
    });
    return null;
  }

  const client = readyClients[pool.nextIndex % readyClients.length];
  pool.nextIndex = (pool.nextIndex + 1) % readyClients.length;
  return client;
};

export const getRedisClient = (): RedisClient | null => {
  void ensurePool();
  const readyClient = pool.clients.find((client) => client.status === 'ready');
  return readyClient ?? null;
};

export const closeRedisConnections = async (): Promise<void> => {
  const clients = [...pool.clients];
  pool.clients = [];
  pool.nextIndex = 0;

  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        await client.quit();
      } catch (error: unknown) {
        cacheLogger.warn('Failed to close Redis client', { error: serializeError(error) });
      }
    }),
  );

  cacheLogger.info('Redis pool closed', { clients: clients.length });
};

export const get = async <T>(key: string): Promise<T | null> => {
  const client = await acquireClient();

  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error: unknown) {
      cacheLogger.warn('Failed to parse cached payload - deleting key', {
        key,
        error: serializeError(error),
      });

      await client.del(key);
      return null;
    }
  } catch (error: unknown) {
    cacheLogger.error('Redis get failed', {
      key,
      error: serializeError(error),
    });
    return null;
  }
};

export const set = async <T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> => {
  const client = await acquireClient();

  if (!client) {
    return false;
  }

  let payload: string;
  try {
    payload = JSON.stringify(value);
  } catch (error: unknown) {
    cacheLogger.error('Failed to serialize cache payload', {
      key,
      error: serializeError(error),
    });
    return false;
  }

  const ttlSeconds = options?.ttlSeconds;

  try {
    if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
      await client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await client.set(key, payload);
    }
    return true;
  } catch (error: unknown) {
    cacheLogger.error('Redis set failed', {
      key,
      error: serializeError(error),
    });
    return false;
  }
};

export const del = async (keys: string | string[]): Promise<number> => {
  const keyList = Array.isArray(keys) ? keys : [keys];

  if (keyList.length === 0) {
    return 0;
  }

  const client = await acquireClient();

  if (!client) {
    return 0;
  }

  try {
    return await client.del(...keyList);
  } catch (error: unknown) {
    cacheLogger.error('Redis del failed', {
      keys: keyList,
      error: serializeError(error),
    });
    return 0;
  }
};

export const invalidate = async (pattern: string): Promise<number> => {
  const client = await acquireClient();

  if (!client) {
    return 0;
  }

  let cursor = '0';
  let removed = 0;

  try {
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', INVALIDATE_SCAN_COUNT);
      cursor = nextCursor;

      if (keys.length > 0) {
        removed += await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error: unknown) {
    cacheLogger.error('Redis invalidate failed', {
      pattern,
      error: serializeError(error),
    });
  }

  return removed;
};

export const getCacheHealth = async (): Promise<CacheHealth> => {
  if (!env.redisUrl) {
    return {
      status: 'error',
      latencyMs: null,
      error: { message: 'Redis connection not configured' },
    };
  }

  const client = await acquireClient();

  if (!client) {
    return {
      status: 'error',
      latencyMs: null,
      error: { message: 'Redis pool unavailable' },
    };
  }

  const start = performance.now();

  try {
    const response = await client.ping();
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;

    if (response === 'PONG') {
      cacheLogger.debug('Redis health check succeeded', { latencyMs });
      return {
        status: 'ok',
        latencyMs,
      };
    }

    cacheLogger.warn('Unexpected Redis health check response', { response });
    const normalizedResponse = typeof response === 'string' ? response : String(response);

    return {
      status: 'error',
      latencyMs,
      error: { message: `Unexpected PING response: ${normalizedResponse}` },
    };
  } catch (error: unknown) {
    cacheLogger.error('Redis health check failed', {
      error: serializeError(error),
    });

    return {
      status: 'error',
      latencyMs: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown Redis error',
      },
    };
  }
};
