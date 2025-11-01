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

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDjFlWGDuyPFBjP
h/3FNCDR/aWn1ASBLVnhC50nWwAGu5V8rQStN3FqdijhXY7DYNnruzDpVRIfb+PD
y64Qj/5Y8UQEJ0imsw2SuwZotlvBemh4viQHu9tdF9lTPeyPwjZnHmJvHxMipx4c
uQOt5NK3Iom8CQQPs05WGv2+YXgoX/gp6gJ+MpmqTutZugNngkPXRI8mDfdCcGYX
GPW4IZpz3maSuXsctLUtIbRfjnson7GBuFjJHjd3eahENziYcLGIPJeQspdY0CvG
IXE2oYPPIKiBd5i/jVq7KTPcb40s7NeKmXxZA8AYG2lEwUv0kp0j2YHeEQ8sTqz6
moa768RrAgMBAAECggEBAJTLh5JlqP8/Tdp94vwaYf72UlsbgzAZRTE+aOTmrae7
tgGRZOUS1Q/LCJJSuT6v8VqSt0PMaCmNKRKcHRvhHemtfMGz89i2rggc3+AwzQKD
cHzdKcKfhucCv3XZt22i9f6vXBQvqlwkYIi1egGxU5iH2vQIfE7FUGj/GpBqUU8y
Buzi2GzY6CJuRzLOgyFYlFKSyJowmAbEQCThZjFIeRLEDeYldfhXuxQANRxCpphZ
ouPqJO8FZwuNJpdCrgggyJ8Og50FP86w52Emzwig3prVKPxH95MHpIyPPahrJ4Uw
Msr3aCW/rlkZm1bVVgj8IJJmMIGuDtGORQ5zj1Zz9VECgYEA9AGyMMUaX0JkpY1V
CxmxWHyTEi4CHHyP7CWKyuA8GqIKQbPDpCp7j10FokcppWmPhZeig4hns5jtBE6l
0G014ALloFokB00eXd4mg0SCC3dXAKhGy8cSYCSFfZeJlPO2kwlv4jwYrNbHpHKN
gKvbdj1XFX5z33+/vSVi4TdTRb8CgYEA7j++XPZb+yVn5W4GbrBZmGkdFjXQAu8C
f9OqvZOMrqt9RMaeA4D61E75qoFFQfEvs1zvFwZ9myAjD5kiA5TEj6KObYEqjx20
v7enqGDLGF0zwpJBMhulamC5hJmF+jl52PzEhgog6EGHuhZ1MuS9V7jjJlOIV3zJ
v+jpHFG5ZFUCgYBINhRI8JvsYxasE9Z+MX1VhZB0yd7gFVD2funDPncrHpdQeGXG
uLfWZp4bN1ow1Lufuo9iw8SE1xYVtzzFIPzXraPNP7/31S/OcccOBAFEaW37CNHi
zqg2gbhrwaP6y+FVRG6zEjvvMqTkmu4bjUCmjmKuPr0GAKV60YygwCHJuwKBgQDH
nrMicuyopjPCIQjUr3+yWsgbNuVdv+LpNXGGu90Q8PDZskztBKGlR7KasQtVb/8W
mpRdR3vwgOG/jP/Z3kk/S+VoTORa23n5dKjORKOGe3kF2sMzd8SGOBrYxkViXcwB
CfCjmlLuJxHQ0kZKaStYF7qC/1RqcU0dNcozhyn9rQKBgQCcl87gCdDMPEqZLgKC
WF0JNl9XECa+7elMVhdCIK+bSgSyz91AuJ9oeR/B7ptfCA+nZRVcdGuzc6MRDVrU
wcVfBbn8JausgtK62URFJyI4oVIf/LaUFDn79DPNu9tUw9whBzhbhcIHRR3KnmV8
gms5cUOCDHrfE4oq3+dr3IqlnQ==
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4xZVhg7sjxQYz4f9xTQg
0f2lp9QEgS1Z4QudJ1sABruVfK0ErTdxanYo4V2Ow2DZ67sw6VUSH2/jw8uuEI/+
WPFEBCdIprMNkrsGaLZbwXpoeL4kB7vbXRfZUz3sj8I2Zx5ibx8TIqceHLkDreTS
tyKJvAkED7NOVhr9vmF4KF/4KeoCfjKZqk7rWboDZ4JD10SPJg33QnBmFxj1uCGa
c95mkrl7HLS1LSG0X457KJ+xgbhYyR43d3moRDc4mHCxiDyXkLKXWNArxiFxNqGD
zyCogXeYv41auykz3G+NLOzXipl8WQPAGBtpRMFL9JKdI9mB3hEPLE6s+pqGu+vE
awIDAQAB
-----END PUBLIC KEY-----`;

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
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      {
        id: ACTIVE_KEY_ID,
        privateKey: PRIVATE_KEY,
        publicKey: PUBLIC_KEY,
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
