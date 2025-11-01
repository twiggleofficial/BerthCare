const DEFAULT_DB_HOST = '127.0.0.1';
const DEFAULT_DB_PORT = '5432';
const DEFAULT_DB_NAME = 'berth';
const DEFAULT_MIGRATIONS_TABLE = 'schema_migrations';

const buildConnectionString = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.DB_USER ?? 'postgres');
  const passwordRaw = process.env.DB_PASSWORD;
  const password = passwordRaw ? `:${encodeURIComponent(passwordRaw)}` : '';
  const host = process.env.DB_HOST ?? DEFAULT_DB_HOST;
  const port = process.env.DB_PORT ?? DEFAULT_DB_PORT;
  const database = encodeURIComponent(process.env.DB_NAME ?? DEFAULT_DB_NAME);

  const params = [];

  if (process.env.DB_APPLICATION_NAME) {
    params.push(`application_name=${encodeURIComponent(process.env.DB_APPLICATION_NAME)}`);
  }

  if (process.env.DB_USE_SSL === 'true') {
    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
    params.push(`sslmode=${rejectUnauthorized ? 'verify-full' : 'require'}`);
  }

  const searchParams = params.length > 0 ? `?${params.join('&')}` : '';

  return `postgres://${user}${password}@${host}:${port}/${database}${searchParams}`;
};

/** @type {import('node-pg-migrate').RunnerOption} */
const config = {
  dir: 'apps/backend/migrations',
  migrationsTable: process.env.DB_MIGRATIONS_TABLE ?? DEFAULT_MIGRATIONS_TABLE,
  migrationFileLanguage: 'js',
  databaseUrl: buildConnectionString(),
};

if (process.env.DB_SCHEMA) {
  config.schema = process.env.DB_SCHEMA;
}

module.exports = config;
