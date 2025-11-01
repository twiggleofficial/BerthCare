import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { JwtPayload } from 'jsonwebtoken';

import { hashPassword, verifyPassword } from 'libs/shared/auth-utils';
import { generateAccessToken, generateRefreshToken, verifyToken } from 'libs/shared/jwt-utils';

import { runWithClient } from '../database/pool';
import { logger } from '../logger';
import {
  sanitiseLoginPayload,
  sanitiseRegistrationPayload,
  sanitiseRefreshPayload,
  sanitiseLogoutPayload,
  type SanitisedRegistrationPayload,
} from './validation';
import { authenticateJwt } from './middleware';
import { blacklistAccessToken } from './token-blacklist';

type DatabaseError = Error & { code?: string };

const ADMIN_ROLE = 'admin';
const UNIQUE_VIOLATION_CODE = '23505';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_REGISTRATION_SECRET_HEADER = 'x-admin-registration-secret';

const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Email "${email}" is already registered`);
    this.name = 'DuplicateEmailError';
  }
}

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(
    error && typeof error === 'object' && (error as DatabaseError).code === UNIQUE_VIOLATION_CODE
  );

const formatValidationErrorResponse = (errors: string[]) => ({
  message: 'Invalid request body',
  errors,
});

const successResponse = (result: AuthResult) => ({
  accessToken: result.accessToken,
  refreshToken: result.refreshToken,
  user: result.user,
});

const refreshErrorResponse = { message: 'Invalid or expired refresh token' };

type AuthResult = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    zoneId: string;
  };
  accessToken: string;
  refreshToken: string;
};

const registerAdminAccount = async (payload: SanitisedRegistrationPayload): Promise<AuthResult> => {
  const passwordHash = await hashPassword(payload.password);

  return runWithClient(async (client) => {
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const userInsertResult = await client.query<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        zone_id: string;
      }>(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, zone_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, zone_id`,
        [
          payload.email,
          passwordHash,
          payload.firstName,
          payload.lastName,
          ADMIN_ROLE,
          payload.zoneId,
        ]
      );

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

      const accessToken = generateAccessToken(claims);
      const refreshToken = generateRefreshToken(claims);
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, refreshTokenHash, payload.deviceId, expiresAt]
      );

      await client.query('COMMIT');

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Failed to rollback registration transaction', {
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

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Too many registration attempts. Please try again later.',
    });
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
    });
  },
});

export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Too many refresh attempts. Please try again later.',
    });
  },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  registerRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const adminRegistrationSecret = process.env.ADMIN_REGISTRATION_SECRET;

    if (!adminRegistrationSecret) {
      res.status(503).json({ message: 'Admin registration is disabled' });
      return;
    }

    const providedSecretHeader = req.headers[ADMIN_REGISTRATION_SECRET_HEADER];
    const providedSecret = Array.isArray(providedSecretHeader)
      ? providedSecretHeader[0]
      : providedSecretHeader;

    if (providedSecret !== adminRegistrationSecret) {
      res.status(403).json({ message: 'Admin registration is not permitted' });
      return;
    }

    const validation = sanitiseRegistrationPayload(req.body ?? {});

    if (!validation.ok) {
      res.status(400).json(formatValidationErrorResponse(validation.errors));
      return;
    }

    try {
      const result = await registerAdminAccount(validation.value);
      res.status(201).json(successResponse(result));
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        res.status(409).json({ message: 'Email already registered' });
        return;
      }

      logger.error('Failed to register admin user', {
        message: error instanceof Error ? error.message : 'Unknown error',
        email: validation.value.email,
      });

      next(error);
    }
  }
);

authRouter.post(
  '/refresh',
  refreshRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = sanitiseRefreshPayload(req.body ?? {});

    if (!validation.ok) {
      res.status(400).json(formatValidationErrorResponse(validation.errors));
      return;
    }

    const { refreshToken } = validation.value;

    type RefreshTokenPayload = {
      user_id?: string;
      role?: string;
      zone_id?: string;
      token_type?: string;
    } & JwtPayload;

    let payload: RefreshTokenPayload;

    try {
      ({ payload } = verifyToken<RefreshTokenPayload>(refreshToken));
    } catch (error) {
      logger.warn('Failed to verify refresh token', {
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
    const userId =
      typeof user_id === 'string' ? user_id : typeof sub === 'string' ? sub : undefined;
    const role = typeof roleClaim === 'string' ? roleClaim : undefined;
    const zoneId = typeof zone_id === 'string' ? zone_id : undefined;

    if (!userId || !role || !zoneId) {
      res.status(401).json(refreshErrorResponse);
      return;
    }

    const hashedToken = hashRefreshToken(refreshToken);

    try {
      const rotationResult = await runWithClient(async (client) => {
        await client.query('BEGIN');
        try {
          const result = await client.query<{
            user_id: string;
            expires_at: Date | string;
          }>(
            `SELECT user_id, expires_at
             FROM refresh_tokens
             WHERE token_hash = $1
             FOR UPDATE`,
            [hashedToken]
          );

          const record = result.rows[0];

          if (!record || record.user_id !== userId) {
            await client.query('ROLLBACK');
            return { status: 'not_found' } as const;
          }

          const expiresAt =
            record.expires_at instanceof Date ? record.expires_at : new Date(record.expires_at);

          if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
            await client.query('ROLLBACK');
            return { status: 'expired' } as const;
          }

          const newRefreshToken = generateRefreshToken({
            userId,
            role,
            zoneId,
          });
          const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
          const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

          const updateResult = await client.query(
            `UPDATE refresh_tokens
             SET token_hash = $1, expires_at = $2
             WHERE token_hash = $3`,
            [newRefreshTokenHash, newExpiresAt, hashedToken]
          );

          if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return { status: 'update_failed' } as const;
          }

          await client.query('COMMIT');
          return {
            status: 'ok',
            newRefreshToken,
          } as const;
        } catch (txError) {
          await client.query('ROLLBACK');
          throw txError;
        }
      });

      if (rotationResult.status === 'not_found' || rotationResult.status === 'expired') {
        res.status(401).json(refreshErrorResponse);
        return;
      }

      if (rotationResult.status === 'update_failed') {
        logger.error('Failed to rotate refresh token', {
          userId,
        });
        res.status(500).json({ message: 'Unable to refresh session' });
        return;
      }

      const accessToken = generateAccessToken({
        userId,
        role,
        zoneId,
      });

      res.status(200).json({
        accessToken,
        refreshToken: rotationResult.newRefreshToken,
      });
    } catch (error) {
      logger.error('Failed to process refresh token', {
        message: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      next(error);
    }
  }
);

authRouter.post(
  '/login',
  loginRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = sanitiseLoginPayload(req.body ?? {});

    if (!validation.ok) {
      res.status(400).json(formatValidationErrorResponse(validation.errors));
      return;
    }

    try {
      const result = await runWithClient(async (client) => {
        const userResult = await client.query<{
          id: string;
          email: string;
          password_hash: string;
          first_name: string;
          last_name: string;
          role: string;
          zone_id: string;
        }>(
          `SELECT id, email, password_hash, first_name, last_name, role, zone_id
           FROM users
           WHERE email = $1`,
          [validation.value.email]
        );

        const row = userResult.rows[0];
        const passwordHash = row?.password_hash ?? '';
        const passwordValid = await verifyPassword(validation.value.password, passwordHash);

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

        const accessToken = generateAccessToken(claims);
        const refreshToken = generateRefreshToken(claims);
        const refreshTokenHash = hashRefreshToken(refreshToken);
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await client.query('BEGIN');
        try {
          await client.query(
            `DELETE FROM refresh_tokens
             WHERE user_id = $1 AND device_id = $2`,
            [user.id, validation.value.deviceId]
          );

          await client.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [user.id, refreshTokenHash, validation.value.deviceId, expiresAt]
          );

          await client.query('COMMIT');
        } catch (transactionError) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('Failed to rollback refresh token transaction', {
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
        logger.warn('Invalid login attempt', {
          email: validation.value.email,
        });
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      res.status(200).json(successResponse(result));
    } catch (error) {
      logger.error('Failed to log in user', {
        message: error instanceof Error ? error.message : 'Unknown error',
        email: validation.value.email,
      });
      next(error);
    }
  }
);

authRouter.post(
  '/logout',
  authenticateJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = sanitiseLogoutPayload(req.body ?? {});

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

      await blacklistAccessToken(user.token, ttlSeconds);
    } catch (error) {
      logger.error('Failed to blacklist access token during logout', {
        message: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      });
      return next(error);
    }

    try {
      await runWithClient(async (client) => {
        await client.query(
          `DELETE FROM refresh_tokens
         WHERE token_hash = $1 AND user_id = $2`,
          [hashedToken, user.id]
        );
      });
    } catch (error) {
      logger.error('Failed to invalidate refresh token during logout', {
        message: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      });
      return next(error);
    }

    res.status(200).json({ success: true });
  }
);
