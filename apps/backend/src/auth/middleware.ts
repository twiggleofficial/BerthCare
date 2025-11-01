import type { NextFunction, Request, Response } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

import { verifyToken } from 'libs/shared/jwt-utils';

import { logger } from '../logger';
import { isAccessTokenBlacklisted } from './token-blacklist';

const AUTH_HEADER = 'authorization';
const BEARER_REGEX = /^Bearer\s+(.+)$/i;
const INVALID_TOKEN_MESSAGE = 'Invalid access token';
const TOKEN_EXPIRED_MESSAGE = 'Access token expired';
const TOKEN_REVOKED_MESSAGE = 'Access token has been revoked';
const AUTH_REQUIRED_MESSAGE = 'Authentication required';
const FORBIDDEN_MESSAGE = 'Insufficient permissions';
const TOKEN_TYPE = 'access';

type AccessTokenPayload = JwtPayload & {
  user_id?: string;
  role?: string;
  zone_id?: string;
  token_type?: string;
};

export interface AuthenticatedRequestUser {
  id: string;
  role: string;
  zoneId: string;
  token: string;
  tokenExpiresAt: number;
}

const extractToken = (headerValue?: string | null): string | null => {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(BEARER_REGEX);

  if (!match || !match[1]) {
    return null;
  }

  return match[1].trim();
};

const respondUnauthorized = (res: Response, message: string): void => {
  res.status(401).json({ message });
};

const respondForbidden = (res: Response): void => {
  res.status(403).json({ message: FORBIDDEN_MESSAGE });
};

const handleVerificationError = (error: unknown, res: Response): void => {
  if (error instanceof TokenExpiredError) {
    respondUnauthorized(res, TOKEN_EXPIRED_MESSAGE);
    return;
  }

  respondUnauthorized(res, INVALID_TOKEN_MESSAGE);
};

const getUserIdFromPayload = (payload: AccessTokenPayload): string | null => {
  if (typeof payload.user_id === 'string' && payload.user_id.trim().length > 0) {
    return payload.user_id;
  }

  if (typeof payload.sub === 'string' && payload.sub.trim().length > 0) {
    return payload.sub;
  }

  return null;
};

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const headerValue = req.headers[AUTH_HEADER] ?? req.get(AUTH_HEADER);
  const token = extractToken(Array.isArray(headerValue) ? headerValue[0] : headerValue);

  if (!token) {
    respondUnauthorized(res, AUTH_REQUIRED_MESSAGE);
    return;
  }

  let payload: AccessTokenPayload;

  try {
    ({ payload } = verifyToken<AccessTokenPayload>(token));
  } catch (error) {
    logger.warn('Failed to verify access token', {
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

  if (!userId || !role || !zoneId || tokenType !== TOKEN_TYPE || !expiresAt) {
    respondUnauthorized(res, INVALID_TOKEN_MESSAGE);
    return;
  }

  try {
    const revoked = await isAccessTokenBlacklisted(token);

    if (revoked) {
      respondUnauthorized(res, TOKEN_REVOKED_MESSAGE);
      return;
    }
  } catch (error) {
    logger.error('Failed to check access token blacklist', {
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

export const authorizeRoles = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  const normalisedRoles = requiredRoles
    .map((role) => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
    .filter((role): role is string => role.length > 0);

  return (req: Request, res: Response, next: NextFunction): void => {
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
