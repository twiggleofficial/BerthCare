import { randomUUID } from 'node:crypto';
import { DataType, newDb } from 'pg-mem';
export const setupTestDatabase = async () => {
    const db = newDb({
        autoCreateForeignKeyIndices: true,
    });
    db.public.registerFunction({
        name: 'gen_random_uuid',
        returns: DataType.uuid,
        implementation: randomUUID,
    });
    const pgAdapter = db.adapters.createPg();
    const poolConstructor = pgAdapter.Pool;
    const pool = new poolConstructor();
    await pool.query(`
    CREATE TYPE user_role AS ENUM ('caregiver', 'coordinator', 'admin', 'family');
  `);
    await pool.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      email varchar(255) NOT NULL UNIQUE,
      activation_code_hash varchar(255),
      activation_expires_at timestamptz,
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      role user_role NOT NULL,
      zone_id uuid,
      is_active boolean NOT NULL DEFAULT true
    );
  `);
    await pool.query(`
    CREATE TABLE auth_activation_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      email varchar(255) NOT NULL,
      device_fingerprint varchar(255) NOT NULL,
      app_version varchar(50),
      ip_address varchar(64),
      user_agent text,
      detail text,
      outcome varchar(30) NOT NULL,
      success boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
    await pool.query(`
    CREATE TABLE auth_activation_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activation_token_hash varchar(128) NOT NULL,
      device_fingerprint varchar(255) NOT NULL,
      app_version varchar(50),
      ip_address varchar(64),
      user_agent text,
      expires_at timestamptz NOT NULL,
      completed_at timestamptz,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
    await pool.query(`
    CREATE TABLE device_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activation_session_id uuid NOT NULL REFERENCES auth_activation_sessions(id) ON DELETE CASCADE,
      device_fingerprint varchar(255) NOT NULL,
      device_name varchar(255) NOT NULL,
      app_version varchar(50),
      supports_biometric boolean NOT NULL DEFAULT false,
      pin_scrypt_hash text NOT NULL,
      pin_scrypt_salt varchar(64) NOT NULL,
      pin_scrypt_params varchar(100) NOT NULL,
      token_id uuid NOT NULL,
      rotation_id uuid NOT NULL,
      refresh_token_hash varchar(128) NOT NULL,
      refresh_token_expires_at timestamptz NOT NULL,
      last_rotated_at timestamptz,
      revoked_at timestamptz,
      revoked_reason text,
      ip_address varchar(64),
      user_agent text,
      last_seen_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
    await pool.query(`
    CREATE INDEX idx_auth_activation_attempts_email_created_at
      ON auth_activation_attempts (email, created_at);
  `);
    await pool.query(`
    CREATE INDEX idx_auth_activation_attempts_fp_created_at
      ON auth_activation_attempts (device_fingerprint, created_at);
  `);
    await pool.query(`
    CREATE INDEX idx_auth_activation_sessions_user_id
      ON auth_activation_sessions (user_id);
  `);
    await pool.query(`
    CREATE UNIQUE INDEX idx_auth_activation_sessions_active_fp
      ON auth_activation_sessions (user_id, device_fingerprint)
      WHERE completed_at IS NULL AND revoked_at IS NULL AND expires_at > now();
  `);
    await pool.query(`
    CREATE INDEX idx_device_sessions_user_id
      ON device_sessions (user_id);
  `);
    await pool.query(`
    CREATE UNIQUE INDEX idx_device_sessions_activation_session_id
      ON device_sessions (activation_session_id);
  `);
    await pool.query(`
    CREATE UNIQUE INDEX idx_device_sessions_token_id
      ON device_sessions (token_id);
  `);
    await pool.query(`
    CREATE UNIQUE INDEX idx_device_sessions_rotation_id
      ON device_sessions (rotation_id);
  `);
    await pool.query(`
    CREATE UNIQUE INDEX idx_device_sessions_active_fingerprint
      ON device_sessions (device_fingerprint)
      WHERE revoked_at IS NULL;
  `);
    return {
        pool,
        dispose: async () => {
            await pool.end();
        },
    };
};
