'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.closePool =
  exports.checkDatabaseConnection =
  exports.runWithClient =
  exports.getReadReplicaPool =
  exports.getPool =
    void 0;
const pg_1 = require('pg');
const logger_1 = require('../logger');
const parse_1 = require('libs/utils/parse');
const MAX_POOL_CONNECTIONS = 20;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_DB_HOST = '127.0.0.1';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_NAME = 'berth';
const DEFAULT_DB_USER = 'postgres';
const readEnv = (role, key, fallback) => {
  const candidates =
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
const buildPoolConfig = (role) => {
  var _a, _b, _c, _d, _e, _f;
  const host =
    (_a = readEnv(role, 'HOST', DEFAULT_DB_HOST)) !== null && _a !== void 0 ? _a : DEFAULT_DB_HOST;
  const port = (0, parse_1.parseInteger)(readEnv(role, 'PORT'), DEFAULT_DB_PORT, {
    min: 1,
    max: 65535,
  });
  const database =
    (_b = readEnv(role, 'NAME', DEFAULT_DB_NAME)) !== null && _b !== void 0 ? _b : DEFAULT_DB_NAME;
  const user =
    (_c = readEnv(role, 'USER', DEFAULT_DB_USER)) !== null && _c !== void 0 ? _c : DEFAULT_DB_USER;
  const password = readEnv(role, 'PASSWORD', process.env.DB_PASSWORD);
  const maxConnections = (0, parse_1.parseInteger)(
    readEnv(role, 'POOL_MAX'),
    MAX_POOL_CONNECTIONS,
    {
      min: 1,
      max: MAX_POOL_CONNECTIONS,
    }
  );
  const idleTimeoutMillis = (0, parse_1.parseInteger)(
    readEnv(role, 'IDLE_TIMEOUT_MS'),
    DEFAULT_IDLE_TIMEOUT_MS,
    { min: 1 }
  );
  const connectionTimeoutMillis = (0, parse_1.parseInteger)(
    readEnv(role, 'CONNECTION_TIMEOUT_MS'),
    DEFAULT_CONNECTION_TIMEOUT_MS,
    { min: 1 }
  );
  const applicationNameDefault =
    role === 'read-replica'
      ? `${(_d = process.env.DB_APPLICATION_NAME) !== null && _d !== void 0 ? _d : 'berth-backend'}-read`
      : (_e = process.env.DB_APPLICATION_NAME) !== null && _e !== void 0
        ? _e
        : 'berth-backend';
  const applicationName =
    (_f = readEnv(role, 'APPLICATION_NAME', applicationNameDefault)) !== null && _f !== void 0
      ? _f
      : applicationNameDefault;
  const sslEnabled = readEnv(role, 'USE_SSL') === 'true';
  const rejectUnauthorized = readEnv(role, 'SSL_REJECT_UNAUTHORIZED') !== 'false';
  const config = {
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
const attachPoolLogging = (pool, role) => {
  pool.on('error', (error) => {
    logger_1.logger.error(`Unexpected PostgreSQL client error (${role})`, {
      message: error.message,
      stack: error.stack,
    });
  });
};
const primaryPool = new pg_1.Pool(buildPoolConfig('primary'));
attachPoolLogging(primaryPool, 'primary');
let readReplicaPool;
const shouldInitialiseReadReplica = () =>
  Boolean(
    process.env.DB_REPLICA_HOST || process.env.DB_REPLICA_NAME || process.env.DB_REPLICA_USER
  );
if (shouldInitialiseReadReplica()) {
  try {
    readReplicaPool = new pg_1.Pool(buildPoolConfig('read-replica'));
    attachPoolLogging(readReplicaPool, 'read-replica');
    logger_1.logger.info('Read replica pool initialised');
  } catch (error) {
    const err = error;
    logger_1.logger.warn(
      'Failed to initialise read replica pool, falling back to primary for reads',
      {
        message: err.message,
      }
    );
    readReplicaPool = undefined;
  }
} else {
  logger_1.logger.info(
    'Read replica pool not configured; primary pool will handle read operations'
  );
}
const getPool = () => primaryPool;
exports.getPool = getPool;
const getReadReplicaPool = () => readReplicaPool;
exports.getReadReplicaPool = getReadReplicaPool;
const runWithClient = async (callback, options = {}) => {
  const pool = options.useReadReplica && readReplicaPool ? readReplicaPool : primaryPool;
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
};
exports.runWithClient = runWithClient;
const measureHealth = async (pool) => {
  const start = process.hrtime.bigint();
  try {
    await pool.query('SELECT 1');
    const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
    return {
      healthy: true,
      latencyMs: Number(durationMs.toFixed(3)),
    };
  } catch (error) {
    const err = error;
    logger_1.logger.warn('Database health check failed', {
      message: err.message,
    });
    return {
      healthy: false,
      error: err.message,
    };
  }
};
const checkDatabaseConnection = async () => {
  var _a;
  const primaryHealth = await measureHealth(primaryPool);
  const replicaHealth = readReplicaPool ? await measureHealth(readReplicaPool) : undefined;
  return {
    healthy:
      primaryHealth.healthy &&
      ((_a =
        replicaHealth === null || replicaHealth === void 0 ? void 0 : replicaHealth.healthy) !==
        null && _a !== void 0
        ? _a
        : true),
    nodes: {
      primary: primaryHealth,
      ...(replicaHealth ? { readReplica: replicaHealth } : {}),
    },
  };
};
exports.checkDatabaseConnection = checkDatabaseConnection;
const closePool = async () => {
  const closePromises = [primaryPool.end()];
  if (readReplicaPool) {
    closePromises.push(readReplicaPool.end());
  }
  await Promise.all(closePromises);
};
exports.closePool = closePool;
