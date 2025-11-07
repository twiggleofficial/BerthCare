import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';

import { projectMetadata } from '@berthcare/shared';

import { env } from '../config/environment.js';
import { getDatabasePool } from '../database/index.js';
import { createLogger } from '../logger/index.js';
import {
  createActivationRepository,
  type ActivationAttemptOutcome,
  type ActivationRepository,
  type ActivationSessionRecord,
  type ActivationSessionWithUser,
} from './activation-repository.js';
import {
  createDeviceSessionRepository,
  type DeviceSessionRepository,
} from './device-session-repository.js';
import { hashPin, PinPolicyError } from './offline-pin.js';

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class ActivationError extends Error {
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

type ActivationRequestPayload = {
  email: string;
  activationCode: string;
  deviceFingerprint: string;
  appVersion: string;
};

type ActivationRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ActivationResponse = {
  activationToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'caregiver' | 'coordinator';
    zoneId: string | null;
  };
  requiresMfa: boolean;
};

export interface ActivationService {
  requestActivation(
    payload: ActivationRequestPayload,
    context: ActivationRequestContext,
  ): Promise<ActivationResponse>;
  completeActivation(
    payload: ActivationCompletionPayload,
    context: ActivationCompletionContext,
  ): Promise<ActivationCompletionResponse>;
}

type ActivationServiceOptions = {
  pool?: Pool | null;
  repository?: ActivationRepository;
  deviceSessions?: DeviceSessionRepository;
};

const normalizeActivationCode = (activationCode: string): string => {
  return activationCode.replace(/\D/g, '');
};

const isEligibleRole = (role: string): role is 'caregiver' | 'coordinator' => {
  return role === 'caregiver' || role === 'coordinator';
};

const buildAttemptDetail = (
  outcome: ActivationAttemptOutcome,
  detail?: string | null,
): string | null => {
  if (!detail) {
    return null;
  }

  return `[${outcome}] ${detail}`;
};

type ActivationCompletionPayload = {
  activationToken: string;
  pin: string;
  deviceName: string;
  supportsBiometric: boolean;
};

type ActivationCompletionContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type ActivationCompletionResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
};

const calculateRefreshTokenExpiry = (issuedAt: Date): Date => {
  return new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);
};

const createTokenHash = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const isActivationSessionUsable = (session: ActivationSessionWithUser, now: Date): boolean => {
  if (session.expiresAt.getTime() <= now.getTime()) {
    return false;
  }

  if (session.completedAt || session.revokedAt) {
    return false;
  }

  if (!session.user.isActive || !isEligibleRole(session.user.role)) {
    return false;
  }

  return true;
};

export const createActivationService = (
  options: ActivationServiceOptions = {},
): ActivationService => {
  const repository = options.repository ?? createActivationRepository();
  const deviceSessions = options.deviceSessions ?? createDeviceSessionRepository();
  const logger = createLogger('auth.activate');

  const resolvePool = (): Pool | null => {
    if (options.pool) {
      return options.pool;
    }
    return getDatabasePool();
  };

  return {
    async requestActivation(payload, context) {
      const pool = resolvePool();

      if (!pool) {
        logger.error('Activation service unavailable - database pool not configured');
        throw new ActivationError(
          'Activation service unavailable',
          503,
          'AUTH_SERVICE_UNAVAILABLE',
          false,
        );
      }

      const normalizedActivationCode = normalizeActivationCode(payload.activationCode);

      const client = await pool.connect();
      let committed = false;

      try {
        await client.query('BEGIN');

        const attemptContext = {
          email: payload.email,
          deviceFingerprint: payload.deviceFingerprint,
          appVersion: payload.appVersion,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        };

        const recentAttempts = await repository.countRecentAttempts(
          client,
          payload.email,
          payload.deviceFingerprint,
          RATE_LIMIT_WINDOW_MINUTES,
        );

        if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
          await repository.recordAttempt(client, {
            userId: null,
            ...attemptContext,
            outcome: 'rate_limited',
            success: false,
            detail: buildAttemptDetail(
              'rate_limited',
              `Exceeded ${RATE_LIMIT_MAX_ATTEMPTS} attempts within ${RATE_LIMIT_WINDOW_MINUTES} minutes`,
            ),
          });
          await client.query('COMMIT');
          committed = true;

          logger.warn('Activation attempt rate limited', {
            email: payload.email,
            deviceFingerprint: payload.deviceFingerprint,
            windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
          });

          throw new ActivationError(
            'Too many activation attempts. Try again later.',
            429,
            'AUTH_ACTIVATION_RATE_LIMITED',
          );
        }

        const user = await repository.findUserByEmail(client, payload.email);

        if (!user || !user.activationCodeHash || !user.isActive || !isEligibleRole(user.role)) {
          await repository.recordAttempt(client, {
            userId: user?.id ?? null,
            ...attemptContext,
            outcome: 'invalid_credentials',
            success: false,
            detail: buildAttemptDetail('invalid_credentials', 'User unavailable for activation'),
          });
          await client.query('COMMIT');
          committed = true;

          logger.warn('Activation attempt rejected - user unavailable', {
            email: payload.email,
            hasHash: Boolean(user?.activationCodeHash),
            isActive: user?.isActive ?? false,
            role: user?.role,
          });

          throw new ActivationError('Invalid activation code', 400, 'AUTH_INVALID_ACTIVATION_CODE');
        }

        const now = new Date();
        if (!user.activationExpiresAt || user.activationExpiresAt.getTime() <= now.getTime()) {
          await repository.recordAttempt(client, {
            userId: user.id,
            ...attemptContext,
            outcome: 'expired',
            success: false,
            detail: buildAttemptDetail('expired', 'Activation code expired'),
          });
          await client.query('COMMIT');
          committed = true;

          logger.warn('Activation attempt rejected - code expired', {
            email: payload.email,
            userId: user.id,
            expiresAt: user.activationExpiresAt,
          });

          throw new ActivationError('Activation code expired', 410, 'AUTH_ACTIVATION_EXPIRED');
        }

        const isValidCode = await bcrypt.compare(normalizedActivationCode, user.activationCodeHash);

        if (!isValidCode) {
          await repository.recordAttempt(client, {
            userId: user.id,
            ...attemptContext,
            outcome: 'invalid_credentials',
            success: false,
            detail: buildAttemptDetail('invalid_credentials', 'Activation code mismatch'),
          });
          await client.query('COMMIT');
          committed = true;

          logger.warn('Activation attempt rejected - invalid code', {
            email: payload.email,
            userId: user.id,
          });

          throw new ActivationError('Invalid activation code', 400, 'AUTH_INVALID_ACTIVATION_CODE');
        }

        const hasActiveSession = await repository.hasActiveSession(
          client,
          user.id,
          payload.deviceFingerprint,
        );

        if (hasActiveSession) {
          await repository.recordAttempt(client, {
            userId: user.id,
            ...attemptContext,
            outcome: 'device_enrolled',
            success: false,
            detail: buildAttemptDetail(
              'device_enrolled',
              'Existing activation session still valid',
            ),
          });
          await client.query('COMMIT');
          committed = true;

          logger.warn('Activation attempt rejected - device already enrolled', {
            email: payload.email,
            userId: user.id,
            deviceFingerprint: payload.deviceFingerprint,
          });

          throw new ActivationError('Device already enrolled', 409, 'AUTH_DEVICE_ALREADY_ENROLLED');
        }

        await repository.revokePendingSessions(client, user.id, payload.deviceFingerprint);

        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenHash = crypto
          .createHash('sha256')
          .update(activationToken)
          .digest('hex');
        const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);

        const sessionRecord: ActivationSessionRecord = {
          userId: user.id,
          activationTokenHash,
          deviceFingerprint: payload.deviceFingerprint,
          appVersion: payload.appVersion,
          ipAddress: attemptContext.ipAddress,
          userAgent: attemptContext.userAgent,
          expiresAt,
        };

        await repository.createActivationSession(client, sessionRecord);

        await repository.recordAttempt(client, {
          userId: user.id,
          ...attemptContext,
          outcome: 'success',
          success: true,
          detail: null,
        });

        await client.query('COMMIT');
        committed = true;

        logger.info('Activation token issued', {
          userId: user.id,
          email: user.email,
          deviceFingerprint: payload.deviceFingerprint,
          expiresAt,
        });

        return {
          activationToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            zoneId: user.zoneId,
          },
          requiresMfa: user.role === 'coordinator',
        };
      } catch (error) {
        if (!committed) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('Failed to rollback activation transaction', {
              error: (rollbackError as Error).message,
            });
          }
        }

        if (error instanceof ActivationError) {
          throw error;
        }

        logger.error('Unexpected error during activation request', {
          error: error instanceof Error ? error.message : String(error),
        });

        throw new ActivationError(
          'Failed to process activation',
          500,
          'AUTH_ACTIVATION_FAILED',
          false,
        );
      } finally {
        client.release();
      }
    },
    async completeActivation(
      payload: ActivationCompletionPayload,
      context: ActivationCompletionContext,
    ) {
      const pool = resolvePool();

      if (!pool) {
        logger.error('Activation service unavailable - database pool not configured');
        throw new ActivationError(
          'Activation service unavailable',
          503,
          'AUTH_SERVICE_UNAVAILABLE',
          false,
        );
      }

      const client = await pool.connect();
      let committed = false;

      try {
        await client.query('BEGIN');

        const now = new Date();
        const activationTokenHash = createTokenHash(payload.activationToken);
        const session = await repository.findActivationSessionByTokenHash(
          client,
          activationTokenHash,
        );

        if (!session || !isActivationSessionUsable(session, now)) {
          logger.warn('Activation completion rejected - invalid session', {
            reason: session ? 'session_unusable' : 'session_not_found',
          });
          throw new ActivationError(
            'Invalid activation token',
            400,
            'AUTH_INVALID_ACTIVATION_TOKEN',
          );
        }

        const existingDeviceSession = await deviceSessions.findActiveByFingerprint(
          client,
          session.deviceFingerprint,
        );

        if (existingDeviceSession) {
          logger.warn('Activation completion rejected - device already enrolled', {
            deviceFingerprint: session.deviceFingerprint,
            existingSessionId: existingDeviceSession.id,
          });

          throw new ActivationError('Device already enrolled', 409, 'AUTH_DEVICE_ALREADY_ENROLLED');
        }

        let pinHash;
        try {
          pinHash = await hashPin(payload.pin);
        } catch (error) {
          if (error instanceof PinPolicyError) {
            logger.warn('Activation completion rejected - PIN policy violation', {
              reason: error.message,
            });
            throw new ActivationError('Invalid PIN', 422, 'AUTH_PIN_POLICY_VIOLATION');
          }

          throw error;
        }

        const deviceSessionId = crypto.randomUUID();
        const tokenId = crypto.randomUUID();
        const rotationId = crypto.randomUUID();
        const refreshTokenExpiresAt = calculateRefreshTokenExpiry(now);
        const activationMethod = payload.supportsBiometric ? 'biometric' : 'pin';

        const accessToken = jwt.sign(
          {
            sub: session.userId,
            role: session.user.role,
            deviceId: deviceSessionId,
            activationMethod,
          },
          env.jwtSecret,
          {
            issuer: projectMetadata.service,
            expiresIn: '15m',
          },
        );

        const refreshToken = jwt.sign(
          {
            sub: session.userId,
            deviceId: deviceSessionId,
            tokenId,
            rotationId,
          },
          env.jwtSecret,
          {
            issuer: projectMetadata.service,
            expiresIn: '30d',
          },
        );

        const refreshTokenHash = createTokenHash(refreshToken);

        await deviceSessions.createDeviceSession(client, {
          id: deviceSessionId,
          userId: session.userId,
          activationSessionId: session.id,
          deviceFingerprint: session.deviceFingerprint,
          deviceName: payload.deviceName,
          appVersion: session.appVersion,
          supportsBiometric: payload.supportsBiometric,
          pinScryptHash: pinHash.hash,
          pinScryptSalt: pinHash.salt,
          pinScryptParams: JSON.stringify(pinHash.params),
          tokenId,
          rotationId,
          refreshTokenHash,
          refreshTokenExpiresAt,
          ipAddress: context.ipAddress ?? session.ipAddress,
          userAgent: context.userAgent ?? session.userAgent,
          lastSeenAt: now,
        });

        await repository.completeActivationSession(client, session.id, now);

        await client.query('COMMIT');
        committed = true;

        logger.info('Activation session completed', {
          activationSessionId: session.id,
          deviceSessionId,
          userId: session.userId,
        });

        return {
          accessToken,
          refreshToken,
          deviceId: deviceSessionId,
        };
      } catch (error) {
        if (!committed) {
          try {
            await client.query('ROLLBACK');
          } catch (rollbackError) {
            logger.error('Failed to rollback activation completion transaction', {
              error: (rollbackError as Error).message,
            });
          }
        }

        if (error instanceof ActivationError) {
          throw error;
        }

        logger.error('Unexpected error during activation completion', {
          error: error instanceof Error ? error.message : String(error),
        });

        throw new ActivationError(
          'Failed to complete activation',
          500,
          'AUTH_ACTIVATION_COMPLETION_FAILED',
          false,
        );
      } finally {
        client.release();
      }
    },
  };
};
