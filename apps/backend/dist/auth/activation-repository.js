import { randomUUID } from 'node:crypto';
export const createActivationRepository = () => {
    return {
        async findUserByEmail(client, email) {
            const query = `
        SELECT 
          id,
          email,
          activation_code_hash AS "activationCodeHash",
          activation_expires_at AS "activationExpiresAt",
          first_name AS "firstName",
          last_name AS "lastName",
          role,
          zone_id AS "zoneId",
          is_active AS "isActive"
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `;
            const result = await client.query(query, [email]);
            return result.rows[0] ?? null;
        },
        async countRecentAttempts(client, email, deviceFingerprint, windowMinutes) {
            const query = `
        SELECT COUNT(*)::int AS attempts
        FROM auth_activation_attempts
        WHERE email = $1
          AND device_fingerprint = $2
          AND created_at >= NOW() - ($3::text || ' minutes')::interval
      `;
            const result = await client.query(query, [
                email,
                deviceFingerprint,
                windowMinutes,
            ]);
            return result.rows[0]?.attempts ?? 0;
        },
        async recordAttempt(client, record) {
            const attemptId = randomUUID();
            const query = `
        INSERT INTO auth_activation_attempts (
          id,
          user_id,
          email,
          device_fingerprint,
          app_version,
          ip_address,
          user_agent,
          detail,
          outcome,
          success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
            await client.query(query, [
                attemptId,
                record.userId,
                record.email,
                record.deviceFingerprint,
                record.appVersion ?? null,
                record.ipAddress ?? null,
                record.userAgent ?? null,
                record.detail ?? null,
                record.outcome,
                record.success,
            ]);
        },
        async hasActiveSession(client, userId, deviceFingerprint) {
            const query = `
        SELECT 1
        FROM auth_activation_sessions
        WHERE user_id = $1
          AND device_fingerprint = $2
          AND completed_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `;
            const result = await client.query(query, [userId, deviceFingerprint]);
            return (result.rowCount ?? 0) > 0;
        },
        async revokePendingSessions(client, userId, deviceFingerprint) {
            const query = `
        UPDATE auth_activation_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND device_fingerprint = $2
          AND completed_at IS NULL
          AND revoked_at IS NULL
      `;
            await client.query(query, [userId, deviceFingerprint]);
        },
        async createActivationSession(client, record) {
            const query = `
        INSERT INTO auth_activation_sessions (
          user_id,
          activation_token_hash,
          device_fingerprint,
          app_version,
          ip_address,
          user_agent,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
            await client.query(query, [
                record.userId,
                record.activationTokenHash,
                record.deviceFingerprint,
                record.appVersion ?? null,
                record.ipAddress ?? null,
                record.userAgent ?? null,
                record.expiresAt,
            ]);
        },
        async findActivationSessionByTokenHash(client, activationTokenHash) {
            const query = `
        SELECT
          s.id,
          s.user_id AS "userId",
          s.activation_token_hash AS "activationTokenHash",
          s.device_fingerprint AS "deviceFingerprint",
          s.app_version AS "appVersion",
          s.ip_address AS "ipAddress",
          s.user_agent AS "userAgent",
          s.expires_at AS "expiresAt",
          s.completed_at AS "completedAt",
          s.revoked_at AS "revokedAt",
          u.email AS "userEmail",
          u.activation_code_hash AS "userActivationCodeHash",
          u.activation_expires_at AS "userActivationExpiresAt",
          u.first_name AS "userFirstName",
          u.last_name AS "userLastName",
          u.role AS "userRole",
          u.zone_id AS "userZoneId",
          u.is_active AS "userIsActive"
        FROM auth_activation_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.activation_token_hash = $1
        LIMIT 1
      `;
            const result = await client.query(query, [activationTokenHash]);
            const row = result.rows[0];
            if (!row) {
                return null;
            }
            const user = {
                id: row.userId,
                email: row.userEmail,
                activationCodeHash: row.userActivationCodeHash,
                activationExpiresAt: row.userActivationExpiresAt,
                firstName: row.userFirstName,
                lastName: row.userLastName,
                role: row.userRole,
                zoneId: row.userZoneId,
                isActive: row.userIsActive,
            };
            return {
                id: row.id,
                userId: row.userId,
                activationTokenHash: row.activationTokenHash,
                deviceFingerprint: row.deviceFingerprint,
                appVersion: row.appVersion,
                ipAddress: row.ipAddress,
                userAgent: row.userAgent,
                expiresAt: row.expiresAt,
                completedAt: row.completedAt,
                revokedAt: row.revokedAt,
                user,
            };
        },
        async completeActivationSession(client, sessionId, completedAt) {
            const query = `
        UPDATE auth_activation_sessions
        SET completed_at = $2, updated_at = NOW()
        WHERE id = $1
      `;
            await client.query(query, [sessionId, completedAt]);
        },
    };
};
