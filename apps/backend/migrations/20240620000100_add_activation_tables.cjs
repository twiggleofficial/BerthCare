exports.up = (pgm) => {
  pgm.createTable('auth_activation_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"', onDelete: 'SET NULL' },
    email: { type: 'varchar(255)', notNull: true },
    device_fingerprint: { type: 'varchar(255)', notNull: true },
    app_version: { type: 'varchar(50)' },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    outcome: { type: 'varchar(30)', notNull: true },
    success: { type: 'boolean', notNull: true, default: false },
    detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('auth_activation_attempts', 'auth_activation_attempts_outcome_check', {
    check: `
      outcome IN (
        'invalid_credentials',
        'expired',
        'rate_limited',
        'device_enrolled',
        'success'
      )
    `,
  });

  pgm.createIndex('auth_activation_attempts', ['email', 'created_at'], {
    name: 'idx_auth_activation_attempts_email_created_at',
  });
  pgm.createIndex('auth_activation_attempts', ['device_fingerprint', 'created_at'], {
    name: 'idx_auth_activation_attempts_fp_created_at',
  });

  pgm.createTable('auth_activation_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    activation_token_hash: { type: 'varchar(128)', notNull: true },
    device_fingerprint: { type: 'varchar(255)', notNull: true },
    app_version: { type: 'varchar(50)' },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    expires_at: { type: 'timestamptz', notNull: true },
    completed_at: { type: 'timestamptz' },
    revoked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('auth_activation_sessions', 'user_id');
  pgm.createIndex('auth_activation_sessions', 'expires_at', {
    name: 'idx_auth_activation_sessions_expires_at',
  });
  pgm.createIndex('auth_activation_sessions', 'activation_token_hash', {
    name: 'idx_auth_activation_sessions_token_hash',
  });

  pgm.createIndex('auth_activation_sessions', ['user_id', 'device_fingerprint'], {
    name: 'idx_auth_activation_sessions_active_fp',
    unique: true,
    where: 'completed_at IS NULL AND revoked_at IS NULL AND expires_at > now()',
  });

  pgm.createTrigger('auth_activation_sessions', 'auth_activation_sessions_set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_updated_at_column',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('auth_activation_sessions', 'auth_activation_sessions_set_updated_at', {
    ifExists: true,
  });
  pgm.dropIndex('auth_activation_sessions', ['user_id', 'device_fingerprint'], {
    name: 'idx_auth_activation_sessions_active_fp',
    ifExists: true,
  });
  pgm.dropTable('auth_activation_sessions');
  pgm.dropTable('auth_activation_attempts');
};
