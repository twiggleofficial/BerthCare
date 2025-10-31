import type { PoolClient, PoolConfig } from 'pg';
import { Pool } from 'pg';

import { logger } from '../logger';
import { parseInteger } from 'libs/utils/parse';

const MAX_POOL_CONNECTIONS = 20;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5_000;
const DEFAULT_DB_HOST = '127.0.0.1';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_NAME = 'berth';
const DEFAULT_DB_USER = 'postgres';

type PoolRole = 'primary' | 'read-replica';

type HealthCheckDetails = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
};

export type DatabaseHealth = {
  healthy: boolean;
  nodes: {
    primary: HealthCheckDetails;
    readReplica?: HealthCheckDetails;
  };
};

const readEnv = (role: PoolRole, key: string, fallback?: string): string | undefined => {
  const candidates: string[] =
    role === 'primary'
      ? [`DB_${key}`, `DATABASE_${key}`]
      : [`DB_REPLICA_${key}`, `DB_${key}`, `DATABASE_${key}`];

  for (const candidate of candidates) {
    if (process.env[candidate] !== undefined) {
      return process.env[candidate];
    }
  }

  return fallback;
};

const buildPoolConfig = (role: PoolRole): PoolConfig => {
  const host = readEnv(role, 'HOST', DEFAULT_DB_HOST) ?? DEFAULT_DB_HOST;
  const port = parseInteger(readEnv(role, 'PORT'), DEFAULT_DB_PORT, { min: 1, max: 65_535 });
  const database = readEnv(role, 'NAME', DEFAULT_DB_NAME) ?? DEFAULT_DB_NAME;
  const user = readEnv(role, 'USER', DEFAULT_DB_USER) ?? DEFAULT_DB_USER;
  const password = readEnv(role, 'PASSWORD', process.env.DB_PASSWORD);
  const maxConnections = parseInteger(readEnv(role, 'POOL_MAX'), MAX_POOL_CONNECTIONS, {
    min: 1,
    max: MAX_POOL_CONNECTIONS,
  });
  const idleTimeoutMillis = parseInteger(
    readEnv(role, 'IDLE_TIMEOUT_MS'),
    DEFAULT_IDLE_TIMEOUT_MS,
    { min: 1 }
  );
  const connectionTimeoutMillis = parseInteger(
    readEnv(role, 'CONNECTION_TIMEOUT_MS'),
    DEFAULT_CONNECTION_TIMEOUT_MS,
    { min: 1 }
  );
  const applicationNameDefault =
    role === 'read-replica'
      ? `${process.env.DB_APPLICATION_NAME ?? 'berth-backend'}-read`
      : (process.env.DB_APPLICATION_NAME ?? 'berth-backend');
  const applicationName =
    readEnv(role, 'APPLICATION_NAME', applicationNameDefault) ?? applicationNameDefault;
  const sslEnabled = readEnv(role, 'USE_SSL') === 'true';
  const rejectUnauthorized = readEnv(role, 'SSL_REJECT_UNAUTHORIZED') !== 'false';

  const config: PoolConfig = {
    host,
    port,
    database,
    user,
    password,
    max: maxConnections,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    application_name: applicationName,
  };

  if (sslEnabled) {
    config.ssl = {
      rejectUnauthorized,
    };
  }

  return config;
};

const attachPoolLogging = (pool: Pool, role: PoolRole): void => {
  pool.on('error', (error: Error) => {
    logger.error(`Unexpected PostgreSQL client error (${role})`, {
      message: error.message,
      stack: error.stack,
    });
  });
};

const primaryPool = new Pool(buildPoolConfig('primary'));
attachPoolLogging(primaryPool, 'primary');

let readReplicaPool: Pool | undefined;

const shouldInitialiseReadReplica = (): boolean =>
  Boolean(
    process.env.DB_REPLICA_HOST || process.env.DB_REPLICA_NAME || process.env.DB_REPLICA_USER
  );

if (shouldInitialiseReadReplica()) {
  try {
    readReplicaPool = new Pool(buildPoolConfig('read-replica'));
    attachPoolLogging(readReplicaPool, 'read-replica');
    logger.info('Read replica pool initialised');
  } catch (error) {
    const err = error as Error;
    logger.warn('Failed to initialise read replica pool, falling back to primary for reads', {
      message: err.message,
    });
    readReplicaPool = undefined;
  }
} else {
  logger.info('Read replica pool not configured; primary pool will handle read operations');
}

export const getPool = (): Pool => primaryPool;

export const getReadReplicaPool = (): Pool | undefined => readReplicaPool;

export const runWithClient = async <T>(
  callback: (client: PoolClient) => Promise<T>,
  options: { useReadReplica?: boolean } = {}
): Promise<T> => {
  const pool = options.useReadReplica && readReplicaPool ? readReplicaPool : primaryPool;
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

const measureHealth = async (pool: Pool): Promise<HealthCheckDetails> => {
  const start = process.hrtime.bigint();

  try {
    await pool.query('SELECT 1');
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    return {
      healthy: true,
      latencyMs: Number(durationMs.toFixed(3)),
    };
  } catch (error) {
    const err = error as Error;

    logger.warn('Database health check failed', {
      message: err.message,
    });

    return {
      healthy: false,
      error: err.message,
    };
  }
};

export const checkDatabaseConnection = async (): Promise<DatabaseHealth> => {
  const primaryHealth = await measureHealth(primaryPool);
  const replicaHealth = readReplicaPool ? await measureHealth(readReplicaPool) : undefined;

  return {
    healthy: primaryHealth.healthy && (replicaHealth?.healthy ?? true),
    nodes: {
      primary: primaryHealth,
      ...(replicaHealth ? { readReplica: replicaHealth } : {}),
    },
  };
};

export const closePool = async (): Promise<void> => {
  await primaryPool.end();

  if (readReplicaPool) {
    await readReplicaPool.end();
  }
};
