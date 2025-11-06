import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';

export type DeviceSessionRecord = {
  id: string;
  userId: string;
  activationSessionId: string;
  deviceFingerprint: string;
  deviceName: string;
  appVersion: string | null;
  supportsBiometric: boolean;
  pinScryptHash: string;
  pinScryptSalt: string;
  pinScryptParams: string;
  tokenId: string;
  rotationId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  lastRotatedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceSessionUser = {
  role: 'caregiver' | 'coordinator' | 'admin' | 'family';
  zoneId: string | null;
  isActive: boolean;
};

export type DeviceSessionWithUser = DeviceSessionRecord & {
  user: DeviceSessionUser;
};

export type CreateDeviceSessionInput = {
  id?: string;
  userId: string;
  activationSessionId: string;
  deviceFingerprint: string;
  deviceName: string;
  appVersion?: string | null;
  supportsBiometric: boolean;
  pinScryptHash: string;
  pinScryptSalt: string;
  pinScryptParams: string;
  tokenId: string;
  rotationId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastSeenAt?: Date | null;
};

export type RotateDeviceSessionInput = {
  deviceSessionId: string;
  tokenId: string;
  rotationId: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  rotatedAt: Date;
};

export type RevokeDeviceSessionInput = {
  deviceSessionId: string;
  revokedAt: Date;
  reason?: string | null;
};

export interface DeviceSessionRepository {
  createDeviceSession(client: PoolClient, input: CreateDeviceSessionInput): Promise<DeviceSessionRecord>;
  findActiveByFingerprint(client: PoolClient, deviceFingerprint: string): Promise<DeviceSessionRecord | null>;
  findByIdWithUser(
    client: PoolClient,
    deviceSessionId: string,
    options?: { lock?: boolean },
  ): Promise<DeviceSessionWithUser | null>;
  rotateDeviceSession(client: PoolClient, input: RotateDeviceSessionInput): Promise<void>;
  revokeDeviceSession(client: PoolClient, input: RevokeDeviceSessionInput): Promise<void>;
  touchDeviceSession(client: PoolClient, deviceSessionId: string, seenAt: Date): Promise<void>;
}

type DeviceSessionRow = DeviceSessionRecord & {
  userRole: DeviceSessionUser['role'];
  userZoneId: string | null;
  userIsActive: boolean;
};

const mapDeviceSession = (row: DeviceSessionRow): DeviceSessionWithUser => {
  return {
    id: row.id,
    userId: row.userId,
    activationSessionId: row.activationSessionId,
    deviceFingerprint: row.deviceFingerprint,
    deviceName: row.deviceName,
    appVersion: row.appVersion,
    supportsBiometric: row.supportsBiometric,
    pinScryptHash: row.pinScryptHash,
    pinScryptSalt: row.pinScryptSalt,
    pinScryptParams: row.pinScryptParams,
    tokenId: row.tokenId,
    rotationId: row.rotationId,
    refreshTokenHash: row.refreshTokenHash,
    refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    lastRotatedAt: row.lastRotatedAt,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      role: row.userRole,
      zoneId: row.userZoneId,
      isActive: row.userIsActive,
    },
  };
};

export const createDeviceSessionRepository = (): DeviceSessionRepository => {
  return {
    async createDeviceSession(client, input) {
      const query = `
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
          ip_address,
          user_agent,
          last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING
          id,
          user_id AS "userId",
          activation_session_id AS "activationSessionId",
          device_fingerprint AS "deviceFingerprint",
          device_name AS "deviceName",
          app_version AS "appVersion",
          supports_biometric AS "supportsBiometric",
          pin_scrypt_hash AS "pinScryptHash",
          pin_scrypt_salt AS "pinScryptSalt",
          pin_scrypt_params AS "pinScryptParams",
          token_id AS "tokenId",
          rotation_id AS "rotationId",
          refresh_token_hash AS "refreshTokenHash",
          refresh_token_expires_at AS "refreshTokenExpiresAt",
          last_rotated_at AS "lastRotatedAt",
          revoked_at AS "revokedAt",
          revoked_reason AS "revokedReason",
          ip_address AS "ipAddress",
          user_agent AS "userAgent",
          last_seen_at AS "lastSeenAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

      const deviceSessionId = input.id ?? randomUUID();

      const result = await client.query<DeviceSessionRecord>(query, [
        deviceSessionId,
        input.userId,
        input.activationSessionId,
        input.deviceFingerprint,
        input.deviceName,
        input.appVersion ?? null,
        input.supportsBiometric,
        input.pinScryptHash,
        input.pinScryptSalt,
        input.pinScryptParams,
        input.tokenId,
        input.rotationId,
        input.refreshTokenHash,
        input.refreshTokenExpiresAt,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.lastSeenAt ?? null,
      ]);

      return result.rows[0];
    },

    async findActiveByFingerprint(client, deviceFingerprint) {
      const query = `
        SELECT
          id,
          user_id AS "userId",
          activation_session_id AS "activationSessionId",
          device_fingerprint AS "deviceFingerprint",
          device_name AS "deviceName",
          app_version AS "appVersion",
          supports_biometric AS "supportsBiometric",
          pin_scrypt_hash AS "pinScryptHash",
          pin_scrypt_salt AS "pinScryptSalt",
          pin_scrypt_params AS "pinScryptParams",
          token_id AS "tokenId",
          rotation_id AS "rotationId",
          refresh_token_hash AS "refreshTokenHash",
          refresh_token_expires_at AS "refreshTokenExpiresAt",
          last_rotated_at AS "lastRotatedAt",
          revoked_at AS "revokedAt",
          revoked_reason AS "revokedReason",
          ip_address AS "ipAddress",
          user_agent AS "userAgent",
          last_seen_at AS "lastSeenAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM device_sessions
        WHERE device_fingerprint = $1
          AND revoked_at IS NULL
        LIMIT 1
      `;

      const result = await client.query<DeviceSessionRecord>(query, [deviceFingerprint]);
      return result.rows[0] ?? null;
    },

    async findByIdWithUser(client, deviceSessionId, options = {}) {
      const lock = options.lock ? 'FOR UPDATE' : '';
      const query = `
        SELECT
          ds.id,
          ds.user_id AS "userId",
          ds.activation_session_id AS "activationSessionId",
          ds.device_fingerprint AS "deviceFingerprint",
          ds.device_name AS "deviceName",
          ds.app_version AS "appVersion",
          ds.supports_biometric AS "supportsBiometric",
          ds.pin_scrypt_hash AS "pinScryptHash",
          ds.pin_scrypt_salt AS "pinScryptSalt",
          ds.pin_scrypt_params AS "pinScryptParams",
          ds.token_id AS "tokenId",
          ds.rotation_id AS "rotationId",
          ds.refresh_token_hash AS "refreshTokenHash",
          ds.refresh_token_expires_at AS "refreshTokenExpiresAt",
          ds.last_rotated_at AS "lastRotatedAt",
          ds.revoked_at AS "revokedAt",
          ds.revoked_reason AS "revokedReason",
          ds.ip_address AS "ipAddress",
          ds.user_agent AS "userAgent",
          ds.last_seen_at AS "lastSeenAt",
          ds.created_at AS "createdAt",
          ds.updated_at AS "updatedAt",
          u.role AS "userRole",
          u.zone_id AS "userZoneId",
          u.is_active AS "userIsActive"
        FROM device_sessions ds
        INNER JOIN users u ON u.id = ds.user_id
        WHERE ds.id = $1
        ${lock}
      `;

      const result = await client.query<DeviceSessionRow>(query, [deviceSessionId]);

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return mapDeviceSession(row);
    },

    async rotateDeviceSession(client, input) {
      const query = `
        UPDATE device_sessions
        SET
          token_id = $2,
          rotation_id = $3,
          refresh_token_hash = $4,
          refresh_token_expires_at = $5,
          last_rotated_at = $6,
          updated_at = NOW()
        WHERE id = $1
      `;

      await client.query(query, [
        input.deviceSessionId,
        input.tokenId,
        input.rotationId,
        input.refreshTokenHash,
        input.refreshTokenExpiresAt,
        input.rotatedAt,
      ]);
    },

    async revokeDeviceSession(client, input) {
      const query = `
        UPDATE device_sessions
        SET
          revoked_at = $2,
          revoked_reason = $3,
          updated_at = NOW()
        WHERE id = $1
      `;

      await client.query(query, [input.deviceSessionId, input.revokedAt, input.reason ?? null]);
    },

    async touchDeviceSession(client, deviceSessionId, seenAt) {
      const query = `
        UPDATE device_sessions
        SET
          last_seen_at = $2,
          updated_at = NOW()
        WHERE id = $1
      `;

      await client.query(query, [deviceSessionId, seenAt]);
    },
  };
};
