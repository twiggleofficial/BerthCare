import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';

import { projectMetadata } from '@berthcare/shared';

import { env } from '../config/environment.js';
import { getDatabasePool } from '../database/index.js';
import { createLogger, serializeError } from '../logger/index.js';
import {
  createDeviceSessionRepository,
  type DeviceSessionRepository,
  type DeviceSessionUser,
  type DeviceSessionWithUser,
  DeviceSessionRotationConflictError,
} from './device-session-repository.js';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TOUCH_THRESHOLD_MS = 5 * 60 * 1000;
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

const sessionLogger = createLogger('auth.session');

export class SessionError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(message: string, status: number, code: string, expose = true) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

type SessionServiceOptions = {
  pool?: Pool | null;
  repository?: DeviceSessionRepository;
};

type RefreshSessionPayload = {
  refreshToken: string;
  deviceId: string;
};

type RefreshSessionContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type RefreshSessionResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
};

type RevokeSessionPayload = RefreshSessionPayload & {
  reason?: string | null;
};

type AccessTokenClaims = jwt.JwtPayload & {
  sub: string;
  role: DeviceSessionUser['role'];
  deviceId: string;
  activationMethod: 'biometric' | 'pin';
};

type RefreshTokenClaims = jwt.JwtPayload & {
  sub: string;
  deviceId: string;
  tokenId: string;
  rotationId: string;
};

export type LoadedDeviceSession = {
  user: {
    id: string;
    role: DeviceSessionUser['role'];
    zoneId: string | null;
    permissions?: string[];
    accessibleZoneIds?: string[];
  };
  deviceSession: {
    id: string;
    userId: string;
    deviceName: string;
    supportsBiometric: boolean;
    rotationId: string;
    tokenId: string;
    refreshTokenExpiresAt: Date;
    lastSeenAt: Date | null;
  };
  token: AccessTokenClaims;
};

export interface SessionService {
  refreshSession(
    payload: RefreshSessionPayload,
    context: RefreshSessionContext,
  ): Promise<RefreshSessionResponse>;
  revokeSession(payload: RevokeSessionPayload): Promise<void>;
  loadSessionContext(accessToken: string): Promise<LoadedDeviceSession>;
}

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const verifyRefreshClaims = (token: string): RefreshTokenClaims => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: projectMetadata.service,
      algorithms: [JWT_ALGORITHM],
    }) as RefreshTokenClaims | string;
    if (typeof payload === 'string') {
      throw new SessionError('Invalid refresh token payload', 401, 'AUTH_TOKEN_INVALID');
    }

    if (!payload.sub || !payload.deviceId || !payload.tokenId || !payload.rotationId) {
      throw new SessionError('Invalid refresh token payload', 401, 'AUTH_TOKEN_INVALID');
    }

    return payload;
  } catch (error) {
    if (error instanceof SessionError) {
      throw error;
    }

    sessionLogger.warn('Failed to verify refresh token', {
      error: serializeError(error),
    });
    throw new SessionError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID');
  }
};

const verifyAccessClaims = (token: string): AccessTokenClaims => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: projectMetadata.service,
      algorithms: [JWT_ALGORITHM],
    }) as AccessTokenClaims | string;

    if (typeof payload === 'string') {
      throw new SessionError('Invalid access token payload', 401, 'AUTH_UNAUTHENTICATED');
    }

    if (!payload.sub || !payload.deviceId || !payload.role || !payload.activationMethod) {
      throw new SessionError('Invalid access token payload', 401, 'AUTH_UNAUTHENTICATED');
    }

    return payload;
  } catch (error) {
    if (error instanceof SessionError) {
      throw error;
    }

    sessionLogger.warn('Failed to verify access token', {
      error: serializeError(error),
    });
    throw new SessionError('Authentication required', 401, 'AUTH_UNAUTHENTICATED');
  }
};

const calculateRefreshTokenExpiry = (issuedAt: Date): Date => {
  return new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);
};

const buildActivationMethod = (session: DeviceSessionWithUser): 'biometric' | 'pin' => {
  return session.supportsBiometric ? 'biometric' : 'pin';
};

export const createSessionService = (options: SessionServiceOptions = {}): SessionService => {
  const repository = options.repository ?? createDeviceSessionRepository();

  const resolvePool = (): Pool | null => {
    if (options.pool) {
      return options.pool;
    }

    return getDatabasePool();
  };

  return {
    async refreshSession(payload, context) {
      const claims = verifyRefreshClaims(payload.refreshToken);

      if (claims.deviceId !== payload.deviceId) {
        throw new SessionError('Refresh token device mismatch', 401, 'AUTH_TOKEN_INVALID');
      }

      const pool = resolvePool();

      if (!pool) {
        sessionLogger.error('Refresh session unavailable - database pool not configured');
        throw new SessionError(
          'Session service unavailable',
          503,
          'AUTH_SERVICE_UNAVAILABLE',
          false,
        );
      }

      const now = new Date();
      const client = await pool.connect();
      let committed = false;

      try {
        await client.query('BEGIN');

        const session = await repository.findByIdWithUser(client, payload.deviceId, { lock: true });

        if (!session) {
          throw new SessionError('Device session not found', 401, 'AUTH_TOKEN_INVALID', false);
        }

        if (session.userId !== claims.sub) {
          throw new SessionError(
            'Refresh token subject mismatch',
            401,
            'AUTH_TOKEN_INVALID',
            false,
          );
        }

        if (session.revokedAt) {
          throw new SessionError('Device session revoked', 423, 'AUTH_DEVICE_REVOKED');
        }

        if (!session.user.isActive) {
          throw new SessionError('Account disabled', 401, 'AUTH_TOKEN_INVALID', false);
        }

        const inboundHash = hashToken(payload.refreshToken);

        const revokeForReplay = async (reason: string) => {
          await repository.revokeDeviceSession(client, {
            deviceSessionId: session.id,
            revokedAt: now,
            reason,
          });
          await client.query('COMMIT');
          committed = true;
          sessionLogger.warn('Refresh token reuse detected; device session revoked', {
            deviceSessionId: session.id,
            userId: session.userId,
            reason,
          });
          throw new SessionError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID');
        };

        if (
          inboundHash !== session.refreshTokenHash ||
          session.tokenId !== claims.tokenId ||
          session.rotationId !== claims.rotationId
        ) {
          await revokeForReplay('refresh_token_reuse');
        }

        if (session.refreshTokenExpiresAt.getTime() <= now.getTime()) {
          throw new SessionError('Refresh token expired', 401, 'AUTH_TOKEN_EXPIRED');
        }

        const tokenId = crypto.randomUUID();
        const rotationId = crypto.randomUUID();
        const refreshExpiresAt = calculateRefreshTokenExpiry(now);
        const activationMethod = buildActivationMethod(session);

        const accessToken = jwt.sign(
          {
            sub: session.userId,
            role: session.user.role,
            deviceId: session.id,
            activationMethod,
          },
          env.jwtSecret,
          {
            issuer: projectMetadata.service,
            expiresIn: '15m',
            algorithm: JWT_ALGORITHM,
          },
        );

        const refreshToken = jwt.sign(
          {
            sub: session.userId,
            deviceId: session.id,
            tokenId,
            rotationId,
          },
          env.jwtSecret,
          {
            issuer: projectMetadata.service,
            expiresIn: '30d',
            algorithm: JWT_ALGORITHM,
          },
        );

        const refreshTokenHash = hashToken(refreshToken);

        try {
          await repository.rotateDeviceSession(client, {
            deviceSessionId: session.id,
            tokenId,
            rotationId,
            refreshTokenHash,
            refreshTokenExpiresAt: refreshExpiresAt,
            rotatedAt: now,
            expectedTokenId: session.tokenId,
            expectedRotationId: session.rotationId,
            expectedRefreshTokenHash: session.refreshTokenHash,
          });
        } catch (error) {
          if (error instanceof DeviceSessionRotationConflictError) {
            await revokeForReplay('refresh_token_reuse');
          }
          throw error;
        }

        await repository.touchDeviceSession(client, session.id, now);

        await client.query('COMMIT');
        committed = true;

        sessionLogger.info('Refresh token rotated', {
          deviceSessionId: session.id,
          userId: session.userId,
          tokenId,
          rotationId,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        });

        return {
          accessToken,
          refreshToken,
          deviceId: session.id,
        };
      } catch (error) {
        if (!committed) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            sessionLogger.error('Failed to rollback refresh session transaction', {
              error: serializeError(rollbackError),
            });
          }
        }

        if (error instanceof SessionError) {
          throw error;
        }

        sessionLogger.error('Unexpected error during session refresh', {
          error: serializeError(error),
        });
        throw new SessionError('Failed to refresh session', 500, 'AUTH_SERVICE_UNAVAILABLE', false);
      } finally {
        client.release();
      }
    },

    async revokeSession(payload) {
      const claims = verifyRefreshClaims(payload.refreshToken);

      if (claims.deviceId !== payload.deviceId) {
        throw new SessionError('Refresh token device mismatch', 401, 'AUTH_TOKEN_INVALID');
      }

      const pool = resolvePool();

      if (!pool) {
        sessionLogger.error('Revoke session unavailable - database pool not configured');
        throw new SessionError(
          'Session service unavailable',
          503,
          'AUTH_SERVICE_UNAVAILABLE',
          false,
        );
      }

      const now = new Date();
      const client = await pool.connect();
      let committed = false;

      try {
        await client.query('BEGIN');

        const session = await repository.findByIdWithUser(client, payload.deviceId, { lock: true });

        if (!session) {
          throw new SessionError('Device session not found', 404, 'AUTH_SESSION_NOT_FOUND');
        }

        if (session.userId !== claims.sub) {
          throw new SessionError(
            'Refresh token subject mismatch',
            401,
            'AUTH_TOKEN_INVALID',
            false,
          );
        }

        if (session.revokedAt) {
          await client.query('COMMIT');
          committed = true;
          return;
        }

        const inboundHash = hashToken(payload.refreshToken);

        if (
          inboundHash !== session.refreshTokenHash ||
          session.tokenId !== claims.tokenId ||
          session.rotationId !== claims.rotationId
        ) {
          throw new SessionError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID');
        }

        await repository.revokeDeviceSession(client, {
          deviceSessionId: session.id,
          revokedAt: now,
          reason: payload.reason ?? 'user_logout',
        });

        await client.query('COMMIT');
        committed = true;

        sessionLogger.info('Device session revoked', {
          deviceSessionId: session.id,
          userId: session.userId,
          reason: payload.reason ?? 'user_logout',
        });
      } catch (error) {
        if (!committed) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            sessionLogger.error('Failed to rollback revoke session transaction', {
              error: serializeError(rollbackError),
            });
          }
        }

        if (error instanceof SessionError) {
          throw error;
        }

        sessionLogger.error('Unexpected error during session revocation', {
          error: serializeError(error),
        });
        throw new SessionError('Failed to revoke session', 500, 'AUTH_SERVICE_UNAVAILABLE', false);
      } finally {
        client.release();
      }
    },

    async loadSessionContext(accessToken) {
      const claims = verifyAccessClaims(accessToken);
      const pool = resolvePool();

      if (!pool) {
        throw new SessionError(
          'Session service unavailable',
          503,
          'AUTH_SERVICE_UNAVAILABLE',
          false,
        );
      }

      const client = await pool.connect();

      try {
        const session = await repository.findByIdWithUser(client, claims.deviceId);

        if (!session) {
          throw new SessionError('Device session not found', 401, 'AUTH_UNAUTHENTICATED', false);
        }

        if (session.userId !== claims.sub) {
          throw new SessionError(
            'Access token subject mismatch',
            401,
            'AUTH_UNAUTHENTICATED',
            false,
          );
        }

        if (session.revokedAt) {
          throw new SessionError('Device session revoked', 423, 'AUTH_DEVICE_REVOKED');
        }

        if (!session.user.isActive) {
          throw new SessionError('Account disabled', 401, 'AUTH_UNAUTHENTICATED', false);
        }

        const now = new Date();
        let lastSeenAt = session.lastSeenAt;

        if (!lastSeenAt || now.getTime() - lastSeenAt.getTime() >= SESSION_TOUCH_THRESHOLD_MS) {
          await repository.touchDeviceSession(client, session.id, now);
          lastSeenAt = now;
        }

        return {
          user: {
            id: session.userId,
            role: session.user.role,
            zoneId: session.user.zoneId,
            permissions: undefined,
            accessibleZoneIds: undefined,
          },
          deviceSession: {
            id: session.id,
            userId: session.userId,
            deviceName: session.deviceName,
            supportsBiometric: session.supportsBiometric,
            rotationId: session.rotationId,
            tokenId: session.tokenId,
            refreshTokenExpiresAt: session.refreshTokenExpiresAt,
            lastSeenAt,
          },
          token: claims,
        };
      } catch (error) {
        if (error instanceof SessionError) {
          throw error;
        }

        sessionLogger.error('Failed to load device session context', {
          error: serializeError(error),
        });
        throw new SessionError('Authentication required', 401, 'AUTH_UNAUTHENTICATED');
      } finally {
        client.release();
      }
    },
  };
};
