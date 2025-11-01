'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isAccessTokenBlacklisted = exports.blacklistAccessToken = void 0;
const node_crypto_1 = require('node:crypto');
const redis_1 = require('../cache/redis');
const logger_1 = require('../logger');
const ACCESS_TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:access:';
const hashToken = (token) => node_crypto_1.default.createHash('sha256').update(token).digest('hex');
const buildAccessTokenKey = (token) => `${ACCESS_TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`;
const processLogger =
  (logger_1 === null || logger_1 === void 0 ? void 0 : logger_1.processLogger) ||
  (logger_1 === null || logger_1 === void 0 ? void 0 : logger_1.logger);
const logBlacklistError = (operation, key, error) => {
  const context = { operation, key };
  if (processLogger && typeof processLogger.error === 'function') {
    processLogger.error(`Failed to ${operation} access token blacklist entry`, {
      ...context,
      error,
    });
  } else {
    console.error(`Failed to ${operation} access token blacklist entry`, { ...context, error });
  }
};
/**
 * Adds an access token to the blacklist with a TTL matching the remaining lifetime of the token.
 * The value stored in Redis does not matter; only the key existence is important.
 */
const blacklistAccessToken = async (token, ttlSeconds) => {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return;
  }
  const client = (0, redis_1.getSessionClient)();
  const key = buildAccessTokenKey(token);
  try {
    await client.set(key, '1', 'EX', Math.ceil(ttlSeconds));
  } catch (error) {
    logBlacklistError('set', key, error);
    throw error;
  }
};
exports.blacklistAccessToken = blacklistAccessToken;
const isAccessTokenBlacklisted = async (token) => {
  const client = (0, redis_1.getSessionClient)();
  const key = buildAccessTokenKey(token);
  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logBlacklistError('exists', key, error);
    throw error;
  }
};
exports.isAccessTokenBlacklisted = isAccessTokenBlacklisted;
