import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { projectMetadata } from '@berthcare/shared';
import { env } from '../config/environment.js';
import { createSessionService } from './session-service.js';
import { setupTestDatabase } from './test-utils.js';
const seedDeviceSession = async (db) => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const activationSessionId = '22222222-2222-2222-2222-222222222222';
    const deviceSessionId = '33333333-3333-3333-3333-333333333333';
    const tokenId = '44444444-4444-4444-4444-444444444444';
    const rotationId = '55555555-5555-5555-5555-555555555555';
    const now = new Date();
    const refreshToken = jwt.sign({
        sub: userId,
        deviceId: deviceSessionId,
        tokenId,
        rotationId,
    }, env.jwtSecret, {
        issuer: projectMetadata.service,
        expiresIn: '30d',
    });
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.pool.query(`
      INSERT INTO users (
        id,
        email,
        activation_code_hash,
        activation_expires_at,
        first_name,
        last_name,
        role,
        zone_id,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, 'caregiver', NULL, true)
    `, [userId, 'caregiver@example.com', 'activation-hash', new Date(now.getTime() + 24 * 60 * 60 * 1000), 'Care', 'Giver']);
    await db.pool.query(`
      INSERT INTO auth_activation_sessions (
        id,
        user_id,
        activation_token_hash,
        device_fingerprint,
        app_version,
        ip_address,
        user_agent,
        expires_at,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
        activationSessionId,
        userId,
        'activation-token-hash',
        'device-fingerprint',
        '1.0.0',
        '127.0.0.1',
        'vitest',
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
    ]);
    await db.pool.query(`
      INSERT INTO device_sessions (
        id,
        user_id,
        activation_session_id,
        device_fingerprint,
        device_name,
        app_version,
        supports_biometric,
        pin_scrypt_hash,
        pin_scrypt_salt,
        pin_scrypt_params,
        token_id,
        rotation_id,
        refresh_token_hash,
        refresh_token_expires_at,
        last_rotated_at,
        revoked_at,
        revoked_reason,
        ip_address,
        user_agent,
        last_seen_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NULL, NULL, NULL, $15, $16, $17
      )
    `, [
        deviceSessionId,
        userId,
        activationSessionId,
        'device-fingerprint',
        'Field Tablet',
        '1.0.0',
        true,
        'pin-hash',
        'pin-salt',
        'pin-params',
        tokenId,
        rotationId,
        refreshTokenHash,
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        '127.0.0.1',
        'vitest',
        new Date(now.getTime() - 10 * 60 * 1000),
    ]);
    return {
        userId,
        activationSessionId,
        deviceSessionId,
        refreshToken,
        tokenId,
        rotationId,
    };
};
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
