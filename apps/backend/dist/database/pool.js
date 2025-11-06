import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import { env } from '../config/environment.js';
import { createLogger, serializeError } from '../logger/index.js';
const databaseLogger = createLogger('database');
const MIN_CONNECTIONS = 10;
const MAX_CONNECTIONS = 50;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 2_000;
const STATEMENT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 5_000;
let pool = null;
let initializationPromise = null;
const calculateBackoff = (attempt) => {
    const exponential = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
    const capped = Math.min(exponential, MAX_BACKOFF_MS);
    const jitter = Math.round(Math.random() * 100);
    return capped + jitter;
};
const getPoolMetrics = () => {
    if (!pool) {
        return {
            total: 0,
            idle: 0,
            waiting: 0,
        };
    }
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
    };
};
const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const initializePool = async (createdPool) => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            const client = await createdPool.connect();
            try {
                await client.query('SELECT 1');
            }
            finally {
                client.release();
            }
            databaseLogger.info('PostgreSQL pool ready', {
                attempt,
                metrics: getPoolMetrics(),
            });
            return;
        }
        catch (error) {
            const delayMs = calculateBackoff(attempt);
            databaseLogger.warn('PostgreSQL connection attempt failed', {
                attempt,
                maxAttempts: MAX_RETRIES,
                delayMs,
                error: serializeError(error),
            });
            if (attempt === MAX_RETRIES) {
                databaseLogger.error('PostgreSQL pool initialization failed after max retries', {
                    error: serializeError(error),
                });
                return;
            }
            await wait(delayMs);
        }
    }
};
const attachPoolEventHandlers = (createdPool) => {
    createdPool.on('connect', () => {
        databaseLogger.debug('PostgreSQL client connected', { metrics: getPoolMetrics() });
    });
    createdPool.on('acquire', () => {
        databaseLogger.debug('PostgreSQL client acquired', { metrics: getPoolMetrics() });
    });
    createdPool.on('remove', () => {
        databaseLogger.debug('PostgreSQL client removed', { metrics: getPoolMetrics() });
    });
    createdPool.on('error', (error) => {
        databaseLogger.error('Unexpected PostgreSQL error', { error: serializeError(error) });
    });
};
export const getDatabasePool = () => {
    if (pool) {
        return pool;
    }
    if (!env.postgresUrl) {
        databaseLogger.warn('PostgreSQL connection skipped - DATABASE_URL not configured');
        return null;
    }
    pool = new Pool({
        connectionString: env.postgresUrl,
        min: MIN_CONNECTIONS,
        max: MAX_CONNECTIONS,
        idleTimeoutMillis: IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        statement_timeout: STATEMENT_TIMEOUT_MS,
    });
    attachPoolEventHandlers(pool);
    databaseLogger.info('PostgreSQL pool created', {
        config: {
            min: MIN_CONNECTIONS,
            max: MAX_CONNECTIONS,
            idleTimeoutMs: IDLE_TIMEOUT_MS,
            connectionTimeoutMs: CONNECTION_TIMEOUT_MS,
            statementTimeoutMs: STATEMENT_TIMEOUT_MS,
        },
    });
    initializationPromise = initializePool(pool);
    return pool;
};
export const waitForDatabasePool = async () => {
    if (!initializationPromise) {
        const maybePool = getDatabasePool();
        if (!maybePool) {
            return;
        }
    }
    const promise = initializationPromise;
    if (!promise) {
        return;
    }
    try {
        await promise;
    }
    catch (error) {
        databaseLogger.error('PostgreSQL pool initialization promise rejected', {
            error: serializeError(error),
        });
    }
};
export const getDatabaseHealth = async () => {
    const currentPool = getDatabasePool();
    if (!currentPool) {
        return {
            status: 'error',
            latencyMs: null,
            metrics: getPoolMetrics(),
            error: { message: 'PostgreSQL connection not configured' },
        };
    }
    const start = performance.now();
    try {
        await currentPool.query('SELECT 1');
        const latencyMs = Math.round((performance.now() - start) * 100) / 100;
        const metrics = getPoolMetrics();
        databaseLogger.debug('PostgreSQL health check succeeded', {
            latencyMs,
            metrics,
        });
        return { status: 'ok', latencyMs, metrics };
    }
    catch (error) {
        const latencyMs = Math.round((performance.now() - start) * 100) / 100;
        const metrics = getPoolMetrics();
        databaseLogger.error('PostgreSQL health check failed', {
            latencyMs,
            metrics,
            error: serializeError(error),
        });
        return {
            status: 'error',
            latencyMs,
            metrics,
            error: { message: error instanceof Error ? error.message : 'Unknown database error' },
        };
    }
};
export const closeDatabasePool = async () => {
    const currentPool = pool;
    if (!currentPool) {
        return;
    }
    const metricsBeforeClose = getPoolMetrics();
    pool = null;
    initializationPromise = null;
    try {
        await currentPool.end();
        databaseLogger.info('PostgreSQL pool closed', { metrics: metricsBeforeClose });
    }
    catch (error) {
        databaseLogger.warn('Failed to close PostgreSQL pool cleanly', { error: serializeError(error) });
    }
};
