/**
 * @jest-environment node
 */

type MockPool = {
  config: Record<string, unknown>;
  on: jest.Mock;
  connect: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
  client: { release: jest.Mock };
};

const mockPools: MockPool[] = [];
let PoolConstructor: jest.Mock;
let poolFactory: (config: Record<string, unknown>) => MockPool = (config) =>
  createMockPool(config);

const createMockPool = (config: Record<string, unknown>): MockPool => {
  const client = {
    release: jest.fn(),
  };

  const pool: MockPool = {
    config,
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(client),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
    client,
  };

  mockPools.push(pool);
  return pool;
};

jest.mock('pg', () => {
  PoolConstructor = jest.fn().mockImplementation((config: Record<string, unknown>) =>
    poolFactory(config)
  );

  return { Pool: PoolConstructor };
});

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../logger', () => ({
  logger,
}));

const originalEnv = { ...process.env };

const loadPoolModule = () => {
  let poolModule: typeof import('./pool');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- used for dynamic require in test isolation to reset module state
    poolModule = require('./pool');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return poolModule!;
};

const resetEnv = () => {
  process.env = { ...originalEnv };

  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;
  delete process.env.DB_POOL_MAX;
  delete process.env.DB_IDLE_TIMEOUT_MS;
  delete process.env.DB_CONNECTION_TIMEOUT_MS;
  delete process.env.DB_APPLICATION_NAME;
  delete process.env.DATABASE_HOST;
  delete process.env.DATABASE_NAME;
  delete process.env.DB_REPLICA_HOST;
  delete process.env.DB_REPLICA_NAME;
  delete process.env.DB_REPLICA_USER;
  delete process.env.DB_REPLICA_PASSWORD;
  delete process.env.DB_REPLICA_POOL_MAX;
  delete process.env.DB_REPLICA_USE_SSL;
  delete process.env.DB_REPLICA_SSL_REJECT_UNAUTHORIZED;
  delete process.env.DB_REPLICA_APPLICATION_NAME;
  delete process.env.DB_USE_SSL;
  delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockPools.length = 0;
  poolFactory = (config) => createMockPool(config);
  resetEnv();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('database pool', () => {
  it('creates primary pool with sensible defaults', () => {
    const { getPool } = loadPoolModule();

    const pool = getPool();
    expect(pool).toBe(mockPools[0]);
    expect(PoolConstructor).toHaveBeenCalledTimes(1);

    const config = mockPools[0].config;
    expect(config).toMatchObject({
      host: '127.0.0.1',
      port: 5432,
      database: 'berth',
      user: 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      application_name: 'berth-backend',
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Read replica pool not configured; primary pool will handle read operations'
    );
  });

  it('prefers DATABASE_ environment fallbacks', () => {
    process.env.DATABASE_HOST = '192.168.0.10';
    process.env.DATABASE_NAME = 'berthcare_db';
    process.env.DB_USER = 'berthcare_user';
    const { getPool } = loadPoolModule();

    getPool();
    const config = mockPools[0].config;

    expect(config.host).toBe('192.168.0.10');
    expect(config.database).toBe('berthcare_db');
    expect(config.user).toBe('berthcare_user');
  });

  it('initialises read replica when configuration is provided', () => {
    process.env.DB_APPLICATION_NAME = 'berth-api';
    process.env.DB_REPLICA_HOST = 'replica.local';
    process.env.DB_REPLICA_NAME = 'berth_replica';
    process.env.DB_REPLICA_USER = 'replica_user';
    process.env.DB_REPLICA_PASSWORD = 'secret';
    process.env.DB_REPLICA_POOL_MAX = '4';
    process.env.DB_REPLICA_USE_SSL = 'true';
    process.env.DB_REPLICA_SSL_REJECT_UNAUTHORIZED = 'false';
    const { getPool, getReadReplicaPool } = loadPoolModule();

    const primary = getPool();
    const replica = getReadReplicaPool();

    expect(primary).toBe(mockPools[0]);
    expect(replica).toBe(mockPools[1]);
    expect(PoolConstructor).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('Read replica pool initialised');

    const replicaConfig = mockPools[1].config;
    expect(replicaConfig).toMatchObject({
      host: 'replica.local',
      database: 'berth_replica',
      user: 'replica_user',
      password: 'secret',
      max: 4,
      application_name: 'berth-api',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('falls back to the primary pool when replica initialisation fails', () => {
    let invocation = 0;
    poolFactory = (config) => {
      invocation += 1;
      if (invocation === 1) {
        return createMockPool(config);
      }

      throw new Error('replica failure');
    };

    process.env.DB_REPLICA_HOST = 'replica.local';
    const { getReadReplicaPool } = loadPoolModule();

    expect(getReadReplicaPool()).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to initialise read replica pool, falling back to primary for reads',
      { message: 'replica failure' }
    );
  });

  it('runs callbacks with appropriate pool based on replica usage', async () => {
    process.env.DB_REPLICA_HOST = 'replica.local';
    process.env.DB_REPLICA_NAME = 'berth_replica';
    const { runWithClient } = loadPoolModule();

    const result = await runWithClient(async (client) => {
      expect(client).toBe(mockPools[1].client);
      return 'ok';
    }, { useReadReplica: true });

    expect(result).toBe('ok');
    expect(mockPools[1].connect).toHaveBeenCalledTimes(1);
    expect(mockPools[1].client.release).toHaveBeenCalledTimes(1);
  });

  it('runs callbacks against primary when replica is unavailable', async () => {
    const { runWithClient } = loadPoolModule();

    const result = await runWithClient(async (client) => {
      expect(client).toBe(mockPools[0].client);
      return 42;
    }, { useReadReplica: true });

    expect(result).toBe(42);
    expect(mockPools[0].connect).toHaveBeenCalledTimes(1);
    expect(mockPools[0].client.release).toHaveBeenCalledTimes(1);
  });

  it('reports database health and aggregates replica status', async () => {
    process.env.DB_REPLICA_HOST = 'replica.local';
    process.env.DB_REPLICA_NAME = 'berth_replica';
    const { checkDatabaseConnection } = loadPoolModule();

    const result = await checkDatabaseConnection();

    expect(result.healthy).toBe(true);
    expect(result.nodes.primary.healthy).toBe(true);
    expect(result.nodes.readReplica?.healthy).toBe(true);
    expect(mockPools[0].query).toHaveBeenCalledWith('SELECT 1');
    expect(mockPools[1].query).toHaveBeenCalledWith('SELECT 1');
  });

  it('marks health as degraded when a query fails', async () => {
    const { checkDatabaseConnection } = loadPoolModule();
    mockPools[0].query.mockRejectedValueOnce(new Error('db down'));

    const result = await checkDatabaseConnection();

    expect(result.healthy).toBe(false);
    expect(result.nodes.primary.healthy).toBe(false);
    expect(result.nodes.primary.error).toBe('db down');
    expect(logger.warn).toHaveBeenCalledWith('Database health check failed', {
      message: 'db down',
    });
  });

  it('closes all pools when requested', async () => {
    process.env.DB_REPLICA_HOST = 'replica.local';
    process.env.DB_REPLICA_NAME = 'berth_replica';
    const { closePool } = loadPoolModule();

    await closePool();

    expect(mockPools[0].end).toHaveBeenCalledTimes(1);
    expect(mockPools[1].end).toHaveBeenCalledTimes(1);
  });
});
