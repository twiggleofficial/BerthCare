import { performance } from 'node:perf_hooks';
import { Redis } from 'ioredis';
import { env } from '../config/environment.js';
import { createLogger, serializeError } from '../logger/index.js';
const cacheLogger = createLogger('cache');
const parsePositiveIntEnv = (name, fallback) => {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value) || value <= 0) {
        cacheLogger.warn('Ignoring invalid numeric environment value; using fallback', {
            name,
            value: raw,
            fallback,
        });
        return fallback;
    }
    return value;
};
export const CACHE_TTL = {
    client_list: 5 * 60,
    client_detail: 10 * 60,
    user_profile: 15 * 60,
    visit_schedule: 2 * 60,
    care_plan: 30 * 60,
};
const POOL_MIN_CONNECTIONS = parsePositiveIntEnv('REDIS_POOL_MIN', 2);
const POOL_MAX_CONNECTIONS = Math.max(parsePositiveIntEnv('REDIS_POOL_MAX', 6), POOL_MIN_CONNECTIONS);
const CONNECTION_TIMEOUT_MS = parsePositiveIntEnv('REDIS_CONN_TIMEOUT_MS', 1_500);
const INITIAL_BACKOFF_MS = parsePositiveIntEnv('REDIS_INIT_BACKOFF_MS', 200);
const MAX_BACKOFF_MS = Math.max(parsePositiveIntEnv('REDIS_MAX_BACKOFF_MS', 3_000), INITIAL_BACKOFF_MS);
const MAX_RETRIES = parsePositiveIntEnv('REDIS_MAX_RETRIES', 5);
const INVALIDATE_SCAN_COUNT = parsePositiveIntEnv('REDIS_INVALIDATE_SCAN_COUNT', 100);
const pool = {
    clients: [],
    initializationPromise: null,
    nextIndex: 0,
};
const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const calculateBackoff = (attempt) => {
    const exponential = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
    const capped = Math.min(exponential, MAX_BACKOFF_MS);
    const jitterRange = Math.max(1, capped * 0.1);
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const jittered = capped + jitter;
    const clamped = Math.min(Math.max(jittered, INITIAL_BACKOFF_MS), MAX_BACKOFF_MS);
    return Math.round(clamped);
};
const buildRedisOptions = (connectionName) => ({
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
const removeClientFromPool = (client) => {
    const index = pool.clients.indexOf(client);
    if (index === -1) {
        return;
    }
    pool.clients.splice(index, 1);
    if (pool.nextIndex >= pool.clients.length) {
        pool.nextIndex = 0;
    }
};
const attachClientEventHandlers = (client, index) => {
    client.on('connect', () => {
        cacheLogger.debug('Redis client connecting', { index });
    });
    client.on('ready', () => {
        cacheLogger.info('Redis client ready', { index });
    });
    client.on('error', (error) => {
        cacheLogger.error('Redis client error', {
            index,
            error: serializeError(error),
        });
    });
    client.on('close', () => {
        cacheLogger.warn('Redis client connection closed', { index });
    });
    client.on('reconnecting', (delay) => {
        cacheLogger.warn('Redis client reconnecting', { index, delayMs: delay });
    });
    client.on('end', () => {
        cacheLogger.warn('Redis client ended', { index });
        removeClientFromPool(client);
        void ensureMinimumPoolSize();
    });
};
const waitForClientReady = (client) => new Promise((resolve, reject) => {
    if (client.status === 'ready') {
        resolve();
        return;
    }
    const handleReady = () => {
        cleanup();
        resolve();
    };
    const handleError = (error) => {
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
const createRedisClient = (index) => {
    const redisUrl = env.redisUrl;
    if (!redisUrl) {
        throw new Error('Redis connection not configured');
    }
    const client = new Redis(redisUrl, buildRedisOptions(`cache:${env.appEnv}:${index}`));
    attachClientEventHandlers(client, index);
    return client;
};
const connectClientWithRetry = async (index) => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        let client = null;
        try {
            client = createRedisClient(index);
            await waitForClientReady(client);
            cacheLogger.info('Redis connection established', {
                index,
                attempt,
            });
            return client;
        }
        catch (error) {
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
const initializePool = async () => {
    if (!env.redisUrl) {
        cacheLogger.warn('Redis connection skipped - REDIS_URL/REDIS_HOST not configured');
        return;
    }
    const newClients = [];
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
    }
    else {
        cacheLogger.error('Redis pool initialization failed - no clients ready');
    }
};
const ensurePool = async () => {
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
    }
    catch (error) {
        cacheLogger.error('Redis pool initialization promise rejected', {
            error: serializeError(error),
        });
    }
    return pool.clients;
};
const ensureMinimumPoolSize = async () => {
    if (!env.redisUrl) {
        return;
    }
    if (pool.clients.length >= POOL_MIN_CONNECTIONS) {
        return;
    }
    const needed = Math.min(POOL_MIN_CONNECTIONS - pool.clients.length, POOL_MAX_CONNECTIONS - pool.clients.length);
    const newClients = [];
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
const acquireClient = async () => {
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
export const getRedisClient = () => {
    void ensurePool();
    const readyClient = pool.clients.find((client) => client.status === 'ready');
    return readyClient ?? null;
};
export const closeRedisConnections = async () => {
    const clients = [...pool.clients];
    pool.clients = [];
    pool.nextIndex = 0;
    await Promise.allSettled(clients.map(async (client) => {
        try {
            await client.quit();
        }
        catch (error) {
            cacheLogger.warn('Failed to close Redis client', { error: serializeError(error) });
        }
    }));
    cacheLogger.info('Redis pool closed', { clients: clients.length });
};
export const get = async (key) => {
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
            return JSON.parse(value);
        }
        catch (error) {
            cacheLogger.warn('Failed to parse cached payload - deleting key', {
                key,
                error: serializeError(error),
            });
            await client.del(key);
            return null;
        }
    }
    catch (error) {
        cacheLogger.error('Redis get failed', {
            key,
            error: serializeError(error),
        });
        return null;
    }
};
export const set = async (key, value, options) => {
    const client = await acquireClient();
    if (!client) {
        return false;
    }
    let payload;
    try {
        payload = JSON.stringify(value);
    }
    catch (error) {
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
        }
        else {
            await client.set(key, payload);
        }
        return true;
    }
    catch (error) {
        cacheLogger.error('Redis set failed', {
            key,
            error: serializeError(error),
        });
        return false;
    }
};
export const del = async (keys) => {
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
    }
    catch (error) {
        cacheLogger.error('Redis del failed', {
            keys: keyList,
            error: serializeError(error),
        });
        return 0;
    }
};
export const invalidate = async (pattern) => {
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
    }
    catch (error) {
        cacheLogger.error('Redis invalidate failed', {
            pattern,
            error: serializeError(error),
        });
    }
    return removed;
};
export const getCacheHealth = async () => {
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
    }
    catch (error) {
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
