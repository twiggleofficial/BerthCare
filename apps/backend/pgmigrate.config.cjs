const path = require('path');

const resolveDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER ?? 'berthcare';
  const password = process.env.POSTGRES_PASSWORD ?? 'berthcare';
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DB ?? 'berthcare_dev';

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
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
