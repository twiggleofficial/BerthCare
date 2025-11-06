exports.up = (pgm) => {
  pgm.createTable('device_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    activation_session_id: {
      type: 'uuid',
      notNull: true,
      references: '"auth_activation_sessions"',
      onDelete: 'CASCADE',
    },
    device_fingerprint: { type: 'varchar(255)', notNull: true },
    device_name: { type: 'varchar(255)', notNull: true },
    app_version: { type: 'varchar(50)' },
    supports_biometric: { type: 'boolean', notNull: true, default: false },
    pin_scrypt_hash: { type: 'text', notNull: true },
    pin_scrypt_salt: { type: 'varchar(64)', notNull: true },
    pin_scrypt_params: { type: 'varchar(100)', notNull: true },
    token_id: { type: 'uuid', notNull: true },
    rotation_id: { type: 'uuid', notNull: true },
    refresh_token_hash: { type: 'varchar(128)', notNull: true },
    refresh_token_expires_at: { type: 'timestamptz', notNull: true },
    last_rotated_at: { type: 'timestamptz' },
    revoked_at: { type: 'timestamptz' },
    revoked_reason: { type: 'text' },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    last_seen_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('device_sessions', 'user_id');
  pgm.createIndex('device_sessions', 'activation_session_id', {
    unique: true,
    name: 'idx_device_sessions_activation_session_id',
  });
  pgm.createIndex('device_sessions', 'token_id', {
    unique: true,
    name: 'idx_device_sessions_token_id',
  });
  pgm.createIndex('device_sessions', 'rotation_id', {
    unique: true,
    name: 'idx_device_sessions_rotation_id',
  });
  pgm.createIndex('device_sessions', ['device_fingerprint'], {
    name: 'idx_device_sessions_active_fingerprint',
    unique: true,
    where: 'revoked_at IS NULL',
  });

  pgm.createTrigger('device_sessions', 'device_sessions_set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_updated_at_column',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('device_sessions', 'device_sessions_set_updated_at', {
    ifExists: true,
  });
  pgm.dropIndex('device_sessions', ['device_fingerprint'], {
    name: 'idx_device_sessions_active_fingerprint',
    ifExists: true,
  });
  pgm.dropIndex('device_sessions', 'rotation_id', {
    name: 'idx_device_sessions_rotation_id',
    ifExists: true,
  });
  pgm.dropIndex('device_sessions', 'token_id', {
    name: 'idx_device_sessions_token_id',
    ifExists: true,
  });
  pgm.dropIndex('device_sessions', 'activation_session_id', {
    name: 'idx_device_sessions_activation_session_id',
    ifExists: true,
  });
  pgm.dropTable('device_sessions');
};
