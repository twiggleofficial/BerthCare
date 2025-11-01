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

jest.mock('./token-blacklist', () => ({
  blacklistAccessToken: jest.fn(),
  isAccessTokenBlacklisted: jest.fn(),
}));

import { app } from '../app';
import { runWithClient } from '../database/pool';
import { blacklistAccessToken, isAccessTokenBlacklisted } from './token-blacklist';
import { configureJwtKeySet, generateAccessToken, resetJwtKeySet } from 'libs/shared/jwt-utils';

const ACTIVE_KEY_ID = 'logout-key-20240201';

let testPrivateKey: string;
let testPublicKey: string;

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
const blacklistAccessTokenMock = blacklistAccessToken as jest.MockedFunction<
  typeof blacklistAccessToken
>;
const isAccessTokenBlacklistedMock = isAccessTokenBlacklisted as jest.MockedFunction<
  typeof isAccessTokenBlacklisted
>;

let server: Server;
let baseUrl: string;

const configureKeySet = () => {
  if (!testPrivateKey || !testPublicKey) {
    throw new Error('JWT test keys have not been initialised');
  }
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      {
        id: ACTIVE_KEY_ID,
        privateKey: testPrivateKey,
        publicKey: testPublicKey,
      },
    ],
  });
};

const createMockClient = (): {
  client: MockClient;
  state: { deleteValues?: unknown[] };
} => {
  const state: { deleteValues?: unknown[] } = {};

  const query = jest.fn(async (text: string, values: unknown[] = []) => {
    if (text.includes('DELETE FROM refresh_tokens')) {
      state.deleteValues = values;
      return { rows: [], rowCount: 1 };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  return {
    client: { query },
    state,
  };
};

const performRequest = async (body: Record<string, unknown>, token: string) =>
  fetch(`${baseUrl}/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  testPrivateKey = privateKey;
  testPublicKey = publicKey;
  configureKeySet();

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

  resetJwtKeySet();
});

beforeEach(() => {
  runWithClientMock.mockReset();
  blacklistAccessTokenMock.mockReset();
  isAccessTokenBlacklistedMock.mockReset();
});

describe('POST /v1/auth/logout', () => {
  it('deletes the stored refresh token hash and blacklists the access token', async () => {
    const userId = crypto.randomUUID();
    const zoneId = crypto.randomUUID();
    const refreshToken = 'valid-refresh-token';
    const accessToken = generateAccessToken({
      userId,
      role: 'caregiver',
      zoneId,
    });

    isAccessTokenBlacklistedMock.mockResolvedValue(false);
    blacklistAccessTokenMock.mockResolvedValue();

    const { client, state } = createMockClient();

    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const response = await performRequest({ refreshToken }, accessToken);

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ success: true });

    expect(runWithClientMock).toHaveBeenCalledTimes(1);
    const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    expect(state.deleteValues).toEqual([expectedHash, userId]);

    expect(blacklistAccessTokenMock).toHaveBeenCalledTimes(1);
    const [blacklistedToken, ttlSeconds] = blacklistAccessTokenMock.mock.calls[0] ?? [];
    expect(blacklistedToken).toBe(accessToken);
    expect(typeof ttlSeconds).toBe('number');
    expect(ttlSeconds).toBeGreaterThan(0);
    expect(ttlSeconds).toBeLessThanOrEqual(3600);
  });

  it('returns 400 when the refresh token is missing', async () => {
    const accessToken = generateAccessToken({
      userId: crypto.randomUUID(),
      role: 'caregiver',
      zoneId: crypto.randomUUID(),
    });

    isAccessTokenBlacklistedMock.mockResolvedValue(false);

    const response = await performRequest({}, accessToken);

    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      message: 'Invalid request body',
      errors: ['refreshToken is required'],
    });

    expect(runWithClientMock).not.toHaveBeenCalled();
    expect(blacklistAccessTokenMock).not.toHaveBeenCalled();
  });

  it('rejects subsequent requests with the same access token once it is blacklisted', async () => {
    const userId = crypto.randomUUID();
    const zoneId = crypto.randomUUID();
    const refreshToken = 'logout-refresh-token';
    const accessToken = generateAccessToken({
      userId,
      role: 'caregiver',
      zoneId,
    });

    isAccessTokenBlacklistedMock.mockResolvedValueOnce(false).mockResolvedValue(true);
    blacklistAccessTokenMock.mockResolvedValue();

    const { client } = createMockClient();
    runWithClientMock.mockImplementation(async (callback) => callback(client as never));

    const firstResponse = await performRequest({ refreshToken }, accessToken);
    expect(firstResponse.status).toBe(200);

    const secondResponse = await performRequest({ refreshToken }, accessToken);
    expect(secondResponse.status).toBe(401);
    const body = (await secondResponse.json()) as Record<string, unknown>;
    expect(body).toEqual({ message: 'Access token has been revoked' });

    expect(runWithClientMock).toHaveBeenCalledTimes(1);
    expect(blacklistAccessTokenMock).toHaveBeenCalledTimes(1);
  });
});
