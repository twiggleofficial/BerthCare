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
  generateAccessToken: jest.fn(() => 'new-access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
  verifyToken: jest.fn(),
}));

import { app } from '../app';
import { runWithClient } from '../database/pool';
import { generateAccessToken, generateRefreshToken, verifyToken } from 'libs/shared/jwt-utils';

const API_PATH = '/v1/auth/refresh';

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
const verifyTokenMock = verifyToken as jest.MockedFunction<typeof verifyToken>;

let server: Server;
let baseUrl: string;

const createMockClient = ({
  record,
  updateRowCount = 1,
}: {
  record?: { user_id: string; expires_at: Date | string };
  updateRowCount?: number;
}): {
  client: MockClient;
  state: {
    tokenHash?: string;
    updatedTokenHash?: string;
    updateExpiresAt?: unknown;
    updatePreviousHash?: string;
  };
} => {
  const state: {
    tokenHash?: string;
    updatedTokenHash?: string;
    updateExpiresAt?: unknown;
    updatePreviousHash?: string;
  } = {};

  const query = jest.fn(async (text: string, values: unknown[] = []) => {
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('FROM refresh_tokens')) {
      state.tokenHash = values[0] as string;

      if (!record) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [record],
        rowCount: 1,
      };
    }

    if (text.startsWith('UPDATE refresh_tokens')) {
      state.updatedTokenHash = values[0] as string;
      state.updateExpiresAt = values[1];
      state.updatePreviousHash = values[2] as string;
      return { rows: [], rowCount: updateRowCount };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  return { client: { query }, state };
};

const performRequest = async (body: Record<string, unknown>) =>
  fetch(`${baseUrl}${API_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

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
  verifyTokenMock.mockReset();
});

describe('POST /v1/auth/refresh', () => {
  const tokenPayload = {
    user_id: crypto.randomUUID(),
    role: 'caregiver',
    zone_id: crypto.randomUUID(),
    token_type: 'refresh',
  };

  it('returns new access and refresh tokens when the refresh token is valid', async () => {
    const refreshToken = 'valid-refresh-token';
    const futureDate = new Date(Date.now() + 60_000);

    verifyTokenMock.mockReturnValue({
      header: { kid: 'test-key', alg: 'RS256' },
      payload: tokenPayload,
    });

    const { client, state } = createMockClient({
      record: {
        user_id: tokenPayload.user_id,
        expires_at: futureDate,
      },
    });

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({ refreshToken });

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toEqual({ accessToken: 'new-access-token', refreshToken: 'refresh-token' });
    expect(generateAccessTokenMock).toHaveBeenCalledWith({
      userId: tokenPayload.user_id,
      role: tokenPayload.role,
      zoneId: tokenPayload.zone_id,
    });
    expect(generateRefreshTokenMock).toHaveBeenCalledWith({
      userId: tokenPayload.user_id,
      role: tokenPayload.role,
      zoneId: tokenPayload.zone_id,
    });

    const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    expect(state.tokenHash).toBe(expectedHash);
    expect(state.updatePreviousHash).toBe(expectedHash);

    const expectedNewHash = crypto.createHash('sha256').update('refresh-token').digest('hex');
    expect(state.updatedTokenHash).toBe(expectedNewHash);
    expect(state.updateExpiresAt).toBeInstanceOf(Date);
  });

  it('returns 400 when the body is invalid', async () => {
    const response = await performRequest({});

    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      message: 'Invalid request body',
      errors: ['refreshToken is required'],
    });

    expect(runWithClientMock).not.toHaveBeenCalled();
    expect(generateAccessTokenMock).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    verifyTokenMock.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const response = await performRequest({ refreshToken: 'bad-token' });

    expect(response.status).toBe(401);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Invalid or expired refresh token' });

    expect(runWithClientMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the refresh token is expired in storage', async () => {
    const expiredDate = new Date(Date.now() - 1_000);

    verifyTokenMock.mockReturnValue({
      header: { kid: 'test-key', alg: 'RS256' },
      payload: tokenPayload,
    });

    const { client } = createMockClient({
      record: {
        user_id: tokenPayload.user_id,
        expires_at: expiredDate,
      },
    });

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({ refreshToken: 'expired-refresh-token' });

    expect(response.status).toBe(401);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Invalid or expired refresh token' });

    expect(generateAccessTokenMock).not.toHaveBeenCalled();
    expect(generateRefreshTokenMock).not.toHaveBeenCalled();
  });

  it('returns 500 when rotation update fails', async () => {
    const refreshToken = 'valid-refresh-token';
    const futureDate = new Date(Date.now() + 60_000);

    verifyTokenMock.mockReturnValue({
      header: { kid: 'test-key', alg: 'RS256' },
      payload: tokenPayload,
    });

    const { client, state } = createMockClient({
      record: {
        user_id: tokenPayload.user_id,
        expires_at: futureDate,
      },
      updateRowCount: 0,
    });

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({ refreshToken });

    expect(response.status).toBe(500);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Unable to refresh session' });

    expect(generateAccessTokenMock).not.toHaveBeenCalled();
    expect(generateRefreshTokenMock).toHaveBeenCalledTimes(1);

    const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    expect(state.tokenHash).toBe(expectedHash);
    expect(state.updatePreviousHash).toBe(expectedHash);
  });
});
