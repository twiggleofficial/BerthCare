import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../config/environment.js';
import { createActivationService, ActivationError } from './activation-service.js';
import { verifyPin } from './offline-pin.js';
import { setupTestDatabase } from './test-utils.js';
const ACTIVATION_CODE = '7583-1204';
const NORMALIZED_CODE = ACTIVATION_CODE.replace(/\D/g, '');
const futureDate = () => {
    const date = new Date();
    date.setHours(date.getHours() + 12);
    return date;
};
const pastDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 12);
    return date;
};
describe('ActivationService', () => {
    it('issues activation token for valid caregiver credentials', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'caregiver.north@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Carlos',
                'Caregiver',
                'caregiver',
                '11111111-1111-1111-1111-111111111111',
            ]);
            const response = await service.requestActivation({
                email: 'caregiver.north@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-abc',
                appVersion: '1.0.0',
            }, {
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
            });
            expect(response.activationToken).toHaveLength(64);
            expect(response.user).toEqual({
                id: '55555555-5555-5555-5555-555555555555',
                firstName: 'Carlos',
                lastName: 'Caregiver',
                role: 'caregiver',
                zoneId: '11111111-1111-1111-1111-111111111111',
            });
            expect(response.requiresMfa).toBe(false);
            const attempts = await db.pool.query('SELECT success, outcome FROM auth_activation_attempts ORDER BY created_at ASC');
            expect(attempts.rowCount).toBe(1);
            expect(attempts.rows[0].success).toBe(true);
            const sessions = await db.pool.query('SELECT device_fingerprint FROM auth_activation_sessions');
            expect(sessions.rowCount).toBe(1);
            expect(sessions.rows[0].device_fingerprint).toBe('device-abc');
        }
        finally {
            await db.dispose();
        }
    });
    it('completes activation and creates a device session with tokens', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '11111111-2222-3333-4444-555555555555',
                'complete@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Casey',
                'Caregiver',
                'caregiver',
                '22222222-3333-4444-5555-666666666666',
            ]);
            const activation = await service.requestActivation({
                email: 'complete@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-complete',
                appVersion: '1.5.0',
            }, {
                ipAddress: '10.0.0.2',
                userAgent: 'vitest-agent',
            });
            const completion = await service.completeActivation({
                activationToken: activation.activationToken,
                pin: '654321',
                deviceName: 'Field Tablet',
                supportsBiometric: true,
            }, {
                ipAddress: '10.0.0.2',
                userAgent: 'vitest-agent',
            });
            expect(completion.accessToken).toBeDefined();
            expect(completion.refreshToken).toBeDefined();
            expect(completion.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
            const accessPayload = jwt.verify(completion.accessToken, env.jwtSecret);
            expect(accessPayload.sub).toBe('11111111-2222-3333-4444-555555555555');
            expect(accessPayload.role).toBe('caregiver');
            expect(accessPayload.deviceId).toBe(completion.deviceId);
            expect(accessPayload.activationMethod).toBe('biometric');
            const refreshPayload = jwt.verify(completion.refreshToken, env.jwtSecret);
            expect(refreshPayload.sub).toBe('11111111-2222-3333-4444-555555555555');
            expect(refreshPayload.deviceId).toBe(completion.deviceId);
            expect(refreshPayload.tokenId).toHaveLength(36);
            expect(refreshPayload.rotationId).toHaveLength(36);
            const refreshTokenHash = crypto.createHash('sha256').update(completion.refreshToken).digest('hex');
            const sessionResult = await db.pool.query(`
          SELECT
            user_id,
            device_fingerprint,
            device_name,
            supports_biometric,
            pin_scrypt_hash,
            pin_scrypt_salt,
            pin_scrypt_params,
            refresh_token_hash,
            refresh_token_expires_at,
            ip_address,
            user_agent,
            activation_session_id
          FROM device_sessions
          WHERE id = $1
        `, [completion.deviceId]);
            expect(sessionResult.rowCount).toBe(1);
            const session = sessionResult.rows[0];
            expect(session.user_id).toBe('11111111-2222-3333-4444-555555555555');
            expect(session.device_fingerprint).toBe('device-complete');
            expect(session.device_name).toBe('Field Tablet');
            expect(session.supports_biometric).toBe(true);
            expect(session.ip_address).toBe('10.0.0.2');
            expect(session.user_agent).toBe('vitest-agent');
            expect(session.refresh_token_hash).toBe(refreshTokenHash);
            const pinOk = await verifyPin('654321', {
                hash: session.pin_scrypt_hash,
                salt: session.pin_scrypt_salt,
                params: session.pin_scrypt_params,
            });
            expect(pinOk).toBe(true);
            const activationSession = await db.pool.query(`
          SELECT completed_at
          FROM auth_activation_sessions
          WHERE id = $1
        `, [session.activation_session_id]);
            expect(activationSession.rows[0].completed_at).not.toBeNull();
        }
        finally {
            await db.dispose();
        }
    });
    it('marks coordinator activation as requiring MFA', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '44444444-4444-4444-4444-444444444444',
                'coordinator@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Bianca',
                'Coordinator',
                'coordinator',
                '11111111-1111-1111-1111-111111111111',
            ]);
            const response = await service.requestActivation({
                email: 'coordinator@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'coord-device',
                appVersion: '1.2.3',
            }, {});
            expect(response.requiresMfa).toBe(true);
            expect(response.user.role).toBe('coordinator');
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects activation completion with invalid token', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
            await expect(service.completeActivation({
                activationToken: 'b'.repeat(64),
                pin: '123456',
                deviceName: 'Unknown Device',
                supportsBiometric: false,
            }, {})).rejects.toMatchObject({
                status: 400,
                code: 'AUTH_INVALID_ACTIVATION_TOKEN',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects activation completion when PIN violates policy', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'pinpolicy@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Polly',
                'Policy',
                'caregiver',
                null,
            ]);
            const activation = await service.requestActivation({
                email: 'pinpolicy@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-pin-policy',
                appVersion: '1.0.1',
            }, {});
            await expect(service.completeActivation({
                activationToken: activation.activationToken,
                pin: '12ab34',
                deviceName: 'Tablet',
                supportsBiometric: false,
            }, {})).rejects.toMatchObject({
                status: 422,
                code: 'AUTH_PIN_POLICY_VIOLATION',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects activation completion when device already enrolled', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                'device@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Devon',
                'Device',
                'caregiver',
                null,
            ]);
            const activation = await service.requestActivation({
                email: 'device@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-existing',
                appVersion: '1.0.2',
            }, {});
            const activationSession = await db.pool.query(`
          SELECT id
          FROM auth_activation_sessions
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']);
            const activationSessionId = activationSession.rows[0].id;
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
            refresh_token_expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
                'cccccccc-cccc-cccc-cccc-cccccccccccc',
                'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                activationSessionId,
                'device-existing',
                'Existing Device',
                '1.0.2',
                false,
                'f'.repeat(64),
                'a'.repeat(32),
                'scrypt:N=16384,r=8,p=1,keylen=32',
                crypto.randomUUID(),
                crypto.randomUUID(),
                'd'.repeat(64),
                futureDate(),
            ]);
            await expect(service.completeActivation({
                activationToken: activation.activationToken,
                pin: '123456',
                deviceName: 'New Device',
                supportsBiometric: false,
            }, {})).rejects.toMatchObject({
                status: 409,
                code: 'AUTH_DEVICE_ALREADY_ENROLLED',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects invalid activation codes', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'caregiver.north@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Carlos',
                'Caregiver',
                'caregiver',
                '11111111-1111-1111-1111-111111111111',
            ]);
            await expect(service.requestActivation({
                email: 'caregiver.north@berthcare.dev',
                activationCode: '0000-0000',
                deviceFingerprint: 'device-abc',
                appVersion: '1.0.0',
            }, {})).rejects.toMatchObject({
                status: 400,
                code: 'AUTH_INVALID_ACTIVATION_CODE',
            });
            const attempts = await db.pool.query('SELECT success, outcome FROM auth_activation_attempts ORDER BY created_at ASC');
            expect(attempts.rowCount).toBe(1);
            expect(attempts.rows[0].success).toBe(false);
            expect(attempts.rows[0].outcome).toBe('invalid_credentials');
        }
        finally {
            await db.dispose();
        }
    });
    it('rejects expired activation codes', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'caregiver.north@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                pastDate(),
                'Carlos',
                'Caregiver',
                'caregiver',
                '11111111-1111-1111-1111-111111111111',
            ]);
            await expect(service.requestActivation({
                email: 'caregiver.north@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-abc',
                appVersion: '1.0.0',
            }, {})).rejects.toMatchObject({
                status: 410,
                code: 'AUTH_ACTIVATION_EXPIRED',
            });
        }
        finally {
            await db.dispose();
        }
    });
    it('rate limits repeated invalid attempts per device fingerprint', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'caregiver.north@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Carlos',
                'Caregiver',
                'caregiver',
                '11111111-1111-1111-1111-111111111111',
            ]);
            const attempt = () => service.requestActivation({
                email: 'caregiver.north@berthcare.dev',
                activationCode: '0000-0000',
                deviceFingerprint: 'device-abc',
                appVersion: '1.0.0',
            }, {});
            for (let i = 0; i < 5; i += 1) {
                await expect(attempt()).rejects.toBeInstanceOf(ActivationError);
            }
            await expect(attempt()).rejects.toMatchObject({
                status: 429,
                code: 'AUTH_ACTIVATION_RATE_LIMITED',
            });
            const attempts = await db.pool.query(`
          SELECT outcome, success
          FROM auth_activation_attempts
          ORDER BY created_at ASC
        `);
            expect(attempts.rows.at(-1)?.outcome).toBe('rate_limited');
        }
        finally {
            await db.dispose();
        }
    });
    it('blocks devices with existing active sessions', async () => {
        const db = await setupTestDatabase();
        const service = createActivationService({ pool: db.pool });
        try {
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'caregiver.north@berthcare.dev',
                await bcrypt.hash(NORMALIZED_CODE, 12),
                futureDate(),
                'Carlos',
                'Caregiver',
                'caregiver',
                '11111111-1111-1111-1111-111111111111',
            ]);
            await db.pool.query(`
        INSERT INTO auth_activation_sessions (
          user_id,
          activation_token_hash,
          device_fingerprint,
          app_version,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [
                '55555555-5555-5555-5555-555555555555',
                'existing-token-hash',
                'device-abc',
                '1.0.0',
                futureDate(),
            ]);
            await expect(service.requestActivation({
                email: 'caregiver.north@berthcare.dev',
                activationCode: ACTIVATION_CODE,
                deviceFingerprint: 'device-abc',
                appVersion: '1.0.0',
            }, {})).rejects.toMatchObject({
                status: 409,
                code: 'AUTH_DEVICE_ALREADY_ENROLLED',
            });
        }
        finally {
            await db.dispose();
        }
    });
});
