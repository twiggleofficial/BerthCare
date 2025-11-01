import crypto from 'node:crypto';
import type { Server } from 'http';
import { AddressInfo } from 'net';

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

jest.mock('libs/shared/auth-utils', () => {
  const actual = jest.requireActual('libs/shared/auth-utils');

  return {
    ...actual,
    verifyPassword: jest.fn(),
  };
});

import { app } from '../app';
import { loginRateLimiter } from './routes';
import { runWithClient } from '../database/pool';
import { generateAccessToken, generateRefreshToken } from 'libs/shared/jwt-utils';
import { verifyPassword } from 'libs/shared/auth-utils';

type MockClient = {
  query: jest.Mock<
    Promise<{
      rows: Array<Record<string, unknown>>;
      rowCount: number | null;
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
const verifyPasswordMock = verifyPassword as jest.MockedFunction<typeof verifyPassword>;

const API_PATH = '/v1/auth/login';

let server: Server;
let baseUrl: string;

const createMockClient = ({
  userRow,
}: {
  userRow?: Record<string, unknown>;
}): {
  client: MockClient;
  state: {
    beginCount: number;
    commitCount: number;
    rollbackCount: number;
    selectValues?: unknown[];
    deleteValues?: unknown[];
    insertValues?: unknown[];
  };
} => {
  const state: {
    beginCount: number;
    commitCount: number;
    rollbackCount: number;
    selectValues?: unknown[];
    deleteValues?: unknown[];
    insertValues?: unknown[];
  } = {
    beginCount: 0,
    commitCount: 0,
    rollbackCount: 0,
  };

  const query = jest.fn(async (text: string, values: unknown[] = []) => {
    if (text.includes('FROM users')) {
      state.selectValues = values;

      if (!userRow) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [userRow],
        rowCount: 1,
      };
    }

    if (text.trim().toUpperCase() === 'BEGIN') {
      state.beginCount += 1;
      return { rows: [], rowCount: null };
    }

    if (text.trim().toUpperCase() === 'COMMIT') {
      state.commitCount += 1;
      return { rows: [], rowCount: null };
    }

    if (text.trim().toUpperCase() === 'ROLLBACK') {
      state.rollbackCount += 1;
      return { rows: [], rowCount: null };
    }

    if (text.includes('DELETE FROM refresh_tokens')) {
      state.deleteValues = values;
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('INSERT INTO refresh_tokens')) {
      state.insertValues = values;
      return { rows: [], rowCount: 1 };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  return {
    client: { query },
    state,
  };
};

const performRequest = async (body: Record<string, unknown>) =>
  fetch(`${baseUrl}${API_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const resetLimiter = () => {
  if ('resetKey' in loginRateLimiter && typeof loginRateLimiter.resetKey === 'function') {
    loginRateLimiter.resetKey('127.0.0.1');
    loginRateLimiter.resetKey('::ffff:127.0.0.1');
  }

  if ('resetAll' in loginRateLimiter && typeof loginRateLimiter.resetAll === 'function') {
    loginRateLimiter.resetAll();
  }
};

beforeAll(async () => {
  server = app.listen(0);

  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
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
  verifyPasswordMock.mockReset();
  resetLimiter();
});

describe('POST /v1/auth/login', () => {
  const userRow = {
    id: crypto.randomUUID(),
    email: 'caregiver@example.com',
    password_hash: 'stored-hash',
    first_name: 'Care',
    last_name: 'Giver',
    role: 'caregiver',
    zone_id: '01234567-89ab-cdef-0123-456789abcdef',
  };

  it('logs in the user, verifies the password, and stores a hashed refresh token', async () => {
    verifyPasswordMock.mockResolvedValue(true);

    const { client, state } = createMockClient({ userRow });

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({
      email: 'Caregiver@Example.com',
      password: 'ValidPass1',
      deviceId: 'device-42',
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: userRow.id,
        email: 'caregiver@example.com',
        firstName: 'Care',
        lastName: 'Giver',
        role: 'caregiver',
        zoneId: '01234567-89ab-cdef-0123-456789abcdef',
      },
    });

    expect(generateAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(generateRefreshTokenMock).toHaveBeenCalledTimes(1);
    expect(verifyPasswordMock).toHaveBeenCalledWith('ValidPass1', 'stored-hash');
    expect(state.selectValues).toEqual(['caregiver@example.com']);
    expect(state.beginCount).toBe(1);
    expect(state.commitCount).toBe(1);
    expect(state.rollbackCount).toBe(0);

    const expectedHash = crypto.createHash('sha256').update('refresh-token').digest('hex');
    expect(state.deleteValues).toEqual([userRow.id, 'device-42']);
    expect(state.insertValues).toBeDefined();
    expect(state.insertValues?.[0]).toBe(userRow.id);
    expect(state.insertValues?.[1]).toBe(expectedHash);
    expect(state.insertValues?.[2]).toBe('device-42');
    expect(state.insertValues?.[3]).toBeInstanceOf(Date);
    expect(
      state.insertValues?.[3] instanceof Date ? state.insertValues?.[3].getTime() : 0
    ).toBeGreaterThan(Date.now());
  });

  it('returns 401 when the credentials are invalid', async () => {
    verifyPasswordMock.mockResolvedValue(false);

    const { client, state } = createMockClient({ userRow });

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({
      email: 'caregiver@example.com',
      password: 'WrongPass1',
      deviceId: 'device-401',
    });

    expect(response.status).toBe(401);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Invalid credentials' });

    expect(generateAccessTokenMock).not.toHaveBeenCalled();
    expect(generateRefreshTokenMock).not.toHaveBeenCalled();
    expect(state.beginCount).toBe(0);
    expect(state.commitCount).toBe(0);
    expect(state.rollbackCount).toBe(0);
    expect(state.deleteValues).toBeUndefined();
    expect(state.insertValues).toBeUndefined();
  });

  it('limits login attempts per IP address', async () => {
    verifyPasswordMock.mockResolvedValue(true);

    runWithClientMock.mockImplementation(async (callback) => {
      const { client } = createMockClient({ userRow });
      return callback(client as never);
    });

    const requestBody = {
      email: 'ratelimit@example.com',
      password: 'ValidPass1',
      deviceId: 'device-rate',
    };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await performRequest(requestBody);
      expect(response.status).toBe(200);
    }

    const blockedResponse = await performRequest(requestBody);
    expect(blockedResponse.status).toBe(429);
    const body = (await blockedResponse.json()) as Record<string, unknown>;
    expect(body).toEqual({
      message: 'Too many login attempts. Please try again later.',
    });

    expect(runWithClientMock).toHaveBeenCalledTimes(10);
  });
});
