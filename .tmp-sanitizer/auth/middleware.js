'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.authorizeRoles = exports.authenticateJwt = void 0;
const jsonwebtoken_1 = require('jsonwebtoken');
const jwt_utils_1 = require('libs/shared/jwt-utils');
const logger_1 = require('../logger');
const token_blacklist_1 = require('./token-blacklist');
const AUTH_HEADER = 'authorization';
const BEARER_REGEX = /^Bearer\s+(.+)$/i;
const INVALID_TOKEN_MESSAGE = 'Invalid access token';
const TOKEN_EXPIRED_MESSAGE = 'Access token expired';
const TOKEN_REVOKED_MESSAGE = 'Access token has been revoked';
const AUTH_REQUIRED_MESSAGE = 'Authentication required';
const FORBIDDEN_MESSAGE = 'Insufficient permissions';
const TOKEN_TYPE = 'access';
const extractToken = (headerValue) => {
  if (!headerValue) {
    return null;
  }
  const match = headerValue.match(BEARER_REGEX);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].trim();
};
const respondUnauthorized = (res, message) => {
  res.status(401).json({ message });
};
const respondForbidden = (res) => {
  res.status(403).json({ message: FORBIDDEN_MESSAGE });
};
const handleVerificationError = (error, res) => {
  if (error instanceof jsonwebtoken_1.TokenExpiredError) {
    respondUnauthorized(res, TOKEN_EXPIRED_MESSAGE);
    return;
  }
  respondUnauthorized(res, INVALID_TOKEN_MESSAGE);
};
const getUserIdFromPayload = (payload) => {
  if (typeof payload.user_id === 'string' && payload.user_id.trim().length > 0) {
    return payload.user_id;
  }
  if (typeof payload.sub === 'string' && payload.sub.trim().length > 0) {
    return payload.sub;
  }
  return null;
};
const authenticateJwt = async (req, res, next) => {
  var _a;
  const headerValue =
    (_a = req.headers[AUTH_HEADER]) !== null && _a !== void 0 ? _a : req.get(AUTH_HEADER);
  const token = extractToken(Array.isArray(headerValue) ? headerValue[0] : headerValue);
  if (!token) {
    respondUnauthorized(res, AUTH_REQUIRED_MESSAGE);
    return;
  }
  let payload;
  try {
    ({ payload } = (0, jwt_utils_1.verifyToken)(token));
  } catch (error) {
    logger_1.logger.warn('Failed to verify access token', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    handleVerificationError(error, res);
    return;
  }
  const userId = getUserIdFromPayload(payload);
  const role = typeof payload.role === 'string' ? payload.role : null;
  const zoneId = typeof payload.zone_id === 'string' ? payload.zone_id : null;
  const tokenType = typeof payload.token_type === 'string' ? payload.token_type : null;
  const expiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  if (!expiresAt || expiresAt <= Date.now()) {
    respondUnauthorized(res, INVALID_TOKEN_MESSAGE);
    return;
  }
  if (!userId || !role || !zoneId || tokenType !== TOKEN_TYPE) {
    respondUnauthorized(res, INVALID_TOKEN_MESSAGE);
    return;
  }
  try {
    const revoked = await (0, token_blacklist_1.isAccessTokenBlacklisted)(token);
    if (revoked) {
      respondUnauthorized(res, TOKEN_REVOKED_MESSAGE);
      return;
    }
  } catch (error) {
    logger_1.logger.error('Failed to check access token blacklist', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({ message: 'Service temporarily unavailable' });
    return;
  }
  req.user = {
    id: userId,
    role,
    zoneId,
    token,
    tokenExpiresAt: expiresAt,
  };
  next();
};
exports.authenticateJwt = authenticateJwt;
const authorizeRoles = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  const normalisedRoles = requiredRoles
    .map((role) => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
    .filter((role) => role.length > 0);
  return (req, res, next) => {
    if (!req.user) {
      respondUnauthorized(res, AUTH_REQUIRED_MESSAGE);
      return;
    }
    if (normalisedRoles.length === 0) {
      next();
      return;
    }
    const userRole = typeof req.user.role === 'string' ? req.user.role.trim().toLowerCase() : '';
    if (!normalisedRoles.includes(userRole)) {
      respondForbidden(res);
      return;
    }
    next();
  };
};
exports.authorizeRoles = authorizeRoles;
