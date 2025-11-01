import crypto from 'node:crypto';
import type { Server } from 'http';
import { AddressInfo } from 'net';

import bcrypt from 'bcrypt';

jest.mock('../database/pool', () => ({
  runWithClient: jest.fn(),
  checkDatabaseConnection: jest.fn().mockResolvedValue({
    healthy: true,
    nodes: {
      primary: { healthy: true },
    },
  }),
  getPool: jest.fn(),
  getReadReplicaPool: jest.fn(),
  closePool: jest.fn(),
}));

jest.mock('libs/shared/jwt-utils', () => ({
  generateAccessToken: jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
}));

import { app } from '../app';
import { registerRateLimiter } from './routes';
import { runWithClient } from '../database/pool';
import { generateAccessToken, generateRefreshToken } from 'libs/shared/jwt-utils';

type MockClient = {
  query: jest.Mock<
    Promise<{
      rows: Array<Record<string, unknown>>;
      rowCount: number;
    }>,
    [string, unknown[]?]
  >;
};

const runWithClientMock = runWithClient as jest.MockedFunction<typeof runWithClient>;
const generateAccessTokenMock = generateAccessToken as jest.MockedFunction<
  typeof generateAccessToken
>;
const generateRefreshTokenMock = generateRefreshToken as jest.MockedFunction<
  typeof generateRefreshToken
>;

const API_PATH = '/v1/auth/register';
const ADMIN_SECRET = 'test-registration-secret';
const ADMIN_SECRET_HEADER = 'x-admin-registration-secret';

const resetLimiter = () => {
  if ('resetKey' in registerRateLimiter && typeof registerRateLimiter.resetKey === 'function') {
    registerRateLimiter.resetKey('127.0.0.1');
    registerRateLimiter.resetKey('::ffff:127.0.0.1');
  }

  if ('resetAll' in registerRateLimiter && typeof registerRateLimiter.resetAll === 'function') {
    registerRateLimiter.resetAll();
  }
};

describe('POST /v1/auth/register', () => {
  let server: Server;
  let baseUrl: string;
  let originalAdminSecret: string | undefined;

  const createMockClient = ({
    onUserInsert,
    onTokenInsert,
    failWithUniqueViolation = false,
  }: {
    onUserInsert?: (values: unknown[]) => void;
    onTokenInsert?: (values: unknown[]) => void;
    failWithUniqueViolation?: boolean;
  }): MockClient => {
    const query = jest.fn(async (text: string, values: unknown[] = []) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }

      if (text.includes('INSERT INTO users')) {
        if (failWithUniqueViolation) {
          const error = new Error('duplicate key value violates unique constraint') as Error & {
            code?: string;
          };
          error.code = '23505';
          throw error;
        }

        onUserInsert?.(values);

        return {
          rows: [
            {
              id: crypto.randomUUID(),
              email: values[0],
              first_name: values[2],
              last_name: values[3],
              role: 'admin',
              zone_id: values[5],
            },
          ],
          rowCount: 1,
        };
      }

      if (text.includes('INSERT INTO refresh_tokens')) {
        onTokenInsert?.(values);
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    return { query };
  };

  const performRequest = async (body: Record<string, unknown>) =>
    performRequestWithSecret(body, ADMIN_SECRET);

  const performRequestWithSecret = async (
    body: Record<string, unknown>,
    secret: string | null
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (secret !== null) {
      headers[ADMIN_SECRET_HEADER] = secret;
    }

    return fetch(`${baseUrl}${API_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  };

  beforeAll(async () => {
    originalAdminSecret = process.env.ADMIN_REGISTRATION_SECRET;
    process.env.ADMIN_REGISTRATION_SECRET = ADMIN_SECRET;

    server = app.listen(0);

    await new Promise<void>((resolve) => {
      server.once('listening', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (originalAdminSecret === undefined) {
      delete process.env.ADMIN_REGISTRATION_SECRET;
    } else {
      process.env.ADMIN_REGISTRATION_SECRET = originalAdminSecret;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    runWithClientMock.mockReset();
    generateAccessTokenMock.mockClear();
    generateRefreshTokenMock.mockClear();
    resetLimiter();
  });

  it('registers an admin user, hashes the password, and stores a refresh token hash', async () => {
    let hashedPassword: string | undefined;
    let refreshTokenHash: string | undefined;
    let refreshTokenExpiresAt: unknown;

    runWithClientMock.mockImplementation(async (callback) => {
      const client = createMockClient({
        onUserInsert: (values) => {
          hashedPassword = values[1] as string;
        },
        onTokenInsert: (values) => {
          refreshTokenHash = values[1] as string;
          refreshTokenExpiresAt = values[3];
        },
      });

      return callback(client as never);
    });

    const response = await performRequest({
      email: 'AdminUser@Example.com',
      password: 'Str0ngPass1',
      firstName: 'Ada',
      lastName: 'Admin',
      zoneId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      deviceId: 'device-123',
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        email: 'adminuser@example.com',
        firstName: 'Ada',
        lastName: 'Admin',
        role: 'admin',
        zoneId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      },
    });

    const user = body.user as Record<string, unknown>;
    expect(typeof user.id).toBe('string');

    expect(hashedPassword).toBeDefined();
    await expect(bcrypt.compare('Str0ngPass1', hashedPassword ?? '')).resolves.toBe(true);

    expect(generateAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(generateRefreshTokenMock).toHaveBeenCalledTimes(1);

    expect(refreshTokenHash).toBe(
      crypto.createHash('sha256').update('refresh-token').digest('hex')
    );
    expect(refreshTokenExpiresAt).toBeInstanceOf(Date);
    if (refreshTokenExpiresAt instanceof Date) {
      expect(refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('returns 409 when the email already exists', async () => {
    runWithClientMock.mockImplementation(async (callback) => {
      const client = createMockClient({ failWithUniqueViolation: true });

      return callback(client as never);
    });

    const response = await performRequest({
      email: 'duplicate@example.com',
      password: 'Str0ngPass1',
      firstName: 'Dana',
      lastName: 'Duplicate',
      zoneId: 'd2719c4d-0171-4aaa-9058-63812ac52301',
      deviceId: 'device-456',
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Email already registered' });
    expect(generateAccessTokenMock).not.toHaveBeenCalled();
    expect(generateRefreshTokenMock).not.toHaveBeenCalled();
  });

  it('limits registration attempts per IP address', async () => {
    let invocation = 0;
    runWithClientMock.mockImplementation(async (callback) => {
      const client = createMockClient({
        onUserInsert: () => {
          invocation += 1;
        },
      });

      return callback(client as never);
    });

    const baseBody = {
      password: 'Str0ngPass1',
      firstName: 'Rita',
      lastName: 'Rate',
      zoneId: 'b5c3fd89-25f4-498d-b60a-2ee86d01c8aa',
      deviceId: 'device-rate',
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await performRequest({
        ...baseBody,
        email: `rate-${attempt}@example.com`,
      });

      expect(response.status).toBe(201);
    }

    const blockedResponse = await performRequest({
      ...baseBody,
      email: 'rate-blocked@example.com',
    });

    expect(blockedResponse.status).toBe(429);
    const body = (await blockedResponse.json()) as Record<string, unknown>;
    expect(body).toEqual({
      message: 'Too many registration attempts. Please try again later.',
    });

    // Only the successful attempts should reach the database layer.
    expect(invocation).toBe(5);
  });

  it('rejects requests without the admin registration secret', async () => {
    const response = await performRequestWithSecret(
      {
        email: 'no-secret@example.com',
        password: 'Str0ngPass1',
        firstName: 'Nora',
        lastName: 'NoSecret',
        zoneId: 'd9b256b7-9897-4669-98a0-5b04171aaabc',
        deviceId: 'device-nosecret',
      },
      null
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Admin registration is not permitted' });
    expect(runWithClientMock).not.toHaveBeenCalled();
  });

  it('responds with 503 when admin registration is disabled', async () => {
    delete process.env.ADMIN_REGISTRATION_SECRET;

    const response = await performRequest({
      email: 'disabled@example.com',
      password: 'Str0ngPass1',
      firstName: 'Diana',
      lastName: 'Disabled',
      zoneId: '5d0cffae-ec4b-4a99-a846-1b213da685c2',
      deviceId: 'device-disabled',
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Admin registration is disabled' });
    expect(runWithClientMock).not.toHaveBeenCalled();

    process.env.ADMIN_REGISTRATION_SECRET = ADMIN_SECRET;
  });
});
