const path = require('path');
const { URL } = require('url');

const resolveDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER ?? 'berthcare';
  const password = process.env.POSTGRES_PASSWORD ?? 'berthcare';
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DB ?? 'berthcare_dev';

  const url = new URL('postgres://localhost');
  url.username = user;
  url.password = password;
  url.hostname = host;
  if (port) {
    url.port = String(port);
  }
  url.pathname = `/${database}`;

  return url.toString();
};

module.exports = {
  migrationFileLanguage: 'cjs',
  migrationsTable: 'schema_migrations',
  dir: path.join(__dirname, 'migrations'),
  url: resolveDatabaseUrl(),
  columnDefaults: {
    timestamps: false,
  },
};
