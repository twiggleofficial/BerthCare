/**
 * @jest-environment node
 */

import type { Redis as RedisClient } from 'ioredis';

type MockRedisInstance = {
  on: jest.Mock;
  ping: jest.Mock;
  quit: jest.Mock;
};

const mockInstances: MockRedisInstance[] = [];
let RedisConstructor: jest.Mock;

jest.mock('ioredis', () => {
  RedisConstructor = jest.fn().mockImplementation(() => {
    const instance: MockRedisInstance = {
      on: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    mockInstances.push(instance);
    return instance as unknown as RedisClient;
  });

  return {
    __esModule: true,
    default: RedisConstructor,
  };
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../logger', () => ({
  logger,
}));

const originalEnv = { ...process.env };

const loadRedisModule = () => {
  let redisModule: typeof import('./redis');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    redisModule = require('./redis');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return redisModule!;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockInstances.length = 0;
  process.env = { ...originalEnv };
  delete process.env.REDIS_URL;
  delete process.env.REDIS_CACHE_PREFIX;
  delete process.env.REDIS_SESSION_PREFIX;
  delete process.env.REDIS_USE_TLS;
  delete process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
  delete process.env.REDIS_KEEP_ALIVE_MS;
  delete process.env.REDIS_RETRY_BASE_MS;
  delete process.env.REDIS_RETRY_MAX_MS;
  delete process.env.REDIS_MAX_RETRY_ATTEMPTS;
  delete process.env.REDIS_PASSWORD;
  delete process.env.REDIS_PORT;
  delete process.env.REDIS_DB;
  delete process.env.REDIS_MAX_RETRIES_PER_REQUEST;
  delete process.env.REDIS_ENABLE_OFFLINE_QUEUE;
  delete process.env.REDIS_CONNECTION_NAME;
});

afterAll(() => {
  process.env = originalEnv;
});

describe('redis connections', () => {
  it('creates clients lazily and reuses the same instance', () => {
    const { getRedisClient } = loadRedisModule();

    const first = getRedisClient();
    const second = getRedisClient();

    expect(first).toBe(second);
    expect(RedisConstructor).toHaveBeenCalledTimes(1);
  });

  it('applies configured prefixes for cache and session clients', () => {
    process.env.REDIS_CACHE_PREFIX = 'cache-prefix';
    process.env.REDIS_SESSION_PREFIX = 'session-prefix';
    const { getCacheClient, getSessionClient } = loadRedisModule();

    const cacheClient = getCacheClient();
    const sessionClient = getSessionClient();

    expect(cacheClient).toBe(mockInstances[0]);
    expect(sessionClient).toBe(mockInstances[1]);

    const cacheOptions = RedisConstructor.mock.calls[0][0];
    const sessionOptions = RedisConstructor.mock.calls[1][0];

    expect(cacheOptions.keyPrefix).toBe('cache-prefix:');
    expect(sessionOptions.keyPrefix).toBe('session-prefix:');
  });

  it('supports redis url configuration', () => {
    process.env.REDIS_URL = 'rediss://example.com:6380/1';
    const { getRedisClient } = loadRedisModule();

    getRedisClient();

    expect(RedisConstructor).toHaveBeenCalledTimes(1);
    expect(RedisConstructor).toHaveBeenCalledWith(
      'rediss://example.com:6380/1',
      expect.objectContaining({
        host: '127.0.0.1',
      })
    );
  });

  it('configures tls, keepAlive and retry strategy', () => {
    process.env.REDIS_USE_TLS = 'true';
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED = 'false';
    process.env.REDIS_KEEP_ALIVE_MS = '15000';
    process.env.REDIS_RETRY_BASE_MS = '200';
    process.env.REDIS_RETRY_MAX_MS = '1000';
    process.env.REDIS_MAX_RETRY_ATTEMPTS = '3';
    const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { getRedisClient } = loadRedisModule();

    getRedisClient();

    const options = RedisConstructor.mock.calls[0][0];
    expect(options.tls).toEqual({ rejectUnauthorized: false });
    expect(options.keepAlive).toBe(15000);

    const retryStrategy = options.retryStrategy;
    expect(retryStrategy(1)).toBeGreaterThanOrEqual(200);
    expect(retryStrategy(1)).toBeLessThanOrEqual(1000);
    expect(retryStrategy(3)).toBeGreaterThan(0);
    expect(retryStrategy(4)).toBeNull();

    mathRandomSpy.mockRestore();
  });

  it('logs connection lifecycle events', () => {
    const { getRedisClient } = loadRedisModule();

    getRedisClient();
    const instance = mockInstances[0];
    const listeners = Object.fromEntries(
      instance.on.mock.calls.map(([event, handler]) => [
        event as string,
        handler as (...args: unknown[]) => void,
      ])
    ) as Record<string, (...args: unknown[]) => void>;

    listeners.connect();
    listeners.ready();
    listeners.error(new Error('boom'));
    listeners.end();
    listeners.reconnecting(500);

    expect(logger.debug).toHaveBeenCalledWith('Redis (primary) connecting');
    expect(logger.info).toHaveBeenCalledWith('Redis (primary) connection ready');
    expect(logger.error).toHaveBeenCalledWith('Redis (primary) error', { message: 'boom' });
    expect(logger.warn).toHaveBeenCalledWith('Redis (primary) connection closed');
    expect(logger.warn).toHaveBeenCalledWith('Redis (primary) attempting reconnect', {
      delayMs: 500,
    });
  });

  it('reports health by pinging cache and session clients', async () => {
    const { getCacheClient, getSessionClient, checkRedisConnection } = loadRedisModule();
    getCacheClient();
    getSessionClient();

    const result = await checkRedisConnection();

    expect(result.healthy).toBe(true);
    expect(result.nodes.cache.healthy).toBe(true);
    expect(result.nodes.session.healthy).toBe(true);
    expect(typeof result.nodes.cache.latencyMs).toBe('number');
    expect(typeof result.nodes.session.latencyMs).toBe('number');
  });

  it('handles ping failures and returns degraded health', async () => {
    const { getCacheClient, checkRedisConnection } = loadRedisModule();
    getCacheClient();

    const cacheInstance = mockInstances[0];
    cacheInstance.ping.mockRejectedValueOnce(new Error('cache offline'));

    const result = await checkRedisConnection();

    expect(result.healthy).toBe(false);
    expect(result.nodes.cache.healthy).toBe(false);
    expect(result.nodes.cache.error).toBe('cache offline');
    expect(logger.warn).toHaveBeenCalledWith('Redis (cache) health check failed', {
      message: 'cache offline',
    });
  });

  it('closes clients and resets singletons', async () => {
    const { getRedisClient, getCacheClient, getSessionClient, closeRedisConnections } =
      loadRedisModule();

    getRedisClient();
    getCacheClient();
    getSessionClient();

    const [primary, cache, session] = mockInstances;
    await closeRedisConnections();

    expect(primary.quit).toHaveBeenCalledTimes(1);
    expect(cache.quit).toHaveBeenCalledTimes(1);
    expect(session.quit).toHaveBeenCalledTimes(1);

    getRedisClient();
    expect(RedisConstructor).toHaveBeenCalledTimes(4);
  });

  it('logs an error when quitting a client fails', async () => {
    const { getRedisClient, closeRedisConnections } = loadRedisModule();
    getRedisClient();

    const instance = mockInstances[0];
    instance.quit.mockRejectedValueOnce(new Error('quit failed'));

    await closeRedisConnections();

    expect(logger.error).toHaveBeenCalledWith('Failed to close Redis (primary) connection', {
      message: 'quit failed',
    });
  });

  it('normalises prefixes and honours advanced configuration', () => {
    process.env.REDIS_CACHE_PREFIX = 'cache-prefix';
    process.env.REDIS_SESSION_PREFIX = 'session-prefix:';
    process.env.REDIS_PORT = 'not-a-number';
    process.env.REDIS_DB = '5';
    process.env.REDIS_ENABLE_OFFLINE_QUEUE = 'true';
    process.env.REDIS_PASSWORD = 's3cret';
    process.env.REDIS_CONNECTION_NAME = 'custom-cache';
    process.env.REDIS_MAX_RETRIES_PER_REQUEST = '7';

    const { getCacheClient, getSessionClient } = loadRedisModule();
    getCacheClient();
    getSessionClient();

    const cacheOptions = RedisConstructor.mock.calls[0][0];
    const sessionOptions = RedisConstructor.mock.calls[1][0];

    expect(cacheOptions.keyPrefix).toBe('cache-prefix:');
    expect(sessionOptions.keyPrefix).toBe('session-prefix:');
    expect(cacheOptions.port).toBe(6379);
    expect(cacheOptions.db).toBe(5);
    expect(cacheOptions.enableOfflineQueue).toBe(true);
    expect(cacheOptions.password).toBe('s3cret');
    expect(cacheOptions.connectionName).toBe('custom-cache');
    expect(cacheOptions.maxRetriesPerRequest).toBe(7);
  });

  it('defaults to secure TLS configuration when enabled without override', () => {
    process.env.REDIS_USE_TLS = 'true';
    delete process.env.REDIS_TLS_REJECT_UNAUTHORIZED;

    const { getRedisClient } = loadRedisModule();
    getRedisClient();

    const options = RedisConstructor.mock.calls[0][0];
    expect(options.tls).toEqual({ rejectUnauthorized: true });
  });

  it('handles reconnectOnError heuristics for known failure modes', () => {
    const { getRedisClient } = loadRedisModule();
    getRedisClient();

    const options = RedisConstructor.mock.calls[0][0];
    expect(options.reconnectOnError({ message: 'READONLY You can\'t write against a replica.' })).toBe(
      true
    );
    expect(options.reconnectOnError({ message: 'ETIMEDOUT while reading from socket' })).toBe(true);
    expect(options.reconnectOnError({ message: 'ECONNRESET connection lost' })).toBe(true);
    expect(options.reconnectOnError({ message: 'ERR random failure' })).toBe(false);
  });

  it('retries indefinitely when no max attempts are configured', () => {
    delete process.env.REDIS_MAX_RETRY_ATTEMPTS;
    const { getRedisClient } = loadRedisModule();
    getRedisClient();
    const options = RedisConstructor.mock.calls[0][0];
    const retryStrategy = options.retryStrategy;

    expect(typeof retryStrategy(5)).toBe('number');
    expect(typeof retryStrategy(10)).toBe('number');
  });

  it('allows closing connections when no clients exist', async () => {
    const { closeRedisConnections } = loadRedisModule();

    await expect(closeRedisConnections()).resolves.toBeUndefined();
    expect(RedisConstructor).not.toHaveBeenCalled();
  });
});
