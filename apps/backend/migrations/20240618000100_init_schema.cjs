const tablesWithUpdatedAt = [
  'zones',
  'users',
  'clients',
  'emergency_contacts',
  'medications',
  'visits',
  'visit_documentation',
  'photos',
  'alerts',
  'alert_recipients',
  'sync_log',
];

const createUpdatedAtTriggers = (pgm) => {
  tablesWithUpdatedAt.forEach((table) => {
    pgm.createTrigger(table, `${table}_set_updated_at`, {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column',
    });
  });
};

const dropUpdatedAtTriggers = (pgm) => {
  tablesWithUpdatedAt.forEach((table) => {
    pgm.dropTrigger(table, `${table}_set_updated_at`, { ifExists: true });
  });
};

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  pgm.createExtension('cube', { ifNotExists: true });
  pgm.createExtension('earthdistance', { ifNotExists: true });

  pgm.createFunction(
    'update_updated_at_column',
    [],
    { returns: 'TRIGGER', language: 'plpgsql' },
    `
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
  `
  );

  pgm.createType('user_role', ['caregiver', 'coordinator', 'admin', 'family']);
  pgm.createType('visit_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);
  pgm.createType('alert_urgency', ['low', 'medium', 'high', 'critical']);
  pgm.createType('sync_operation', ['create', 'update', 'delete']);

  pgm.createTable('zones', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    timezone: { type: 'varchar(100)', notNull: false },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('zones', 'zones_code_unique', { unique: ['code'] });
  pgm.createIndex('zones', 'is_active', { where: 'is_active = true' });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true },
    password_hash: { type: 'varchar(255)' },
    activation_code_hash: { type: 'varchar(255)' },
    activation_expires_at: { type: 'timestamptz' },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    role: { type: 'user_role', notNull: true },
    zone_id: { type: 'uuid', references: '"zones"', onDelete: 'SET NULL' },
    phone: { type: 'varchar(20)' },
    is_active: { type: 'boolean', notNull: true, default: true },
    last_login_at: { type: 'timestamptz' },
    last_activation_at: { type: 'timestamptz' },
    device_limit: { type: 'smallint', notNull: true, default: 1 },
    mfa_secret: { type: 'varchar(64)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('users', 'users_email_unique', { unique: ['email'] });
  pgm.addConstraint('users', 'users_role_credentials_check', {
    check: `
      (
        role IN ('admin', 'coordinator') AND password_hash IS NOT NULL
      ) OR (
        role = 'caregiver' AND activation_code_hash IS NOT NULL
      ) OR (
        role = 'family'
      )
    `,
  });
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'zone_id');
  pgm.createIndex('users', 'role');
  pgm.createIndex('users', 'is_active', { where: 'is_active = true' });
  pgm.createIndex('users', 'activation_expires_at', {
    where: 'activation_expires_at IS NOT NULL',
  });

  pgm.createTable('clients', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    date_of_birth: { type: 'date', notNull: true },
    address: { type: 'text', notNull: true },
    latitude: { type: 'numeric(10,8)' },
    longitude: { type: 'numeric(11,8)' },
    phone: { type: 'varchar(20)' },
    zone_id: { type: 'uuid', notNull: true, references: '"zones"', onDelete: 'RESTRICT' },
    care_plan_summary: { type: 'text' },
    allergies: { type: 'text[]' },
    special_instructions: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('clients', 'clients_latitude_range_check', {
    check: '(latitude IS NULL OR (latitude >= -90 AND latitude <= 90))',
  });
  pgm.addConstraint('clients', 'clients_longitude_range_check', {
    check: '(longitude IS NULL OR (longitude >= -180 AND longitude <= 180))',
  });
  pgm.createIndex('clients', ['last_name', 'first_name']);
  pgm.createIndex('clients', 'zone_id');
  pgm.sql(`
    CREATE INDEX idx_clients_location ON clients USING GIST (
      ll_to_earth(latitude, longitude)
    )
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `);
  pgm.createIndex('clients', 'is_active', { where: 'is_active = true' });

  pgm.createTable('emergency_contacts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: {
      type: 'uuid',
      notNull: true,
      references: '"clients"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(100)', notNull: true },
    relationship: { type: 'varchar(50)' },
    phone: { type: 'varchar(20)', notNull: true },
    is_primary: { type: 'boolean', notNull: true, default: false },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('emergency_contacts', 'client_id');
  pgm.createIndex('emergency_contacts', 'is_active', { where: 'is_active = true' });

  pgm.createTable('medications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: {
      type: 'uuid',
      notNull: true,
      references: '"clients"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(200)', notNull: true },
    dosage: { type: 'varchar(100)' },
    frequency: { type: 'varchar(100)' },
    instructions: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('medications', 'client_id');
  pgm.createIndex('medications', 'is_active', { where: 'is_active = true' });

  pgm.createTable('visits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: {
      type: 'uuid',
      notNull: true,
      references: '"clients"',
      onDelete: 'CASCADE',
    },
    staff_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
    scheduled_start_time: { type: 'timestamptz', notNull: true },
    check_in_time: { type: 'timestamptz' },
    check_in_latitude: { type: 'numeric(10,8)' },
    check_in_longitude: { type: 'numeric(11,8)' },
    check_out_time: { type: 'timestamptz' },
    check_out_latitude: { type: 'numeric(10,8)' },
    check_out_longitude: { type: 'numeric(11,8)' },
    duration_minutes: { type: 'integer' },
    status: { type: 'visit_status', notNull: true, default: 'scheduled' },
    copied_from_visit_id: { type: 'uuid', references: '"visits"', onDelete: 'SET NULL' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('visits', 'visits_duration_positive', {
    check: '(duration_minutes IS NULL OR duration_minutes >= 0)',
  });
  pgm.addConstraint('visits', 'visits_checkout_after_checkin', {
    check: '(check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time)',
  });
  pgm.createIndex('visits', 'client_id');
  pgm.createIndex('visits', 'staff_id');
  pgm.createIndex('visits', 'scheduled_start_time');
  pgm.createIndex('visits', 'status');
  pgm.createIndex('visits', 'is_active', { where: 'is_active = true' });

  pgm.createTable('visit_documentation', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    visit_id: {
      type: 'uuid',
      notNull: true,
      references: '"visits"',
      onDelete: 'CASCADE',
    },
    vital_signs: { type: 'jsonb' },
    activities: { type: 'jsonb' },
    observations: { type: 'text' },
    concerns: { type: 'text' },
    signature_url: { type: 'varchar(500)' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('visit_documentation', 'visit_id');
  pgm.createIndex('visit_documentation', 'vital_signs', {
    name: 'idx_visit_documentation_vital_signs',
    method: 'gin',
  });
  pgm.createIndex('visit_documentation', 'is_active', { where: 'is_active = true' });

  pgm.createTable('photos', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    visit_id: {
      type: 'uuid',
      notNull: true,
      references: '"visits"',
      onDelete: 'CASCADE',
    },
    s3_key: { type: 'varchar(500)', notNull: true },
    file_name: { type: 'varchar(255)' },
    file_size: { type: 'integer' },
    mime_type: { type: 'varchar(100)' },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('photos', 'photos_file_size_non_negative', {
    check: '(file_size IS NULL OR file_size >= 0)',
  });
  pgm.createIndex('photos', 'visit_id');
  pgm.createIndex('photos', 'is_active', { where: 'is_active = true' });

  pgm.createTable('alerts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'uuid', references: '"clients"', onDelete: 'SET NULL' },
    created_by_user_id: { type: 'uuid', references: '"users"', onDelete: 'SET NULL' },
    urgency: { type: 'alert_urgency', notNull: true },
    category: { type: 'varchar(50)', notNull: true },
    message: { type: 'text', notNull: true },
    resolved_at: { type: 'timestamptz' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('alerts', 'client_id');
  pgm.createIndex('alerts', 'created_at', {
    name: 'idx_alerts_created_at_desc',
    order: 'DESC',
  });
  pgm.createIndex('alerts', 'urgency');
  pgm.createIndex('alerts', 'is_active', { where: 'is_active = true' });

  pgm.createTable('alert_recipients', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    alert_id: {
      type: 'uuid',
      notNull: true,
      references: '"alerts"',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
    read_at: { type: 'timestamptz' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('alert_recipients', 'alert_recipients_unique_recipient', {
    unique: ['alert_id', 'user_id'],
  });
  pgm.createIndex('alert_recipients', 'alert_id');
  pgm.createIndex('alert_recipients', 'user_id');
  pgm.createIndex('alert_recipients', ['user_id', 'read_at'], {
    name: 'idx_alert_recipients_unread',
    where: 'read_at IS NULL',
  });
  pgm.createIndex('alert_recipients', 'is_active', { where: 'is_active = true' });

  pgm.createTable('sync_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"users"', onDelete: 'SET NULL' },
    device_id: { type: 'varchar(255)' },
    entity_type: { type: 'varchar(50)' },
    entity_id: { type: 'uuid' },
    operation: { type: 'sync_operation', notNull: true },
    sync_timestamp: { type: 'timestamptz', notNull: true },
    client_timestamp: { type: 'timestamptz' },
    conflict_resolved: { type: 'boolean', notNull: true, default: false },
    metadata: { type: 'jsonb' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('sync_log', ['user_id', 'device_id']);
  pgm.createIndex('sync_log', 'sync_timestamp', {
    name: 'idx_sync_log_timestamp_desc',
    order: 'DESC',
  });
  pgm.createIndex('sync_log', 'is_active', { where: 'is_active = true' });

  createUpdatedAtTriggers(pgm);
};

exports.down = (pgm) => {
  dropUpdatedAtTriggers(pgm);

  pgm.dropTable('sync_log');
  pgm.dropTable('alert_recipients');
  pgm.dropTable('alerts');
  pgm.dropTable('photos');
  pgm.dropTable('visit_documentation');
  pgm.dropTable('visits');
  pgm.dropTable('medications');
  pgm.dropTable('emergency_contacts');
  pgm.sql('DROP INDEX IF EXISTS idx_clients_location');
  pgm.dropTable('clients');
  pgm.dropTable('users');
  pgm.dropTable('zones');

  pgm.dropType('sync_operation');
  pgm.dropType('alert_urgency');
  pgm.dropType('visit_status');
  pgm.dropType('user_role');

  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  pgm.dropExtension('earthdistance', { ifExists: true });
  pgm.dropExtension('cube', { ifExists: true });
  pgm.dropExtension('uuid-ossp', { ifExists: true });
  pgm.dropExtension('pgcrypto', { ifExists: true });
};
