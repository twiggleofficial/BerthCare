"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.__TESTING__ = exports.app = void 0;
const compression_1 = require("compression");
const cors_1 = require("cors");
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
const helmet_1 = require("helmet");
const redis_1 = require("./cache/redis");
const pool_1 = require("./database/pool");
const logger_1 = require("./logger");
const routes_1 = require("./auth/routes");
const routes_2 = require("./photos/routes");
const s3_1 = require("./storage/s3");
const SENSITIVE_QUERY_KEYS = new Set(['token', 'password', 'email']);
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const sanitizeUrl = (originalUrl) => {
    try {
        const parsedUrl = new URL(originalUrl, 'http://placeholder');
        if (!parsedUrl.search) {
            return parsedUrl.pathname + parsedUrl.hash;
        }
        const searchParams = new URLSearchParams(parsedUrl.search);
        searchParams.forEach((_value, key) => {
            if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
                searchParams.set(key, '[REDACTED]');
            }
        });
        const sanitizedQuery = searchParams.toString();
        parsedUrl.search = sanitizedQuery ? `?${sanitizedQuery}` : '';
        return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
    catch {
        const [path] = originalUrl.split('?');
        return path;
    }
};
const withTimeout = async (promise, timeoutMs, timeoutError) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
};
const configuredMax = Number.parseInt((_a = process.env.RATE_LIMIT_MAX) !== null && _a !== void 0 ? _a : '100', 10);
const rateLimitMax = Number.isNaN(configuredMax) ? 100 : configuredMax;
const allowedOrigins = (_c = (_b = process.env.ALLOWED_ORIGINS) === null || _b === void 0 ? void 0 : _b.split(',').map((origin) => origin.trim()).filter((origin) => origin.length > 0)) !== null && _c !== void 0 ? _c : undefined;
const rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
});
exports.app = (0, express_1.default)();
exports.app.disable('x-powered-by');
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
}));
exports.app.use((0, compression_1.default)());
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        var _a, _b, _c;
        const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
        const sanitizedUrl = sanitizeUrl((_b = (_a = req.originalUrl) !== null && _a !== void 0 ? _a : req.url) !== null && _b !== void 0 ? _b : '');
        logger_1.logger.info(`${req.method} ${sanitizedUrl}`, {
            statusCode: res.statusCode,
            durationMs,
            method: req.method,
            url: sanitizedUrl,
            userAgent: (_c = req.get('user-agent')) !== null && _c !== void 0 ? _c : undefined,
        });
    });
    next();
});
exports.app.use('/v1', rateLimiter);
exports.app.use('/v1/auth', routes_1.authRouter);
exports.app.use('/v1/photos', routes_2.photoRouter);
exports.app.get('/health', async (_req, res, next) => {
    const timeoutError = new Error(`Health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`);
    try {
        const [dbHealth, redisHealth, storageHealth] = await withTimeout(Promise.all([(0, pool_1.checkDatabaseConnection)(), (0, redis_1.checkRedisConnection)(), (0, s3_1.checkPhotoBucketHealth)()]), HEALTH_CHECK_TIMEOUT_MS, timeoutError);
        const healthy = dbHealth.healthy && redisHealth.healthy && storageHealth.healthy;
        const statusCode = healthy ? 200 : 503;
        res.status(statusCode).json({
            status: healthy ? 'ok' : 'degraded',
            checks: {
                database: dbHealth,
                redis: redisHealth,
                storage: storageHealth,
            },
        });
    }
    catch (error) {
        if (error === timeoutError) {
            logger_1.logger.warn('Health check timed out', {
                timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
            });
            res.status(503).json({
                status: 'degraded',
                message: timeoutError.message,
                checks: {
                    database: {
                        healthy: false,
                        nodes: {
                            primary: { healthy: false, error: timeoutError.message },
                        },
                    },
                    redis: {
                        healthy: false,
                        nodes: {
                            cache: { healthy: false, error: timeoutError.message },
                            session: { healthy: false, error: timeoutError.message },
                        },
                    },
                    storage: {
                        healthy: false,
                        bucket: 'unknown',
                        region: 'unknown',
                        error: timeoutError.message,
                    },
                },
            });
            return;
        }
        next(error);
    }
});
exports.app.use((req, res) => {
    res.status(404).json({ message: 'Not Found', path: req.originalUrl });
});
exports.app.use((err, req, res, next) => {
    var _a;
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger_1.logger.error('Unhandled error', {
        message: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl,
    });
    if (res.headersSent) {
        return next(error);
    }
    const status = (_a = error.status) !== null && _a !== void 0 ? _a : 500;
    const message = status === 500 ? 'Internal Server Error' : error.message;
    res.status(status).json({ message });
});
exports.__TESTING__ = {
    sanitizeUrl,
    withTimeout,
};
