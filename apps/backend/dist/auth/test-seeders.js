import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { projectMetadata } from '@berthcare/shared';
import { env } from '../config/environment.js';
export const seedDeviceSession = async (db) => {
    const userId = crypto.randomUUID();
    const activationSessionId = crypto.randomUUID();
    const deviceSessionId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const rotationId = crypto.randomUUID();
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
    `, [
        userId,
        'caregiver@example.com',
        'activation-hash',
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
        'Care',
        'Giver',
    ]);
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
