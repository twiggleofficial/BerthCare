"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = exports.logoutRateLimiter = exports.refreshRateLimiter = exports.loginRateLimiter = exports.registerRateLimiter = void 0;
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
const auth_utils_1 = require("libs/shared/auth-utils");
const jwt_utils_1 = require("libs/shared/jwt-utils");
const pool_1 = require("../database/pool");
const logger_1 = require("../logger");
const validation_1 = require("./validation");
const middleware_1 = require("./middleware");
const token_blacklist_1 = require("./token-blacklist");
const ADMIN_ROLE = 'admin';
const UNIQUE_VIOLATION_CODE = '23505';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const hashRefreshToken = (token) => node_crypto_1.default.createHash('sha256').update(token).digest('hex');
const DEFAULT_RATE_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_REGISTER_RATE_MAX = 5;
const DEFAULT_LOGIN_RATE_MAX = 10;
const DEFAULT_REFRESH_RATE_MAX = 20;
const DEFAULT_LOGOUT_RATE_MAX = 20;
/**
 * Rate limiter configuration environment variables and defaults:
 * - RATE_WINDOW_MS (default 3600000)
 * - REG_RATE_MAX (default 5)
 * - LOG_RATE_MAX (default 10)
 * - REF_RATE_MAX (default 20)
 * - LOGOUT_RATE_MAX (default 20)
 * - RATE_LIMIT_STRATEGY ('user' to prefer user-based keys, defaults to 'ip')
 */
const parsePositiveIntegerEnv = (name, defaultValue, minimum = 1) => {
    const raw = process.env[name];
    if (!raw) {
        return defaultValue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < minimum) {
        return defaultValue;
    }
    return parsed;
};
const rateWindowMs = parsePositiveIntegerEnv('RATE_WINDOW_MS', DEFAULT_RATE_WINDOW_MS, 1000);
const registerRateMax = parsePositiveIntegerEnv('REG_RATE_MAX', DEFAULT_REGISTER_RATE_MAX);
const loginRateMax = parsePositiveIntegerEnv('LOG_RATE_MAX', DEFAULT_LOGIN_RATE_MAX);
const refreshRateMax = parsePositiveIntegerEnv('REF_RATE_MAX', DEFAULT_REFRESH_RATE_MAX);
const logoutRateMax = parsePositiveIntegerEnv('LOGOUT_RATE_MAX', DEFAULT_LOGOUT_RATE_MAX);
const rateLimitStrategy = (process.env.RATE_LIMIT_STRATEGY || 'ip').toLowerCase();
const useUserRateLimiting = rateLimitStrategy === 'user';
const resolveRequestIp = (req) => {
    var _a;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0];
    }
    return (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown';
};
const rateLimitKeyGenerator = (req) => {
    if (!useUserRateLimiting) {
        return resolveRequestIp(req);
    }
    const userId = req.user && typeof req.user.id === 'string' && req.user.id.trim().length > 0
        ? req.user.id.trim()
        : null;
    return userId !== null && userId !== void 0 ? userId : resolveRequestIp(req);
};
const createRateLimiter = (max, message) => (0, express_rate_limit_1.default)({
    windowMs: rateWindowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator,
    handler: (_req, res) => {
        res.status(429).json({
            message,
        });
    },
});
class DuplicateEmailError extends Error {
    constructor(email) {
        super(`Email "${email}" is already registered`);
        this.name = 'DuplicateEmailError';
    }
}
const isUniqueViolation = (error) => Boolean(error && typeof error === 'object' && error.code === UNIQUE_VIOLATION_CODE);
const formatValidationErrorResponse = (errors) => ({
    message: 'Invalid request body',
    errors,
});
const successResponse = (result) => ({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
});
const refreshErrorResponse = { message: 'Invalid or expired refresh token' };
const registerAdminAccount = async (payload) => {
    const passwordHash = await (0, auth_utils_1.hashPassword)(payload.password);
    return (0, pool_1.runWithClient)(async (client) => {
        let transactionStarted = false;
        try {
            await client.query('BEGIN');
            transactionStarted = true;
            const userInsertResult = await client.query(`INSERT INTO users (email, password_hash, first_name, last_name, role, zone_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, zone_id`, [
                payload.email,
                passwordHash,
                payload.firstName,
                payload.lastName,
                ADMIN_ROLE,
                payload.zoneId,
            ]);
            const row = userInsertResult.rows[0];
            const user = {
                id: row.id,
                email: row.email,
                firstName: row.first_name,
                lastName: row.last_name,
                role: row.role,
                zoneId: row.zone_id,
            };
            const claims = {
                userId: user.id,
                role: user.role,
                zoneId: user.zoneId,
            };
            const accessToken = (0, jwt_utils_1.generateAccessToken)(claims);
            const refreshToken = (0, jwt_utils_1.generateRefreshToken)(claims);
            const refreshTokenHash = hashRefreshToken(refreshToken);
            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
            await client.query(`INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
         VALUES ($1, $2, $3, $4)`, [user.id, refreshTokenHash, payload.deviceId, expiresAt]);
            await client.query('COMMIT');
            return {
                user,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            if (transactionStarted) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    logger_1.logger.error('Failed to rollback registration transaction', {
                        message: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
                    });
                }
            }
            if (isUniqueViolation(error)) {
                throw new DuplicateEmailError(payload.email);
            }
            throw error;
        }
    });
};
exports.registerRateLimiter = createRateLimiter(registerRateMax, 'Too many requests. Please try again later.');
exports.loginRateLimiter = createRateLimiter(loginRateMax, 'Too many requests. Please try again later.');
exports.refreshRateLimiter = createRateLimiter(refreshRateMax, 'Too many requests. Please try again later.');
exports.logoutRateLimiter = createRateLimiter(logoutRateMax, 'Too many requests. Please try again later.');
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', exports.registerRateLimiter, async (req, res, next) => {
    var _a;
    const validation = (0, validation_1.sanitiseRegistrationPayload)((_a = req.body) !== null && _a !== void 0 ? _a : {});
    if (!validation.ok) {
        res.status(400).json(formatValidationErrorResponse(validation.errors));
        return;
    }
    try {
        const result = await registerAdminAccount(validation.value);
        res.status(201).json(successResponse(result));
    }
    catch (error) {
        if (error instanceof DuplicateEmailError) {
            res.status(409).json({ message: 'Email already registered' });
            return;
        }
        logger_1.logger.error('Failed to register admin user', {
            message: error instanceof Error ? error.message : 'Unknown error',
            email: validation.value.email,
        });
        next(error);
    }
});
exports.authRouter.post('/refresh', exports.refreshRateLimiter, async (req, res, next) => {
    var _a;
    const validation = (0, validation_1.sanitiseRefreshPayload)((_a = req.body) !== null && _a !== void 0 ? _a : {});
    if (!validation.ok) {
        res.status(400).json(formatValidationErrorResponse(validation.errors));
        return;
    }
    const { refreshToken } = validation.value;
    let payload;
    try {
        ({ payload } = (0, jwt_utils_1.verifyToken)(refreshToken));
    }
    catch (error) {
        logger_1.logger.warn('Failed to verify refresh token', {
            message: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(401).json(refreshErrorResponse);
        return;
    }
    const tokenType = typeof payload.token_type === 'string' ? payload.token_type : undefined;
    if (tokenType !== 'refresh') {
        res.status(401).json(refreshErrorResponse);
        return;
    }
    const { user_id, sub, role: roleClaim, zone_id } = payload;
    const userId = typeof user_id === 'string'
        ? user_id
        : typeof sub === 'string'
            ? sub
            : undefined;
    const role = typeof roleClaim === 'string' ? roleClaim : undefined;
    const zoneId = typeof zone_id === 'string' ? zone_id : undefined;
    if (!userId || !role || !zoneId) {
        res.status(401).json(refreshErrorResponse);
        return;
    }
    const hashedToken = hashRefreshToken(refreshToken);
    try {
        const rotationResult = await (0, pool_1.runWithClient)(async (client) => {
            await client.query('BEGIN');
            try {
                const result = await client.query(`SELECT user_id, expires_at
             FROM refresh_tokens
             WHERE token_hash = $1
             FOR UPDATE`, [hashedToken]);
                const record = result.rows[0];
                if (!record || record.user_id !== userId) {
                    await client.query('ROLLBACK');
                    return { status: 'not_found' };
                }
                const expiresAt = record.expires_at instanceof Date ? record.expires_at : new Date(record.expires_at);
                if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
                    await client.query('ROLLBACK');
                    return { status: 'expired' };
                }
                const newRefreshToken = (0, jwt_utils_1.generateRefreshToken)({
                    userId,
                    role,
                    zoneId,
                });
                const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
                const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
                const updateResult = await client.query(`UPDATE refresh_tokens
             SET token_hash = $1, expires_at = $2
             WHERE token_hash = $3`, [newRefreshTokenHash, newExpiresAt, hashedToken]);
                if (updateResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return { status: 'update_failed' };
                }
                await client.query('COMMIT');
                return {
                    status: 'ok',
                    newRefreshToken,
                };
            }
            catch (txError) {
                await client.query('ROLLBACK');
                throw txError;
            }
        });
        if (rotationResult.status === 'not_found' || rotationResult.status === 'expired') {
            res.status(401).json(refreshErrorResponse);
            return;
        }
        if (rotationResult.status === 'update_failed') {
            logger_1.logger.error('Failed to rotate refresh token', {
                userId,
            });
            res.status(500).json({ message: 'Unable to refresh session' });
            return;
        }
        const accessToken = (0, jwt_utils_1.generateAccessToken)({
            userId,
            role,
            zoneId,
        });
        res.status(200).json({
            accessToken,
            refreshToken: rotationResult.newRefreshToken,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to process refresh token', {
            message: error instanceof Error ? error.message : 'Unknown error',
            userId,
        });
        next(error);
    }
});
exports.authRouter.post('/login', exports.loginRateLimiter, async (req, res, next) => {
    var _a;
    const validation = (0, validation_1.sanitiseLoginPayload)((_a = req.body) !== null && _a !== void 0 ? _a : {});
    if (!validation.ok) {
        res.status(400).json(formatValidationErrorResponse(validation.errors));
        return;
    }
    try {
        const result = await (0, pool_1.runWithClient)(async (client) => {
            var _a;
            const userResult = await client.query(`SELECT id, email, password_hash, first_name, last_name, role, zone_id
           FROM users
           WHERE email = $1`, [validation.value.email]);
            const row = userResult.rows[0];
            const passwordHash = (_a = row === null || row === void 0 ? void 0 : row.password_hash) !== null && _a !== void 0 ? _a : '';
            const passwordValid = await (0, auth_utils_1.verifyPassword)(validation.value.password, passwordHash);
            if (!row || !passwordValid) {
                return null;
            }
            const user = {
                id: row.id,
                email: row.email,
                firstName: row.first_name,
                lastName: row.last_name,
                role: row.role,
                zoneId: row.zone_id,
            };
            const claims = {
                userId: user.id,
                role: user.role,
                zoneId: user.zoneId,
            };
            const accessToken = (0, jwt_utils_1.generateAccessToken)(claims);
            const refreshToken = (0, jwt_utils_1.generateRefreshToken)(claims);
            const refreshTokenHash = hashRefreshToken(refreshToken);
            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
            await client.query('BEGIN');
            try {
                await client.query(`DELETE FROM refresh_tokens
             WHERE user_id = $1 AND device_id = $2`, [user.id, validation.value.deviceId]);
                await client.query(`INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
             VALUES ($1, $2, $3, $4)`, [user.id, refreshTokenHash, validation.value.deviceId, expiresAt]);
                await client.query('COMMIT');
            }
            catch (transactionError) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (rollbackError) {
                    logger_1.logger.error('Failed to rollback refresh token transaction', {
                        message: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
                        userId: user.id,
                        deviceId: validation.value.deviceId,
                    });
                }
                throw transactionError;
            }
            return {
                user,
                accessToken,
                refreshToken,
            };
        });
        if (!result) {
            logger_1.logger.warn('Invalid login attempt', {
                email: validation.value.email,
            });
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        res.status(200).json(successResponse(result));
    }
    catch (error) {
        logger_1.logger.error('Failed to log in user', {
            message: error instanceof Error ? error.message : 'Unknown error',
            email: validation.value.email,
        });
        next(error);
    }
});
exports.authRouter.post('/logout', exports.logoutRateLimiter, middleware_1.authenticateJwt, async (req, res, next) => {
    var _a;
    const validation = (0, validation_1.sanitiseLogoutPayload)((_a = req.body) !== null && _a !== void 0 ? _a : {});
    if (!validation.ok) {
        res.status(400).json(formatValidationErrorResponse(validation.errors));
        return;
    }
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }
    const hashedToken = hashRefreshToken(validation.value.refreshToken);
    try {
        const ttlMilliseconds = user.tokenExpiresAt - Date.now();
        const ttlSeconds = Math.max(0, Math.ceil(ttlMilliseconds / 1000));
        await (0, token_blacklist_1.blacklistAccessToken)(user.token, ttlSeconds);
    }
    catch (error) {
        logger_1.logger.error('Failed to blacklist access token during logout', {
            message: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
        });
        return next(error);
    }
    try {
        await (0, pool_1.runWithClient)(async (client) => {
            await client.query(`DELETE FROM refresh_tokens
         WHERE token_hash = $1 AND user_id = $2`, [hashedToken, user.id]);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to invalidate refresh token during logout', {
            message: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
        });
        return next(error);
    }
    res.status(200).json({ success: true });
});
