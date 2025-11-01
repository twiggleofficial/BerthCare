/**
 * @jest-environment node
 */

import http from 'http';
import type { AddressInfo } from 'net';
import type { ErrorRequestHandler, Express, Request, Response } from 'express';

const mockCheckDatabaseConnection = jest.fn();
const mockCheckRedisConnection = jest.fn();
const mockCheckPhotoBucketHealth = jest.fn();

jest.mock('./database/pool', () => ({
  checkDatabaseConnection: mockCheckDatabaseConnection,
}));

jest.mock('./cache/redis', () => ({
  checkRedisConnection: mockCheckRedisConnection,
}));

jest.mock('./storage/s3', () => ({
  checkPhotoBucketHealth: mockCheckPhotoBucketHealth,
}));

jest.mock('./auth/routes', () => {
  const express = require('express');
  return { authRouter: express.Router() };
});

jest.mock('./photos/routes', () => {
  const express = require('express');
  return { photoRouter: express.Router() };
});

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('./logger', () => ({
  logger,
}));

const originalEnv = { ...process.env };

const sendRequest = async (
  app: Express,
  options: { method?: string; path: string; headers?: http.OutgoingHttpHeaders; body?: string }
) => {
  return await new Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }>(
    (resolve, reject) => {
      const server = http.createServer(app);
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        const request = http.request(
          {
            host: '127.0.0.1',
            port: address.port,
            method: options.method ?? 'GET',
            path: options.path,
            headers: options.headers,
          },
          (response) => {
            let data = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              data += chunk;
            });
            response.on('end', () => {
              server.close();
              resolve({
                status: response.statusCode ?? 0,
                body: data,
                headers: response.headers,
              });
            });
          }
        );

        request.on('error', (error) => {
          server.close();
          reject(error);
        });

        if (options.body) {
          request.write(options.body);
        }

        request.end();
      });
    }
  );
};

const loadApp = () => {
  let appModule: typeof import('./app');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    appModule = require('./app');
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return appModule!;
};

const getErrorHandler = (appInstance: Express): ErrorRequestHandler => {
  const stack: Array<{ handle?: unknown }> =
    ((appInstance as unknown as { _router?: { stack: Array<{ handle?: unknown }> } })._router
      ?.stack as Array<{ handle?: unknown }> | undefined) ?? [];

  const layer = stack.find(
    (entry) => typeof entry.handle === 'function' && (entry.handle as Function).length === 4
  );

  if (!layer || typeof layer.handle !== 'function') {
    throw new Error('Error handler middleware not found on app');
  }

  return layer.handle as ErrorRequestHandler;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockCheckDatabaseConnection.mockReset();
  mockCheckRedisConnection.mockReset();
  mockCheckPhotoBucketHealth.mockReset();
  process.env = { ...originalEnv };
  delete process.env.RATE_LIMIT_MAX;
  delete process.env.ALLOWED_ORIGINS;

  mockCheckDatabaseConnection.mockResolvedValue({
    healthy: true,
    nodes: {
      primary: { healthy: true, latencyMs: 1.2 },
    },
  });

  mockCheckRedisConnection.mockResolvedValue({
    healthy: true,
    nodes: {
      cache: { healthy: true, latencyMs: 1 },
      session: { healthy: true, latencyMs: 1 },
    },
  });

  mockCheckPhotoBucketHealth.mockResolvedValue({
    healthy: true,
    bucket: 'test-bucket',
    region: 'ca-central-1',
  });
});

afterAll(() => {
  process.env = originalEnv;
});

describe('app', () => {
  describe('sanitizeUrl', () => {
    it('redacts sensitive query parameters and preserves path structure', () => {
      const { __TESTING__ } = loadApp();
      const sanitizeUrl = __TESTING__.sanitizeUrl;

      expect(
        sanitizeUrl('/login?email=user@example.com&token=secret&nested=value')
      ).toBe('/login?email=%5BREDACTED%5D&token=%5BREDACTED%5D&nested=value');
      expect(sanitizeUrl('/path?EMAIL=UPPER')).toBe('/path?EMAIL=%5BREDACTED%5D');
      expect(sanitizeUrl('/safe?foo=bar')).toBe('/safe?foo=bar');
      expect(sanitizeUrl('/plain-path')).toBe('/plain-path');
    });

    it('handles malformed urls gracefully', () => {
      const { __TESTING__ } = loadApp();
      const sanitizeUrl = __TESTING__.sanitizeUrl;

      expect(sanitizeUrl('/path??weird')).toBe('/path?%3Fweird=');
    });
  });

  it('sanitises sensitive query parameters in access logs', async () => {
    const { app } = loadApp();

    const response = await sendRequest(app, { path: '/unknown?token=secret&email=user@example.com' });

    expect(response.status).toBe(404);
    expect(logger.info).toHaveBeenCalledWith(
      'GET /unknown?token=%5BREDACTED%5D&email=%5BREDACTED%5D',
      expect.objectContaining({
        url: '/unknown?token=%5BREDACTED%5D&email=%5BREDACTED%5D',
      })
    );
  });

  it('returns healthy status when all checks pass', async () => {
    const { app } = loadApp();

    const response = await sendRequest(app, { path: '/health' });
    const body = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(mockCheckDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(mockCheckRedisConnection).toHaveBeenCalledTimes(1);
    expect(mockCheckPhotoBucketHealth).toHaveBeenCalledTimes(1);
  });

  it('returns degraded status when a dependency is unhealthy', async () => {
    mockCheckDatabaseConnection.mockResolvedValue({
      healthy: false,
      nodes: {
        primary: { healthy: false, error: 'connection refused' },
      },
    });

    const { app } = loadApp();
    const response = await sendRequest(app, { path: '/health' });
    const body = JSON.parse(response.body);

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.checks.database.nodes.primary.healthy).toBe(false);
  });

  it('returns timeout response when checks exceed allowed duration', async () => {
    mockCheckDatabaseConnection.mockImplementation(() => new Promise(() => {}));
    mockCheckRedisConnection.mockImplementation(() => new Promise(() => {}));
    mockCheckPhotoBucketHealth.mockImplementation(() => new Promise(() => {}));

    const originalSetTimeout = setTimeout;
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(
      ((handler: unknown, timeout?: number, ...args: unknown[]) =>
        originalSetTimeout(
          handler as Parameters<typeof setTimeout>[0],
          timeout === 5_000 ? 0 : timeout ?? 0,
          ...(args as unknown[])
        )) as typeof setTimeout
    );

    const { app } = loadApp();
    const requestPromise = sendRequest(app, { path: '/health' });

    let response: Awaited<ReturnType<typeof sendRequest>>;
    try {
      response = await requestPromise;
    } finally {
      timeoutSpy.mockRestore();
    }

    const body = JSON.parse(response.body);
    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.message).toContain('timed out');
    expect(logger.warn).toHaveBeenCalledWith('Health check timed out', {
      timeoutMs: 5_000,
    });
  });

  it('masks internal server errors when propagating through error handler', () => {
    const { app } = loadApp();
    const errorHandler = getErrorHandler(app);
    const req = { method: 'GET', originalUrl: '/trigger-error' } as Request;
    const res = {
      headersSent: false,
      status: jest.fn().mockImplementation(() => res),
      json: jest.fn().mockImplementation(() => res),
    } as unknown as Response;
    const next = jest.fn();

    errorHandler(new Error('boom'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled error',
      expect.objectContaining({ message: 'boom' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves explicit status codes and messages from errors', () => {
    const { app } = loadApp();
    const errorHandler = getErrorHandler(app);
    const req = { method: 'GET', originalUrl: '/forbidden' } as Request;
    const res = {
      headersSent: false,
      status: jest.fn().mockImplementation(() => res),
      json: jest.fn().mockImplementation(() => res),
    } as unknown as Response;
    const next = jest.fn();
    const error = new Error('Forbidden') as Error & { status?: number };
    error.status = 403;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates to next middleware when headers already sent', () => {
    const { app } = loadApp();
    const errorHandler = getErrorHandler(app);
    const req = { method: 'POST', originalUrl: '/after-send' } as Request;
    const res = {
      headersSent: true,
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();
    const error = new Error('already sent');

    errorHandler(error, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
