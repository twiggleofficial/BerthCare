import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { projectMetadata } from '@berthcare/shared';
import { env } from '../config/environment.js';
import { createSessionService } from './session-service.js';
import { seedDeviceSession } from './test-seeders.js';
import { setupTestDatabase } from './test-utils.js';
// Test fixture for invalid JWT signature verification - dynamically generated
const TEST_INVALID_SECRET = crypto.randomBytes(32).toString('hex');
describe('SessionService', () => {
    it('rotates refresh tokens and updates session metadata', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const response = await service.refreshSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
            }, {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
            });
            expect(response.deviceId).toBe(seed.deviceSessionId);
            expect(response.refreshToken).not.toBe(seed.refreshToken);
            const accessClaims = jwt.verify(response.accessToken, env.jwtSecret);
            expect(accessClaims.deviceId).toBe(seed.deviceSessionId);
            expect(accessClaims.sub).toBe(seed.userId);
            expect(accessClaims.role).toBe('caregiver');
            expect(accessClaims.activationMethod).toBe('biometric');
            const refreshClaims = jwt.verify(response.refreshToken, env.jwtSecret);
            expect(refreshClaims.deviceId).toBe(seed.deviceSessionId);
            expect(refreshClaims.sub).toBe(seed.userId);
            expect(refreshClaims.tokenId).not.toBe(seed.tokenId);
            expect(refreshClaims.rotationId).not.toBe(seed.rotationId);
            const row = await db.pool.query(`
          SELECT token_id, rotation_id, refresh_token_hash, last_rotated_at, last_seen_at
          FROM device_sessions
          WHERE id = $1
        `, [seed.deviceSessionId]);
            expect(row.rowCount).toBe(1);
            const record = row.rows[0];
            expect(record.token_id).toBe(refreshClaims.tokenId);
            expect(record.rotation_id).toBe(refreshClaims.rotationId);
            expect(record.last_rotated_at).not.toBeNull();
            expect(record.last_seen_at).not.toBeNull();
            const expectedHash = crypto.createHash('sha256').update(response.refreshToken).digest('hex');
            expect(record.refresh_token_hash).toBe(expectedHash);
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects refresh requests with expired tokens', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const expiredToken = jwt.sign({
                sub: seed.userId,
                deviceId: seed.deviceSessionId,
                tokenId: seed.tokenId,
                rotationId: seed.rotationId,
            }, env.jwtSecret, {
                issuer: projectMetadata.service,
                expiresIn: -10,
            });
            await expect(service.refreshSession({
                refreshToken: expiredToken,
                deviceId: seed.deviceSessionId,
            }, {})).rejects.toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects refresh requests signed with an invalid secret', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const invalidSignatureToken = jwt.sign({
                sub: seed.userId,
                deviceId: seed.deviceSessionId,
                tokenId: seed.tokenId,
                rotationId: seed.rotationId,
            }, TEST_INVALID_SECRET, {
                issuer: projectMetadata.service,
                expiresIn: '30d',
            });
            await expect(service.refreshSession({
                refreshToken: invalidSignatureToken,
                deviceId: seed.deviceSessionId,
            }, {})).rejects.toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects refresh requests for missing device sessions', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const missingDeviceId = crypto.randomUUID();
            const token = jwt.sign({
                sub: seed.userId,
                deviceId: missingDeviceId,
                tokenId: crypto.randomUUID(),
                rotationId: crypto.randomUUID(),
            }, env.jwtSecret, {
                issuer: projectMetadata.service,
                expiresIn: '30d',
            });
            await expect(service.refreshSession({
                refreshToken: token,
                deviceId: missingDeviceId,
            }, {})).rejects.toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects refresh requests when token and payload device IDs differ', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const mismatchedDeviceId = crypto.randomUUID();
            const token = jwt.sign({
                sub: seed.userId,
                deviceId: seed.deviceSessionId,
                tokenId: seed.tokenId,
                rotationId: seed.rotationId,
            }, env.jwtSecret, {
                issuer: projectMetadata.service,
                expiresIn: '30d',
            });
            await expect(service.refreshSession({
                refreshToken: token,
                deviceId: mismatchedDeviceId,
            }, {})).rejects.toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('revokes session on refresh token reuse', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            await service.refreshSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
            }, {});
            await expect(service.refreshSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
            }, {})).rejects.toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
            const row = await db.pool.query(`
          SELECT revoked_at, revoked_reason
          FROM device_sessions
          WHERE id = $1
        `, [seed.deviceSessionId]);
            expect(row.rowCount).toBe(1);
            expect(row.rows[0].revoked_at).not.toBeNull();
            expect(row.rows[0].revoked_reason).toBe('refresh_token_reuse');
        }
        finally {
            await db.dispose();
        }
    });
    it('revokes the device session when concurrent refresh attempts reuse a token', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const firstAttempt = service.refreshSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
            }, {});
            await new Promise((resolve) => setTimeout(resolve, 0));
            const secondAttempt = service.refreshSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
            }, {});
            const results = await Promise.allSettled([firstAttempt, secondAttempt]);
            const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length;
            const rejected = results.find((result) => result.status === 'rejected');
            expect(fulfilledCount).toBe(1);
            expect(rejected.reason).toMatchObject({
                status: 401,
                code: 'AUTH_TOKEN_INVALID',
            });
            const row = await db.pool.query(`
          SELECT revoked_at, revoked_reason
          FROM device_sessions
          WHERE id = $1
        `, [seed.deviceSessionId]);
            expect(row.rowCount).toBe(1);
            expect(row.rows[0].revoked_at).not.toBeNull();
            expect(row.rows[0].revoked_reason).toBe('refresh_token_reuse');
        }
        finally {
            await db.dispose();
        }
    });
    it('revokes sessions on explicit revoke requests', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            await service.revokeSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
                reason: 'user_logout',
            });
            const row = await db.pool.query(`
          SELECT revoked_at, revoked_reason
          FROM device_sessions
          WHERE id = $1
        `, [seed.deviceSessionId]);
            expect(row.rowCount).toBe(1);
            expect(row.rows[0].revoked_at).not.toBeNull();
            expect(row.rows[0].revoked_reason).toBe('user_logout');
        }
        finally {
            await db.dispose();
        }
    });
    it('loads device session context from access tokens', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            const accessToken = jwt.sign({
                sub: seed.userId,
                role: 'caregiver',
                deviceId: seed.deviceSessionId,
                activationMethod: 'biometric',
            }, env.jwtSecret, {
                issuer: projectMetadata.service,
                expiresIn: '15m',
            });
            const context = await service.loadSessionContext(accessToken);
            expect(context.user).toEqual({
                id: seed.userId,
                role: 'caregiver',
                zoneId: null,
                permissions: undefined,
                accessibleZoneIds: undefined,
            });
            expect(context.deviceSession.id).toBe(seed.deviceSessionId);
            expect(context.token.deviceId).toBe(seed.deviceSessionId);
            const row = await db.pool.query(`
          SELECT last_seen_at
          FROM device_sessions
          WHERE id = $1
        `, [seed.deviceSessionId]);
            expect(row.rowCount).toBe(1);
            expect(row.rows[0].last_seen_at).not.toBeNull();
        }
        finally {
            await db.dispose();
        }
    });
    it('prevents loading context for revoked sessions', async () => {
        const db = await setupTestDatabase();
        const service = createSessionService({ pool: db.pool });
        try {
            const seed = await seedDeviceSession(db);
            await service.revokeSession({
                refreshToken: seed.refreshToken,
                deviceId: seed.deviceSessionId,
                reason: 'device_lost',
            });
            const accessToken = jwt.sign({
                sub: seed.userId,
                role: 'caregiver',
                deviceId: seed.deviceSessionId,
                activationMethod: 'biometric',
            }, env.jwtSecret, {
                issuer: projectMetadata.service,
                expiresIn: '15m',
            });
            await expect(service.loadSessionContext(accessToken)).rejects.toMatchObject({
                status: 423,
                code: 'AUTH_DEVICE_REVOKED',
            });
        }
        finally {
            await db.dispose();
        }
    });
});
