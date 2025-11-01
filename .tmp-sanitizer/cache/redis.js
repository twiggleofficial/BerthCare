"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnections = exports.checkRedisConnection = exports.getSessionClient = exports.getCacheClient = exports.getRedisClient = void 0;
const ioredis_1 = require("ioredis");
const logger_1 = require("../logger");
const parse_1 = require("libs/utils/parse");
const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;
const DEFAULT_CONNECTION_NAME = 'berth-backend';
const DEFAULT_CACHE_PREFIX = 'cache:';
const DEFAULT_SESSION_PREFIX = 'session:';
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES_PER_REQUEST = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 100;
const DEFAULT_RETRY_MAX_DELAY_MS = 30000;
const INDIVIDUAL_REDIS_ENV_VARS = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_DB', 'REDIS_PASSWORD'];
let primaryClient;
let cacheClient;
let sessionClient;
let hasLoggedRedisUrlOverrideWarning = false;
const clampNumber = (value, min, max) => {
    let result = value;
    if (typeof min === 'number') {
        result = Math.max(result, min);
    }
    if (typeof max === 'number') {
        result = Math.min(result, max);
    }
    return result;
};
const parseOptionalInteger = (raw, options = {}) => {
    if (!raw) {
        return undefined;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        return undefined;
    }
    return clampNumber(parsed, options.min, options.max);
};
const ensurePrefix = (prefix) => (prefix.endsWith(':') ? prefix : `${prefix}:`);
const shouldUseTls = () => {
    var _a;
    const raw = (_a = process.env.REDIS_USE_TLS) !== null && _a !== void 0 ? _a : process.env.REDIS_TLS;
    return (0, parse_1.parseBoolean)(raw, false);
};
const shouldRejectUnauthorized = () => {
    const raw = process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
    return (0, parse_1.parseBoolean)(raw, true);
};
const createRetryStrategy = () => {
    const baseDelayMs = (0, parse_1.parseInteger)(process.env.REDIS_RETRY_BASE_MS, DEFAULT_RETRY_BASE_DELAY_MS, {
        min: 10,
    });
    const maxDelayMs = (0, parse_1.parseInteger)(process.env.REDIS_RETRY_MAX_MS, DEFAULT_RETRY_MAX_DELAY_MS, {
        min: baseDelayMs,
    });
    const maxAttempts = parseOptionalInteger(process.env.REDIS_MAX_RETRY_ATTEMPTS, { min: 1 });
    return (attempt) => {
        if (maxAttempts !== undefined && attempt > maxAttempts) {
            return null;
        }
        const exponentialDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        const jitter = Math.random() * exponentialDelay * 0.2;
        return Math.round(exponentialDelay + jitter);
    };
};
// Redis connection precedence: when REDIS_URL is provided, ioredis derives host/port/db/password
// from the URL and those values override individual environment variables defined below.
// Defaults are only used when REDIS_URL is absent. Update env docs/README if this precedence changes.
const buildRedisOptions = (keyPrefix) => {
    var _a, _b;
    const host = (_a = process.env.REDIS_HOST) !== null && _a !== void 0 ? _a : DEFAULT_REDIS_HOST;
    const port = (0, parse_1.parseInteger)(process.env.REDIS_PORT, DEFAULT_REDIS_PORT, { min: 1, max: 65535 });
    const db = (0, parse_1.parseInteger)(process.env.REDIS_DB, DEFAULT_REDIS_DB, { min: 0 });
    const password = process.env.REDIS_PASSWORD;
    const connectTimeout = (0, parse_1.parseInteger)(process.env.REDIS_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS, {
        min: 100,
    });
    const keepAlive = parseOptionalInteger(process.env.REDIS_KEEP_ALIVE_MS, { min: 0 });
    const maxRetriesPerRequest = (0, parse_1.parseInteger)(process.env.REDIS_MAX_RETRIES_PER_REQUEST, DEFAULT_MAX_RETRIES_PER_REQUEST, { min: 0 });
    const enableOfflineQueue = (0, parse_1.parseBoolean)(process.env.REDIS_ENABLE_OFFLINE_QUEUE, false);
    const connectionName = (_b = process.env.REDIS_CONNECTION_NAME) !== null && _b !== void 0 ? _b : DEFAULT_CONNECTION_NAME;
    const options = {
        host,
        port,
        db,
        connectionName,
        enableAutoPipelining: true,
        enableOfflineQueue,
        retryStrategy: createRetryStrategy(),
        reconnectOnError: (error) => {
            var _a;
            const message = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : '';
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
const attachLogging = (client, role) => {
    client.on('connect', () => {
        logger_1.logger.debug(`Redis (${role}) connecting`);
    });
    client.on('ready', () => {
        logger_1.logger.info(`Redis (${role}) connection ready`);
    });
    client.on('error', (error) => {
        logger_1.logger.error(`Redis (${role}) error`, {
            message: error.message,
        });
    });
    client.on('end', () => {
        logger_1.logger.warn(`Redis (${role}) connection closed`);
    });
    client.on('reconnecting', (delay) => {
        logger_1.logger.warn(`Redis (${role}) attempting reconnect`, {
            delayMs: delay,
        });
    });
};
const createRedisClient = (role, keyPrefix) => {
    const url = process.env.REDIS_URL;
    const options = buildRedisOptions(keyPrefix);
    if (url && !hasLoggedRedisUrlOverrideWarning) {
        const conflicting = INDIVIDUAL_REDIS_ENV_VARS.filter((name) => typeof process.env[name] === 'string');
        if (conflicting.length > 0) {
            logger_1.logger.warn('REDIS_URL is set; overriding individual Redis configuration variables', {
                overriddenEnvVars: conflicting,
            });
            hasLoggedRedisUrlOverrideWarning = true;
        }
    }
    const client = url ? new ioredis_1.default(url, options) : new ioredis_1.default(options);
    attachLogging(client, role);
    return client;
};
const getRedisClient = () => {
    if (!primaryClient) {
        primaryClient = createRedisClient('primary');
    }
    return primaryClient;
};
exports.getRedisClient = getRedisClient;
const getCacheClient = () => {
    var _a;
    if (!cacheClient) {
        const prefix = (_a = process.env.REDIS_CACHE_PREFIX) !== null && _a !== void 0 ? _a : DEFAULT_CACHE_PREFIX;
        cacheClient = createRedisClient('cache', prefix);
    }
    return cacheClient;
};
exports.getCacheClient = getCacheClient;
const getSessionClient = () => {
    var _a;
    if (!sessionClient) {
        const prefix = (_a = process.env.REDIS_SESSION_PREFIX) !== null && _a !== void 0 ? _a : DEFAULT_SESSION_PREFIX;
        sessionClient = createRedisClient('session', prefix);
    }
    return sessionClient;
};
exports.getSessionClient = getSessionClient;
const measureHealth = async (client, label) => {
    const start = process.hrtime.bigint();
    try {
        await client.ping();
        const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
        return {
            healthy: true,
            latencyMs: Number(durationMs.toFixed(3)),
        };
    }
    catch (error) {
        const err = error;
        logger_1.logger.warn(`Redis (${label}) health check failed`, {
            message: err.message,
        });
        return {
            healthy: false,
            error: err.message,
        };
    }
};
const checkRedisConnection = async () => {
    const cacheHealth = await measureHealth((0, exports.getCacheClient)(), 'cache');
    const sessionHealth = await measureHealth((0, exports.getSessionClient)(), 'session');
    return {
        healthy: cacheHealth.healthy && sessionHealth.healthy,
        nodes: {
            cache: cacheHealth,
            session: sessionHealth,
        },
    };
};
exports.checkRedisConnection = checkRedisConnection;
const closeClient = async (client, role) => {
    if (!client) {
        return;
    }
    try {
        await client.quit();
        logger_1.logger.info(`Redis (${role}) connection closed gracefully`);
    }
    catch (error) {
        const err = error;
        logger_1.logger.error(`Failed to close Redis (${role}) connection`, {
            message: err.message,
        });
    }
};
const closeRedisConnections = async () => {
    await Promise.all([
        closeClient(cacheClient, 'cache'),
        closeClient(sessionClient, 'session'),
        closeClient(primaryClient, 'primary'),
    ]);
    cacheClient = undefined;
    sessionClient = undefined;
    primaryClient = undefined;
};
exports.closeRedisConnections = closeRedisConnections;
